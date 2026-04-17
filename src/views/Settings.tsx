import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button } from '../components';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const [paths, setPaths] = useState<{ userData: string; data: string; assets: string } | null>(null);
  const [tempFileCount, setTempFileCount] = useState(0);

  useEffect(() => {
    loadPaths();
    loadTempCount();
  }, []);

  const loadPaths = async () => {
    const p = await window.electronAPI.getPaths();
    setPaths(p);
  };

  const loadTempCount = async () => {
    const count = await window.electronAPI.getTempAssetCount();
    setTempFileCount(count);
  };

  const handleExport = async () => {
    const result = await window.electronAPI.saveFile({
      defaultPath: 'ow-graphics-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      const dataToExport = {
        teams: state.teams,
        matches: state.matches,
        talents: state.talents,
        assets: state.assets,
        exportedAt: new Date().toISOString()
      };
      await window.electronAPI.writeFile(result.filePath, JSON.stringify(dataToExport, null, 2));
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.openFile({
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePaths[0]) {
      const content = await window.electronAPI.readFile(result.filePaths[0]);
      if (content) {
        try {
          const data = JSON.parse(content);
          if (confirm('This will replace all current data. Continue?')) {
            dispatch({ type: 'SET_STATE', payload: data });
          }
        } catch {
          alert('Invalid file format');
        }
      }
    }
  };

  const handleClearTemp = async () => {
    if (tempFileCount === 0) return;
    
    if (confirm(`Delete ${tempFileCount} file(s) from the temp folder? This cannot be undone.`)) {
      const result = await window.electronAPI.clearTempAssets();
      if (result.success) {
        setTempFileCount(0);
        alert(`Deleted ${result.count} file(s)`);
      } else {
        alert('Failed to clear temp folder');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      <div className={styles.sections}>
        <Panel title="Data Management">
          <div className={styles.section}>
            <p className={styles.description}>
              Export your teams, matches, and settings to a file for backup or transfer to another machine.
            </p>
            <div className={styles.actions}>
              <Button onClick={handleExport}>Export Data</Button>
              <Button variant="secondary" onClick={handleImport}>Import Data</Button>
            </div>
          </div>
        </Panel>

        <Panel title="Storage">
          {paths && (
            <div className={styles.section}>
              <div className={styles.paths}>
                <div className={styles.path}>
                  <span className={styles.pathLabel}>Data Directory</span>
                  <code className={styles.pathValue}>{paths.data}</code>
                </div>
                <div className={styles.path}>
                  <span className={styles.pathLabel}>Assets Directory</span>
                  <code className={styles.pathValue}>{paths.assets}</code>
                </div>
              </div>
              <div className={styles.storageActions}>
                <Button variant="secondary" onClick={() => window.electronAPI.openFile}>
                  Open Data Folder
                </Button>
                {tempFileCount > 0 && (
                  <Button variant="danger" onClick={handleClearTemp}>
                    Clear Temp Folder ({tempFileCount} files)
                  </Button>
                )}
              </div>
              <p className="text-muted text-sm">
                Temp folder contains deleted/replaced images pending permanent deletion.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Overlay Settings">
          <div className={styles.section}>
            <div className={styles.setting}>
              <div className={styles.settingInfo}>
                <h4>Default Browser Port</h4>
                <p className="text-muted">Port used for the overlay browser source server</p>
              </div>
              <input
                type="number"
                value={state.overlayServer.port}
                onChange={(e) => dispatch({
                  type: 'SET_OVERLAY_SERVER',
                  payload: { port: parseInt(e.target.value) || 3000 }
                })}
                className={styles.smallInput}
              />
            </div>

            <div className={styles.setting}>
              <div className={styles.settingInfo}>
                <h4>NDI Output Name</h4>
                <p className="text-muted">Name shown when selecting NDI source in OBS</p>
              </div>
              <input
                type="text"
                value={state.ndi.outputName}
                onChange={(e) => dispatch({
                  type: 'SET_NDI',
                  payload: { outputName: e.target.value }
                })}
                className={styles.mediumInput}
              />
            </div>
          </div>
        </Panel>

        <Panel title="About">
          <div className={styles.section}>
            <div className={styles.about}>
              <h3>OW Graphics Control Panel</h3>
              <p className="text-secondary">Version 1.0.0</p>
              <p className={styles.credits}>
                Broadcast graphics control for Overwatch esports productions.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};
