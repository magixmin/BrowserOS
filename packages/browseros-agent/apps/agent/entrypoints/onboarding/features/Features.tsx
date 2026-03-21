import {
  ArrowDown,
  ArrowRight,
  BookOpenText,
  Bot,
  Code2,
  FolderOpen,
  GitBranch,
  LinkIcon,
  Plug,
  SplitSquareHorizontal,
} from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import DiscordLogo from '@/assets/discord-logo.svg'
import GithubLogo from '@/assets/github-logo.svg'
import SlackLogo from '@/assets/slack-logo.svg'
import { PillIndicator } from '@/components/elements/pill-indicator'
import { Button } from '@/components/ui/button'
import {
  AGENT_MODE_DEMO_URL,
  AGENTIC_CODING_DEMO_URL,
  BROWSER_OS_INTRO_VIDEO_URL,
  COWORK_DEMO_URL,
  MCP_SERVER_DEMO_URL,
  SPLIT_VIEW_GIF_URL,
  WORKFLOWS_DEMO_URL,
} from '@/lib/constants/mediaUrls'
import {
  discordUrl,
  docsUrl,
  productRepositoryUrl,
  slackUrl,
} from '@/lib/constants/productUrls'
import { PRODUCT_NAME } from '@/lib/constants/product'
import { useI18n } from '@/lib/i18n/useI18n'
import { cn } from '@/lib/utils'
import { BentoCard, type Feature } from './BentoCard'
import { VideoFrame } from './VideoFrame'

const getFeatures = (
  t: (key: string, params?: Record<string, string | number>) => string,
): Feature[] => [
  {
    id: 'agent',
    Icon: Bot,
    tag: t('features.agent.tag'),
    title: t('features.agent.title'),
    description: t('features.agent.description', { product: PRODUCT_NAME }),
    detailedDescription: t('features.agent.detail', {
      product: PRODUCT_NAME,
    }),
    highlights: [
      t('features.agent.highlight1'),
      t('features.agent.highlight2'),
      t('features.agent.highlight3'),
      t('features.agent.highlight4'),
      t('features.agent.highlight5'),
    ],
    videoDuration: '2:22',
    gridClass: 'md:col-span-2',
    videoUrl: AGENT_MODE_DEMO_URL,
  },
  {
    id: 'mcp-server',
    Icon: Plug,
    tag: t('features.mcp.tag'),
    title: t('features.mcp.title', { product: PRODUCT_NAME }),
    description: t('features.mcp.description'),
    detailedDescription: t('features.mcp.detail', {
      product: PRODUCT_NAME,
    }),
    highlights: [
      t('features.mcp.highlight1'),
      t('features.mcp.highlight2'),
      t('features.mcp.highlight3'),
      t('features.mcp.highlight4'),
    ],
    videoDuration: '1:40',
    gridClass: 'md:col-span-1',
    videoUrl: MCP_SERVER_DEMO_URL,
  },
  {
    id: 'workflows',
    Icon: GitBranch,
    tag: t('features.workflows.tag'),
    title: t('features.workflows.title'),
    description: t('features.workflows.description'),
    detailedDescription: t('features.workflows.detail'),
    highlights: [
      t('features.workflows.highlight1'),
      t('features.workflows.highlight2'),
      t('features.workflows.highlight3'),
      t('features.workflows.highlight4'),
    ],
    gridClass: 'md:col-span-1',
    videoUrl: WORKFLOWS_DEMO_URL || undefined,
  },
  {
    id: 'cowork',
    Icon: FolderOpen,
    tag: t('features.cowork.tag'),
    title: t('features.cowork.title'),
    description: t('features.cowork.description'),
    detailedDescription: t('features.cowork.detail'),
    highlights: [
      t('features.cowork.highlight1'),
      t('features.cowork.highlight2'),
      t('features.cowork.highlight3'),
      t('features.cowork.highlight4'),
    ],
    gridClass: 'md:col-span-2',
    videoUrl: COWORK_DEMO_URL || undefined,
  },
  {
    id: 'split-view',
    Icon: SplitSquareHorizontal,
    tag: t('features.split.tag'),
    title: t('features.split.title'),
    description: t('features.split.description'),
    detailedDescription: t('features.split.detail'),
    highlights: [
      t('features.split.highlight1'),
      t('features.split.highlight2'),
      t('features.split.highlight3'),
      t('features.split.highlight4'),
    ],
    gridClass: 'md:col-span-2',
    gifUrl: SPLIT_VIEW_GIF_URL,
  },
  {
    id: 'agentic-coding',
    Icon: Code2,
    tag: t('features.coding.tag'),
    title: t('features.coding.title'),
    description: t('features.coding.description'),
    detailedDescription: t('features.coding.detail', {
      product: PRODUCT_NAME,
    }),
    highlights: [
      t('features.coding.highlight1'),
      t('features.coding.highlight2'),
      t('features.coding.highlight3'),
      t('features.coding.highlight4'),
    ],
    gridClass: 'md:col-span-1',
    videoUrl: AGENTIC_CODING_DEMO_URL || undefined,
  },
]

