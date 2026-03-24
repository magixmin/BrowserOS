import { Check, Copy, Heart, History } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PRODUCT_NAME } from '@/lib/constants/product'
import { useI18n } from '@/lib/i18n/useI18n'
import { cn } from '@/lib/utils'
import {
  favoriteMarketplaceSkillsStorage,
  recentMarketplaceSkillsStorage,
} from './marketplaceStorage'
import type { CatalogSkillMeta, CatalogSkillSource } from './useSkillCatalog'

interface SkillMarketplaceSectionProps {
  skills: CatalogSkillMeta[]
  installingId: string | null
  onInstall: (input: { source: CatalogSkillSource; id: string }) => void
}

const COMPATIBILITY_REASON_KEYS: Record<string, string> = {
  'compatibility metadata mentions openclaw':
    'skills.marketplace.reason.compatibilityOpenClaw',
  'compatibility metadata mentions AgentSkills':
    'skills.marketplace.reason.compatibilityAgentSkills',
  'declares allowed-tools': 'skills.marketplace.reason.allowedTools',
  'declares license metadata': 'skills.marketplace.reason.license',
  'instructions match browser-agent workflows':
    'skills.marketplace.reason.browserWorkflow',
  'contains runtime/tooling requirements that may need adaptation':
    'skills.marketplace.reason.runtimeRequirements',
  'first-party BrowserOS catalog source':
    'skills.marketplace.reason.firstPartyCatalog',
  'published from OpenClaw ClawHub source':
    'skills.marketplace.reason.clawHubSource',
  'published via OpenClaw ClawHub registry':
    'skills.marketplace.reason.clawHubRegistry',
  'recommended starter slug for ClawHub installation':
    'skills.marketplace.reason.clawHubStarter',
  'install path uses official ClawHub registry download API':
    'skills.marketplace.reason.clawHubDownload',
}

function sourceLabel(
  source: CatalogSkillSource,
  productNameLabel: string,
  openAILabel: string,
  openClawLabel: string,
): string {
  if (source === 'openai-curated') return openAILabel
  if (source === 'openclaw-clawhub') return openClawLabel
  return productNameLabel
}

function compatibilityTierClassName(
  tier: CatalogSkillMeta['compatibilityTier'],
): string {
  if (tier === 'high') {
    return 'border-transparent bg-emerald-500/12 text-emerald-700'
  }
  if (tier === 'medium') {
    return 'border-transparent bg-amber-500/12 text-amber-700'
  }
  return 'border-transparent bg-slate-500/12 text-slate-700'
}

function localizeCompatibilityReason(
  reason: string,
  t: ReturnType<typeof useI18n>['t'],
): string {
  const key = COMPATIBILITY_REASON_KEYS[reason]
  if (!key) return reason
  return t(key, { product: PRODUCT_NAME })
}

