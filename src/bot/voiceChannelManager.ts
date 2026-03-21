import { loadTempVoiceConfig } from './configLoader'
import { buildTemporaryChannelName, extractToken, getNextAvailableToken, isValidManagedVoiceName } from './voiceChannelTokens'

interface AppDb {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  list(prefix: string): Promise<Array<{ key: string; value: unknown }>>
}

interface VoiceRuntimeContext {
  guildId: string
  config: Record<string, unknown>
  db: AppDb
  bot: unknown
}

interface ManagedChannelRecord {
  token: string
  ownerId: string
  createdAt: string
}

export interface ManagedChannelEntry {
  channelId: string
  token: string
  source: 'index' | 'pattern'
}

export interface EnsureChannelResult {
  channelId: string | null
  created: boolean
  moved: boolean
  deleted: boolean
  reason?: string
}

export interface RenameChannelResult {
  success: boolean
  reason?: string
}

interface VoiceChannelInfo {
  id: string
  name: string
  parentId: string | null
  memberCount: number | null
  raw: Record<string, unknown>
}

const MANAGED_INDEX_KEY = 'tempvc:managed-index'
const MANAGED_PREFIX = 'tempvc:managed:'

const pendingTokensByGuild = new Map<string, Set<string>>()
const interactionRevisionByGuild = new Map<string, number>()
const guildLockBusy = new Map<string, boolean>()
const guildLockQueues = new Map<string, Array<() => void>>()

function managedChannelKey(channelId: string): string {
  return `${MANAGED_PREFIX}${channelId}`
}

async function acquireGuildLock(guildId: string): Promise<void> {
  if (!guildLockBusy.get(guildId)) {
    guildLockBusy.set(guildId, true)
    return
  }

  await new Promise<void>((resolve) => {
    const queue = guildLockQueues.get(guildId) ?? []
    queue.push(() => {
      guildLockBusy.set(guildId, true)
      resolve()
    })
    guildLockQueues.set(guildId, queue)
  })
}

function releaseGuildLock(guildId: string): void {
  const queue = guildLockQueues.get(guildId) ?? []
  const next = queue.shift()

  if (next) {
    guildLockQueues.set(guildId, queue)
    next()
    return
  }

  guildLockBusy.delete(guildId)
  guildLockQueues.delete(guildId)
}

async function withGuildLock<T>(guildId: string, task: () => Promise<T>): Promise<T> {
  await acquireGuildLock(guildId)
  try {
    return await task()
  } finally {
    releaseGuildLock(guildId)
  }
}

function getPendingTokens(guildId: string): Set<string> {
  const existing = pendingTokensByGuild.get(guildId)
  if (existing) return existing

  const set = new Set<string>()
  pendingTokensByGuild.set(guildId, set)
  return set
}

function bumpInteractionRevision(guildId: string): number {
  const next = (interactionRevisionByGuild.get(guildId) ?? 0) + 1
  interactionRevisionByGuild.set(guildId, next)
  return next
}

export function getInteractionRevision(guildId: string): number {
  return interactionRevisionByGuild.get(guildId) ?? 0
}

async function loadManagedIndex(db: AppDb): Promise<string[]> {
  const value = await db.get(MANAGED_INDEX_KEY)
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

async function saveManagedIndex(db: AppDb, channelIds: string[]): Promise<void> {
  await db.set(MANAGED_INDEX_KEY, Array.from(new Set(channelIds)))
}

async function addManagedChannelToIndex(db: AppDb, channelId: string): Promise<void> {
  const index = await loadManagedIndex(db)
  if (index.includes(channelId)) return

  index.push(channelId)
  await saveManagedIndex(db, index)
}

async function removeManagedChannelFromIndex(db: AppDb, channelId: string): Promise<void> {
  const index = await loadManagedIndex(db)
  const next = index.filter((entry) => entry !== channelId)
  if (next.length === index.length) return

  await saveManagedIndex(db, next)
}

function normalizeManagedRecord(record: unknown): ManagedChannelRecord | null {
  if (!record || typeof record !== 'object') return null

  const value = record as Record<string, unknown>
  if (typeof value.token !== 'string' || value.token.length === 0) return null

  return {
    token: value.token,
    ownerId: typeof value.ownerId === 'string' ? value.ownerId : 'unknown',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  }
}

function normalizeChannelId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object') {
    const id = (value as Record<string, unknown>).id
    if (typeof id === 'string' && id.length > 0) return id
  }

  return null
}

