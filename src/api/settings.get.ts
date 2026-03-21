// GET /api/apps/temporary-voice-channels/settings
// Returns aggregate app statistics. Restricted to admins.

export default defineEventHandler(async (event) => {
  const { userRoles, db } = event.context.guildora

  if (!['admin', 'superadmin'].some((role) => userRoles.includes(role))) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const managedIndex = await db.get('tempvc:managed-index')
  const managedChannels = Array.isArray(managedIndex) ? managedIndex.length : 0

  const trackedTotals = await db.list('tempvc:activity:total:')
  const totalTrackedSeconds = trackedTotals.reduce((sum, entry) => {
    const value = typeof entry.value === 'number' ? entry.value : 0
    return sum + value
  }, 0)

  return {
    version: '1.0.0',
    // Backward-compatible alias for the starter admin page.
    totalMembers: trackedTotals.length,
    managedChannels,
    trackedMembers: trackedTotals.length,
    totalTrackedSeconds
  }
})
