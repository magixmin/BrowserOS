import { storage } from '@wxt-dev/storage'

export const favoriteMarketplaceSkillsStorage = storage.defineItem<string[]>(
  'local:favorite-marketplace-skills',
  { fallback: [] },
)

export const recentMarketplaceSkillsStorage = storage.defineItem<string[]>(
  'local:recent-marketplace-skills',
  { fallback: [] },
)
