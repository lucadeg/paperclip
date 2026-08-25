/**
 * Hermes Agent Models Catalog and Dynamic Discovery.
 *
 * Provides a comprehensive, metadata-rich catalog of all available models
 * (OpenRouter free & frontier, Local Ollama/vLLM, Google Gemini, Anthropic,
 * OpenAI Codex, DeepSeek, Nous Portal, Z.AI, Kimi, MiniMax).
 *
 * Includes live discovery for local Ollama instances and Hermes configuration.
 */

import type { AdapterModel, AdapterModelProfileDefinition } from "@paperclipai/adapter-utils";
import { detectModel } from "./detect-model.js";

const OLLAMA_PROBE_URL = "http://127.0.0.1:11434/api/tags";
const OLLAMA_TIMEOUT_MS = 600;

export const HERMES_CURATED_MODELS: AdapterModel[] = [
  // ==========================================
  // FREE & LOCAL MODELS (Zero Cost / $0.00)
  // ==========================================
  {
    id: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    label: "Meta Llama 3.3 70B Instruct (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM / 200 RPD",
    provider: "openrouter",
    description: "Llama 3.3 70B Instruct open foundation model, free on OpenRouter.",
  },
  {
    id: "openrouter/deepseek/deepseek-r1:free",
    label: "DeepSeek R1 Reasoning (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "DeepSeek R1 frontier open reasoning model, 100% free on OpenRouter.",
  },
  {
    id: "openrouter/google/gemini-2.0-flash-exp:free",
    label: "Google Gemini 2.0 Flash Exp (Free 1M Ctx)",
    isFree: true,
    pricingType: "free",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 1M Context · 15 RPM",
    provider: "openrouter",
    description: "Google Gemini 2.0 Flash with 1M context window, free tier.",
  },
  {
    id: "openrouter/qwen/qwen-2.5-coder-32b-instruct:free",
    label: "Qwen 2.5 Coder 32B Instruct (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "Qwen 2.5 Coder 32B high-accuracy coding specialist, free.",
  },
  {
    id: "openrouter/mistralai/mistral-small-24b-instruct-2501:free",
    label: "Mistral Small 24B Instruct (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "Mistral Small 24B reasoning and tool-calling model, free.",
  },
  {
    id: "z-ai/glm-5.2:free",
    label: "Z.AI GLM 5.2 (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · Z.AI",
    provider: "zai",
    description: "GLM-5.2 conversational & agentic reasoning, free tier.",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "NVIDIA Nemotron 3 Super 120B (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "NVIDIA Nemotron 3 Super 120B, free on OpenRouter.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "NVIDIA Nemotron 3 Ultra 550B (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "NVIDIA Nemotron 3 Ultra 550B frontier model, free on OpenRouter.",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    label: "NVIDIA Nemotron 3.5 Lightning (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier · 20 RPM",
    provider: "openrouter",
    description: "NVIDIA Nemotron 3.5 Lightning ultra fast inference, free on OpenRouter.",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    label: "Poolside Laguna S 2.1 (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier",
    provider: "openrouter",
    description: "Poolside Laguna S 2.1 coding specialist, free.",
  },
  {
    id: "stealth/ox-alpha",
    label: "Stealth Ox-Alpha (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier",
    provider: "openrouter",
    description: "Ox-Alpha reasoning model, free.",
  },
  {
    id: "openrouter/elephant-alpha",
    label: "Elephant Alpha (Free)",
    isFree: true,
    pricingType: "free",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Free Tier",
    provider: "openrouter",
    description: "Elephant Alpha experimental model, free.",
  },

  // ==========================================
  // LOCAL OLLAMA / SELF-HOSTED (Zero Cost / GPU)
  // ==========================================
  {
    id: "ollama/qwen2.5-coder:32b",
    label: "Ollama Qwen 2.5 Coder 32B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local Qwen 2.5 Coder 32B running locally via Ollama.",
  },
  {
    id: "ollama/qwen2.5-coder:14b",
    label: "Ollama Qwen 2.5 Coder 14B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local Qwen 2.5 Coder 14B running locally via Ollama.",
  },
  {
    id: "ollama/qwen2.5-coder:7b",
    label: "Ollama Qwen 2.5 Coder 7B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local Qwen 2.5 Coder 7B running locally via Ollama.",
  },
  {
    id: "ollama/llama3.3:70b",
    label: "Ollama Llama 3.3 70B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local Llama 3.3 70B running locally via Ollama.",
  },
  {
    id: "ollama/llama3.2:3b",
    label: "Ollama Llama 3.2 3B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local CPU/GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local Llama 3.2 3B lightweight agent model via Ollama.",
  },
  {
    id: "ollama/deepseek-r1:14b",
    label: "Ollama DeepSeek R1 14B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 65536,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local DeepSeek R1 14B distilled reasoning via Ollama.",
  },
  {
    id: "ollama/deepseek-r1:32b",
    label: "Ollama DeepSeek R1 32B (Local)",
    isFree: true,
    pricingType: "local",
    contextWindow: 65536,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Local GPU · 0 Latency · 100% Free",
    provider: "ollama",
    description: "Local DeepSeek R1 32B distilled reasoning via Ollama.",
  },
  {
    id: "local/custom",
    label: "Local Custom Endpoint (vLLM / LM Studio)",
    isFree: true,
    pricingType: "local",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    limits: "Self-Hosted · Zero Cost",
    provider: "local",
    description: "Self-hosted local OpenAI-compatible endpoint on localhost.",
  },

  // ==========================================
  // GOOGLE GEMINI (High Context / Multimodal)
  // ==========================================
  {
    id: "google/gemini-3.7-flash",
    label: "Google Gemini 3.7 Flash (Hybrid Reasoning)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.15,
    costPerMillionOutputTokens: 0.60,
    limits: "1M Context · Hybrid Reasoning & Coding",
    provider: "google",
    description: "Google Gemini 3.7 Flash with thinking effort and 1M context.",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Google Gemini 2.5 Pro (2M Context)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 1.25,
    costPerMillionOutputTokens: 5.00,
    limits: "2M Context · Deep Reasoning & Codebase Architecture",
    provider: "google",
    description: "Google Gemini 2.5 Pro 2 million token context window.",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Google Gemini 2.5 Flash",
    isFree: false,
    pricingType: "paid",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.10,
    costPerMillionOutputTokens: 0.40,
    limits: "1M Context · Ultra Fast Tool Calling",
    provider: "google",
    description: "Google Gemini 2.5 Flash low latency agent model.",
  },
  {
    id: "google/gemini-2.0-flash",
    label: "Google Gemini 2.0 Flash (Production)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.10,
    costPerMillionOutputTokens: 0.40,
    limits: "1M Context · High Throughput",
    provider: "google",
    description: "Google Gemini 2.0 Flash production general purpose model.",
  },

  // ==========================================
  // ANTHROPIC CLAUDE (Frontier Agentic)
  // ==========================================
  {
    id: "anthropic/claude-3-7-sonnet",
    label: "Anthropic Claude 3.7 Sonnet (Hybrid)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 3.00,
    costPerMillionOutputTokens: 15.00,
    limits: "200k Context · Extended Thinking / Coding",
    provider: "anthropic",
    description: "Anthropic Claude 3.7 Sonnet premier coding and agentic model.",
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    label: "Anthropic Claude 3.5 Sonnet",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 3.00,
    costPerMillionOutputTokens: 15.00,
    limits: "200k Context · Benchmark Coding",
    provider: "anthropic",
    description: "Anthropic Claude 3.5 Sonnet industry standard agentic model.",
  },
  {
    id: "anthropic/claude-3-5-haiku",
    label: "Anthropic Claude 3.5 Haiku",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.80,
    costPerMillionOutputTokens: 4.00,
    limits: "200k Context · Fast & Economical",
    provider: "anthropic",
    description: "Anthropic Claude 3.5 Haiku high speed agent model.",
  },
  {
    id: "anthropic/claude-opus-5",
    label: "Anthropic Claude Opus 5",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 15.00,
    costPerMillionOutputTokens: 75.00,
    limits: "200k Context · Maximum Intelligence",
    provider: "anthropic",
    description: "Anthropic Claude Opus 5 highest intelligence frontier model.",
  },

  // ==========================================
  // OPENAI & CODEX (Autonomous & Reasoning)
  // ==========================================
  {
    id: "openai/gpt-5.6-sol",
    label: "OpenAI GPT-5.6 Sol",
    isFree: false,
    pricingType: "paid",
    contextWindow: 256000,
    maxOutputTokens: 16384,
    costPerMillionInputTokens: 2.50,
    costPerMillionOutputTokens: 10.00,
    limits: "256k Context · Autonomous Reasoning",
    provider: "openai",
    description: "OpenAI GPT-5.6 Sol autonomous problem solver.",
  },
  {
    id: "openai/gpt-5.5",
    label: "OpenAI GPT-5.5",
    isFree: false,
    pricingType: "paid",
    contextWindow: 256000,
    maxOutputTokens: 16384,
    costPerMillionInputTokens: 2.00,
    costPerMillionOutputTokens: 8.00,
    limits: "256k Context · Advanced Agentic",
    provider: "openai",
    description: "OpenAI GPT-5.5 high-performance coding and tool use.",
  },
  {
    id: "openai/gpt-4o",
    label: "OpenAI GPT-4o",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPerMillionInputTokens: 2.50,
    costPerMillionOutputTokens: 10.00,
    limits: "128k Context · Multimodal Standard",
    provider: "openai",
    description: "OpenAI GPT-4o multimodal flagship model.",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "OpenAI GPT-4o Mini",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPerMillionInputTokens: 0.15,
    costPerMillionOutputTokens: 0.60,
    limits: "128k Context · Ultra Low Cost",
    provider: "openai",
    description: "OpenAI GPT-4o Mini fast and cost-efficient model.",
  },
  {
    id: "openai/o3-mini",
    label: "OpenAI o3-mini (Reasoning)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    costPerMillionInputTokens: 1.10,
    costPerMillionOutputTokens: 4.40,
    limits: "200k Context · High Reasoning Effort",
    provider: "openai",
    description: "OpenAI o3-mini cost-effective reasoning model.",
  },
  {
    id: "openai/o1",
    label: "OpenAI o1 (Deep Reasoning)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    costPerMillionInputTokens: 15.00,
    costPerMillionOutputTokens: 60.00,
    limits: "200k Context · Deep Reasoning",
    provider: "openai",
    description: "OpenAI o1 deep math, science, and coding reasoning.",
  },

  // ==========================================
  // DEEPSEEK (High Performance & Reasoning)
  // ==========================================
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.27,
    costPerMillionOutputTokens: 1.10,
    limits: "128k Context · Frontier Open Coding",
    provider: "deepseek",
    description: "DeepSeek V4 Pro frontier open weights model.",
  },
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.07,
    costPerMillionOutputTokens: 0.28,
    limits: "128k Context · Ultra Low Cost",
    provider: "deepseek",
    description: "DeepSeek V4 Flash ultra high throughput.",
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1 (Paid Hosted)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.55,
    costPerMillionOutputTokens: 2.19,
    limits: "128k Context · Full 671B MoE Reasoning",
    provider: "deepseek",
    description: "DeepSeek R1 671B MoE reasoning model.",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3 Chat",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.14,
    costPerMillionOutputTokens: 0.28,
    limits: "128k Context · General Purpose",
    provider: "deepseek",
    description: "DeepSeek V3 general chat & coding model.",
  },

  // ==========================================
  // NOUS PORTAL & FRONTIER OPEN SOURCE
  // ==========================================
  {
    id: "nous/hermes-3-llama-3.1-70b",
    label: "Nous Hermes 3 Llama 3.1 70B",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.40,
    costPerMillionOutputTokens: 0.80,
    limits: "128k Context · Nous Agentic Finetune",
    provider: "nous",
    description: "Nous Research Hermes 3 flagship agentic model.",
  },
  {
    id: "nous/hermes-3-llama-3.1-8b",
    label: "Nous Hermes 3 Llama 3.1 8B",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.10,
    costPerMillionOutputTokens: 0.20,
    limits: "128k Context · Fast Agentic",
    provider: "nous",
    description: "Nous Research Hermes 3 8B fast tool calling.",
  },
  {
    id: "qwen/qwen3.8-max",
    label: "Qwen 3.8 Max",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 1.60,
    costPerMillionOutputTokens: 6.40,
    limits: "128k Context · Multi-Agent Specialist",
    provider: "qwen",
    description: "Qwen 3.8 Max frontier multilingual & agent model.",
  },
  {
    id: "moonshotai/kimi-k3",
    label: "Moonshot Kimi K3 (200k Ctx)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.50,
    costPerMillionOutputTokens: 2.00,
    limits: "200k Context · Long Document Specialist",
    provider: "kimi",
    description: "Moonshot Kimi K3 long context reasoning model.",
  },
  {
    id: "z-ai/glm-5.3",
    label: "Z.AI GLM 5.3 (Reasoning & Tools)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.60,
    costPerMillionOutputTokens: 2.40,
    limits: "128k Context · Advanced Tool Use",
    provider: "zai",
    description: "Z.AI GLM-5.3 agentic & tool reasoning model.",
  },
  {
    id: "minimax/minimax-m3",
    label: "MiniMax M3 (1M Context)",
    isFree: false,
    pricingType: "paid",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerMillionInputTokens: 0.20,
    costPerMillionOutputTokens: 0.80,
    limits: "1M Context · Ultra-Long Context",
    provider: "minimax",
    description: "MiniMax M3 1M token context window model.",
  },
];

