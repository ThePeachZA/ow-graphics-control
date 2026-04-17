# OW Graphics Control

Overwatch Esports Broadcast Graphics Control Panel - A desktop application for controlling broadcast graphics in Overwatch esports productions.

## Features

- **Match Controller** - Control team rosters, hero bans, map pool, and scores
- **Talent Management** - Manage casters, panel, and interviewees
- **Tournament View** - Configure tournament brackets and match progression
- **Live Overlays** - Real-time overlay control via WebSocket for OBS/browser sources:
  - Game overlay (score, teams, map)
  - Hero bans display
  - Map pool selection
  - Map selection
  - Team rosters (home/away)
  - Row casters

## System Requirements

- Windows 10/11 (x64)
- OBS Studio (for overlay browser sources)

## Getting Started

### Running the App

1. Download the latest release from [GitHub Releases](https://github.com/ThePeachZA/ow-graphics-control/releases)
2. Extract the zip file
3. Run `OW Graphics Control.exe`

### Using Overlays in OBS

1. Add a Browser Source in OBS
2. Enable "Local file" and browse to overlay file in:
   - `resources/overlays/` (packed version)
   - Or use files in `public/overlays/` when running dev mode
3. Set width/height: 1920x1080
4. Check "Shutdown source when not visible" to save resources

Example local URLs:
- Game overlay: `http://localhost:5173/overlays/game-overlay.html`
- Hero bans: `http://localhost:5173/overlays/hero-bans.html`
- Map pool: `http://localhost:5173/overlays/map-pool.html`
- Map select: `http://localhost:5173/overlays/map-select.html`
- Team roster home: `http://localhost:5173/overlays/team-roster-home.html`
- Team roster away: `http://localhost:5173/overlays/team-roster-away.html`

### WebSocket

Overlays connect to `ws://localhost:8767` automatically to receive real-time updates.

## Development

```powershell
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run electron:build
```

## Tech Stack

- Electron 28
- React 18
- TypeScript
- Vite

## License

MIT