/**
 * Free & Local Model Detection and Cost Management.
 *
 * Ensures that all tasks, issues, approvals, and directives using free API tiers
 * (e.g. OpenRouter :free, Gemini free tier) or local models (Ollama, vLLM, LMStudio)
 * are accurately recognized and their estimated & spent costs are strictly zeroed out ($0.00).
 */

export function isFreeOrLocalModel(modelIdOrName?: string | null): boolean {
  if (!modelIdOrName || typeof modelIdOrName !== "string") return false;
  const normalized = modelIdOrName.trim().toLowerCase();
  if (!normalized) return false;

  // 1. Explicit :free tag (OpenRouter, Z.AI, Nemotron, Mistral, Llama, DeepSeek free tiers)
  if (normalized.includes(":free") || normalized.endsWith("-free") || normalized.includes("/free/")) {
    return true;
  }

  // 2. Ollama local models
  if (normalized.startsWith("ollama/") || normalized.startsWith("ollama:") || normalized.includes("ollama")) {
    return true;
  }

  // 3. Local / self-hosted / vLLM / LMStudio models
  if (
    normalized.startsWith("local/") ||
    normalized.startsWith("vllm/") ||
    normalized.startsWith("lmstudio/") ||
    normalized === "local" ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1")
  ) {
    return true;
  }

  // 4. Known free standalone models
  if (
    normalized === "stealth/ox-alpha" ||
    normalized === "openrouter/elephant-alpha" ||
    normalized.includes("ox-alpha") ||
    normalized.includes("elephant-alpha")
  ) {
    return true;
  }

  return false;
}

export function sanitizeCostForModel(
  calculatedCostUsd: number,
  modelIdOrName?: string | null,
  adapterType?: string | null,
): number {
  if (isFreeOrLocalModel(modelIdOrName)) {
    return 0;
  }
  // If no model is explicitly given and adapter is local without api billing, verify
  return calculatedCostUsd < 0 ? 0 : calculatedCostUsd;
}