export const hermesModelProfiles: AdapterModelProfileDefinition[] = [
  {
    key: "cheap",
    label: "Free / Cheap Fast Model",
    description: "Uses free tier API or local model with zero execution cost ($0.00)",
    adapterConfig: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    },
    source: "adapter_default",
  },
];

async function probeLocalOllamaModels(): Promise<AdapterModel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const response = await fetch(OLLAMA_PROBE_URL, { signal: controller.signal });
    if (!response.ok) return [];
    const payload = (await response.json()) as { models?: Array<{ name: string; size?: number }> };
    const list = Array.isArray(payload.models) ? payload.models : [];
    return list.map((item) => {
      const modelName = item.name;
      const sizeGb = item.size ? `${(item.size / 1e9).toFixed(1)}GB` : "Local";
      return {
        id: `ollama/${modelName}`,
        label: `Ollama ${modelName} (${sizeGb} Local)`,
        isFree: true,
        pricingType: "local",
        contextWindow: 32768,
        maxOutputTokens: 8192,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
        limits: `Local GPU · 0 Latency · ${sizeGb} · $0 Cost`,
        provider: "ollama",
        description: `Locally installed Ollama model (${modelName}).`,
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

let cachedModels: { expiresAt: number; list: AdapterModel[] } | null = null;
const CACHE_TTL_MS = 30_000;

export async function listHermesModels(options?: { forceRefresh?: boolean }): Promise<AdapterModel[]> {
  const now = Date.now();
  if (!options?.forceRefresh && cachedModels && cachedModels.expiresAt > now) {
    return cachedModels.list;
  }

  const [ollamaDiscovered, detected] = await Promise.all([
    probeLocalOllamaModels(),
    detectModel().catch(() => null),
  ]);

  const seen = new Set<string>();
  const combined: AdapterModel[] = [];

  // 1. Detected model from user's ~/.hermes/config.yaml (if present)
  if (detected?.model) {
    const isFree = detected.model.includes(":free") || detected.model.startsWith("ollama/") || detected.model.startsWith("local/");
    const id = detected.model;
    seen.add(id);
    combined.push({
      id,
      label: `${id} (Configured Default)`,
      isFree,
      pricingType: isFree ? (id.startsWith("ollama/") || id.startsWith("local/") ? "local" : "free") : "paid",
      contextWindow: 128000,
      limits: isFree ? "Free / Zero Cost" : "Configured in ~/.hermes/config.yaml",
      provider: detected.provider || "auto",
      description: "Default model detected in ~/.hermes/config.yaml",
    });
  }

  // 2. Ollama live discovered models
  for (const m of ollamaDiscovered) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      combined.push(m);
    }
  }

  // 3. Curated catalog models
  for (const m of HERMES_CURATED_MODELS) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      combined.push(m);
    }
  }

  cachedModels = {
    expiresAt: now + CACHE_TTL_MS,
    list: combined,
  };

  return combined;
}

export async function refreshHermesModels(): Promise<AdapterModel[]> {
  return listHermesModels({ forceRefresh: true });
}