function normalizeVoiceChannelInfo(value: unknown): VoiceChannelInfo | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const id = normalizeChannelId(raw.id)
  if (!id) return null

  const name = typeof raw.name === 'string' ? raw.name : ''

  let parentId: string | null = null
  if (typeof raw.parentId === 'string') parentId = raw.parentId
  if (!parentId && raw.parent && typeof raw.parent === 'object') {
    const nestedParent = raw.parent as Record<string, unknown>
    if (typeof nestedParent.id === 'string') parentId = nestedParent.id
  }

  let memberCount: number | null = null
  if (typeof raw.memberCount === 'number') {
    memberCount = raw.memberCount
  } else if (Array.isArray(raw.members)) {
    memberCount = raw.members.length
  } else if (raw.members && typeof raw.members === 'object') {
    const maybeSize = (raw.members as { size?: unknown }).size
    if (typeof maybeSize === 'number') memberCount = maybeSize
  }

  return {
    id,
    name,
    parentId,
    memberCount,
    raw
  }
}

async function tryCall(target: unknown, methodName: string, ...args: unknown[]): Promise<unknown> {
  if (!target || typeof target !== 'object') return undefined

  const fn = (target as Record<string, unknown>)[methodName]
  if (typeof fn !== 'function') return undefined

  try {
    return await (fn as (...fnArgs: unknown[]) => unknown)(...args)
  } catch {
    return undefined
  }
}

async function createVoiceChannel(bot: unknown, name: string, parentId: string): Promise<string | null> {
  const attempts = [
    () => tryCall(bot, 'createVoiceChannel', name, parentId),
    () => tryCall(bot, 'createVoiceChannel', { name, parentId }),
    () => tryCall(bot, 'createChannel', { name, type: 'voice', parentId }),
    () => tryCall(bot, 'createGuildChannel', { name, type: 'voice', parentId }),
    () => tryCall(bot, 'createChannel', name, { type: 'voice', parentId })
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    const channelId = normalizeChannelId(result)
    if (channelId) return channelId
  }

  return null
}

async function deleteVoiceChannel(bot: unknown, channelId: string): Promise<boolean> {
  const attempts = [
    () => tryCall(bot, 'deleteChannel', channelId),
    () => tryCall(bot, 'removeChannel', channelId),
    () => tryCall(bot, 'destroyChannel', channelId)
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    if (result !== undefined) return true
  }

  const channel = await getVoiceChannel(bot, channelId)
  if (channel?.raw && typeof channel.raw.delete === 'function') {
    try {
      await (channel.raw.delete as () => Promise<void>)()
      return true
    } catch {
      return false
    }
  }

  return false
}

async function renameVoiceChannel(bot: unknown, channelId: string, name: string): Promise<boolean> {
  const attempts = [
    () => tryCall(bot, 'setChannelName', channelId, name),
    () => tryCall(bot, 'renameChannel', channelId, name),
    () => tryCall(bot, 'updateChannel', channelId, { name }),
    () => tryCall(bot, 'editChannel', channelId, { name })
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    if (result !== undefined) return true
  }

  const channel = await getVoiceChannel(bot, channelId)
  if (channel?.raw && typeof channel.raw.setName === 'function') {
    try {
      await (channel.raw.setName as (nextName: string) => Promise<void>)(name)
      return true
    } catch {
      return false
    }
  }

  return false
}

