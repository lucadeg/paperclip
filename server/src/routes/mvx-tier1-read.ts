/**
 * Evidence-scoped, authenticated read boundary to MVX Tier 1.
 * The Tier 1 server MUST echo the same company UUID in its response;
 * no demo entries, unsigned attribution, or public-browser localhost requests.
 */
import { isIP } from "node:net";

export type Tier1Resource = "crm/contacts" | "content/phrases" | "content/calendar";

export class Tier1ReadError extends Error {
  readonly status: number;
  readonly reason: string;

  constructor(status: number, reason: string) {
    super(reason);
    this.status = status;
    this.reason = reason;
  }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_PATHS: Record<Tier1Resource, string> = {
  "crm/contacts": "/api/crm/contacts",
  "content/phrases": "/api/phrases",
  "content/calendar": "/api/calendar/events",
};
const ARRAY_KEYS: Record<Tier1Resource, string> = {
  "crm/contacts": "contacts",
  "content/phrases": "phrases",
  "content/calendar": "events",
};
const MAX_TIER1_BODY_BYTES = 2_000_000;

// Bound memory use while reading an untrusted upstream response. Checking the
// string length after Response.text() materializes the entire body is too late.
async function readLimitedTier1Body(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) &&
      Number(contentLength) > MAX_TIER1_BODY_BYTES) {
    throw new Tier1ReadError(502, "TIER1_PAYLOAD_TOO_LARGE");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  let complete = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      size += value.byteLength;
      if (size > MAX_TIER1_BODY_BYTES) {
        throw new Tier1ReadError(502, "TIER1_PAYLOAD_TOO_LARGE");
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } catch (error) {
    if (error instanceof Tier1ReadError) throw error;
    throw new Tier1ReadError(502, "TIER1_RESPONSE_READ_FAILED");
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function readTier1CompanyResource(
  companyId: string,
  resource: Tier1Resource,
  options: { env?: NodeJS.ProcessEnv; fetcher?: typeof fetch } = {},
) {
  if (!UUID.test(companyId)) throw new Tier1ReadError(400, "INVALID_COMPANY_UUID");
  const resourcePath = RESOURCE_PATHS[resource];
  if (!resourcePath) throw new Tier1ReadError(400, "UNKNOWN_RESOURCE");
  const env = options.env ?? process.env;
  const originValue = env.MVX_TIER1_API_ORIGIN;
  const token = env.MVX_TIER1_SERVICE_TOKEN;
  if (!originValue || !token || token.trim().length < 24) {
    throw new Tier1ReadError(503, "TIER1_INTEGRATION_NOT_CONFIGURED");
  }
  let origin: URL;
  try {
    origin = new URL(originValue);
  } catch {
    throw new Tier1ReadError(503, "INVALID_TIER1_API_ORIGIN");
  }
  const hostname = origin.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const localDev = env.NODE_ENV === "development" &&
    /^(localhost|127\.0\.0\.1)$/.test(hostname) &&
    origin.protocol === "http:";
  // HTTPS alone does not make an internal/metadata host a safe outbound target.
  // For production, require a DNS host rather than an IP literal or local name.
  const unsafeHost = isIP(hostname) !== 0 || hostname === "localhost" ||
    hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
    hostname.endsWith(".internal");
  if (!((origin.protocol === "https:" && origin.hostname && !unsafeHost) || localDev) ||
      origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== "/" || /[\s\r\n]/.test(token)) {
    throw new Tier1ReadError(503, "INVALID_TIER1_API_ORIGIN");
  }
  const url = new URL(resourcePath, origin);
  url.searchParams.set("companyId", companyId);
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-MVX-Company-Id": companyId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  } catch {
    throw new Tier1ReadError(502, "TIER1_CONNECTION_FAILED");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Tier1ReadError(502, "TIER1_SERVICE_AUTHORIZATION_FAILED");
  }
  if (!response.ok) throw new Tier1ReadError(502, "TIER1_UPSTREAM_ERROR");
  const bytes = await readLimitedTier1Body(response);
  let payload: unknown;
  try { payload = JSON.parse(bytes); } catch {
    throw new Tier1ReadError(502, "TIER1_INVALID_JSON");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Tier1ReadError(502, "TIER1_INVALID_SHAPE");
  }
  const record = payload as Record<string, unknown>;
  const rows = record[ARRAY_KEYS[resource]];
  // An upstream response MUST prove company-scoped ownership; unscoped legacy
  // responses are deliberately rejected instead of blended across tenants.
  if (record.companyId !== companyId || !Array.isArray(rows) || rows.length > 1000 ||
      rows.some(item => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return true;
        const row = item as Record<string, unknown>;
        // The envelope alone is not sufficient: reject any explicitly
        // company-labelled item that belongs to another company.
        return ("companyId" in row && row.companyId !== companyId) ||
          ("company_id" in row && row.company_id !== companyId);
      })) {
    throw new Tier1ReadError(502, "TIER1_COMPANY_SCOPE_OR_SCHEMA_MISMATCH");
  }
  return {
    schema: "mvx-tier1-company-resource/v1",
    companyId,
    resource,
    items: rows,
    observedAt: new Date().toISOString(),
    authority: "TIER1_AUTHENTICATED_READ_UNRECONCILED",
  };
}
