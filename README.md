# NewGuild App Template

A ready-to-use template for building NewGuild apps. Demonstrates all integration points: Hub pages, API routes, bot hooks, config fields, and i18n.

This template implements a **Community Points** system — members earn points for voice activity, moderators can award bonus points, and a leaderboard tracks the top contributors.

## Quick Start

### 1. Use this template

```bash
# Clone or copy this repository
git clone https://github.com/your-username/newguild-app-template.git my-app
cd my-app

# Remove the template's git history and start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit"
```

### 2. Customize the manifest

Edit `manifest.json`:
- Change `id` to your app's unique identifier (e.g. `my-awesome-app`)
- Update `name`, `description`, `author`, `repositoryUrl`
- Adjust navigation, permissions, pages, and hooks as needed

### 3. Implement your logic

- `src/pages/` — Vue components for Hub pages
- `src/api/` — Nitro server handlers for API routes
- `src/bot/hooks.ts` — Bot event handlers
- `src/i18n/` — Translation strings

### 4. Sideload for testing

1. Open your NewGuild instance as Admin
2. Go to **Admin → Apps → Sideload**
3. Paste your GitHub repository URL
4. Click **Load** and then **Activate**

### 5. Publish to Marketplace

See [docs/07-deployment.md](docs/07-deployment.md) for publishing steps.

---

## Documentation

| File | Description |
|------|-------------|
| [docs/01-overview.md](docs/01-overview.md) | What NewGuild apps are and how they work |
| [docs/02-manifest.md](docs/02-manifest.md) | Complete manifest field reference |
| [docs/03-hub-integration.md](docs/03-hub-integration.md) | Pages, API routes, navigation |
| [docs/04-bot-integration.md](docs/04-bot-integration.md) | Bot hook implementation |
| [docs/05-config-fields.md](docs/05-config-fields.md) | Config fields usage |
| [docs/06-i18n.md](docs/06-i18n.md) | Internationalization (DE + EN) |
| [docs/07-deployment.md](docs/07-deployment.md) | Marketplace publishing |

For AI-assisted development, see [AGENTS.md](AGENTS.md).

---

## File Structure

```
newguild-app-template/
├── manifest.json          ← App definition (sideloadable)
├── README.md
├── AGENTS.md              ← AI agent guidance
├── docs/                  ← Full documentation
└── src/
    ├── pages/             ← Vue Hub pages
    ├── api/               ← Nitro API handlers
    ├── bot/               ← Bot hook handlers
    └── i18n/              ← Translation files
```

## License

MIT
