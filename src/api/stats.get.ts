// GET /api/apps/community-points/stats
// Returns the current user's points and a leaderboard preview.
// Access: requiredRoles: ["user"] (enforced by host before this runs)

export default defineEventHandler(async (event) => {
  const { userId, db } = event.context.newguild

  // Read query param to decide how much leaderboard data to return
  const query = getQuery(event)
  const fullLeaderboard = query.leaderboard === 'full'

  // Get all points entries from the KV store
  const allEntries = await db.list('points:')

  // Build sorted leaderboard
  const leaderboard = allEntries
    .map((entry) => ({
      memberId: entry.key.replace('points:', ''),
      displayName: entry.key.replace('points:', ''), // In a real app, look up display name
      points: entry.value as number,
      isCurrentUser: entry.key === `points:${userId}`,
    }))
    .sort((a, b) => b.points - a.points)

  // Current user's stats
  const myPoints = (await db.get(`points:${userId}`)) ?? 0
  const myRank = leaderboard.findIndex((e) => e.memberId === userId) + 1

  return {
    myPoints,
    myRank: myRank > 0 ? myRank : null,
    // Full leaderboard for the leaderboard page, top 5 for the overview
    leaderboard: fullLeaderboard ? leaderboard : undefined,
    topMembers: fullLeaderboard ? undefined : leaderboard.slice(0, 5),
  }
})
