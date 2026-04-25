# Voice Rooms

Guildora app for managed temporary voice rooms.

When a user joins a configured lobby channel, the bot creates a temporary voice room in a configured category, moves the user, and cleans up empty managed channels automatically.

## Features

- Automatic voice room creation from a lobby channel
- Icon-based naming with collision-safe allocation
- Per-guild runtime config from Hub Admin (no hardcoded runtime IDs)
- Auto cleanup for empty managed channels
- Dynamic icon rename menu via `/voice-room` interaction

## Runtime Configuration (Hub Admin)

Configure these fields in App Settings:

- `enabled`
- `lobbyChannelId`
- `temporaryVoiceCategoryId`
- `defaultChannelIcon`
- `defaultChannelName`
- `maxManagedChannels`
- `renameEnabled`

## Bot Command

- `/voice-room` opens the icon selector for the caller's current managed voice channel.

## API Routes

- `GET /api/apps/voice-rooms/overview`
- `GET /api/apps/voice-rooms/config`
- `GET /api/apps/voice-rooms/settings`

## Development

1. Update `manifest.json` identity fields (`author`, `repositoryUrl`, versioning as needed).
2. Push to GitHub.
3. In Guildora: **Admin -> Apps -> Sideload**, load repository URL, install, and activate.
4. Configure app fields in Admin before testing voice automation.

## Project Structure

```text
voice-rooms/
├── manifest.json
├── README.md
├── AGENTS.md
└── src/
    ├── api/
    ├── bot/
    │   ├── configLoader.ts
    │   ├── events.ts
    │   ├── interactions.ts
    │   ├── voiceChannelManager.ts
    │   ├── voiceChannelTokens.ts
    │   └── hooks.ts
    ├── pages/
    └── i18n/
```

## License

MIT
