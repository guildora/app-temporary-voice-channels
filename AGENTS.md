# AGENTS.md — Guildora App Development Guide for AI Agents

This file is the primary reference for AI agents (Claude, Copilot, Cursor, etc.) building Guildora apps. Read this before writing any code.

---

## Table of Contents

1. [What is a Guildora App?](#1-what-is-a-guildora-app)
2. [Manifest Schema](#2-manifest-schema)
3. [Hub Integration](#3-hub-integration)
4. [Bot Integration](#4-bot-integration)
5. [Permissions Hierarchy](#5-permissions-hierarchy)
6. [Config Fields](#6-config-fields)
7. [i18n](#7-i18n)
8. [Design System](#8-design-system)
9. [Navigation Patterns](#9-navigation-patterns)
10. [Sideloading Workflow](#10-sideloading-workflow)
11. [Common Mistakes](#11-common-mistakes)
12. [Test Checklist](#12-test-checklist)

---

## 1. What is a Guildora App?

Guildora is a community platform with a **Hub** (web frontend) and a **Bot** (Discord-like event processor). Apps extend both layers.

An app is a **GitHub repository** containing:
- `manifest.json` — machine-readable app definition
- `src/pages/` — Vue components rendered in the Hub
- `src/api/` — Nitro server-side API handlers
- `src/bot/hooks.ts` — event handlers triggered by the bot
- `src/i18n/` — translation files

Apps are loaded via URL (`/api/admin/apps/sideload`), activated per-guild, and configured through the Admin UI.

**Key constraint**: Apps run inside the Guildora host process. They are NOT separate services. There is no separate server to deploy.

---

## 2. Manifest Schema

The `manifest.json` at the repo root is required. Every field is documented below.

### Top-level fields

```jsonc
{
  "id": "template",            // required, unique kebab-case identifier
  "name": "Template",          // required, human-readable display name
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
      "id": "template",         // unique ID, referenced by panelGroups
      "icon": "puzzle-piece",   // icon name (Material Symbols)
      "label": "Template",      // displayed in rail tooltip
      "to": "/apps/template",   // route of the landing page
      "order": 50,              // position in rail (lower = higher up)
      "requiredRoles": ["user"] // minimum role to see this item
    }
  ],
  "panelGroups": [
    {
      "railItemId": "template", // must match a rail item id
      "items": [
        {
          "id": "template-app",
          "label": "App",
          "to": "/apps/template",
          "requiredRoles": ["moderator"]
        },
        {
          "id": "template-mod",
          "label": "Moderation",
          "to": "/apps/template/mod",
          "requiredRoles": ["moderator"]
        },
        {
          "id": "template-admin",
          "label": "Admin",
          "to": "/apps/template/admin",
          "requiredRoles": ["admin"]
        }
      ]
    }
  ]
}
```

**Note**: Use `items` (not `entries`) in `panelGroups`.

### permissions

Declare what data your app reads or writes. Users see these during install.

```jsonc
"permissions": [
  { "id": "read:member",    "label": "Read members",  "description": "Read member profiles and roles", "required": false },
  { "id": "write:messages", "label": "Send messages", "description": "Send messages to channels",      "required": false }
]
```

Common permission keys: `read:member`, `write:member`, `read:messages`, `write:messages`, `read:voice`, `read:roles`, `write:roles`.

### pages

Maps URL paths to Vue component files.

```jsonc
"pages": [
  {
    "id": "template-app",
    "path": "/apps/template",
    "title": "Template",
    "requiredRoles": ["user"],
    "component": "src/pages/index.vue"
  }
]
```

- `path` must start with `/apps/`
- `component` is relative to the repo root (use `component`, not `file`)
- `requiredRoles` is enforced server-side; also add guards client-side

### apiRoutes

Maps HTTP endpoints to Nitro handler files.

```jsonc
"apiRoutes": [
  {
    "method": "GET",
    "path": "/api/apps/template/overview",
    "handler": "src/api/overview.get.ts",
    "requiredRoles": ["user"]
  },
  {
    "method": "POST",
    "path": "/api/apps/template/announce",
    "handler": "src/api/announce.post.ts",
    "requiredRoles": ["moderator"]
  }
]
```

- `path` must start with `/api/apps/`
- File naming convention: `<name>.<method>.ts`
- Use `handler` (not `file`) for the handler path
- `requiredRoles` is enforced by the host before the handler runs

### botHooks

List of bot event names this app handles.

```jsonc
"botHooks": ["onVoiceActivity", "onRoleChange", "onMemberJoin", "onInteraction"]
```

All available hook names:
- `onVoiceActivity` — member joins/leaves/moves in a voice channel
- `onRoleChange` — member's roles are updated
- `onMessage` — a message is sent in a text channel
- `onMemberJoin` — a new member joins the guild
- `onInteraction` — a slash command is used

The corresponding handler must be exported from `src/bot/hooks.ts`.

### configFields

Fields editable by admins in the App Settings UI.

```jsonc
"configFields": [
  {
    "key": "welcomeEnabled",
    "type": "boolean",
    "label": "Enable welcome messages",
    "description": "Send a welcome message when a new member joins.",
    "defaultValue": true
  },
  {
    "key": "welcomeMessage",
    "type": "string",
    "label": "Welcome message",
    "description": "Use {username} as a placeholder.",
    "defaultValue": "Welcome to the server, {username}!"
  },
  {
    "key": "announcementChannelId",
    "type": "string",
    "label": "Announcement channel ID",
    "description": "Discord channel ID where announcements are posted."
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
"installNotes": "After install, configure the announcement channel in App Settings."
```

---

## 3. Hub Integration

### Vue Pages

Pages live in `src/pages/` and are standard Vue 3 SFCs (Single File Components).

```vue
<template>
  <div class="p-6 font-nunito">
    <h1 class="text-2xl font-bold font-nunito">{{ t('app.title') }}</h1>
    <p>{{ overview.membersTracked }}</p>
  </div>
</template>

<script setup>
// Composables provided by the Guildora host — NO imports needed
const { t } = useI18n()
const { user, hasRole } = useAuth()

// Fetch from your app's API route
const { data: overview } = await useFetch('/api/apps/template/overview')
</script>
```

**Available composables** (injected by host, no import needed):
- `useI18n()` — `{ t, locale }` for translations
- `useAuth()` — `{ user, hasRole, guildId }` for current user
- `useAppConfig()` — key/value object of all configField values
- `useFetch()` — standard Nuxt `useFetch`, scoped to host origin

**Routing**: Pages are lazy-loaded. Use `<NuxtLink to="/apps/template/mod">` for internal navigation.

### Nitro API Routes

Handlers are standard Nitro `defineEventHandler` functions.

```typescript
// src/api/overview.get.ts
export default defineEventHandler(async (event) => {
  // context injected by Guildora host
  const { guildId, userId, userRoles, config, db } = event.context.guildora

  // db is a guild-scoped key-value store
  const members = await db.list('member:')

  return { membersTracked: members.length, appActive: true }
})
```

**event.context.guildora** fields:
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
if (!event.context.guildora.userRoles.includes('moderator')) {
  throw createError({ statusCode: 403, message: 'Forbidden' })
}
```

---

## 4. Bot Integration

All bot hooks are exported from a single file: `src/bot/hooks.ts`.

```typescript
// src/bot/hooks.ts
import type { BotContext, VoiceActivityPayload, RoleChangePayload, MemberJoinPayload, InteractionPayload } from '@guildora/app-sdk'

export async function onVoiceActivity(payload: VoiceActivityPayload, ctx: BotContext) {
  if (payload.action === 'join') {
    await ctx.db.set(`member:${payload.memberId}`, { lastSeen: new Date().toISOString() })
  }
}

export async function onRoleChange(payload: RoleChangePayload, ctx: BotContext) {
  const { memberId, addedRoles, removedRoles } = payload
  // handle role changes
}

export async function onMemberJoin(payload: MemberJoinPayload, ctx: BotContext) {
  const channelId = ctx.config.announcementChannelId as string | undefined
  if (channelId) {
    await ctx.bot.sendMessage(channelId, `Welcome, <@${payload.memberId}>!`)
  }
}

export async function onInteraction(payload: InteractionPayload, ctx: BotContext) {
  if (payload.commandName !== 'template') return
  await ctx.db.set(`audit:${payload.memberId}:${Date.now()}`, { command: 'template', at: payload.occurredAt })
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

interface InteractionPayload {
  memberId: string
  commandName: string
  occurredAt: string  // ISO date string
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
- **moderator**: Trusted member. Can manage other users, send announcements.
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
const { userRoles } = event.context.guildora
const privileged = ['moderator', 'admin', 'superadmin']
if (!userRoles.some(r => privileged.includes(r))) {
  throw createError({ statusCode: 403 })
}

// Check in Vue page
const { hasRole } = useAuth()
if (hasRole('moderator')) { /* show mod UI */ }
```

---

## 6. Config Fields

Config values are set per-guild by admins in the App Settings UI.

Access in API handlers:
```typescript
const { config } = event.context.guildora
const channelId = config.announcementChannelId ?? null  // always provide a fallback
```

Access in Vue pages:
```typescript
const config = useAppConfig()
const enabled = config.welcomeEnabled  // true/false
```

Access in bot hooks:
```typescript
const enabled = (ctx.config.welcomeEnabled as boolean) ?? true
```

**Always use fallbacks** — config values can be undefined if not yet set.

---

## 7. i18n

Translation files are in `src/i18n/`. At minimum provide `en.json` and `de.json`.

```json
// src/i18n/en.json
{
  "app": {
    "title": "Template App",
    "welcome": "Welcome back, {username}!"
  }
}
```

```json
// src/i18n/de.json
{
  "app": {
    "title": "Template App",
    "welcome": "Willkommen zurück, {username}!"
  }
}
```

In Vue (no import needed):
```typescript
const { t } = useI18n()
// t('app.title') → "Template App"
// t('app.welcome', { username: 'Alice' }) → "Welcome back, Alice!"
```

The host automatically selects the language based on the user's locale preference.

---

## 8. Design System

Guildora uses a clean, minimalist SaaS design system with subtle shadows, rounded corners, and professional typography.

### Key principles
- **Font**: DM Sans. Set globally on `body` by the hub — apps inherit it automatically. Do not add any font class.
- **Borders**: Rounded corners (`rounded-lg` for cards, `rounded` for buttons), subtle drop shadows.
- **Colors**: Dark neutral backgrounds with vibrant accent colors. Use CSS variables from the host theme.
- **Interactive elements**: Smooth transitions on hover/focus.

### CSS variables (host-provided)
```css
var(--color-surface-1)      /* page background */
var(--color-surface-2)      /* card / panel background */
var(--color-surface-3)      /* elevated surface (modals, dropdowns) */
var(--color-line)            /* border color */
var(--color-text-primary)    /* primary text */
var(--color-text-secondary)  /* labels, secondary text */
var(--color-text-tertiary)   /* placeholder, disabled text */
var(--color-accent)          /* primary accent (guild-configurable) */
var(--color-accent-dark)     /* hover state of accent */
var(--color-success)         /* #22C55E */
var(--color-error)           /* #EF4444 */
var(--color-warning)         /* #F59E0B */
var(--color-info)            /* #3B82F6 */
```

### Hub CSS classes (safe to use directly)
The hub's `main.css` provides these classes — use them instead of DaisyUI equivalents:

- **Layout/Surface**: `.card`, `.stat`, `.modal-box`
- **Feedback**: `.alert`, `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-error`
- **Buttons**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-xs`, `.btn-outline`, `.btn-ghost`, `.btn-error`
- **Forms**: `.input`, `.select`, `.textarea`, `.field`, `.field__label`, `.field__control`, `.field__input`, `.field__select`, `.checkbox-field`, `.checkbox-field__input`
- **Badges**: `.badge`, `.badge-primary`, `.badge-ghost`, `.badge-sm`
- **Misc**: `.loading`, `.loading-spinner`, `.divider`, `.tabs`, `.tab`, `.tab-active`

### Tailwind
Tailwind CSS is available. Use utility classes freely. For colors, always use inline CSS variables rather than Tailwind color utilities (they may not be generated for app SFCs since apps are loaded at runtime, not at build time):

```vue
<template>
  <!-- Card example -->
  <div class="card">
    <div class="p-5">
      <h2 class="text-base font-semibold text-[var(--color-text-primary)] mb-3">Title</h2>
      <p class="text-sm text-[var(--color-text-secondary)]">Subtitle</p>
    </div>
  </div>

  <!-- Stats grid example -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div class="stat">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Label</div>
      <div class="text-2xl font-bold text-[var(--color-accent)]">42</div>
    </div>
  </div>

  <!-- Checkbox example -->
  <input type="checkbox" v-model="enabled" class="w-4 h-4" style="accent-color: var(--color-accent);" />

  <!-- Link example -->
  <a href="/some/path" class="text-sm text-[var(--color-accent)] hover:underline">Go somewhere →</a>
</template>
```

### Do NOT
- Import external CSS frameworks (only Tailwind and hub's `main.css` are available)
- Use hardcoded hex colors (use CSS variables)
- Add font classes — DM Sans is inherited automatically, no class needed
- Use DaisyUI compound sub-classes: `card-body`, `card-title`, `stat-title`, `stat-value`, `stats`, `stats-horizontal`, `stats-vertical`, `checkbox checkbox-primary`, `link link-primary` — these are not defined in the hub and will produce unstyled elements
- Use Tailwind color utilities like `text-primary`, `text-success`, `text-error`, `bg-base-200`, `border-base-300` — use `text-[var(--color-*)]` / `border-[var(--color-line)]` inline instead

---

## 9. Navigation Patterns

### User-without-submenu pattern

When you want plain users to navigate directly to a page (no panel) but moderators to see a submenu:

- Set the **rail item** `requiredRoles: ["user"]` — all members see it
- Set all **panel items** `requiredRoles: ["moderator"]` or higher

Result:
- Plain user → no panel shows → rail click navigates directly to the `to` URL
- Moderator → panel opens with App + Moderation items
- Admin → panel opens with App + Moderation + Admin items

```jsonc
"navigation": {
  "rail": [
    { "id": "template", "to": "/apps/template", "requiredRoles": ["user"] }
  ],
  "panelGroups": [{
    "railItemId": "template",
    "items": [
      { "id": "template-app",   "to": "/apps/template",       "requiredRoles": ["moderator"] },
      { "id": "template-mod",   "to": "/apps/template/mod",   "requiredRoles": ["moderator"] },
      { "id": "template-admin", "to": "/apps/template/admin", "requiredRoles": ["admin"] }
    ]
  }]
}
```

### Active state behavior

The hub uses **most-specific-match** logic for panel items. When multiple items could match the current route via prefix (e.g. `/apps/temporary-voice-channels` matches `/apps/temporary-voice-channels/admin`), only the item with the **longest matching path** is shown as active. Sub-page items always take precedence over root items.

- On `/apps/temporary-voice-channels` → "Voice Rooms" item is active
- On `/apps/temporary-voice-channels/settings` → "Einstellungen" item is active (not "Voice Rooms")
- On `/apps/temporary-voice-channels/admin` → "Zugriffsrechte" item is active (not "Voice Rooms")

---

## 10. Sideloading Workflow

To test your app on a live Guildora instance:

1. Push your code to a **public** GitHub repository
2. Ensure `manifest.json` is at the **root** of the default branch
3. In Guildora, navigate to **Admin → Apps**
4. Click **Sideload App**
5. Enter your repository URL: `https://github.com/username/repo`
6. Click **Load** — the system fetches and validates `manifest.json`
7. Review the app details and click **Install**
8. Click **Activate** to enable the app for your guild

To update a sideloaded app:
- Push changes to GitHub
- In Admin → Apps, click the app → **Refresh** to pull the latest version

---

## 11. Common Mistakes

### manifest.json

| Mistake | Fix |
|---------|-----|
| `id` contains uppercase or spaces | Use only `kebab-case` |
| `pages[].path` doesn't start with `/apps/` | Must be `/apps/your-app-id/...` |
| `apiRoutes[].path` doesn't start with `/api/apps/` | Must be `/api/apps/your-app-id/...` |
| `panelGroups[].railItemId` doesn't match a `rail[].id` | IDs must match exactly |
| Bot hook name typo (e.g. `onVoiceactivty`) | Check capitalization against hook list |
| Using `entries` in `panelGroups` | Use `items` instead |
| Using `file` in `pages` | Use `component` instead |
| Using `file` in `apiRoutes` | Use `handler` instead |
| Missing `onInteraction` when using slash commands | Add to `botHooks` and export from `hooks.ts` |

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
| Non-DM Sans font | Use the host theme's font (DM Sans), do not override |
| Direct `fetch()` calls | Use `useFetch()` composable |

### Bot Hooks

| Mistake | Fix |
|---------|-----|
| Hook not exported from `src/bot/hooks.ts` | Export must be a named export matching the hook name |
| Forgetting `await` on `db.set` | Always `await` async db calls |
| Accessing `payload.durationSeconds` on 'join' | Only available on 'leave' and 'move' |
| Missing `onInteraction` export | Must be exported if listed in `botHooks` |

---

## 12. Test Checklist

Before publishing, verify:

- [ ] `manifest.json` is valid JSON (no trailing commas, no comments)
- [ ] All `pages[].component` paths point to existing files
- [ ] All `apiRoutes[].handler` paths point to existing files
- [ ] `src/bot/hooks.ts` exports all functions listed in `botHooks`
- [ ] `onInteraction` is exported if `"onInteraction"` is in `botHooks`
- [ ] Bot hooks compile without TypeScript errors
- [ ] API routes return proper error codes for missing auth
- [ ] `/api/apps/template/config` returns 403 for moderator, 200 for admin
- [ ] `/api/apps/template/settings` returns 403 for non-admin
- [ ] Config fields all have `defaultValue` values
- [ ] Both `en.json` and `de.json` exist and have identical key structure
- [ ] All Vue pages use hub CSS classes (`.card`, `.stat`, `.alert-*`, `.btn-*`) and CSS variables for colors — no DaisyUI compound sub-classes
- [ ] App can be sideloaded from GitHub URL without errors
- [ ] Navigation appears correctly in rail and panel
- [ ] Plain `user` role: rail item visible, **no panel** → direct navigation
- [ ] Moderator role: panel shows App + Moderation items
- [ ] Admin role: panel shows all 3 items; admin page loads without 403
- [ ] Role restrictions work (try accessing protected pages with lower role)
- [ ] Locale switches between EN/DE on all 3 pages
