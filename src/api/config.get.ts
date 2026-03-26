import { loadTempVoiceConfig } from '../bot/configLoader'

// GET /api/apps/temporary-voice-channels/config
// Returns normalized app config values. Accessible to moderators and above.

export default defineEventHandler(async (event) => {
  const normalized = loadTempVoiceConfig(event.context.guildora.config as Record<string, unknown>)

  return {
    // Backward-compatible aliases for the starter admin page.
    welcomeEnabled: normalized.enabled,
    welcomeMessage: normalized.defaultChannelName,
    announcementChannelId: normalized.lobbyChannelId || null,

    enabled: normalized.enabled,
    lobbyChannelId: normalized.lobbyChannelId,
    temporaryVoiceCategoryId: normalized.temporaryVoiceCategoryId,
    defaultChannelIcon: normalized.defaultChannelIcon,
    defaultChannelName: normalized.defaultChannelName,
    maxManagedChannels: normalized.maxManagedChannels,
    renameEnabled: normalized.renameEnabled,
    activityTrackingEnabled: normalized.activityTrackingEnabled
  }
})
