import { Bot, MessageSquare, MousePointer2, Sparkles } from 'lucide-react'
import type { FC } from 'react'
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
  const modes: Array<{
    id: ChatMode
    label: string
    icon: typeof MessageSquare
    title: string
  }> = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      title: 'Read-only page chat',
    },
    {
      id: 'agent',
      label: 'Agent',
      icon: MousePointer2,
      title: 'Full browser automation',
    },
    {
      id: 'lobster',
      label: 'Lobster',
      icon: Sparkles,
      title: 'High-agency browser operator',
    },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 p-1">
      {modes.map((entry) => {
        const Icon = entry.icon
        const isActive = mode === entry.id
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onModeChange(entry.id)}
            title={entry.title}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-xs transition-all',
              isActive
                ? entry.id === 'chat'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'bg-[var(--accent-orange)]/12 text-[var(--accent-orange)] shadow-sm'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
          >
            {entry.id === 'agent' ? (
              <MousePointer2 className="h-3 w-3" />
            ) : entry.id === 'lobster' ? (
              <Bot className="h-3 w-3" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            <span>{entry.label}</span>
          </button>
        )
      })}
    </div>
  )
}
