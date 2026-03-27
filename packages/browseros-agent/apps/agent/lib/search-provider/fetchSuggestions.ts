import type { SearchProviders } from '@/entrypoints/newtab/index/lib/searchSuggestions/SearchProviders'

interface YahooSuggestionItem {
  key: string
}

async function getGoogleSuggestions(query: string): Promise<string[]> {
  const response = await fetch(
    `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
  )
  const data = await response.json()
  return data[1] || []
}

async function getBingSuggestions(query: string): Promise<string[]> {
  const response = await fetch(
    `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
  )
  const data = await response.json()
  return data[1] || []
}

async function getYahooIndiaSuggestions(query: string): Promise<string[]> {
  const response = await fetch(
    `https://in.search.yahoo.com/sugg/gossip/gossip-in-loc/?command=${encodeURIComponent(query)}&output=json`,
  )
  const data = await response.json()
  return data.gossip.results.map((item: YahooSuggestionItem) => item.key) || []
}

async function getDuckDuckGoSuggestions(query: string): Promise<string[]> {
  const response = await fetch(
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
  )
  const data = await response.json()
  return data[1] || []
}

async function getBraveSuggestions(query: string): Promise<string[]> {
  const response = await fetch(
    `https://search.brave.com/api/suggest?q=${encodeURIComponent(query)}`,
  )
  const data = await response.json()
  return data[1] || []
}

export async function fetchSearchSuggestions(
  searchEngine: SearchProviders,
  query: string,
): Promise<string[]> {
  switch (searchEngine) {
    case 'google':
      return getGoogleSuggestions(query)
    case 'bing':
      return getBingSuggestions(query)
    case 'yahoo':
      return getYahooIndiaSuggestions(query)
    case 'duckduckgo':
      return getDuckDuckGoSuggestions(query)
    case 'brave':
      return getBraveSuggestions(query)
    default:
      return []
  }
}
