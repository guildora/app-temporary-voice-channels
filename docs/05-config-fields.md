# 05 — Config Fields

Config fields let admins customize your app's behavior per guild without touching code.

## Defining Fields

In `manifest.json`:

```jsonc
"configFields": [
  {
    "key": "pointsPerMinute",
    "type": "number",
    "label": "Points per voice minute",
    "description": "Points earned per minute in a voice channel.",
    "default": 1,
    "min": 0,
    "max": 100
  },
  {
    "key": "leaderboardVisible",
    "type": "boolean",
    "label": "Public leaderboard",
    "description": "Show leaderboard to all members.",
    "default": true
  },
  {
    "key": "topTierRole",
    "type": "select",
    "label": "Top tier role",
    "options": ["bronze", "silver", "gold"],
    "default": "gold"
  },
  {
    "key": "welcomeMessage",
    "type": "string",
    "label": "Welcome message",
    "description": "Use {username} as placeholder.",
    "default": "Welcome {username}!"
  }
]
```

## Field Types

| Type | UI | Additional fields |
|------|----|-------------------|
| `string` | Text input | — |
| `number` | Number input | `min`, `max` |
| `boolean` | Toggle switch | — |
| `select` | Dropdown | `options: string[]` |

All fields require: `key`, `type`, `label`, `default`.

## Reading Values

**In API handlers:**
```typescript
const { config } = event.context.newguild
const rate = config.pointsPerMinute ?? 1  // always provide fallback
```

**In bot hooks:**
```typescript
const rate = ctx.config.pointsPerMinute ?? 1
```

**In Vue pages:**
```typescript
const config = useAppConfig()
const isPublic = config.leaderboardVisible
```

## Best Practices

- **Always use fallbacks** — a guild may not have configured the value yet
- **Use descriptive labels** — admins see these in the UI
- **Keep descriptions short** — one sentence explaining what the field does
- **Validate ranges** — use `min`/`max` for numbers to prevent abuse
- **Avoid sensitive data** — don't store secrets in config fields, use `requiredEnv` instead
