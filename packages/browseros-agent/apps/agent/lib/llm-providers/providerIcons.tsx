import {
  Anthropic,
  Azure,
  Bedrock,
  DeepSeek,
  Gemini,
  Kimi,
  LmStudio,
  Minimax,
  Ollama,
  OpenAI,
  OpenRouter,
} from '@lobehub/icons'
import { Bot, Github } from 'lucide-react'
import type { FC, SVGProps } from 'react'
import ProductLogoSvg from '@/assets/product_logo.svg'
import { PRODUCT_NAME } from '@/lib/constants/product'
import type { ProviderType } from './types'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

type IconComponent = FC<IconProps>

export type ProviderIconType =
  | ProviderType
  | 'deepseek'
  | 'minimax'
  | 'custom-api'

const providerIconMap: Record<ProviderIconType, IconComponent | null> = {
  anthropic: Anthropic,
  openai: OpenAI,
  'openai-compatible': OpenAI,
  google: Gemini,
  openrouter: OpenRouter,
  azure: Azure,
  ollama: Ollama,
  lmstudio: LmStudio,
  bedrock: Bedrock,
  browseros: null,
  moonshot: Kimi,
  'chatgpt-pro': OpenAI,
  'github-copilot': Github,
  deepseek: DeepSeek,
  minimax: Minimax,
  'custom-api': OpenAI,
}

export function getProviderIconType(provider: {
  type: ProviderType
  name?: string | null
}): ProviderIconType {
  if (provider.type !== 'openai-compatible') return provider.type

  const normalizedName = provider.name?.trim().toLowerCase() ?? ''
  if (normalizedName.includes('deepseek')) return 'deepseek'
  if (normalizedName.includes('minimax')) return 'minimax'

  return 'openai-compatible'
}

interface ProviderIconProps {
  type: ProviderIconType
  size?: number
  className?: string
}

/**
 * Provider icon component that renders the appropriate icon for each provider type
 * @public
 */
export const ProviderIcon: FC<ProviderIconProps> = ({
  type,
  size = 20,
  className,
}) => {
  const IconComponent = providerIconMap[type]

  if (IconComponent) {
    return <IconComponent size={size} className={className} />
  }

  return <Bot size={size} className={className} />
}

/**
 * BrowserOS branded icon component
 * @public
 */
export const BrowserOSIcon: FC<{ size?: number; className?: string }> = ({
  size = 20,
  className,
}) => {
  return (
    <img
      src={ProductLogoSvg}
      alt={PRODUCT_NAME}
      width={size}
      height={size}
      className={className}
    />
  )
}
