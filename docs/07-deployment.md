# 07 — Deployment & Marketplace Publishing

## Sideloading (for testing)

Sideloading lets you load your app directly from a GitHub URL without going through the marketplace review process. Use this for development and testing.

### Steps

1. Push your code to a **public** GitHub repository
2. Ensure `manifest.json` is at the **root** of the default branch (`main` or `master`)
3. In your NewGuild instance, go to **Admin → Apps → Sideload**
4. Enter your repository URL, e.g. `https://github.com/username/my-app`
5. Click **Load** — the host fetches and validates `manifest.json`
6. Review the displayed app info and click **Install**
7. Click **Activate** to enable the app for your guild

### Updating a sideloaded app

1. Push changes to GitHub
2. Go to **Admin → Apps** → click your app
3. Click **Refresh** to pull the latest `manifest.json` and source files

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `manifest.json not found` | File is not at repo root | Move `manifest.json` to root |
| `Invalid manifest` | JSON syntax error | Validate JSON (no trailing commas, no comments) |
| `Page file not found` | `pages[].file` path wrong | Check that file exists at that path |
| `Duplicate app ID` | Another app has the same `id` | Choose a unique `id` |

## Marketplace Publishing

To distribute your app through the NewGuild Marketplace:

### Requirements

- [ ] `manifest.json` is complete with `repositoryUrl`, `license`, `description`
- [ ] Repository is public on GitHub
- [ ] App has been tested via sideloading
- [ ] `README.md` documents what the app does and how to configure it
- [ ] No hardcoded guild IDs or user IDs
- [ ] Config fields cover all customizable behavior

### Submission

1. Ensure your repo is public and the default branch is production-ready
2. Go to the NewGuild Marketplace developer portal
3. Click **Submit App**
4. Enter your repository URL
5. The review team will check your app for:
   - Functional `manifest.json`
   - No malicious code
   - Working sideload install
   - Correct permission declarations
6. Once approved, your app appears in the Marketplace

### Versioning

Use semantic versioning (`major.minor.patch`) in `manifest.json`.

When you release a new version:
1. Update `"version"` in `manifest.json`
2. Commit and push to GitHub
3. Guilds with your app installed will see an update notification

### Best Practices

- Tag releases in GitHub: `git tag v1.0.0 && git push --tags`
- Write a `CHANGELOG.md` so users know what changed
- Never remove `configFields` keys in an update — it breaks existing config
- Never change `apiRoutes[].path` — it breaks existing bookmarks/integrations
- Increment minor version for new features, patch for bug fixes, major for breaking changes
