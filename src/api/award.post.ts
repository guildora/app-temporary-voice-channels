// POST /api/apps/community-points/award
// Awards points to a member. Restricted to moderators.
// Access: requiredRoles: ["moderator"] (enforced by host before this runs)
//
// Request body: { targetUserId: string, amount: number }
// Response:     { success: true, newTotal: number }

export default defineEventHandler(async (event) => {
  const { userRoles, db } = event.context.newguild

  // Double-check role even though the manifest already enforces it.
  // Defense in depth: reject if somehow the host check was bypassed.
  const allowed = ['moderator', 'admin', 'superadmin']
  if (!userRoles.some((r) => allowed.includes(r))) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Parse and validate the request body
  const body = await readBody(event)

  if (!body || typeof body.targetUserId !== 'string' || !body.targetUserId.trim()) {
    throw createError({ statusCode: 400, message: 'targetUserId is required' })
  }

  if (typeof body.amount !== 'number' || body.amount <= 0 || !Number.isInteger(body.amount)) {
    throw createError({ statusCode: 400, message: 'amount must be a positive integer' })
  }

  const { targetUserId, amount } = body as { targetUserId: string; amount: number }

  // Cap award amount to prevent accidental large grants
  const MAX_AWARD = 10_000
  if (amount > MAX_AWARD) {
    throw createError({ statusCode: 400, message: `amount cannot exceed ${MAX_AWARD}` })
  }

  // Read current balance, add award, write back
  const current = (await db.get(`points:${targetUserId}`)) ?? 0
  const newTotal = (current as number) + amount
  await db.set(`points:${targetUserId}`, newTotal)

  return { success: true, newTotal }
})
