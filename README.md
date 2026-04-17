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
4. Go to the **Overlays** tab to start the overlay server

### Using Overlays in OBS

The app runs an embedded HTTP/WebSocket server (port 3001 by default). You must start the server from the app before overlays can connect.

1. Open the app and go to the **Overlays** tab
2. Click **Start Server** to start the overlay server
3. Add a Browser Source in OBS
4. Enter the overlay URL:
   - Game overlay: `http://localhost:3001/overlays/game-overlay.html`
   - Hero bans: `http://localhost:3001/overlays/hero-bans.html`
   - Map pool: `http://localhost:3001/overlays/map-pool.html`
   - Map select: `http://localhost:3001/overlays/map-select.html`
   - Team roster home: `http://localhost:3001/overlays/team-roster-home.html`
   - Team roster away: `http://localhost:3001/overlays/team-roster-away.html`
   - Row casters: `http://localhost:3001/overlays/row-casters.html`
5. Set width/height: 1920x1080
6. Check "Shutdown source when not visible" to save resources

The overlay server must be running in the app for overlays to connect and receive updates. The app broadcasts state changes via WebSocket automatically when data changes.

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