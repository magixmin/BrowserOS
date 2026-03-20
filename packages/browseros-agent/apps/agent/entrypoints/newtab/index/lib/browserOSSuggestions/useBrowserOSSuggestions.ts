/**
 * @public
 */
export interface BrowserOSSuggestion {
  mode: 'chat' | 'agent' | 'lobster'
  message: string
}

/**
 * @public
 */
export const useBrowserOSSuggestions = ({
  query,
}: {
  query: string
}): BrowserOSSuggestion[] => {
  return [
    {
      mode: 'agent',
      message: query,
    },
  ]
}
