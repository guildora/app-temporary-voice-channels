import { loadTempVoiceConfig } from '../bot/configLoader'

// GET /api/apps/voice-rooms/overview
// Returns app-level runtime state for user-facing pages.

export default defineEventHandler(async (event) => {
  const { config, db } = event.context.guildora
  const runtimeConfig = loadTempVoiceConfig(config as Record<string, unknown>)

  const index = await db.get('tempvc:managed-index')
  const managedChannels = Array.isArray(index) ? index.length : 0

  return {
    appActive: runtimeConfig.enabled,
    managedChannels,
    lobbyConfigured: Boolean(runtimeConfig.lobbyChannelId),
    categoryConfigured: Boolean(runtimeConfig.temporaryVoiceCategoryId)
  }
})
