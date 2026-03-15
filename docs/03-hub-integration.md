# 03 — Hub Integration

## Pages

Pages are Vue 3 SFCs (Single File Components) placed in `src/pages/`.

```vue
<template>
  <div class="p-6 font-nunito">
    <h1 class="text-2xl font-bold text-[var(--color-text)]">
      {{ t('title') }}
    </h1>

    <div v-if="pending">Loading…</div>
    <div v-else>
      <p>{{ data?.totalPoints }} points</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// All composables are globally injected — do NOT import them
const { t } = useI18n()
const { user, hasRole } = useAuth()
const config = useAppConfig()

const { data, pending } = await useFetch('/api/apps/my-app/stats')
</script>
```

### Available Composables

| Composable | Returns | Description |
|-----------|---------|-------------|
| `useI18n()` | `{ t, locale }` | Translations |
| `useAuth()` | `{ user, hasRole, guildId }` | Current user |
| `useAppConfig()` | `Record<string, any>` | Config field values |
| `useFetch(url)` | `{ data, pending, error }` | Fetch wrapper |
| `useRouter()` | Vue Router instance | Navigation |
| `useRoute()` | Current route | Route params/query |

### Conditional Rendering by Role

```vue
<template>
  <div>
    <AdminPanel v-if="hasRole('moderator')" />
    <UserPanel v-else />
  </div>
</template>

<script setup lang="ts">
const { hasRole } = useAuth()
</script>
```

### Accessing Route Params

```vue
<script setup lang="ts">
const route = useRoute()
const memberId = route.params.id  // for path /apps/my-app/:id
</script>
```

## API Routes

Handlers are Nitro `defineEventHandler` functions.

```typescript
// src/api/stats.get.ts
export default defineEventHandler(async (event) => {
  const { guildId, userId, userRoles, config, db } = event.context.newguild

  // Read from KV store
  const points = await db.get(`points:${userId}`) ?? 0

  // List with prefix
  const allEntries = await db.list('points:')

  return { points, leaderboard: allEntries }
})
```

### Reading Request Body

```typescript
// src/api/award.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)  // Nitro built-in
  const { targetUserId, amount } = body

  if (!targetUserId || typeof amount !== 'number') {
    throw createError({ statusCode: 400, message: 'Invalid request' })
  }

  const { db, userRoles } = event.context.newguild
  if (!userRoles.includes('moderator')) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const current = await db.get(`points:${targetUserId}`) ?? 0
  await db.set(`points:${targetUserId}`, current + amount)

  return { success: true, newTotal: current + amount }
})
```

### Reading Query Params

```typescript
const query = getQuery(event)  // Nitro built-in
const limit = Number(query.limit) || 10
```

## Navigation

Navigation entries are defined in `manifest.json`. The host renders them automatically.

**Rail** — the icon sidebar on the left.
**PanelGroups** — the sub-navigation panel that slides out when a rail item is active.

To link between pages within your app, use `<NuxtLink>`:

```vue
<NuxtLink to="/apps/my-app/leaderboard">Leaderboard</NuxtLink>
```

For programmatic navigation:

```typescript
const router = useRouter()
router.push('/apps/my-app/leaderboard')
```
