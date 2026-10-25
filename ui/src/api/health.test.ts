import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTenantSessionRecoveryCoordinator,
  tenantSessionRecovery,
} from "@/lib/tenant-session-recovery";
import { healthApi } from "./health";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("healthApi", () => {
  it("initiates tenant-session recovery and keeps the bootstrap request pending", async () => {
    const reload = vi.fn();
    const recovery = createTenantSessionRecoveryCoordinator(reload);
    vi.spyOn(tenantSessionRecovery, "recoverIfNeeded").mockImplementation(recovery.recoverIfNeeded);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "tenant_session_invalid" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = healthApi.get();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    let settled = false;
    void request.then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it("never fabricates a healthy server when the API responds with 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Database unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    await expect(healthApi.get()).rejects.toThrow("Database unavailable");
  });

  it("rejects an unauthorized non-recovery health request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    await expect(healthApi.get()).rejects.toThrow("Failed to fetch server health (403)");
  });

  it("accepts a genuine server health response without inventing auth state", async () => {
    const actual = { status: "ok", deploymentMode: "authenticated", authReady: false };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(actual), { status: 200 })));
    await expect(healthApi.get()).resolves.toEqual(actual);
  });

  it("rejects malformed successful health responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "broken" }), { status: 200 })));
    await expect(healthApi.get()).rejects.toThrow("Invalid server health response");
  });
});
