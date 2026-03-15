// Bot hook handlers for Community Points.
// All hooks declared in manifest.botHooks must be exported here.
// The NewGuild host calls these functions when the corresponding events fire.

import type { BotContext, VoiceActivityPayload, RoleChangePayload } from '@newguild/app-sdk'

/**
 * onVoiceActivity — fires when a member joins, leaves, or moves in voice.
 *
 * We award points when a member leaves a voice channel, based on how long
 * they were in there and the guild's configured rate.
 */
export async function onVoiceActivity(payload: VoiceActivityPayload, ctx: BotContext) {
  // Only award points when the member leaves (or moves away), and we know the duration
  if ((payload.action === 'leave' || payload.action === 'move') && payload.durationSeconds) {
    const pointsPerMinute = (ctx.config.pointsPerMinute as number) ?? 1
    const earned = Math.floor(payload.durationSeconds / 60) * pointsPerMinute

    // Only write to DB if they actually earned something
    if (earned > 0) {
      const current = ((await ctx.db.get(`points:${payload.memberId}`)) as number) ?? 0
      await ctx.db.set(`points:${payload.memberId}`, current + earned)
    }
  }
}

/**
 * onRoleChange — fires when a member's roles are updated.
 *
 * We use this to automatically assign the top-tier role to the leaderboard
 * top 3 members. In practice you would do this via a scheduled task, but
 * a role change event is a good moment to re-evaluate rankings.
 */
export async function onRoleChange(payload: RoleChangePayload, ctx: BotContext) {
  // Example: remove old tier roles from the member if they were just demoted
  const tierRoles = ['bronze', 'silver', 'gold']
  const topTier = (ctx.config.topTier as string) ?? 'gold'

  // If a tier role was removed and they no longer have points, clean up
  const hadTierRole = payload.removedRoles.some((r) => tierRoles.includes(r))
  if (hadTierRole) {
    // Nothing to do in this example — role removal is handled externally
  }

  // If they just received a tier role, log it (or send a congrats message)
  const gainedTopTier = payload.addedRoles.includes(topTier)
  if (gainedTopTier) {
    // In a real app you might send a congratulations message here
    // await ctx.bot.sendMessage(announcementChannelId, `Congrats ${memberId}!`)
  }
}
