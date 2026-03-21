export type ChatMode = 'chat' | 'agent' | 'lobster'

export interface Suggestion {
  display: string
  prompt: string
  icon: string
}

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

export function getSuggestions(mode: ChatMode, t: Translate): Suggestion[] {
  if (mode === 'chat') {
    return [
      {
        display: t('chat.suggestion.chat.summarize.display'),
        prompt: t('chat.suggestion.chat.summarize.prompt'),
        icon: '✨',
      },
      {
        display: t('chat.suggestion.chat.topics.display'),
        prompt: t('chat.suggestion.chat.topics.prompt'),
        icon: '🔍',
      },
      {
        display: t('chat.suggestion.chat.comments.display'),
        prompt: t('chat.suggestion.chat.comments.prompt'),
        icon: '💬',
      },
    ]
  }

  if (mode === 'lobster') {
    return [
      {
        display: t('chat.suggestion.lobster.compare.display'),
        prompt: t('chat.suggestion.lobster.compare.prompt'),
        icon: '🦞',
      },
      {
        display: t('chat.suggestion.lobster.execute.display'),
        prompt: t('chat.suggestion.lobster.execute.prompt'),
        icon: '⚙️',
      },
      {
        display: t('chat.suggestion.lobster.tools.display'),
        prompt: t('chat.suggestion.lobster.tools.prompt'),
        icon: '🌐',
      },
    ]
  }

  return [
    {
      display: t('chat.suggestion.agent.upvote.display'),
      prompt: t('chat.suggestion.agent.upvote.prompt'),
      icon: '❤️',
    },
    {
      display: t('chat.suggestion.agent.github.display'),
      prompt: t('chat.suggestion.agent.github.prompt'),
      icon: '⭐',
    },
    {
      display: t('chat.suggestion.agent.amazon.display'),
      prompt: t('chat.suggestion.agent.amazon.prompt'),
      icon: '🛒',
    },
  ]
}
