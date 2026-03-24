import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAgentServerUrl } from '@/lib/browseros/useBrowserOSProviders'

export type CatalogSkillSource =
  | 'browseros-remote'
  | 'openai-curated'
  | 'openclaw-clawhub'

export interface CatalogSkillMeta {
  source: CatalogSkillSource
  id: string
  name: string
  description: string
  version?: string
  installed: boolean
  builtIn: boolean
  openClawCompatible: boolean
  compatibilityScore: number
  compatibilityTier: 'high' | 'medium' | 'low'
  compatibilityReasons: string[]
  frontmatterPreview: Record<string, unknown>
  contentPreview: string[]
  outline: string[]
}

const SKILL_CATALOG_QUERY_KEY = 'skill-catalog'

async function fetchSkillCatalog(baseUrl: string): Promise<CatalogSkillMeta[]> {
  const res = await fetch(`${baseUrl}/skills/catalog`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.skills
}

async function installCatalogSkill(
  baseUrl: string,
  input: { source: CatalogSkillSource; id: string },
): Promise<void> {
  const res = await fetch(`${baseUrl}/skills/catalog/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
}

export function useSkillCatalog() {
  const { baseUrl, isLoading: urlLoading } = useAgentServerUrl()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery<
    CatalogSkillMeta[],
    Error
  >({
    queryKey: [SKILL_CATALOG_QUERY_KEY, baseUrl],
    queryFn: () => fetchSkillCatalog(baseUrl as string),
    enabled: !!baseUrl && !urlLoading,
  })

  const installMutation = useMutation({
    mutationFn: (input: { source: CatalogSkillSource; id: string }) =>
      installCatalogSkill(baseUrl as string, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [SKILL_CATALOG_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['skills'] }),
      ])
    },
  })

  return {
    skills: data ?? [],
    isLoading: isLoading || urlLoading,
    error,
    refetch,
    installSkill: installMutation.mutateAsync,
    installing:
      installMutation.variables?.id && installMutation.isPending
        ? installMutation.variables.id
        : null,
  }
}
