# 04 — Bot Integration

## Overview

The bot processes guild events and slash commands. Your app can react to events by exporting handlers from `src/bot/hooks.ts`, and register Discord slash commands via `manifest.botCommands`.

All hooks receive a typed payload and a `BotContext`.

## hooks.ts Structure

```typescript
// src/bot/hooks.ts
import type { BotContext, VoiceActivityPayload, RoleChangePayload, MemberJoinPayload, InteractionPayload } from '@guildora/app-sdk'

// Only export handlers for events listed in manifest.botHooks
export async function onVoiceActivity(payload: VoiceActivityPayload, ctx: BotContext) { }
export async function onRoleChange(payload: RoleChangePayload, ctx: BotContext) { }
export async function onMemberJoin(payload: MemberJoinPayload, ctx: BotContext) { }
export async function onInteraction(payload: InteractionPayload, ctx: BotContext) { }
```

**Important**: Export only the hooks you've declared in `manifest.botHooks`. Exporting undeclared hooks is ignored but considered bad practice.

## BotContext

```typescript
interface BotContext {
  guildId: string
  config: Record<string, any>   // configField values for this guild
  db: AppDb                      // guild-scoped KV store
  bot: BotClient                 // bot API client
}
```

## BotClient

```typescript
interface BotClient {
  sendMessage(channelId: string, content: string): Promise<void>
  addRole(memberId: string, roleId: string): Promise<void>
  removeRole(memberId: string, roleId: string): Promise<void>
  getMember(memberId: string): Promise<Member>
}
```

## Hook Types

### onVoiceActivity

Fires when a member joins, leaves, or moves between voice channels.

```typescript
interface VoiceActivityPayload {
  memberId: string
  action: 'join' | 'leave' | 'move'
  channelId: string
  previousChannelId?: string  // only on 'move'
  durationSeconds?: number    // only on 'leave' and 'move'
}

export async function onVoiceActivity(payload: VoiceActivityPayload, ctx: BotContext) {
  if (payload.action === 'leave' && payload.durationSeconds) {
    const rate = ctx.config.pointsPerMinute ?? 1
    const earned = Math.floor(payload.durationSeconds / 60) * rate
    if (earned > 0) {
      const current = await ctx.db.get(`points:${payload.memberId}`) ?? 0
      await ctx.db.set(`points:${payload.memberId}`, current + earned)
    }
  }
}
```

### onRoleChange

Fires when a member's roles are updated.

```typescript
interface RoleChangePayload {
  memberId: string
  addedRoles: string[]
  removedRoles: string[]
  allRoles: string[]  // complete list of roles after the change
}

export async function onRoleChange(payload: RoleChangePayload, ctx: BotContext) {
  if (payload.addedRoles.includes('verified')) {
    // Grant welcome bonus
    const bonus = ctx.config.joinBonus ?? 100
    const current = await ctx.db.get(`points:${payload.memberId}`) ?? 0
    await ctx.db.set(`points:${payload.memberId}`, current + bonus)
  }
}
```

### onMessage

Fires when a message is sent in a text channel.

```typescript
interface MessagePayload {
  memberId: string
  channelId: string
  messageId: string
  content: string
}

export async function onMessage(payload: MessagePayload, ctx: BotContext) {
  // Example: command handling
  if (payload.content === '!points') {
    const points = await ctx.db.get(`points:${payload.memberId}`) ?? 0
    await ctx.bot.sendMessage(payload.channelId, `You have ${points} points.`)
  }
}
```

### onMemberJoin

Fires when a new member joins the guild.

```typescript
interface MemberJoinPayload {
  memberId: string
  joinedAt: string  // ISO 8601 date string
}

export async function onMemberJoin(payload: MemberJoinPayload, ctx: BotContext) {
  const welcome = ctx.config.welcomeMessage ?? 'Welcome!'
  // Note: you need to know the welcome channel ID — store it in config or hardcode
  const channelId = ctx.config.welcomeChannelId
  if (channelId) {
    const member = await ctx.bot.getMember(payload.memberId)
    await ctx.bot.sendMessage(channelId, welcome.replace('{username}', member.displayName))
  }
}
```

### onInteraction

Fires when a user runs one of the app's slash commands (declared in `manifest.botCommands`). Declare `"onInteraction"` in `manifest.botHooks` to receive these events.

```typescript
interface InteractionPayload {
  commandName: string   // name of the slash command that was invoked
  memberId: string
  guildId: string
  channelId: string
}

export async function onInteraction(payload: InteractionPayload, ctx: BotContext) {
  if (payload.commandName === 'my-command') {
    const channelId = ctx.config.announcementChannelId
    if (channelId) {
      await ctx.bot.sendMessage(channelId, `/${payload.commandName} used by <@${payload.memberId}>`)
    }
  }
}
```

**Note**: The bot replies ephemerally to acknowledge the command automatically. Your `onInteraction` handler runs as a fire-and-forget side effect — do not attempt to reply to the interaction from the hook.

## Slash Commands

Declare slash commands in `manifest.botCommands` (see [02-manifest.md](./02-manifest.md#botcommands)). Commands are deployed to Discord automatically on app activation/deactivation and on bot startup.

To handle a command, declare `"onInteraction"` in `manifest.botHooks` and export an `onInteraction` handler in `src/bot/hooks.ts`.

## DB Patterns

The KV store is guild-scoped. Keys are strings, values are JSON-serializable.

```typescript
// Individual records
await ctx.db.set(`points:${memberId}`, 100)
const pts = await ctx.db.get(`points:${memberId}`) ?? 0
await ctx.db.delete(`points:${memberId}`)

// Bulk listing by prefix
const allPoints = await ctx.db.list('points:')
// Returns: [{ key: 'points:123', value: 100 }, ...]

// Sorted leaderboard (compute in-memory)
const sorted = allPoints
  .sort((a, b) => b.value - a.value)
  .slice(0, 10)
```
