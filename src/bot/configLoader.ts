export interface TempVoiceConfig {
  enabled: boolean
  lobbyChannelId: string
  temporaryVoiceCategoryId: string
  defaultChannelIcon: string
  defaultChannelName: string
  maxManagedChannels: number
  renameEnabled: boolean
  activityTrackingEnabled: boolean
}

const DEFAULT_MAX_MANAGED_CHANNELS = 50
const DEFAULT_CHANNEL_ICON = '🔵'
const DEFAULT_CHANNEL_NAME = 'Voice Room'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  const parsed = Math.floor(value)
  return parsed > 0 ? parsed : fallback
}

export function loadTempVoiceConfig(rawConfig: Record<string, unknown> | undefined): TempVoiceConfig {
  const config = rawConfig ?? {}

  return {
    enabled: asBoolean(config.enabled, true),
    lobbyChannelId: asString(config.lobbyChannelId),
    temporaryVoiceCategoryId: asString(config.temporaryVoiceCategoryId),
    defaultChannelIcon: asString(config.defaultChannelIcon, DEFAULT_CHANNEL_ICON) || DEFAULT_CHANNEL_ICON,
    defaultChannelName: asString(config.defaultChannelName, DEFAULT_CHANNEL_NAME) || DEFAULT_CHANNEL_NAME,
    maxManagedChannels: asPositiveInteger(config.maxManagedChannels, DEFAULT_MAX_MANAGED_CHANNELS),
    renameEnabled: asBoolean(config.renameEnabled, true),
    activityTrackingEnabled: asBoolean(config.activityTrackingEnabled, true)
  }
}