export const SkillMarketplaceSection: FC<SkillMarketplaceSectionProps> = ({
  skills,
  installingId,
  onInstall,
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<
    'all' | CatalogSkillSource
  >('all')
  const [installedOnly, setInstalledOnly] = useState(false)
  const [compatibleOnly, setCompatibleOnly] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<CatalogSkillMeta | null>(
    null,
  )
  const [sortBy, setSortBy] = useState<'name' | 'compatibility'>('compatibility')
  const [page, setPage] = useState(1)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [openClawSlug, setOpenClawSlug] = useState('')
  const pageSize = 9

  const productSourceLabel = t('skills.marketplace.filter.product', {
    product: PRODUCT_NAME,
  })
  const openAISourceLabel = t('skills.marketplace.filter.openAI')
  const openClawSourceLabel = t('skills.marketplace.filter.openClaw')

  useEffect(() => {
    favoriteMarketplaceSkillsStorage.getValue().then((value) =>
      setFavorites(value ?? []),
    )
    recentMarketplaceSkillsStorage.getValue().then((value) =>
      setRecent(value ?? []),
    )

    const unwatchFavorites = favoriteMarketplaceSkillsStorage.watch((value) =>
      setFavorites(value ?? []),
    )
    const unwatchRecent = recentMarketplaceSkillsStorage.watch((value) =>
      setRecent(value ?? []),
    )

    return () => {
      unwatchFavorites()
      unwatchRecent()
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, sourceFilter, installedOnly, compatibleOnly, favoritesOnly, sortBy])

  const filteredSkills = useMemo(() => {
    const filtered = skills.filter((skill) => {
      if (sourceFilter !== 'all' && skill.source !== sourceFilter) return false
      if (installedOnly && !skill.installed) return false
      if (compatibleOnly && !skill.openClawCompatible) return false
      if (favoritesOnly && !favorites.includes(skill.id)) return false
      if (!query.trim()) return true

      const haystack = `${skill.name} ${skill.description} ${skill.id}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'compatibility') {
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore
        }
      }
      return a.name.localeCompare(b.name)
    })
  }, [
    skills,
    sourceFilter,
    installedOnly,
    compatibleOnly,
    favoritesOnly,
    favorites,
    query,
    sortBy,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / pageSize))

  const pageNumbers = useMemo(() => {
    const windowSize = 5
    let start = Math.max(1, page - Math.floor(windowSize / 2))
    let end = Math.min(totalPages, start + windowSize - 1)

    start = Math.max(1, end - windowSize + 1)

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [page, totalPages])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pagedSkills = filteredSkills.slice((page - 1) * pageSize, page * pageSize)

  if (skills.length === 0) return null

  const toggleFavorite = async (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((entry) => entry !== id)
      : [...favorites, id]
    await favoriteMarketplaceSkillsStorage.setValue(next)
  }

  const markRecent = async (id: string) => {
    const next = [id, ...recent.filter((entry) => entry !== id)].slice(0, 12)
    await recentMarketplaceSkillsStorage.setValue(next)
  }

  const copyText = async (kind: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedField(kind)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const installCommand = (skill: CatalogSkillMeta) =>
    skill.source === 'openai-curated'
      ? `install ${skill.id} from openai/skills curated`
      : skill.source === 'openclaw-clawhub'
        ? `install ${skill.id} from openclaw/clawhub`
        : `install ${skill.id} from ${PRODUCT_NAME} catalog`

  const tierLabel = (tier: CatalogSkillMeta['compatibilityTier']) =>
    t(`skills.marketplace.tier.${tier}`)

  const openDetails = (skill: CatalogSkillMeta) => {
    void markRecent(skill.id)
    setSelectedSkill(skill)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-muted-foreground text-sm">
            {t('skills.marketplace.results', {
              shown: filteredSkills.length,
              total: skills.length,
            })}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              placeholder={t('skills.marketplace.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="sm:max-w-sm"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={sourceFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSourceFilter('all')}
              >
                {t('skills.marketplace.filter.all')}
              </Button>
              <Button
                size="sm"
                variant={
                  sourceFilter === 'browseros-remote' ? 'default' : 'outline'
                }
                onClick={() => setSourceFilter('browseros-remote')}
              >
                {productSourceLabel}
              </Button>
              <Button
                size="sm"
                variant={
                  sourceFilter === 'openai-curated' ? 'default' : 'outline'
                }
                onClick={() => setSourceFilter('openai-curated')}
              >
                {openAISourceLabel}
              </Button>
              <Button
                size="sm"
                variant={
                  sourceFilter === 'openclaw-clawhub' ? 'default' : 'outline'
                }
                onClick={() => setSourceFilter('openclaw-clawhub')}
              >
                {openClawSourceLabel}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={installedOnly ? 'default' : 'outline'}
              onClick={() => setInstalledOnly((prev) => !prev)}
            >
              {t('skills.marketplace.filter.installedOnly')}
            </Button>
            <Button
              size="sm"
              variant={compatibleOnly ? 'default' : 'outline'}
              onClick={() => setCompatibleOnly((prev) => !prev)}
            >
              {t('skills.marketplace.filter.compatibleOnly')}
            </Button>
            <Button
              size="sm"
              variant={favoritesOnly ? 'default' : 'outline'}
              onClick={() => setFavoritesOnly((prev) => !prev)}
            >
              {t('skills.marketplace.filter.favorites')}
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'compatibility' ? 'default' : 'outline'}
              onClick={() => setSortBy('compatibility')}
            >
              {t('skills.marketplace.filter.sortCompatibility')}
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'name' ? 'default' : 'outline'}
              onClick={() => setSortBy('name')}
            >
              {t('skills.marketplace.filter.sortName')}
            </Button>
          </div>
        </div>

      </div>

      {sourceFilter === 'openclaw-clawhub' ? (
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {t('skills.marketplace.openClawInstallTitle')}
              </p>
              <p className="text-muted-foreground text-xs leading-5">
                {t('skills.marketplace.openClawInstallDescription')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder={t('skills.marketplace.openClawInstallPlaceholder')}
                value={openClawSlug}
                onChange={(event) => setOpenClawSlug(event.target.value)}
                className="sm:w-80"
              />
              <Button
                onClick={() =>
                  onInstall({
                    source: 'openclaw-clawhub',
                    id: openClawSlug.trim().toLowerCase(),
                  })
                }
                disabled={!openClawSlug.trim()}
              >
                {t('skills.marketplace.openClawInstallAction')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background p-10 text-center text-muted-foreground text-sm shadow-sm">
          {t('skills.marketplace.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedSkills.map((skill) => {
            const isFavorite = favorites.includes(skill.id)
            const isRecent = recent.includes(skill.id)

            return (
              <Card
                key={`${skill.source}:${skill.id}`}
                className="h-full overflow-hidden border-border/70 bg-background py-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {sourceLabel(
                            skill.source,
                            productSourceLabel,
                            openAISourceLabel,
                            openClawSourceLabel,
                          )}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-[10px]',
                            compatibilityTierClassName(skill.compatibilityTier),
                          )}
                        >
                          {t('skills.marketplace.compatibilityBadge', {
                            tier: tierLabel(skill.compatibilityTier),
                            score: skill.compatibilityScore,
                          })}
                        </Badge>
                        {skill.builtIn ? (
                          <Badge variant="outline" className="text-[10px]">
                            {t('skills.marketplace.badge.builtIn')}
                          </Badge>
                        ) : null}
                        {skill.version ? (
                          <Badge variant="outline" className="text-[10px]">
                            v{skill.version}
                          </Badge>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => openDetails(skill)}
                        className="text-left"
                      >
                        <h4 className="font-semibold text-base leading-6 transition-colors hover:text-primary">
                          {skill.name}
                        </h4>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {skill.id}
                        </p>
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void toggleFavorite(skill.id)}
                      aria-label={
                        isFavorite
                          ? t('skills.marketplace.unfavoriteAction')
                          : t('skills.marketplace.favoriteAction')
                      }
                    >
                      <Heart
                        className={cn(
                          'size-4',
                          isFavorite && 'fill-current text-rose-500',
                        )}
                      />
                    </Button>
                  </div>

                  <p className="flex-1 text-muted-foreground text-sm leading-6">
                    {skill.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {isFavorite ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Heart className="size-3" />
                        {t('skills.marketplace.badge.favorite')}
                      </Badge>
                    ) : null}
                    {isRecent ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <History className="size-3" />
                        {t('skills.marketplace.badge.recent')}
                      </Badge>
                    ) : null}
                    {skill.installed ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {t('skills.marketplace.badge.installed')}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-border/60 border-t pt-3">
                    <button
                      type="button"
                      onClick={() => openDetails(skill)}
                      className="text-muted-foreground text-xs underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {t('skills.marketplace.details')}
                    </button>
                    {skill.installed ? (
                      <Badge variant="secondary">
                        {t('skills.marketplace.badge.installed')}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          onInstall({ source: skill.source, id: skill.id })
                        }
                        disabled={installingId === skill.id}
                      >
                        {installingId === skill.id
                          ? t('skills.marketplace.installing')
                          : t('skills.marketplace.install')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredSkills.length > pageSize ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {t('skills.marketplace.pageOf', { page, total: totalPages })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              {t('skills.marketplace.prev')}
            </Button>

            {pageNumbers[0] > 1 ? (
              <>
                <Button
                  size="sm"
                  variant={page === 1 ? 'default' : 'outline'}
                  onClick={() => setPage(1)}
                >
                  1
                </Button>
                {pageNumbers[0] > 2 ? (
                  <span className="px-1 text-muted-foreground text-sm">...</span>
                ) : null}
              </>
            ) : null}

            {pageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                size="sm"
                variant={page === pageNumber ? 'default' : 'outline'}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages ? (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 ? (
                  <span className="px-1 text-muted-foreground text-sm">...</span>
                ) : null}
                <Button
                  size="sm"
                  variant={page === totalPages ? 'default' : 'outline'}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            ) : null}

            <Button
              size="sm"
              variant={page < totalPages ? 'default' : 'outline'}
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              {t('skills.marketplace.next')}
            </Button>

            {page < totalPages ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                {t('skills.marketplace.loadMore')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog
        open={!!selectedSkill}
        onOpenChange={(open) => !open && setSelectedSkill(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border/70 bg-background/95">
          <DialogHeader>
            <DialogTitle>{selectedSkill?.name}</DialogTitle>
            <DialogDescription>{selectedSkill?.description}</DialogDescription>
          </DialogHeader>
          {selectedSkill ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {sourceLabel(
                    selectedSkill.source,
                    productSourceLabel,
                    openAISourceLabel,
                    openClawSourceLabel,
                  )}
                </Badge>
                <Badge
                  className={compatibilityTierClassName(
                    selectedSkill.compatibilityTier,
                  )}
                >
                  {t('skills.marketplace.compatibilityBadge', {
                    tier: tierLabel(selectedSkill.compatibilityTier),
                    score: selectedSkill.compatibilityScore,
                  })}
                </Badge>
                {selectedSkill.version ? (
                  <Badge variant="outline">v{selectedSkill.version}</Badge>
                ) : null}
                {selectedSkill.installed ? (
                  <Badge variant="secondary">
                    {t('skills.marketplace.badge.installed')}
                  </Badge>
                ) : null}
                {favorites.includes(selectedSkill.id) ? (
                  <Badge variant="outline">
                    {t('skills.marketplace.badge.favorite')}
                  </Badge>
                ) : null}
                {recent.includes(selectedSkill.id) ? (
                  <Badge variant="outline">
                    {t('skills.marketplace.badge.recent')}
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void toggleFavorite(selectedSkill.id)}
                >
                  <Heart className="mr-1.5 h-4 w-4" />
                  {favorites.includes(selectedSkill.id)
                    ? t('skills.marketplace.unfavoriteAction')
                    : t('skills.marketplace.favoriteAction')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText('skill-id', selectedSkill.id)}
                >
                  {copiedField === 'skill-id' ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  {t('skills.marketplace.copySkillId')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copyText('install-command', installCommand(selectedSkill))
                  }
                >
                  {copiedField === 'install-command' ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  {t('skills.marketplace.copyInstallCommand')}
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.compatibility')}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground text-sm leading-6">
                  {selectedSkill.compatibilityReasons.map((reason) => (
                    <li key={reason}>
                      {localizeCompatibilityReason(reason, t)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.installCommand')}
                </p>
                <p className="mt-1 font-mono text-muted-foreground text-xs">
                  {installCommand(selectedSkill)}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.frontmatter')}
                </p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-background p-3 text-xs leading-5">
                  {JSON.stringify(selectedSkill.frontmatterPreview, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.summary')}
                </p>
                <div className="mt-2 space-y-3 text-muted-foreground text-sm leading-6">
                  {selectedSkill.contentPreview.length > 0 ? (
                    selectedSkill.contentPreview.map((paragraph, index) => (
                      <p key={`${selectedSkill.id}-preview-${index}`}>
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p>{t('skills.marketplace.noSummary')}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.outline')}
                </p>
                {selectedSkill.outline.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground text-sm leading-6">
                    {selectedSkill.outline.map((heading) => (
                      <li key={`${selectedSkill.id}-heading-${heading}`}>
                        {heading}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted-foreground text-sm leading-6">
                    {t('skills.marketplace.noOutline')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4">
                <p className="font-medium text-sm">
                  {t('skills.marketplace.section.skillId')}
                </p>
                <p className="mt-1 font-mono text-muted-foreground text-xs">
                  {selectedSkill.id}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4 text-muted-foreground text-sm leading-6">
                {t('skills.marketplace.section.safety', {
                  product: PRODUCT_NAME,
                })}
              </div>

              {!selectedSkill.installed ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      onInstall({
                        source: selectedSkill.source,
                        id: selectedSkill.id,
                      })
                    }
                    disabled={installingId === selectedSkill.id}
                  >
                    {installingId === selectedSkill.id
                      ? t('skills.marketplace.installing')
                      : t('skills.marketplace.installSkill')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
