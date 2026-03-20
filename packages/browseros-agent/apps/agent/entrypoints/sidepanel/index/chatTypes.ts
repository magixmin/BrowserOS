export type ChatMode = 'chat' | 'agent' | 'lobster'

export interface Suggestion {
  display: string
  prompt: string
  icon: string
}

export const CHAT_SUGGESTIONS: Suggestion[] = [
  {
    display: 'Summarize this page',
    prompt: 'Read the current tab and summarize it in bullet points',
    icon: '✨',
  },
  {
    display: 'What topics does this page talk about?',
    prompt:
      'Read the current tab and briefly describe what it is about in 1-2 lines',
    icon: '🔍',
  },
  {
    display: 'Extract comments from this page',
    prompt: 'Read the current tab and extract comments as bullet points',
    icon: '💬',
  },
]

export const AGENT_SUGGESTIONS: Suggestion[] = [
  {
    display: 'Read about our vision and upvote',
    prompt:
      'Go to https://dub.sh/browseros-launch in current tab. Find and click the upvote button',
    icon: '❤️',
  },
  {
    display: 'Support BrowserOS on Github',
    prompt:
      'Go to http://git.new/browseros in current tab and star the repository',
    icon: '⭐',
  },
  {
    display: 'Open amazon.com and order Sensodyne toothpaste',
    prompt:
      'Open amazon.com in current tab and add sensodyne toothpaste to cart',
    icon: '🛒',
  },
]

export const LOBSTER_SUGGESTIONS: Suggestion[] = [
  {
    display: 'Search, compare, and recommend',
    prompt:
      'Search the web for the best options, compare them, and give me a recommendation with reasoning.',
    icon: '🦞',
  },
  {
    display: 'Research and execute the task',
    prompt:
      'Research what is needed, make a plan, use the browser to do the work, then summarize the result.',
    icon: '⚙️',
  },
  {
    display: 'Use BrowserOS tools end-to-end',
    prompt:
      'Use BrowserOS browser tools to search, gather evidence, and complete the task step by step.',
    icon: '🌐',
  },
]