export async function getMemberCurrentVoiceChannelId(bot: unknown, memberId: string): Promise<string | null> {
  const directAttempts = [
    () => tryCall(bot, 'getMemberVoiceChannelId', memberId),
    () => tryCall(bot, 'getVoiceChannelForMember', memberId)
  ]

  for (const attempt of directAttempts) {
    const result = await attempt()
    const channelId = normalizeChannelId(result)
    if (channelId) return channelId
    if (result && typeof result === 'object') {
      const fromObject = normalizeChannelId((result as Record<string, unknown>).channelId)
      if (fromObject) return fromObject
    }
  }

  const voiceState = await tryCall(bot, 'getVoiceState', memberId)
  if (voiceState && typeof voiceState === 'object') {
    const voiceStateRecord = voiceState as Record<string, unknown>
    const channelId = normalizeChannelId(voiceStateRecord.channelId)
    if (channelId) return channelId
  }

  const member = await tryCall(bot, 'getMember', memberId) ?? await tryCall(bot, 'fetchMember', memberId)
  if (member && typeof member === 'object') {
    const rawMember = member as Record<string, unknown>

    const directChannelId = normalizeChannelId(rawMember.channelId)
    if (directChannelId) return directChannelId

    if (rawMember.voice && typeof rawMember.voice === 'object') {
      const voice = rawMember.voice as Record<string, unknown>
      const voiceChannelId = normalizeChannelId(voice.channelId) ?? normalizeChannelId(voice.channel)
      if (voiceChannelId) return voiceChannelId
    }
  }

  return null
}

async function moveMemberToChannel(bot: unknown, memberId: string, channelId: string): Promise<boolean> {
  const attempts = [
    () => tryCall(bot, 'setChannel', memberId, channelId),
    () => tryCall(bot, 'moveMemberToChannel', memberId, channelId),
    () => tryCall(bot, 'setMemberVoiceChannel', memberId, channelId),
    () => tryCall(bot, 'patchMemberVoice', memberId, { channelId })
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    if (result !== undefined) return true
  }

  const member = await tryCall(bot, 'getMember', memberId) ?? await tryCall(bot, 'fetchMember', memberId)
  if (member && typeof member === 'object') {
    const rawMember = member as Record<string, unknown>

    if (typeof rawMember.setChannel === 'function') {
      try {
        await (rawMember.setChannel as (nextChannelId: string) => Promise<void>)(channelId)
        return true
      } catch {
        // continue
      }
    }

    if (rawMember.voice && typeof rawMember.voice === 'object') {
      const voice = rawMember.voice as Record<string, unknown>
      if (typeof voice.setChannel === 'function') {
        try {
          await (voice.setChannel as (nextChannelId: string) => Promise<void>)(channelId)
          return true
        } catch {
          return false
        }
      }
    }
  }

  return false
}

async function getVoiceChannel(bot: unknown, channelId: string): Promise<VoiceChannelInfo | null> {
  const attempts = [
    () => tryCall(bot, 'getVoiceChannel', channelId),
    () => tryCall(bot, 'getChannel', channelId),
    () => tryCall(bot, 'fetchChannel', channelId)
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    const normalized = normalizeVoiceChannelInfo(result)
    if (normalized) return normalized
  }

  return null
}

async function getVoiceChannelMemberCount(bot: unknown, channelId: string): Promise<number | null> {
  const channel = await getVoiceChannel(bot, channelId)
  if (!channel) return null

  return channel.memberCount
}

async function listVoiceChannelsByCategory(bot: unknown, categoryId: string): Promise<VoiceChannelInfo[]> {
  const attempts = [
    () => tryCall(bot, 'listVoiceChannelsByCategory', categoryId),
    () => tryCall(bot, 'getVoiceChannelsByCategory', categoryId),
    () => tryCall(bot, 'listChannelsByCategory', categoryId),
    () => tryCall(bot, 'listChannels', { parentId: categoryId, type: 'voice' }),
    () => tryCall(bot, 'getChannels', categoryId)
  ]

  for (const attempt of attempts) {
    const result = await attempt()
    if (!Array.isArray(result)) continue

    const channels = result
      .map((entry) => normalizeVoiceChannelInfo(entry))
      .filter((entry): entry is VoiceChannelInfo => entry !== null)
      .filter((entry) => entry.parentId === categoryId)

    if (channels.length > 0) {
      return channels
    }
  }

  return []
}

async function getManagedRecord(db: AppDb, channelId: string): Promise<ManagedChannelRecord | null> {
  return normalizeManagedRecord(await db.get(managedChannelKey(channelId)))
}

async function setManagedRecord(db: AppDb, channelId: string, record: ManagedChannelRecord): Promise<void> {
  await db.set(managedChannelKey(channelId), record)
}