/**
 * @public
 */
export const FeaturesPage: FC = () => {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const features = getFeatures(t)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleStart = async () => {
    const newtabUrl = chrome.runtime.getURL('app.html')
    const [currentTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })
    await chrome.tabs.create({ url: newtabUrl })
    if (currentTab.id) {
      await chrome.tabs.remove(currentTab.id)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative border-border/40 border-b">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="space-y-8 text-center">
            {/* Header */}
            <div className="space-y-6">
              <PillIndicator
                text={t('features.welcome')}
                className={`transition-all delay-100 duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              />

              <div className="space-y-4">
                <h1
                  className={cn(
                    'font-bold text-4xl leading-tight tracking-tight md:text-5xl',
                    'transition-all delay-200 duration-700 md:text-7xl',
                    mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
                  )}
                >
                  {t('features.heroTitle', { product: PRODUCT_NAME })}
                </h1>
                <p
                  className={cn(
                    'mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed',
                    'transition-all delay-300 duration-700',
                    mounted
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0',
                  )}
                >
                  {t('features.heroSubtitle', { product: PRODUCT_NAME })}
                </p>
              </div>
            </div>

            {/* Centered Large Video */}
            <VideoFrame
              title="browseros.com/demo"
              className={cn(
                'transition-all delay-500 duration-700',
                mounted
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0',
              )}
            >
              <video
                className="h-full w-full"
                src={BROWSER_OS_INTRO_VIDEO_URL}
                title={t('features.heroVideoTitle', { product: PRODUCT_NAME })}
                autoPlay
                muted
                loop
                playsInline
                controls
              />
            </VideoFrame>
          </div>
        </div>

        <div
          className={cn(
            'animation-duration-[3s] absolute bottom-0.5 left-1/2 flex -translate-x-1/2 animate-bounce flex-col items-center gap-3',
            'transition-opacity delay-[2000ms] duration-700',
            mounted ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="text-center">
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              {t('features.scroll')}
            </p>
            <ArrowDown className="mx-auto h-6 w-6 text-[var(--accent-orange)]" />
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mb-12 space-y-3 text-center">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
            {t('features.sectionTitle')}
          </p>
          <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
            {t('features.exploreTitle')}{' '}
            <span className="text-[var(--accent-orange)]">Possible</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t('features.exploreSubtitle')}
          </p>
        </div>

        {/* Bento Grid */}
        {mounted && (
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <BentoCard
                key={feature.id}
                feature={feature}
                mounted={mounted}
                index={index}
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            {`💡 ${t('features.cardTip')}`}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-border/40 border-y px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <LinkIcon className="h-6 w-6 text-[var(--accent-orange)]" />
            <h2 className="font-bold text-3xl">
              {t('features.communityTitle', { product: PRODUCT_NAME })}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Discord */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="community-card group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-[var(--accent-orange)]/50 hover:bg-card/80 hover:shadow-[var(--accent-orange)]/5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg transition-all group-hover:scale-110">
                <img
                  src={DiscordLogo}
                  className="h-full w-full"
                  alt="discord-logo"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg transition-colors group-hover:text-[var(--accent-orange)]">
                  {t('features.community.discord')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('features.community.feedback')}
                </p>
              </div>
            </a>

            {/* Slack */}
            <a
              href={slackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="community-card group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-[var(--accent-orange)]/50 hover:bg-card/80 hover:shadow-[var(--accent-orange)]/5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg transition-all group-hover:scale-110">
                <img
                  src={SlackLogo}
                  className="h-full w-full"
                  alt="slack-logo"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg transition-colors group-hover:text-[var(--accent-orange)]">
                  {t('features.community.slack')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('features.community.feedback')}
                </p>
              </div>
            </a>

            {/* GitHub */}
            <a
              href={productRepositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="community-card group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-[var(--accent-orange)]/50 hover:bg-card/80 hover:shadow-[var(--accent-orange)]/5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground/10 transition-all group-hover:scale-110 group-hover:bg-foreground/20">
                <img
                  src={GithubLogo}
                  className="h-full w-full"
                  alt="github-logo"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg transition-colors group-hover:text-[var(--accent-orange)]">
                  {t('features.community.github')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('features.community.star')}
                </p>
              </div>
            </a>

            {/* Documentation */}
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="community-card group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-[var(--accent-orange)]/50 hover:bg-card/80 hover:shadow-[var(--accent-orange)]/5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-orange)]/10 transition-all group-hover:scale-110 group-hover:bg-[var(--accent-orange)]/20">
                <BookOpenText className="h-6 w-6 text-[var(--accent-orange)]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg transition-colors group-hover:text-[var(--accent-orange)]">
                  {t('features.community.docs')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('features.community.learn')}
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-56">
        <div className="space-y-4 text-center">
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-[var(--accent-orange)] text-white shadow-[var(--accent-orange)]/25 shadow-lg hover:bg-[var(--accent-orange)]/90"
          >
            {t('features.startUsing', { product: PRODUCT_NAME })}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  )
}
