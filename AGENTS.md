# AGENTS.md — NewGuild App Development Guide for AI Agents

This file is the primary reference for AI agents (Claude, Copilot, Cursor, etc.) building NewGuild apps. Read this before writing any code.

---

## Table of Contents

1. [What is a NewGuild App?](#1-what-is-a-newguild-app)
2. [Manifest Schema](#2-manifest-schema)
3. [Hub Integration](#3-hub-integration)
4. [Bot Integration](#4-bot-integration)
5. [Permissions Hierarchy](#5-permissions-hierarchy)
6. [Config Fields](#6-config-fields)
7. [i18n](#7-i18n)
8. [Design System](#8-design-system)
9. [Sideloading Workflow](#9-sideloading-workflow)
10. [Common Mistakes](#10-common-mistakes)
11. [Test Checklist](#11-test-checklist)

---

## 1. What is a NewGuild App?

NewGuild is a community platform with a **Hub** (web frontend) and a **Bot** (Discord-like event processor). Apps extend both layers.

An app is a **GitHub repository** containing:
- `manifest.json` — machine-readable app definition
- `src/pages/` — Vue components rendered in the Hub
- `src/api/` — Nitro server-side API handlers
- `src/bot/hooks.ts` — event handlers triggered by the bot
- `src/i18n/` — translation files

Apps are loaded via URL (`/api/admin/apps/sideload`), activated per-guild, and configured through the Admin UI.

**Key constraint**: Apps run inside the NewGuild host process. They are NOT separate services. There is no separate server to deploy.

---

## 2. Manifest Schema

The `manifest.json` at the repo root is required. Every field is documented below.

### Top-level fields

```jsonc
{
  "id": "my-app",              // required, unique kebab-case identifier
  "name": "My App",            // required, human-readable display name
  "version": "1.0.0",          // required, semver
  "author": "github-username", // required
  "description": "...",        // required, shown in marketplace
  "repositoryUrl": "https://github.com/...", // required for marketplace
  "license": "MIT",            // optional
  "compatibility": {
    "core": { "minVersion": "0.1.0" }
  }
}
```

### navigation

Defines where the app appears in the Hub sidebar.

```jsonc
"navigation": {
  "rail": [
    {
      "id": "my-rail-item",     // unique ID, referenced by panelGroups
      "icon": "star",           // icon name (Material Symbols)
      "label": "My App",        // displayed in rail tooltip
      "to": "/apps/my-app",     // route of the landing page
      "order": 50,              // position in rail (lower = higher up)
      "requiredRoles": ["user"] // minimum role to see this item
    }
  ],
  "panelGroups": [
    {
      "railItemId": "my-rail-item", // must match a rail item id
      "entries": [
        {
          "id": "my-overview",
          "label": "Overview",
          "to": "/apps/my-app",
          "requiredRoles": ["user"]   // optional, defaults to no restriction
        },
        {
          "id": "my-admin",
          "label": "Admin",
          "to": "/apps/my-app/admin",
          "requiredRoles": ["moderator"]
        }
      ]
    }
  ]
}
```

### permissions

Declare what data your app reads or writes. Users see these during install.

```jsonc
"permissions": [
  { "key": "read:member", "description": "Read member profiles" },
  { "key": "write:member", "description": "Update member data" },
  { "key": "read:voice",   "description": "Track voice activity" }
]
```

Common permission keys: `read:member`, `write:member`, `read:messages`, `write:messages`, `read:voice`, `read:roles`, `write:roles`.

### pages

Maps URL paths to Vue component files.

```jsonc
"pages": [
  {
    "id": "my-overview",
    "path": "/apps/my-app",
    "file": "src/pages/index.vue",
    "requiredRoles": ["user"]
  }
]
```

- `path` must start with `/apps/`
- `file` is relative to the repo root
- `requiredRoles` is enforced server-side; also add guards client-side

### apiRoutes

Maps HTTP endpoints to Nitro handler files.

```jsonc
"apiRoutes": [
  {
    "id": "my-get",
    "method": "GET",
    "path": "/api/apps/my-app/data",
    "file": "src/api/data.get.ts",
    "requiredRoles": ["user"]
  },
  {
    "id": "my-post",
    "method": "POST",
    "path": "/api/apps/my-app/action",
    "file": "src/api/action.post.ts",
    "requiredRoles": ["moderator"]
  }
]
```

- `path` must start with `/api/apps/`
- File naming convention: `<name>.<method>.ts`
- `requiredRoles` is enforced by the host before the handler runs

### botHooks

List of bot event names this app handles.

```jsonc
"botHooks": ["onVoiceActivity", "onRoleChange"]
```

All available hook names:
- `onVoiceActivity` — member joins/leaves/moves in a voice channel
- `onRoleChange` — member's roles are updated
- `onMessage` — a message is sent in a text channel
- `onMemberJoin` — a new member joins the guild

The corresponding handler must be exported from `src/bot/hooks.ts`.

### configFields

Fields editable by admins in the App Settings UI.

```jsonc
"configFields": [
  {
    "key": "myNumber",     // accessed via config.myNumber in handlers
    "type": "number",
    "label": "My Number",
    "description": "Optional help text shown below the field.",
    "default": 10,
    "min": 0,             // only for type: number
    "max": 1000           // only for type: number
  },
  {
    "key": "myFlag",
    "type": "boolean",
    "label": "Enable Feature",
    "default": false
  },
  {
    "key": "mySelect",
    "type": "select",
    "label": "Choose Option",
    "options": ["alpha", "beta", "gamma"],
    "default": "alpha"
  },
  {
    "key": "myText",
    "type": "string",
    "label": "Custom Text",
    "default": "Hello {username}"
  }
]
```

### requiredEnv

Environment variables the admin must configure on the server.

```jsonc
"requiredEnv": [
  { "key": "MY_API_SECRET", "description": "API key for external service" }
]
```

### installNotes

A plain-text string displayed to the admin after installation.

```jsonc
"installNotes": "After install, configure the API key in server settings."
```

---

## 3. Hub Integration

### Vue Pages

Pages live in `src/pages/` and are standard Vue 3 SFCs (Single File Components).

```vue
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold font-nunito">{{ t('title') }}</h1>
    <p>{{ stats.totalPoints }}</p>
  </div>
</template>

<script setup lang="ts">
// Composables provided by the NewGuild host
const { t } = useI18n()
const { user, hasRole } = useAuth()
const config = useAppConfig()  // access configFields values

// Fetch from your app's API route
const { data: stats } = await useFetch('/api/apps/my-app/stats')
</script>
```

**Available composables** (injected by host, no import needed):
- `useI18n()` — `{ t, locale }` for translations
- `useAuth()` — `{ user, hasRole, guildId }` for current user
- `useAppConfig()` — key/value object of all configField values
- `useFetch()` — standard Nuxt `useFetch`, scoped to host origin

**Routing**: Pages are lazy-loaded. Use `<NuxtLink to="/apps/my-app/other">` for internal navigation.

### Nitro API Routes

Handlers are standard Nitro `defineEventHandler` functions.

```typescript
// src/api/stats.get.ts
export default defineEventHandler(async (event) => {
  // context injected by NewGuild host
  const { guildId, userId, userRoles, config, db } = event.context.newguild

  // db is a guild-scoped key-value store
  const points = await db.get(`points:${userId}`) ?? 0

  return { points }
})
```

**event.context.newguild** fields:
- `guildId: string` — current guild ID
- `userId: string` — authenticated user ID (undefined if no auth)
- `userRoles: string[]` — roles of the current user
- `config: Record<string, any>` — configField values for this guild
- `db: AppDb` — guild-scoped KV store (see below)

**AppDb API**:
```typescript
await db.get(key: string): Promise<any | null>
await db.set(key: string, value: any): Promise<void>
await db.delete(key: string): Promise<void>
await db.list(prefix: string): Promise<{ key: string; value: any }[]>
```

**Auth guards**: `requiredRoles` in the manifest is enforced before the handler runs. Inside the handler you can do additional checks:

```typescript
if (!event.context.newguild.userRoles.includes('moderator')) {
  throw createError({ statusCode: 403, message: 'Forbidden' })
}
```

---

## 4. Bot Integration

All bot hooks are exported from a single file: `src/bot/hooks.ts`.

```typescript
// src/bot/hooks.ts
import type { BotContext, VoiceActivityPayload, RoleChangePayload } from '@newguild/app-sdk'

export async function onVoiceActivity(payload: VoiceActivityPayload, ctx: BotContext) {
  const { memberId, action, channelId, durationSeconds } = payload
  // action: 'join' | 'leave' | 'move'

  if (action === 'leave' && durationSeconds) {
    const pointsPerMinute = ctx.config.pointsPerMinute ?? 1
    const earned = Math.floor(durationSeconds / 60) * pointsPerMinute
    const current = await ctx.db.get(`points:${memberId}`) ?? 0
    await ctx.db.set(`points:${memberId}`, current + earned)
  }
}

export async function onRoleChange(payload: RoleChangePayload, ctx: BotContext) {
  const { memberId, addedRoles, removedRoles } = payload
  // handle role changes
}
```

### BotContext

```typescript
interface BotContext {
  guildId: string
  config: Record<string, any>   // configField values
  db: AppDb                      // same KV store as in API routes
  bot: BotClient                 // bot API client
}
```

### BotClient methods

```typescript
ctx.bot.sendMessage(channelId: string, content: string): Promise<void>
ctx.bot.addRole(memberId: string, roleId: string): Promise<void>
ctx.bot.removeRole(memberId: string, roleId: string): Promise<void>
ctx.bot.getMember(memberId: string): Promise<Member>
```

### All Payload Types

```typescript
interface VoiceActivityPayload {
  memberId: string
  action: 'join' | 'leave' | 'move'
  channelId: string
  previousChannelId?: string  // only on 'move'
  durationSeconds?: number    // only on 'leave' and 'move'
}

interface RoleChangePayload {
  memberId: string
  addedRoles: string[]
  removedRoles: string[]
  allRoles: string[]
}

interface MessagePayload {
  memberId: string
  channelId: string
  messageId: string
  content: string
}

interface MemberJoinPayload {
  memberId: string
  joinedAt: string  // ISO date string
}
```

---

## 5. Permissions Hierarchy

Roles are ordered from least to most privileged:

```
temporaer → user → moderator → admin → superadmin
```

- **temporaer**: Guest/unverified. Can see public pages only.
- **user**: Verified member. Standard access.
- **moderator**: Trusted member. Can manage other users, award points.
- **admin**: Guild administrator. Can configure apps, manage roles.
- **superadmin**: Platform owner. Full access, including server settings.

In manifest `requiredRoles`, specify the **minimum** role. The system grants access to that role and all higher roles.

```jsonc
"requiredRoles": ["moderator"]
// grants access to: moderator, admin, superadmin
// denies access to: temporaer, user
```

In code:
```typescript
// Check in API handler
const { userRoles } = event.context.newguild
const privileged = ['moderator', 'admin', 'superadmin']
if (!userRoles.some(r => privileged.includes(r))) {
  throw createError({ statusCode: 403 })
}

// Check in Vue page
const { hasRole } = useAuth()
if (hasRole('moderator')) { /* show admin UI */ }
```

---

## 6. Config Fields

Config values are set per-guild by admins in the App Settings UI.

Access in API handlers:
```typescript
const { config } = event.context.newguild
const rate = config.pointsPerMinute ?? 1  // always provide a fallback
```

Access in Vue pages:
```typescript
const config = useAppConfig()
const isPublic = config.leaderboardVisible  // true/false
```

Access in bot hooks:
```typescript
const rate = ctx.config.pointsPerMinute ?? 1
```

**Always use fallbacks** — config values can be undefined if not yet set.

---

## 7. i18n

Translation files are in `src/i18n/`. At minimum provide `en.json` and `de.json`.

```json
// src/i18n/en.json
{
  "title": "Community Points",
  "points": "Points",
  "leaderboard": "Leaderboard",
  "rank": "Rank",
  "member": "Member",
  "earned": "{count} points earned"
}
```

```json
// src/i18n/de.json
{
  "title": "Community-Punkte",
  "points": "Punkte",
  "leaderboard": "Bestenliste",
  "rank": "Rang",
  "member": "Mitglied",
  "earned": "{count} Punkte verdient"
}
```

In Vue:
```typescript
const { t } = useI18n()
// t('title') → "Community Points"
// t('earned', { count: 42 }) → "42 points earned"
```

The host automatically selects the language based on the user's locale preference.

---

## 8. Design System

NewGuild uses **Retro-morphism** — a design aesthetic combining retro/pixel-art elements with modern neumorphism.

### Key principles
- **Font**: Nunito (rounded, friendly). Always use `font-nunito` class.
- **Borders**: Slightly rounded corners (`rounded-lg`), subtle drop shadows.
- **Colors**: Warm neutrals with vibrant accent colors. Use CSS variables from the host theme.
- **Interactive elements**: Slight inset on press (shadow inversion).

### CSS variables (host-provided)
```css
var(--color-surface)      /* card/panel background */
var(--color-surface-alt)  /* slightly elevated surface */
var(--color-border)       /* border color */
var(--color-text)         /* primary text */
var(--color-text-muted)   /* secondary text */
var(--color-accent)       /* primary accent (guild-configurable) */
var(--color-accent-hover) /* hover state of accent */
```

### Tailwind
Tailwind CSS is available. Use utility classes freely.

```vue
<template>
  <!-- Good: Retro card component -->
  <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-md p-4 font-nunito">
    <h2 class="text-lg font-bold text-[var(--color-text)]">Title</h2>
    <p class="text-sm text-[var(--color-text-muted)]">Subtitle</p>
  </div>
</template>
```

### Do NOT
- Import external CSS frameworks (only Tailwind is available)
- Use hardcoded hex colors (use CSS variables)
- Use system fonts — always `font-nunito`

---

## 9. Sideloading Workflow

To test your app on a live NewGuild instance:

1. Push your code to a **public** GitHub repository
2. Ensure `manifest.json` is at the **root** of the default branch
3. In NewGuild, navigate to **Admin → Apps**
4. Click **Sideload App**
5. Enter your repository URL: `https://github.com/username/repo`
6. Click **Load** — the system fetches and validates `manifest.json`
7. Review the app details and click **Install**
8. Click **Activate** to enable the app for your guild

To update a sideloaded app:
- Push changes to GitHub
- In Admin → Apps, click the app → **Refresh** to pull the latest version

---

## 10. Common Mistakes

### manifest.json

| Mistake | Fix |
|---------|-----|
| `id` contains uppercase or spaces | Use only `kebab-case` |
| `pages[].path` doesn't start with `/apps/` | Must be `/apps/your-app-id/...` |
| `apiRoutes[].path` doesn't start with `/api/apps/` | Must be `/api/apps/your-app-id/...` |
| `panelGroups[].railItemId` doesn't match a `rail[].id` | IDs must match exactly |
| Bot hook name typo (e.g. `onVoiceactivty`) | Check capitalization against hook list |

### API Handlers

| Mistake | Fix |
|---------|-----|
| Missing fallback for config values | Always use `config.key ?? defaultValue` |
| Returning non-serializable values | Return plain objects/arrays/primitives |
| Not handling missing user context | Check `userId` before using it |
| Throwing raw errors | Use `createError({ statusCode, message })` |

### Vue Pages

| Mistake | Fix |
|---------|-----|
| Using `import` for host composables | Do NOT import — they are globally injected |
| Hardcoded colors | Use `var(--color-*)` CSS variables |
| Non-Nunito font | Always add `font-nunito` class |
| Direct `fetch()` calls | Use `useFetch()` composable |

### Bot Hooks

| Mistake | Fix |
|---------|-----|
| Hook not exported from `src/bot/hooks.ts` | Export must be a named export matching the hook name |
| Forgetting `await` on `db.set` | Always `await` async db calls |
| Accessing `payload.durationSeconds` on 'join' | Only available on 'leave' and 'move' |

---

## 11. Test Checklist

Before publishing, verify:

- [ ] `manifest.json` is valid JSON (no trailing commas, no comments)
- [ ] All `pages[].file` paths point to existing files
- [ ] All `apiRoutes[].file` paths point to existing files
- [ ] `src/bot/hooks.ts` exports all functions listed in `botHooks`
- [ ] Bot hooks compile without TypeScript errors
- [ ] API routes return proper error codes for missing auth
- [ ] Config fields all have `default` values
- [ ] Both `en.json` and `de.json` exist and have the same keys
- [ ] All Vue pages use `font-nunito` and CSS variables for colors
- [ ] App can be sideloaded from GitHub URL without errors
- [ ] Navigation appears correctly in rail and panel
- [ ] Role restrictions work (try accessing protected pages with lower role)