async function deleteManagedRecord(db: AppDb, channelId: string): Promise<void> {
  await db.delete(managedChannelKey(channelId))
}

async function resolveManagedState(
  context: VoiceRuntimeContext,
  channelId: string,
  knownConfig = loadTempVoiceConfig(context.config)
): Promise<{ managed: boolean; token: string | null; ownerId: string; createdAt: string }> {
  const byId = await getManagedRecord(context.db, channelId)
  if (byId) {
    return {
      managed: true,
      token: byId.token,
      ownerId: byId.ownerId,
      createdAt: byId.createdAt
    }
  }

  const channel = await getVoiceChannel(context.bot, channelId)
  if (!channel) {
    return {
      managed: false,
      token: null,
      ownerId: 'unknown',
      createdAt: new Date().toISOString()
    }
  }

  if (channel.parentId !== knownConfig.temporaryVoiceCategoryId) {
    return {
      managed: false,
      token: null,
      ownerId: 'unknown',
      createdAt: new Date().toISOString()
    }
  }

  if (!isValidManagedVoiceName(channel.name, knownConfig.defaultChannelName)) {
    return {
      managed: false,
      token: null,
      ownerId: 'unknown',
      createdAt: new Date().toISOString()
    }
  }

  return {
    managed: true,
    token: extractToken(channel.name, knownConfig.defaultChannelName),
    ownerId: 'unknown',
    createdAt: new Date().toISOString()
  }
}

async function deleteManagedChannel(
  context: VoiceRuntimeContext,
  channelId: string,
  skipDelete = false
): Promise<boolean> {
  const deleted = skipDelete ? true : await deleteVoiceChannel(context.bot, channelId)
  if (!deleted) return false

  await deleteManagedRecord(context.db, channelId)
  await removeManagedChannelFromIndex(context.db, channelId)
  bumpInteractionRevision(context.guildId)

  return true
}

export async function listManagedChannels(guildId: string, context: VoiceRuntimeContext): Promise<ManagedChannelEntry[]> {
  void guildId
  const runtimeConfig = loadTempVoiceConfig(context.config)
  const index = await loadManagedIndex(context.db)
  const byChannelId = new Map<string, ManagedChannelEntry>()

  const stale: string[] = []
  for (const channelId of index) {
    const record = await getManagedRecord(context.db, channelId)
    if (!record) {
      stale.push(channelId)
      continue
    }

    byChannelId.set(channelId, {
      channelId,
      token: record.token,
      source: 'index'
    })
  }

  if (stale.length > 0) {
    const cleaned = index.filter((channelId) => !stale.includes(channelId))
    await saveManagedIndex(context.db, cleaned)
  }

  if (runtimeConfig.temporaryVoiceCategoryId) {
    const channelsInCategory = await listVoiceChannelsByCategory(context.bot, runtimeConfig.temporaryVoiceCategoryId)
    for (const channel of channelsInCategory) {
      if (!isValidManagedVoiceName(channel.name, runtimeConfig.defaultChannelName)) continue

      const token = extractToken(channel.name, runtimeConfig.defaultChannelName)
      if (!token || byChannelId.has(channel.id)) continue

      byChannelId.set(channel.id, {
        channelId: channel.id,
        token,
        source: 'pattern'
      })
    }
  }

  return Array.from(byChannelId.values())
}

