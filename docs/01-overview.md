# 01 — Overview: What are NewGuild Apps?

## Architecture

NewGuild consists of two runtime layers:

- **Hub** — a Nuxt/Vue web application. Members interact with it via browser.
- **Bot** — an event processor that handles guild events (voice, messages, role changes).

Apps extend both layers from a single repository. They run **inside** the NewGuild host process — there is no separate server to deploy.

```
GitHub Repo (your app)
    │
    ▼
NewGuild Host (loads app at install time)
    ├─ Hub renders your Vue pages
    ├─ Nitro serves your API routes
    └─ Bot calls your hook handlers on events
```

## Lifecycle

1. **Sideload**: Admin provides a GitHub URL → host fetches `manifest.json`
2. **Install**: Host registers pages, API routes, and bot hooks
3. **Activate**: App becomes live for the guild
4. **Configure**: Admin sets `configFields` values per guild
5. **Use**: Members interact with Hub pages; bot hooks fire on events

## What apps can do

| Capability | How |
|-----------|-----|
| Add pages to the Hub | `src/pages/*.vue` + `manifest.pages` |
| Add sidebar navigation | `manifest.navigation.rail` + `panelGroups` |
| Add API endpoints | `src/api/*.ts` + `manifest.apiRoutes` |
| React to voice/message/role events | `src/bot/hooks.ts` + `manifest.botHooks` |
| Store per-guild data | `ctx.db` / `event.context.newguild.db` |
| Read admin config | `ctx.config` / `event.context.newguild.config` |
| Show translated UI | `src/i18n/*.json` + `useI18n()` |

## Isolation

Each app's data is isolated by guild:
- `db.get('key')` only reads data for the current guild
- Config values are per-guild
- There is no shared global state between guilds

## What apps cannot do

- Run a separate process or server
- Access other apps' data
- Modify the host's core UI outside designated areas
- Make outbound HTTP requests without declaring `requiredEnv` keys (for any secrets)
