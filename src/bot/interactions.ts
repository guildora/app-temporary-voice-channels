import type { BotContext, InteractionPayload } from '@guildora/app-sdk'
import { loadTempVoiceConfig } from './configLoader'
import {
  getInteractionRevision,
  getMemberCurrentVoiceChannelId,
  listManagedChannels,
  renameManagedChannelToken
} from './voiceChannelManager'
import { getOrderedBaseTokens } from './voiceChannelTokens'

const TEMP_VOICE_COMMAND = 'voice-room'
const RENAME_SELECT_PREFIX = 'tempvc:rename:'
const MAX_SELECT_OPTIONS = 25

interface InteractionResponse {
  content: string
  ephemeral?: boolean
  components?: unknown[]
}

function getPayloadCommandName(payload: InteractionPayload): string {
  const raw = payload as unknown as Record<string, unknown>
  return typeof raw.commandName === 'string' ? raw.commandName : ''
}

function getPayloadCustomId(payload: InteractionPayload): string {
  const raw = payload as unknown as Record<string, unknown>
  if (typeof raw.customId === 'string') return raw.customId

  const data = raw.data
  if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).customId === 'string') {
    return (data as Record<string, string>).customId
  }

  if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).custom_id === 'string') {
    return (data as Record<string, string>).custom_id
  }

  return ''
}

function getPayloadValues(payload: InteractionPayload): string[] {
  const raw = payload as unknown as Record<string, unknown>

  if (Array.isArray(raw.values)) {
    return raw.values.filter((value): value is string => typeof value === 'string' && value.length > 0)
  }

  const data = raw.data
  if (data && typeof data === 'object') {
    const values = (data as Record<string, unknown>).values
    if (Array.isArray(values)) {
      return values.filter((value): value is string => typeof value === 'string' && value.length > 0)
    }
  }

  return []
}

function parseRenameCustomId(customId: string): { channelId: string; revision: number } | null {
  if (!customId.startsWith(RENAME_SELECT_PREFIX)) return null

  const remainder = customId.slice(RENAME_SELECT_PREFIX.length)
  const separator = remainder.lastIndexOf(':')
  if (separator < 1) return null

  const channelId = remainder.slice(0, separator)
  const revision = Number(remainder.slice(separator + 1))
  if (!channelId || Number.isNaN(revision)) return null

  return { channelId, revision }
}

async function tryCall(target: unknown, methodName: string, ...args: unknown[]): Promise<unknown> {
  if (!target || typeof target !== 'object') return undefined

  const method = (target as Record<string, unknown>)[methodName]
  if (typeof method !== 'function') return undefined

  try {
    return await (method as (...fnArgs: unknown[]) => unknown)(...args)
  } catch {
    return undefined
  }
}

async function sendInteractionResponse(
  payload: InteractionPayload,
  bot: unknown,
  response: InteractionResponse,
  preferUpdate = false
): Promise<boolean> {
  const payloadAny = payload as unknown as Record<string, unknown>

  const payloadMethods = preferUpdate
    ? ['update', 'editReply', 'respond', 'reply', 'followUp']
    : ['reply', 'respond', 'followUp', 'update', 'editReply']

  for (const methodName of payloadMethods) {
    const result = await tryCall(payloadAny, methodName, response)
    if (result !== undefined) return true
  }

  const botMethods = preferUpdate
    ? ['updateInteraction', 'respondToInteraction', 'replyToInteraction']
    : ['respondToInteraction', 'replyToInteraction', 'updateInteraction']

  for (const methodName of botMethods) {
    const result = await tryCall(bot, methodName, payload, response)
    if (result !== undefined) return true
  }

  return false
}

function buildTokenOptions(tokens: string[], baseName: string): Array<{ label: string; value: string }> {
  return tokens.slice(0, MAX_SELECT_OPTIONS).map((token) => ({
    label: `${token} ${baseName}`,
    value: token
  }))
}

function buildRenameSelectComponent(customId: string, options: Array<{ label: string; value: string }>): Record<string, unknown> {
  return {
    type: 'string_select',
    customId,
    placeholder: 'Select an icon',
    minValues: 1,
    maxValues: 1,
    options
  }
}

