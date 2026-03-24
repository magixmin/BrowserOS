import { AlertCircle, Loader2 } from 'lucide-react'
import type { FC } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PRODUCT_NAME } from '@/lib/constants/product'
import { useI18n } from '@/lib/i18n/useI18n'
import { SkillMarketplaceSection } from './SkillMarketplaceSection'
import { useSkillCatalog } from './useSkillCatalog'

export const SkillsMarketplacePage: FC = () => {
  const { t } = useI18n()
  const { skills, installSkill, installing, isLoading, error, refetch } =
    useSkillCatalog()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t('skills.marketplace.title')}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10 text-muted-foreground shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading marketplace...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="rounded-2xl shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load marketplace</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <SkillMarketplaceSection
          skills={skills}
          installingId={installing}
          onInstall={async (input) => {
            try {
              await installSkill(input)
              toast.success(
                t('skills.marketplace.toast.installed', { id: input.id }),
              )
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : t('skills.marketplace.toast.installFailed'),
              )
            }
          }}
        />
      )}
    </div>
  )
}
