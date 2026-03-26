// PUT /api/apps/temporary-voice-channels/config
// Saves updated app config. Accessible to moderators and above.

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (typeof body !== 'object' || body === null) {
    throw createError({ statusCode: 400, message: 'Invalid request body.' })
  }
  await event.context.guildora.saveConfig(body as Record<string, unknown>)
  return { ok: true }
})
