// PUT /api/apps/voice-rooms/config
// Saves updated app config. Accessible to moderators and above.
// Validates known config fields before persisting to prevent injection of
// arbitrary keys and ensure type safety.

import { asString, asBoolean } from '../bot/configLoader'

const VALID_COUNTING_STYLES = new Set(['numeric', 'emoji'])

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (typeof body !== 'object' || body === null) {
    throw createError({ statusCode: 400, message: 'Invalid request body.' })
  }

  // Validate known fields from the manifest configFields
  const sanitized: Record<string, unknown> = {}

  if ('enabled' in body) {
    sanitized.enabled = asBoolean(body.enabled, true)
  }
  if ('renameEnabled' in body) {
    sanitized.renameEnabled = asBoolean(body.renameEnabled, true)
  }
  if ('maxManagedChannels' in body) {
    const raw = Number(body.maxManagedChannels)
    sanitized.maxManagedChannels = Math.floor(Math.min(Math.max(raw || 50, 1), 500))
  }
  if ('countingStyle' in body) {
    const raw = asString(body.countingStyle, 'numeric')
    sanitized.countingStyle = VALID_COUNTING_STYLES.has(raw) ? raw : 'numeric'
  }
  if ('lobbyChannelId' in body) {
    sanitized.lobbyChannelId = asString(body.lobbyChannelId)
  }
  if ('temporaryVoiceCategoryId' in body) {
    sanitized.temporaryVoiceCategoryId = asString(body.temporaryVoiceCategoryId)
  }
  if ('defaultChannelIcon' in body) {
    const val = asString(body.defaultChannelIcon)
    if (val) sanitized.defaultChannelIcon = val
  }
  if ('defaultChannelName' in body) {
    const val = asString(body.defaultChannelName)
    if (val) sanitized.defaultChannelName = val
  }

  await event.context.guildora.saveConfig(sanitized)
  return { ok: true }
})
