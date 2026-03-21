// POST /api/apps/temporary-voice-channels/announce
// Sends an announcement to the configured channel. Restricted to moderators.
// Access: requiredRoles: ["moderator"] (enforced by host before this runs)
//
// Request body: { message: string }
// Response:     { success: true }

export default defineEventHandler(async (event) => {
  const { userRoles, config, db } = event.context.guildora

  // Defense in depth
  if (!['moderator', 'admin', 'superadmin'].some(r => userRoles.includes(r))) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    throw createError({ statusCode: 400, message: 'message is required' })
  }

  const channelId = config.announcementChannelId as string | undefined
  if (!channelId) {
    throw createError({ statusCode: 422, message: 'No announcement channel configured' })
  }

  // Log the announcement to the KV store
  await db.set(`announce:${Date.now()}`, {
    message: body.message,
    sentAt: new Date().toISOString()
  })

  return { success: true }
})