function nextAvailableTokens(usedByOtherChannels: Set<string>, currentToken: string, max = MAX_SELECT_OPTIONS): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  const addToken = (token: string) => {
    if (!token || seen.has(token)) return
    if (token !== currentToken && usedByOtherChannels.has(token)) return

    seen.add(token)
    result.push(token)
  }

  for (const token of getOrderedBaseTokens()) {
    addToken(token)
    if (result.length >= max) return result
  }

  let repeats = 2
  while (result.length < max && repeats < 128) {
    addToken('❤️'.repeat(repeats))
    repeats += 1
  }

  return result
}

function renameFailureMessage(reason: string): string {
  if (reason === 'token-occupied') return 'This icon is already used by another managed voice channel.'
  if (reason === 'not-managed') return 'Your current channel is not managed by this app.'
  if (reason === 'rename-disabled') return 'Channel rename is disabled in app settings.'
  if (reason === 'invalid-token') return 'Invalid icon selected.'
  if (reason === 'rename-failed') return 'Could not rename the channel.'

  return 'Rename failed.'
}

async function openRenameMenu(payload: InteractionPayload, ctx: BotContext, preferUpdate = false): Promise<void> {
  const config = loadTempVoiceConfig(ctx.config as Record<string, unknown>)

  if (!config.enabled || !config.renameEnabled) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: 'Channel rename is currently disabled.',
      ephemeral: true
    }, preferUpdate)
    return
  }

  const memberChannelId = await getMemberCurrentVoiceChannelId(ctx.bot, payload.memberId)
  if (!memberChannelId) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: 'You are not connected to a voice channel.',
      ephemeral: true
    }, preferUpdate)
    return
  }

  const managedChannels = await listManagedChannels(ctx.guildId, ctx)
  const targetChannel = managedChannels.find((entry) => entry.channelId === memberChannelId)
  if (!targetChannel) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: 'Your current voice channel is not managed by this app.',
      ephemeral: true
    }, preferUpdate)
    return
  }

  const usedByOtherChannels = new Set(
    managedChannels
      .filter((entry) => entry.channelId !== targetChannel.channelId)
      .map((entry) => entry.token)
  )

  const tokens = nextAvailableTokens(usedByOtherChannels, targetChannel.token)
  const options = buildTokenOptions(tokens, config.defaultChannelName)

  if (options.length === 0) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: 'No free icons are available right now.',
      ephemeral: true
    }, preferUpdate)
    return
  }

  const revision = getInteractionRevision(ctx.guildId)
  const customId = `${RENAME_SELECT_PREFIX}${targetChannel.channelId}:${revision}`

  await sendInteractionResponse(payload, ctx.bot, {
    content: `Select a new icon for your channel (${targetChannel.token} ${config.defaultChannelName}).`,
    ephemeral: true,
    components: [buildRenameSelectComponent(customId, options)]
  }, preferUpdate)
}

async function handleRenameSelection(payload: InteractionPayload, ctx: BotContext, customId: string): Promise<void> {
  const parsed = parseRenameCustomId(customId)
  if (!parsed) return

  const values = getPayloadValues(payload)
  const token = values[0]

  if (!token) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: 'Please select a valid icon.',
      ephemeral: true
    }, true)
    return
  }

  const currentRevision = getInteractionRevision(ctx.guildId)
  if (parsed.revision !== currentRevision) {
    await openRenameMenu(payload, ctx, true)
    return
  }

  const rename = await renameManagedChannelToken(parsed.channelId, token, ctx.guildId, ctx)
  if (!rename.success) {
    await sendInteractionResponse(payload, ctx.bot, {
      content: renameFailureMessage(rename.reason ?? 'unknown'),
      ephemeral: true
    }, true)
    return
  }

  await openRenameMenu(payload, ctx, true)
}

export async function handleTemporaryVoiceInteractions(payload: InteractionPayload, ctx: BotContext): Promise<void> {
  const customId = getPayloadCustomId(payload)
  if (customId.startsWith(RENAME_SELECT_PREFIX)) {
    await handleRenameSelection(payload, ctx, customId)
    return
  }

  const commandName = getPayloadCommandName(payload)
  if (commandName === TEMP_VOICE_COMMAND || commandName === `${TEMP_VOICE_COMMAND}-refresh`) {
    await openRenameMenu(payload, ctx)
  }
}
