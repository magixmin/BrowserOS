import { PRODUCT_NAME } from '@/lib/constants/product'
import type { ProviderType } from './types'

/**
 * Provider template for quick setup
 * @public
 */
export interface ProviderTemplate {
  id: string
  type: ProviderType
  name: string
  defaultBaseUrl: string
  defaultModelId: string
  supportsImages: boolean
  contextWindow: number
  description?: string
  iconType?: ProviderType | 'deepseek' | 'minimax' | 'custom-api'
  setupGuideUrl?: string
  apiKeyUrl?: string
}

/**
 * Available provider templates for quick setup
 * @public
 */
export const providerTemplates: ProviderTemplate[] = [
  {
    id: 'chatgpt-pro',
    type: 'chatgpt-pro',
    name: 'ChatGPT Plus/Pro',
    defaultBaseUrl: 'https://chatgpt.com/backend-api',
    defaultModelId: 'gpt-5.3-codex',
    supportsImages: true,
    contextWindow: 400000,
    setupGuideUrl: 'https://docs.browseros.com/features/chatgpt-pro-oauth',
  },
  {
    id: 'github-copilot',
    type: 'github-copilot',
    name: 'GitHub Copilot',
    defaultBaseUrl: 'https://api.githubcopilot.com',
    defaultModelId: 'gpt-5-mini',
    supportsImages: true,
    contextWindow: 128000,
    setupGuideUrl: 'https://docs.browseros.com/features/github-copilot-oauth',
  },
  {
    id: 'moonshot',
    type: 'moonshot',
    name: 'Kimi (Moonshot AI)',
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    defaultModelId: 'kimi-k2.5',
    supportsImages: true,
    contextWindow: 200000,
    description: 'Connect your own Kimi API key for chat and agent tasks.',
    apiKeyUrl: 'https://platform.moonshot.ai/console/api-keys',
    setupGuideUrl: 'https://platform.moonshot.ai/console/api-keys',
  },
  {
    id: 'openai',
    type: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModelId: 'gpt-4',
    supportsImages: true,
    contextWindow: 128000,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#openai',
  },
  {
    id: 'openai-compatible',
    type: 'openai-compatible',
    name: 'Third-Party Compatible API',
    defaultBaseUrl: '',
    defaultModelId: '',
    supportsImages: true,
    contextWindow: 128000,
    description: 'Bring any OpenAI-compatible endpoint with a custom base URL.',
    iconType: 'custom-api',
  },
  {
    id: 'deepseek',
    type: 'openai-compatible',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModelId: 'deepseek-chat',
    supportsImages: true,
    contextWindow: 128000,
    description:
      'OpenAI-compatible preset for DeepSeek Chat and DeepSeek Reasoner.',
    iconType: 'deepseek',
    setupGuideUrl: 'https://api-docs.deepseek.com/',
  },
  {
    id: 'minimax',
    type: 'openai-compatible',
    name: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.io/v1',
    defaultModelId: 'MiniMax-M2.5',
    supportsImages: true,
    contextWindow: 1000000,
    description: 'OpenAI-compatible preset for MiniMax text generation APIs.',
    iconType: 'minimax',
    setupGuideUrl: 'https://platform.minimax.io/docs/api-reference/text-openai-api',
  },
  {
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModelId: 'claude-3-5-sonnet-20241022',
    supportsImages: true,
    contextWindow: 200000,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#claude',
  },
  {
    id: 'google',
    type: 'google',
    name: 'Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModelId: 'gemini-1.5-pro',
    supportsImages: true,
    contextWindow: 1000000,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#gemini',
  },
  {
    id: 'ollama',
    type: 'ollama',
    name: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModelId: 'llama3.2',
    supportsImages: false,
    contextWindow: 128000,
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#ollama',
  },
  {
    id: 'openrouter',
    type: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModelId: 'openai/gpt-4-turbo',
    supportsImages: true,
    contextWindow: 128000,
    apiKeyUrl: 'https://openrouter.ai/keys',
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#openrouter',
  },
  {
    id: 'lmstudio',
    type: 'lmstudio',
    name: 'LM Studio',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModelId: 'local-model',
    supportsImages: false,
    contextWindow: 32000,
    setupGuideUrl:
      'https://docs.browseros.com/features/bring-your-own-llm#lmstudio',
  },
  {
    id: 'azure',
    type: 'azure',
    name: 'Azure',
    defaultBaseUrl: '',
    defaultModelId: '',
    supportsImages: true,
    contextWindow: 128000,
    apiKeyUrl:
      'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI',
  },
  {
    id: 'bedrock',
    type: 'bedrock',
    name: 'AWS Bedrock',
    defaultBaseUrl: '',
    defaultModelId: '',
    supportsImages: true,
    contextWindow: 200000,
    setupGuideUrl:
      'https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html',
  },
]

/**
 * Provider type options for select dropdowns
 * @public
 */
export const providerTypeOptions: { value: ProviderType; label: string }[] = [
  { value: 'chatgpt-pro', label: 'ChatGPT Plus/Pro' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
  { value: 'moonshot', label: 'Kimi / Moonshot AI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'google', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'azure', label: 'Azure' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'lmstudio', label: 'LM Studio' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'browseros', label: PRODUCT_NAME },
]

/**
 * Get provider template by type
 * @public
 */
export const getProviderTemplate = (
  type: ProviderType,
): ProviderTemplate | undefined => {
  return providerTemplates.find((t) => t.type === type)
}

/**
 * Default base URLs for each provider type
 * Auto-fills when user selects a provider type
 */
export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
  'chatgpt-pro': 'https://chatgpt.com/backend-api',
  'github-copilot': 'https://api.githubcopilot.com',
  moonshot: 'https://api.moonshot.ai/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  'openai-compatible': '',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
  azure: '',
  ollama: 'http://localhost:11434/v1',
  lmstudio: 'http://localhost:1234/v1',
  bedrock: '',
  browseros: '',
}

/**
 * Get default base URL for a provider type
 * @public
 */
export const getDefaultBaseUrlForProviders = (type: ProviderType): string => {
  return DEFAULT_BASE_URLS[type] || ''
}
