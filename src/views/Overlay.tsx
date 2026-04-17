import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button } from '../components';
import styles from './Overlay.module.css';

const OVERLAY_PORT_KEY = 'overlay-server-port';

export const Overlay: React.FC = () => {
  const { state } = useApp();
  const [serverRunning, setServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState(() => {
    const saved = localStorage.getItem(OVERLAY_PORT_KEY);
    return saved ? parseInt(saved) : 3001;
  });
  const [overlayUrl, setOverlayUrl] = useState('');

  useEffect(() => {
    checkServerStatus();
  }, []);

  useEffect(() => {
    localStorage.setItem(OVERLAY_PORT_KEY, String(serverPort));
  }, [serverPort]);

  const checkServerStatus = async () => {
    const status = await window.electronAPI.overlayStatus();
    setServerRunning(status.running);
    if (status.port) {
      setOverlayUrl(`http://localhost:${status.port}/overlays/game-overlay.html?port=${status.port}`);
    }
  };

  const handleStartServer = async () => {
    const result = await window.electronAPI.overlayStart(serverPort);
    if (result.success) {
      setServerRunning(true);
      setOverlayUrl(`http://localhost:${result.port || serverPort}/overlays/game-overlay.html?port=${result.port || serverPort}`);
    }
  };

  const handleStopServer = async () => {
    const result = await window.electronAPI.overlayStop();
    if (result.success) {
      setServerRunning(false);
      setOverlayUrl('');
    }
  };

  const handleRestartServer = async () => {
    await handleStopServer();
    await new Promise(resolve => setTimeout(resolve, 100));
    await handleStartServer();
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPort = parseInt(e.target.value) || 3001;
    setServerPort(newPort);
    if (serverRunning) {
      handleRestartServer();
    }
  };

  const handleForceUpdate = useCallback(async () => {
    if (!serverRunning || !state.currentMatch) return;

    const match = state.currentMatch;
    const teamA = match.teamA ? state.teams.find(t => t.id === match.teamA) : null;
    const teamB = match.teamB ? state.teams.find(t => t.id === match.teamB) : null;

    const scoreboardData = {
      teamA: teamA ? {
        name: teamA.name,
        tag: teamA.tag,
        color: teamA.color,
      } : null,
      teamB: teamB ? {
        name: teamB.name,
        tag: teamB.tag,
        color: teamB.color,
      } : null,
      scoreA: match.useManualScore 
        ? match.manualScoreA 
        : match.maps.filter(m => m.completed && m.scoreA > m.scoreB).length,
      scoreB: match.useManualScore 
        ? match.manualScoreB 
        : match.maps.filter(m => m.completed && m.scoreB > m.scoreA).length,
      title: match.title,
      subtitle: match.subtitle,
      currentMap: (match.currentMap ?? -1) >= 0 ? match.maps[match.currentMap ?? -1]?.name || '' : '',
      currentMapIndex: (match.currentMap ?? -1) + 1,
      firstTo: match.firstTo,
      mapType: (match.currentMap ?? -1) >= 0 ? match.maps[match.currentMap ?? -1]?.type || '' : '',
      status: match.status
    };

    await window.electronAPI.overlayBroadcast('scoreboard', scoreboardData);
  }, [serverRunning, state.currentMatch, state.teams]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Overlay Output</h1>
      </div>

      <div className={styles.grid}>
        <Panel title="Server Control">
          <div className={styles.section}>
            <div className={styles.serverStatus}>
              <span className={`${styles.statusDot} ${serverRunning ? styles.running : ''}`} />
              <span>{serverRunning ? `Running on port ${serverPort}` : 'Stopped'}</span>
            </div>

            <div className={styles.portField}>
              <label>Port</label>
              <input
                type="number"
                value={serverPort}
                onChange={handlePortChange}
                className={styles.portInput}
              />
            </div>

            <div className={styles.serverButtons}>
              {!serverRunning ? (
                <Button onClick={handleStartServer}>Start Server</Button>
              ) : (
                <Button variant="danger" onClick={handleStopServer}>Stop Server</Button>
              )}
            </div>

            {serverRunning && (
              <div className={styles.urls}>
                <div className={styles.urlItem}>
                  <span className={styles.urlLabel}>Game Overlay URL</span>
                  <code className={styles.urlValue}>{overlayUrl}</code>
                  <Button variant="primary" size="sm" onClick={() => handleCopyUrl(overlayUrl)}>
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <p className={styles.hint}>
              Add this URL as an OBS browser source and set dimensions to 1920x1080.
              The overlay auto-updates when match data changes.
            </p>
          </div>
        </Panel>

        <Panel title="Scoreboard Control">
          <div className={styles.section}>
            <Button 
              onClick={handleForceUpdate}
              disabled={!serverRunning || !state.currentMatch}
              fullWidth
            >
              Force Update Overlay
            </Button>

            {state.currentMatch && (() => {
              const match = state.currentMatch;
              const teamA = state.teams.find(t => t.id === match.teamA);
              const teamB = state.teams.find(t => t.id === match.teamB);
              const scoreA = match.useManualScore 
                ? match.manualScoreA 
                : match.maps.filter(m => m.completed && m.scoreA > m.scoreB).length;
              const scoreB = match.useManualScore 
                ? match.manualScoreB 
                : match.maps.filter(m => m.completed && m.scoreB > m.scoreA).length;
              
              return (
                <div className={styles.currentMatch}>
                  <h4>Current Match</h4>
                  <p>
                    {teamA?.name || 'No Team A'} 
                    {' vs '}
                    {teamB?.name || 'No Team B'}
                  </p>
                  <p className="text-secondary">
                    Score: {scoreA} - {scoreB}
                  </p>
                  <p className="text-secondary">
                    Map: {(match.currentMap != null && match.currentMap >= 0) ? match.maps[match.currentMap]?.name || 'None' : 'None'}
                  </p>
                </div>
              );
            })()}
          </div>
        </Panel>

        <Panel title="Instructions">
          <div className={styles.instructions}>
            <h4>Setting up in OBS:</h4>
            <ol>
              <li>Copy the Game Overlay URL above</li>
              <li>In OBS, add a Browser Source</li>
              <li>Paste the URL into the URL field</li>
              <li>Set the dimensions to 1920x1080</li>
              <li>The overlay will update automatically when you change match data</li>
            </ol>
          </div>
        </Panel>
      </div>
    </div>
  );
};
