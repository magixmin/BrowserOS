import { Bot, Check, ChevronUp, MessageSquare, MousePointer2 } from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n/useI18n'
import { cn } from '@/lib/utils'
import type { ChatMode } from './chatTypes'

interface ChatModeToggleProps {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
}

export const ChatModeToggle: FC<ChatModeToggleProps> = ({
  mode,
  onModeChange,
}) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const modes: Array<{
    id: ChatMode
    label: string
    icon: typeof MessageSquare
    title: string
  }> = [
    {
      id: 'chat',
      label: t('mode.chat.label'),
      icon: MessageSquare,
      title: t('mode.chat.title'),
    },
    {
      id: 'agent',
      label: t('mode.agent.label'),
      icon: MousePointer2,
      title: t('mode.agent.title'),
    },
    {
      id: 'lobster',
      label: t('mode.lobster.label'),
      icon: Bot,
      title: t('mode.lobster.title'),
    },
  ]

  const currentMode = modes.find((entry) => entry.id === mode) ?? modes[0]
  const CurrentIcon = currentMode.icon

  const handleSelectMode = (nextMode: ChatMode) => {
    setOpen(false)
    if (nextMode !== mode) {
      onModeChange(nextMode)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-w-[7.25rem] items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-left transition-colors hover:bg-accent/60',
            open && 'bg-accent/70',
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          title={currentMode.title}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-orange)]/12 text-[var(--accent-orange)]">
              <CurrentIcon className="h-3 w-3" />
            </span>
            <span className="min-w-0 truncate font-medium text-foreground text-sm">
              {currentMode.label}
            </span>
          </span>
          <ChevronUp
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-[19rem] rounded-2xl border border-border/70 p-2"
      >
        <div className="px-2 pb-2 pt-1">
          <p className="font-medium text-foreground text-sm">
            {t('mode.selector.title')}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('mode.selector.description')}
          </p>
        </div>

        <div className="space-y-1">
          {modes.map((entry) => {
            const Icon = entry.icon
            const isActive = mode === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleSelectMode(entry.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-[var(--accent-orange)]/10 text-foreground'
                    : 'hover:bg-accent/60',
                )}
                title={entry.title}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    isActive
                      ? 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm">
                    {entry.label}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {entry.title}
                  </span>
                </span>

                {isActive && (
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--accent-orange)]" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
