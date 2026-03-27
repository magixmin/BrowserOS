import type { SearchProviders } from './SearchProviders'
interface SearchSuggestionsResponse {
  suggestions?: string[]
  error?: string
}

export const getSearchSuggestions = async ([searchEngine, query]: [
  searchEngine: SearchProviders,
  query: string,
]): Promise<string[]> => {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'get-search-suggestions',
      searchEngine,
      query,
    })) as SearchSuggestionsResponse | undefined

    if (response?.error) {
      console.warn(`Failed to fetch search suggestions: ${response.error}`)
    }

    return response?.suggestions ?? []
  } catch {
    return []
  }
}
