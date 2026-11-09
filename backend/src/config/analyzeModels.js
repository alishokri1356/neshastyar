const ANALYZE_MODELS = [
  {
    key: 'gemini_flash',
    label: 'Gemini Flash',
    kind: 'major',
    provider: 'google',
    openrouterId: null,
  },
  {
    key: 'gemini_4_argon',
    label: 'Gemini 4 Argon',
    kind: 'major',
    provider: 'openrouter',
    openrouterId: 'google/gemini-4-argon',
  },
  {
    key: 'gpt_61_sol',
    label: 'GPT-6.1 Sol',
    kind: 'major',
    provider: 'openrouter',
    openrouterId: 'openai/gpt-6.1-sol',
  },
  {
    key: 'claude_sonnet_55',
    label: 'Claude Sonnet 5.5',
    kind: 'major',
    provider: 'openrouter',
    openrouterId: 'anthropic/claude-sonnet-5.5',
  },
  {
    key: 'nvidia',
    label: 'NVIDIA Nemotron',
    kind: 'open_weight',
    provider: 'nvidia',
    openrouterId: null,
  },
  {
    key: 'deepseek_v41_flash',
    label: 'DeepSeek V4.1 Flash',
    kind: 'open_weight',
    provider: 'openrouter',
    openrouterId: 'deepseek/deepseek-v4.1-flash',
  },
  {
    key: 'qwen38_27b',
    label: 'Qwen3.8 27B',
    kind: 'open_weight',
    provider: 'openrouter',
    openrouterId: 'qwen/qwen3.8-27b',
  },
  {
    key: 'glm_53',
    label: 'GLM-5.3',
    kind: 'open_weight',
    provider: 'openrouter',
    openrouterId: 'z-ai/glm-5.3',
  },
  {
    key: 'gemma4_31b_free',
    label: 'Gemma 4 31B',
    kind: 'open_weight',
    provider: 'openrouter',
    openrouterId: 'google/gemma-4-31b-it',
  },
];

const AUTO_KEY = 'auto';

const AUTO_ORDER = [
  'gemini_flash',
  'gemini_4_argon',
  'deepseek_v41_flash',
  'glm_53',
  'qwen38_27b',
  'gemma4_31b_free',
  'nvidia',
];

const MANUAL_FALLBACK = ['gemma4_31b_free', 'nvidia'];

const MODEL_BY_KEY = Object.fromEntries(ANALYZE_MODELS.map((model) => [model.key, model]));

function isValidAnalyzeModelKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (key === AUTO_KEY) return true;
  return Boolean(MODEL_BY_KEY[key]);
}

function normalizeAnalyzeModelKey(key) {
  if (!key || typeof key !== 'string') return AUTO_KEY;
  const trimmed = key.trim();
  if (!trimmed || trimmed === AUTO_KEY) return AUTO_KEY;
  return isValidAnalyzeModelKey(trimmed) ? trimmed : null;
}

function getModelLabel(key) {
  if (!key || key === AUTO_KEY) return 'Auto (پیشنهادی)';
  return MODEL_BY_KEY[key]?.label || key;
}

function buildModelOrder(requestedKey) {
  const key = normalizeAnalyzeModelKey(requestedKey) || AUTO_KEY;
  if (key === AUTO_KEY) {
    return AUTO_ORDER.map((modelKey) => MODEL_BY_KEY[modelKey]).filter(Boolean);
  }

  const primary = MODEL_BY_KEY[key];
  if (!primary) {
    return AUTO_ORDER.map((modelKey) => MODEL_BY_KEY[modelKey]).filter(Boolean);
  }

  const order = [primary];
  for (const fallbackKey of MANUAL_FALLBACK) {
    if (fallbackKey === key) continue;
    const fallback = MODEL_BY_KEY[fallbackKey];
    if (fallback) order.push(fallback);
  }
  return order;
}

function getAnalyzeModelsForApi() {
  return {
    autoKey: AUTO_KEY,
    autoOrder: AUTO_ORDER,
    manualFallback: MANUAL_FALLBACK,
    models: ANALYZE_MODELS.map(({ key, label, kind, provider }) => ({
      key,
      label,
      kind,
      provider,
    })),
  };
}

module.exports = {
  ANALYZE_MODELS,
  AUTO_KEY,
  AUTO_ORDER,
  MANUAL_FALLBACK,
  MODEL_BY_KEY,
  isValidAnalyzeModelKey,
  normalizeAnalyzeModelKey,
  getModelLabel,
  buildModelOrder,
  getAnalyzeModelsForApi,
};