export async function ensureChannelForLobbyJoin(
  memberId: string,
  guildId: string,
  context: VoiceRuntimeContext
): Promise<EnsureChannelResult> {
  return withGuildLock(guildId, async () => {
    const runtimeConfig = loadTempVoiceConfig(context.config)

    if (!runtimeConfig.enabled) {
      return { channelId: null, created: false, moved: false, deleted: false, reason: 'disabled' }
    }

    if (!runtimeConfig.lobbyChannelId || !runtimeConfig.temporaryVoiceCategoryId) {
      return { channelId: null, created: false, moved: false, deleted: false, reason: 'missing-config' }
    }

    const managedChannels = await listManagedChannels(guildId, context)
    if (managedChannels.length >= runtimeConfig.maxManagedChannels) {
      return { channelId: null, created: false, moved: false, deleted: false, reason: 'limit-reached' }
    }

    const usedTokens = new Set(managedChannels.map((entry) => entry.token))
    const pendingTokens = getPendingTokens(guildId)
    const token = getNextAvailableToken(usedTokens, pendingTokens, runtimeConfig.defaultChannelIcon)
    pendingTokens.add(token)

    let channelId: string | null = null

    try {
      const name = buildTemporaryChannelName(token, runtimeConfig.defaultChannelName)
      channelId = await createVoiceChannel(context.bot, name, runtimeConfig.temporaryVoiceCategoryId)

      if (!channelId) {
        return { channelId: null, created: false, moved: false, deleted: false, reason: 'create-failed' }
      }

      await setManagedRecord(context.db, channelId, {
        token,
        ownerId: memberId,
        createdAt: new Date().toISOString()
      })
      await addManagedChannelToIndex(context.db, channelId)
      bumpInteractionRevision(guildId)

      const currentVoiceChannelId = await getMemberCurrentVoiceChannelId(context.bot, memberId)
      if (currentVoiceChannelId !== runtimeConfig.lobbyChannelId) {
        const count = await getVoiceChannelMemberCount(context.bot, channelId)
        if (count === 0) {
          const deleted = await deleteManagedChannel(context, channelId)
          return { channelId: deleted ? null : channelId, created: true, moved: false, deleted, reason: 'left-lobby-before-move' }
        }

        return { channelId, created: true, moved: false, deleted: false, reason: 'member-left-lobby' }
      }

      const moved = await moveMemberToChannel(context.bot, memberId, channelId)
      if (!moved) {
        const count = await getVoiceChannelMemberCount(context.bot, channelId)
        if (count === 0) {
          const deleted = await deleteManagedChannel(context, channelId)
          return { channelId: deleted ? null : channelId, created: true, moved: false, deleted, reason: 'move-failed' }
        }
      }

      return { channelId, created: true, moved, deleted: false }
    } finally {
      pendingTokens.delete(token)
      if (pendingTokens.size === 0) {
        pendingTokensByGuild.delete(guildId)
      }
    }
  })
}

export async function cleanupIfManagedAndEmpty(
  channelId: string,
  guildId: string,
  context: VoiceRuntimeContext
): Promise<boolean> {
  return withGuildLock(guildId, async () => {
    if (!channelId) return false

    const runtimeConfig = loadTempVoiceConfig(context.config)
    if (!runtimeConfig.enabled) return false

    const managed = await resolveManagedState(context, channelId, runtimeConfig)
    if (!managed.managed) return false

    const memberCount = await getVoiceChannelMemberCount(context.bot, channelId)
    if (memberCount !== 0) return false

    return deleteManagedChannel(context, channelId)
  })
}

export async function renameManagedChannelToken(
  channelId: string,
  token: string,
  guildId: string,
  context: VoiceRuntimeContext
): Promise<RenameChannelResult> {
  return withGuildLock(guildId, async () => {
    const runtimeConfig = loadTempVoiceConfig(context.config)

    if (!runtimeConfig.enabled || !runtimeConfig.renameEnabled) {
      return { success: false, reason: 'rename-disabled' }
    }

    const nextToken = typeof token === 'string' ? token.trim() : ''
    if (!nextToken) {
      return { success: false, reason: 'invalid-token' }
    }

    const managedState = await resolveManagedState(context, channelId, runtimeConfig)
    if (!managedState.managed || !managedState.token) {
      return { success: false, reason: 'not-managed' }
    }

    const channels = await listManagedChannels(guildId, context)
    const occupiedByOther = channels.some((entry) => entry.channelId !== channelId && entry.token === nextToken)
    if (occupiedByOther) {
      return { success: false, reason: 'token-occupied' }
    }

    const renamed = await renameVoiceChannel(context.bot, channelId, buildTemporaryChannelName(nextToken, runtimeConfig.defaultChannelName))
    if (!renamed) {
      return { success: false, reason: 'rename-failed' }
    }

    await setManagedRecord(context.db, channelId, {
      token: nextToken,
      ownerId: managedState.ownerId,
      createdAt: managedState.createdAt
    })

    await addManagedChannelToIndex(context.db, channelId)
    bumpInteractionRevision(guildId)

    return { success: true }
  })
}
