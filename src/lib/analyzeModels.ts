import { useQuery } from '@tanstack/react-query';
import { mysqlClient } from '@/lib/mysql-client';

export type AnalyzeModelKind = 'major' | 'open_weight';

export interface AnalyzeModel {
  key: string;
  label: string;
  kind: AnalyzeModelKind;
  provider: string;
}

export interface AnalyzeModelsResponse {
  autoKey: string;
  autoOrder: string[];
  manualFallback: string[];
  models: AnalyzeModel[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const FALLBACK_MODELS: AnalyzeModelsResponse = {
  autoKey: 'auto',
  autoOrder: [
    'gemini_flash',
    'gemini_4_argon',
    'deepseek_v41_flash',
    'glm_53',
    'qwen38_27b',
    'gemma4_31b_free',
    'nvidia',
  ],
  manualFallback: ['gemma4_31b_free', 'nvidia'],
  models: [
    { key: 'gemini_flash', label: 'Gemini Flash', kind: 'major', provider: 'google' },
    { key: 'gemini_4_argon', label: 'Gemini 4 Argon', kind: 'major', provider: 'openrouter' },
    { key: 'gpt_61_sol', label: 'GPT-6.1 Sol', kind: 'major', provider: 'openrouter' },
    { key: 'claude_sonnet_55', label: 'Claude Sonnet 5.5', kind: 'major', provider: 'openrouter' },
    { key: 'nvidia', label: 'NVIDIA Nemotron', kind: 'open_weight', provider: 'nvidia' },
    { key: 'deepseek_v41_flash', label: 'DeepSeek V4.1 Flash', kind: 'open_weight', provider: 'openrouter' },
    { key: 'qwen38_27b', label: 'Qwen3.8 27B', kind: 'open_weight', provider: 'openrouter' },
    { key: 'glm_53', label: 'GLM-5.3', kind: 'open_weight', provider: 'openrouter' },
    { key: 'gemma4_31b_free', label: 'Gemma 4 31B', kind: 'open_weight', provider: 'openrouter' },
  ],
};

export async function fetchAnalyzeModels(): Promise<AnalyzeModelsResponse> {
  const response = await fetch(`${API_BASE_URL}/meetings/analyze-models`, {
    method: 'GET',
    headers: {
      ...mysqlClient.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analyze models');
  }

  return response.json();
}

export function useAnalyzeModels() {
  return useQuery({
    queryKey: ['analyze-models'],
    queryFn: fetchAnalyzeModels,
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK_MODELS,
  });
}

export function getModelLabel(
  key: string | null | undefined,
  models?: AnalyzeModel[],
  autoKey = 'auto'
): string {
  if (!key || key === autoKey) return 'Auto (پیشنهادی)';
  const list = models || FALLBACK_MODELS.models;
  return list.find((model) => model.key === key)?.label || key;
}
