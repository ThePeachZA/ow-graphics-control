import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button, Input, Select, Tabs, Toggle } from '../components';
import { LogoSelector } from '../components/ImageSelector';
import styles from './MatchController.module.css';

const tabs = [
  { id: 'setup', label: 'Match' },
  { id: 'maps', label: 'Map Selection' },
  { id: 'bans', label: 'Hero Bans' },
  { id: 'talent', label: 'Talent' },
  { id: 'mappool', label: 'Map Pool' },
  { id: 'live', label: 'Timer' },
  { id: 'config', label: 'Config' }
];

const firstToOptions = [
  { value: '1', label: 'First to 1' },
  { value: '2', label: 'First to 2' },
  { value: '3', label: 'First to 3' },
  { value: '4', label: 'First to 4' }
];

const UPDATE_INTERVAL_MS = 3000;

export const MatchController: React.FC = () => {
  const { state, dispatch, createNewMatch, getTeamById } = useApp();
  const [activeTab, setActiveTab] = useState('setup');
  const [serverStatus, setServerStatus] = useState({ running: false, port: null as number | null });
  const [timerMode, setTimerMode] = useState<'countup' | 'countdown' | 'target'>('countup');
  const [targetDateTime, setTargetDateTime] = useState('');
  const [timer, setTimer] = useState({ running: false, seconds: 0, hours: 0, minutes: 0, secondsDisplay: 0 });
  const [timerSettings, setTimerSettings] = useState({ alignment: 'center' as 'left' | 'center' | 'right', leadingZeroes: true, standalone: false });
  const [pendingOverlayUpdate, setPendingOverlayUpdate] = useState(false);

  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cachedRoleIconsRef = useRef<Record<string, string>>({});
  const cachedGameModeIconsRef = useRef<Record<string, string>>({});
  const cachedSideIconsRef = useRef<Record<string, string | null>>({ attack: null, defend: null });
  const cachedHeroIconsRef = useRef<Record<string, string>>({});
  const cachedHeroPortraitsRef = useRef<Record<string, string>>({});
  const cachedTeamAPlayersRef = useRef<any[]>([]);
  const cachedTeamBPlayersRef = useRef<any[]>([]);
  const cachedTeamLogosRef = useRef<{ logoA: string | null; logoB: string | null }>({ logoA: null, logoB: null });

  const match = state.currentMatch;
  const teamColorsEnabled = state.teamColorsEnabled;

  const handleToggleTeamColors = (enabled: boolean) => {
    dispatch({ type: 'SET_TEAM_COLORS_ENABLED', enabled });
  };
  const teamA = match?.teamA ? getTeamById(match.teamA) : undefined;
  const teamB = match?.teamB ? getTeamById(match.teamB) : undefined;

  const calculatedScoreA = match?.maps.filter(m => m.completed && m.scoreA > m.scoreB).length || 0;
  const calculatedScoreB = match?.maps.filter(m => m.completed && m.scoreB > m.scoreA).length || 0;

  const currentScoreA = match?.useManualScore ? (match?.manualScoreA || 0) : calculatedScoreA;
  const currentScoreB = match?.useManualScore ? (match?.manualScoreB || 0) : calculatedScoreB;

  const checkServerStatus = async () => {
    const status = await window.electronAPI.overlayStatus();
    setServerStatus(status);
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getImageUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return await window.electronAPI.readImageAsDataUrl(path);
  };

  // Load static icons (cached)
  const loadStaticIcons = useCallback(async () => {
    // Load role icons
    if (Object.keys(cachedRoleIconsRef.current).length === 0) {
      await Promise.all(state.assets.roles.map(async (role) => {
        if (role.path) {
          const iconUrl = await getImageUrl(role.path);
          if (iconUrl) {
            cachedRoleIconsRef.current[role.name.toLowerCase()] = iconUrl;
            cachedRoleIconsRef.current[role.name] = iconUrl;
          }
        }
      }));
    }

    // Load game mode icons
    if (Object.keys(cachedGameModeIconsRef.current).length === 0) {
      await Promise.all(state.assets.gameModes.map(async (gm) => {
        if (gm.path) {
          const iconUrl = await getImageUrl(gm.path);
          if (iconUrl) {
            cachedGameModeIconsRef.current[gm.name.toLowerCase()] = iconUrl;
          }
        }
      }));
    }

    // Load side icons
    if (!cachedSideIconsRef.current.attack || !cachedSideIconsRef.current.defend) {
      await Promise.all(state.assets.sides.map(async (side) => {
        const sideName = side.name.toLowerCase();
        if (sideName.includes('attack') && !cachedSideIconsRef.current.attack) {
          const iconUrl = await getImageUrl(side.path);
          if (iconUrl) cachedSideIconsRef.current.attack = iconUrl;
        } else if (sideName.includes('defend') && !cachedSideIconsRef.current.defend) {
          const iconUrl = await getImageUrl(side.path);
          if (iconUrl) cachedSideIconsRef.current.defend = iconUrl;
        }
      }));
    }
  }, [state.assets.roles, state.assets.gameModes, state.assets.sides]);

  // Load hero icons
  const loadHeroIcons = useCallback(async () => {
    // Return cached if available
    if (Object.keys(cachedHeroIconsRef.current).length > 0) {
      return cachedHeroIconsRef.current;
    }
    const heroIcons: Record<string, string> = {};
    await Promise.all(state.assets.heroes.map(async (hero) => {
      if (hero.iconPath) {
        const iconUrl = await getImageUrl(hero.iconPath);
        if (iconUrl) heroIcons[hero.name] = iconUrl;
      }
    }));
    cachedHeroIconsRef.current = heroIcons;
    return heroIcons;
  }, [state.assets.heroes]);

  // Load hero portraits for banned heroes
  const loadHeroPortraits = useCallback(async () => {
    // Return cached if available
    if (Object.keys(cachedHeroPortraitsRef.current).length > 0) {
      return cachedHeroPortraitsRef.current;
    }
    if (!match) return {};
    const heroPortraits: Record<string, string> = {};
    const bannedHeroNames = new Set<string>();
    for (const bans of match.heroBans || []) {
      bans.teamA.forEach(n => bannedHeroNames.add(n));
      bans.teamB.forEach(n => bannedHeroNames.add(n));
    }
    await Promise.all(state.assets.heroes.map(async (hero) => {
      if (bannedHeroNames.has(hero.name)) {
        const portraitPath = hero.path || hero.portraitPath;
        if (portraitPath) {
          const portraitUrl = await getImageUrl(portraitPath);
          if (portraitUrl) heroPortraits[hero.name] = portraitUrl;
        }
      }
    }));
    cachedHeroPortraitsRef.current = heroPortraits;
    return heroPortraits;
  }, [match?.heroBans, state.assets.heroes]);

  // Load team logo URLs
  const loadTeamLogos = useCallback(async (currentTeamA: any, currentTeamB: any) => {
    // Return cached if available
    if (cachedTeamLogosRef.current.logoA && cachedTeamLogosRef.current.logoB) {
      return cachedTeamLogosRef.current;
    }
    const [logoA, logoB] = await Promise.all([
      currentTeamA?.logoAssetId 
        ? getImageUrl(state.assets.logos.find(a => a.id === currentTeamA.logoAssetId)?.path || '')
        : Promise.resolve(null),
      currentTeamB?.logoAssetId 
        ? getImageUrl(state.assets.logos.find(a => a.id === currentTeamB.logoAssetId)?.path || '')
        : Promise.resolve(null)
    ]);
    cachedTeamLogosRef.current = { logoA, logoB };
    return { logoA, logoB };
  }, [state.assets.logos]);

  // Load player data with portraits and hero images
  const loadTeamPlayers = useCallback(async (team: any, cacheArray: any[]) => {
    if (!team) return [];
    // Return cached if available
    if (cacheArray.length > 0) {
      return cacheArray;
    }
    const players = await Promise.all((team.players || []).map(async (player: any) => {
      const portraitAsset = player.portraitAssetId 
        ? state.assets.portraits.find(a => a.id === player.portraitAssetId)
        : null;
      const heroAsset = player.featuredHeroAssetId
        ? state.assets.heroes.find(a => a.id === player.featuredHeroAssetId)
        : null;
      
      const [portraitUrl, heroImageUrl] = await Promise.all([
        portraitAsset?.path ? getImageUrl(portraitAsset.path) : Promise.resolve(null),
        heroAsset?.path ? getImageUrl(heroAsset.path) : Promise.resolve(null)
      ]);
      
      return {
        name: player.name,
        role: player.role,
        position: player.position,
        pronouns: player.pronouns,
        portraitUrl,
        heroImageUrl
      };
    }));
    // Update the cache refs
    if (team.id === match?.teamA) {
      cachedTeamAPlayersRef.current = players;
    } else if (team.id === match?.teamB) {
      cachedTeamBPlayersRef.current = players;
    }
    return players;
  }, [match?.teamA, match?.teamB, state.assets.portraits, state.assets.heroes]);

  // Load map images
  const loadMapsData = useCallback(async () => {
    if (!match) return [];
    
    const currentTeamA = match.teamA ? state.teams.find(t => t.id === match.teamA) : null;
    const currentTeamB = match.teamB ? state.teams.find(t => t.id === match.teamB) : null;
    
    return Promise.all((match.maps || []).map(async (map) => {
      const mapAsset = map.name 
        ? state.assets.maps.find(a => a.name.toLowerCase() === map.name.toLowerCase())
        : null;
      const mapImageUrl = mapAsset?.path ? await getImageUrl(mapAsset.path) : null;
      
      let chosenByName: string | null = null;
      if (map.chosenBy === 'A' && currentTeamA) {
        chosenByName = currentTeamA.tag;
      } else if (map.chosenBy === 'B' && currentTeamB) {
        chosenByName = currentTeamB.tag;
      }
      
      return {
        name: map.name,
        type: map.type,
        completed: map.completed,
        scoreA: map.scoreA,
        scoreB: map.scoreB,
        mapImageUrl,
        chosenBy: map.chosenBy,
        chosenByName
      };
    }));
  }, [match?.maps, match?.teamA, match?.teamB, state.assets.maps, state.teams]);

  // Build map pool data grouped by game mode
  const buildMapPoolData = useCallback(async () => {
    const poolData: Array<{
      modeName: string;
      modeIcons: string[];
      maps: Array<{ 
        name: string; 
        imageUrl: string | null;
        chosenBy: 'A' | 'B' | null;
        chosenByLogo: string | null;
      }>;
    }> = [];

    if (!match || !match.mapPool || match.mapPool.length === 0) {
      return poolData;
    }

    const currentTeamA = match.teamA ? state.teams.find(t => t.id === match.teamA) : null;
    const currentTeamB = match.teamB ? state.teams.find(t => t.id === match.teamB) : null;

    // Build map name to chosenBy lookup
    const chosenByLookup: Record<string, 'A' | 'B' | null> = {};
    match.maps.forEach(map => {
      if (map.name) {
        chosenByLookup[map.name] = map.chosenBy;
      }
    });

    // Load team logos
    const [logoA, logoB] = await Promise.all([
      currentTeamA?.logoAssetId 
        ? getImageUrl(state.assets.logos.find(a => a.id === currentTeamA.logoAssetId)?.path || '')
        : Promise.resolve(null),
      currentTeamB?.logoAssetId 
        ? getImageUrl(state.assets.logos.find(a => a.id === currentTeamB.logoAssetId)?.path || '')
        : Promise.resolve(null)
    ]);

    // Group pool maps by game mode
    const mapsByMode: Record<string, string[]> = {};
    
    for (const mapName of match.mapPool) {
      const mapAsset = state.assets.maps.find(a => a.name === mapName);
      if (!mapAsset) continue;

      // Get the game mode for this map
      const gameMode = mapAsset.gameModeAssetId
        ? state.assets.gameModes.find(gm => gm.id === mapAsset.gameModeAssetId)
        : null;
      const modeName = gameMode?.name || 'Other';

      if (!mapsByMode[modeName]) {
        mapsByMode[modeName] = [];
      }
      mapsByMode[modeName].push(mapName);
    }

    // Build the data for each mode
    for (const [modeName, mapNames] of Object.entries(mapsByMode)) {
      const gameMode = state.assets.gameModes.find(gm => gm.name === modeName);
      const modeIcon = gameMode?.path ? await getImageUrl(gameMode.path) : null;

      const maps = await Promise.all(mapNames.map(async (mapName) => {
        const mapAsset = state.assets.maps.find(a => a.name === mapName);
        const imageUrl = mapAsset?.path ? await getImageUrl(mapAsset.path) : null;
        const chosenBy = chosenByLookup[mapName] || null;
        const chosenByLogo = chosenBy === 'A' ? logoA : chosenBy === 'B' ? logoB : null;
        return { name: mapName, imageUrl, chosenBy, chosenByLogo };
      }));

      poolData.push({
        modeName,
        modeIcons: modeIcon ? [modeIcon] : [],
        maps
      });
    }

    // Sort: alphabetically, with Flashpoint and Push on the right
    const flashpointPush = ['Flashpoint', 'Push'];
    const otherModes = poolData.filter(p => !flashpointPush.includes(p.modeName));
    const fpPushModes = poolData.filter(p => flashpointPush.includes(p.modeName));
    
    otherModes.sort((a, b) => a.modeName.localeCompare(b.modeName));
    fpPushModes.sort((a, b) => a.modeName.localeCompare(b.modeName));
    
    return [...otherModes, ...fpPushModes];
  }, [match?.mapPool, match?.maps, match?.teamA, match?.teamB, state.assets.maps, state.assets.gameModes, state.assets.logos, state.teams]);

  // Load casters data
  const loadCastersData = useCallback(async () => {
    if (!match?.talent) return [];

    const talentRoles = ['caster1', 'caster2', 'panel1', 'panel2', 'panel3', 'interviewer'] as const;
    const casters: Array<{
      displayName: string;
      pronouns?: string;
      socialMedia?: { platform: string; handle: string };
      portraitUrl: string | null;
    }> = [];

    for (const role of talentRoles) {
      const talentSlot = match.talent[role];
      if (talentSlot?.talentId) {
        const talent = state.talents.find(t => t.id === talentSlot.talentId);
        if (talent) {
          const portraitUrl = talent.portraitAssetId
            ? await getImageUrl(state.assets.portraits.find(a => a.id === talent.portraitAssetId)?.path || '')
            : null;
          
          casters.push({
            displayName: talent.displayName,
            pronouns: talent.pronouns,
            socialMedia: talent.socialMedia,
            portraitUrl
          });
        }
      }
    }

    return casters;
  }, [match?.talent, state.talents, state.assets.portraits]);

  const broadcastLiveOverlay = useCallback(async () => {
    if (!match || !serverStatus.running) return;

    // Load static icons first (cached)
    await loadStaticIcons();

    const currentTeamA = match.teamA ? state.teams.find(t => t.id === match.teamA) : null;
    const currentTeamB = match.teamB ? state.teams.find(t => t.id === match.teamB) : null;

    const calculatedScoreA = match.maps.filter(m => m.completed && m.scoreA > m.scoreB).length || 0;
    const calculatedScoreB = match.maps.filter(m => m.completed && m.scoreB > m.scoreA).length || 0;
    const finalScoreA = match.useManualScore ? (match.manualScoreA || 0) : calculatedScoreA;
    const finalScoreB = match.useManualScore ? (match.manualScoreB || 0) : calculatedScoreB;

    // Load all data in parallel
    const [
      teamLogos,
      teamAPlayers,
      teamBPlayers,
      heroIcons,
      heroPortraits,
      mapsData,
      mapPoolData,
      castersData
    ] = await Promise.all([
      loadTeamLogos(currentTeamA, currentTeamB),
      loadTeamPlayers(currentTeamA, cachedTeamAPlayersRef.current),
      loadTeamPlayers(currentTeamB, cachedTeamBPlayersRef.current),
      loadHeroIcons(),
      loadHeroPortraits(),
      loadMapsData(),
      buildMapPoolData(),
      loadCastersData()
    ]);

    // Load tournament and watermark logos
    const tournamentLogo = state.tournamentLogoAssetId
      ? state.assets.logos.find(a => a.id === state.tournamentLogoAssetId)
      : null;
    const watermarkLogo = state.watermarkLogoAssetId
      ? state.assets.logos.find(a => a.id === state.watermarkLogoAssetId)
      : null;

    const [tournamentLogoUrl, watermarkLogoUrl] = await Promise.all([
      tournamentLogo?.path ? getImageUrl(tournamentLogo.path) : Promise.resolve(null),
      watermarkLogo?.path ? getImageUrl(watermarkLogo.path) : getImageUrl('public/assets/logos/Peach.png')
    ]);

    const scoreboardData = {
      teamA: currentTeamA ? {
        name: currentTeamA.name,
        tag: currentTeamA.tag,
        record: currentTeamA.record || '0-0',
        color: currentTeamA.color,
        logoBgColor: currentTeamA.auxColor || '#090909',
        logoUrl: teamLogos.logoA
      } : null,
      teamB: currentTeamB ? {
        name: currentTeamB.name,
        tag: currentTeamB.tag,
        record: currentTeamB.record || '0-0',
        color: currentTeamB.color,
        logoBgColor: currentTeamB.auxColor || '#090909',
        logoUrl: teamLogos.logoB
      } : null,
      scoreA: finalScoreA,
      scoreB: finalScoreB,
      title: match.title,
      subtitle: match.subtitle,
      currentMap: (match.currentMap ?? -1) >= 0 ? match.maps[match.currentMap ?? -1]?.name || '' : '',
      currentMapIndex: match.currentMap,
      firstTo: match.firstTo,
      mapType: (match.currentMap ?? -1) >= 0 ? match.maps[match.currentMap ?? -1]?.type || '' : '',
      status: match.status,
      side: match.side || 0,
      swapSides: match.swapSides,
      loserPicks: match.loserPicks,
      gameModeIcons: cachedGameModeIconsRef.current,
      heroIcons,
      heroPortraits,
      sideIcons: cachedSideIconsRef.current,
      roleIcons: cachedRoleIconsRef.current,
      teamAPlayers,
      teamBPlayers,
      maps: mapsData,
      heroBans: match.heroBans || [],
      mapPool: match.mapPool || [],
      mapPoolData,
      castersData,
      tournamentLogoUrl,
      watermarkLogoUrl,
      teamColorsEnabled,
      showPlayerPortraits: match.showPlayerPortraits
    };

    await Promise.all([
      window.electronAPI.overlayBroadcast('scoreboard', scoreboardData),
      window.electronAPI.overlayBroadcast('gameOverlay', scoreboardData),
      window.electronAPI.overlayBroadcast('mapSelect', scoreboardData),
      window.electronAPI.overlayBroadcast('heroBans', scoreboardData),
      window.electronAPI.overlayBroadcast('teamRoster', scoreboardData),
      window.electronAPI.overlayBroadcast('casters', { castersData })
    ]);
    
    setPendingOverlayUpdate(false);
  }, [match, state.teams, state.assets, state.talents, state.tournamentLogoAssetId, state.watermarkLogoAssetId, state.teamColorsEnabled, serverStatus.running, loadStaticIcons, loadHeroIcons, loadHeroPortraits, loadTeamLogos, loadTeamPlayers, loadMapsData, buildMapPoolData, loadCastersData]);

  useEffect(() => {
    if (match && serverStatus.running) {
      setPendingOverlayUpdate(true);
    }
  }, [match?.teamA, match?.teamB, match?.title, match?.subtitle, match?.currentMap, match?.maps, match?.mapPool, match?.firstTo, match?.useManualScore, match?.manualScoreA, match?.manualScoreB, match?.status, match?.swapSides, match?.side, match?.loserPicks, match?.talent, serverStatus.running]);

  useEffect(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (serverStatus.running) {
      updateIntervalRef.current = setInterval(() => {
        if (pendingOverlayUpdate) {
          broadcastLiveOverlay();
        }
      }, UPDATE_INTERVAL_MS);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [serverStatus.running, pendingOverlayUpdate, broadcastLiveOverlay]);

  useEffect(() => {
    if (timer.running) {
      const interval = setInterval(() => {
        setTimer(t => {
          let newSeconds: number;
          if (timerMode === 'countdown') {
            newSeconds = Math.max(0, t.seconds - 1);
          } else if (timerMode === 'target' && targetDateTime) {
            const target = new Date(targetDateTime).getTime();
            const now = Date.now();
            newSeconds = Math.max(0, Math.floor((target - now) / 1000));
            if (newSeconds <= 0) {
              return { ...t, running: false, seconds: 0, hours: 0, minutes: 0, secondsDisplay: 0 };
            }
          } else {
            newSeconds = t.seconds + 1;
          }
          const hours = Math.floor(newSeconds / 3600);
          const minutes = Math.floor((newSeconds % 3600) / 60);
          const secondsDisplay = newSeconds % 60;
          if (serverStatus.running) {
            window.electronAPI.overlayBroadcast('matchTimer', {
              hours,
              minutes,
              seconds: secondsDisplay,
              settings: timerSettings
            });
          }
          return { ...t, seconds: newSeconds, hours, minutes, secondsDisplay };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer.running, serverStatus.running, timerMode, targetDateTime, timerSettings]);

  useEffect(() => {
    if (serverStatus.running && !timer.running) {
      window.electronAPI.overlayBroadcast('matchTimer', {
        hours: timer.hours,
        minutes: timer.minutes,
        seconds: timer.secondsDisplay,
        settings: timerSettings
      });
    }
  }, [timerSettings, serverStatus.running, timer.running]);

  const startTimer = () => {
    setTimer(t => ({ ...t, running: true }));
    if (serverStatus.running) {
      window.electronAPI.overlayBroadcast('matchTimer', { action: 'start' });
    }
  };

  const pauseTimer = () => {
    setTimer(t => ({ ...t, running: false }));
    if (serverStatus.running) {
      window.electronAPI.overlayBroadcast('matchTimer', { action: 'pause' });
    }
  };

  const resetTimer = () => {
    const hours = timerMode === 'countdown' ? timer.hours : 0;
    const minutes = timerMode === 'countdown' ? timer.minutes : 0;
    const secondsDisplay = timerMode === 'countdown' ? timer.secondsDisplay : 0;
    const totalSeconds = hours * 3600 + minutes * 60 + secondsDisplay;
    setTimer({ running: false, seconds: totalSeconds, hours, minutes, secondsDisplay });
    if (serverStatus.running) {
      window.electronAPI.overlayBroadcast('matchTimer', { action: 'reset', hours, minutes, seconds: secondsDisplay });
    }
  };

  const handleExportMatch = () => {
    if (!match) return;
    const exportData = {
      version: 1,
      match: match,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-${match.title || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMatch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.version && data.match) {
          const importedMatch = {
            ...data.match,
            id: crypto.randomUUID()
          };
          dispatch({ type: 'SET_CURRENT_MATCH', payload: importedMatch });
        } else if (data.title !== undefined) {
          const importedMatch = {
            ...data,
            id: crypto.randomUUID()
          };
          dispatch({ type: 'SET_CURRENT_MATCH', payload: importedMatch });
        } else {
          alert('Invalid match file format');
        }
      } catch (error) {
        console.error('Failed to import match:', error);
        alert('Failed to import match file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (!match) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>No Match Active</h2>
          <p className="text-secondary">Create a new match or import one</p>
          <div className={styles.emptyButtons}>
            <Button onClick={createNewMatch} size="lg">
              Create New Match
            </Button>
            <label className={styles.importButton}>
              <input
                type="file"
                accept=".json"
                onChange={handleImportMatch}
                style={{ display: 'none' }}
              />
              <Button size="lg">
                Import Match
              </Button>
            </label>
          </div>
        </div>
      </div>
    );
  }

  const recalculateLoserPicks = (maps: typeof match.maps): typeof maps => {
    return maps.map((map, index) => {
      if (!map.name) {
        return { ...map, chosenBy: null };
      }

      if (index === 0) {
        return { ...map, chosenBy: 'A' as const };
      }

      let lastLoser: 'A' | 'B' | null = null;
      for (let i = index - 1; i >= 0; i--) {
        const prevMap = maps[i];
        if (prevMap.name) {
          if (prevMap.scoreA > prevMap.scoreB) {
            lastLoser = 'B';
          } else if (prevMap.scoreB > prevMap.scoreA) {
            lastLoser = 'A';
          } else if (prevMap.chosenBy) {
            lastLoser = prevMap.chosenBy;
          }
          break;
        }
      }

      return { ...map, chosenBy: lastLoser || 'A' as const };
    });
  };

  const handleUpdateMatch = (field: string, value: any) => {
    if (field === 'loserPicks' && value === true) {
      const recalculatedMaps = recalculateLoserPicks(match.maps);
      dispatch({ type: 'UPDATE_MATCH', payload: { [field]: value, maps: recalculatedMaps } });
    } else {
      dispatch({ type: 'UPDATE_MATCH', payload: { [field]: value } });
    }
  };

  const handleSetTeam = (side: 'A' | 'B', teamId: string) => {
    dispatch({ type: 'SET_MATCH_TEAM', side, teamId });
  };

  const handleSetMap = (index: number, name: string) => {
    const selectedMapAsset = name 
      ? state.assets.maps.find(a => a.name.toLowerCase() === name.toLowerCase())
      : null;
    
    let newType = '';
    if (selectedMapAsset?.gameModeAssetId) {
      const linkedGameMode = state.assets.gameModes.find(gm => gm.id === selectedMapAsset.gameModeAssetId);
      if (linkedGameMode) {
        newType = linkedGameMode.name;
      }
    }

    // Calculate chosenBy for loser picks mode
    let newChosenBy: 'A' | 'B' | null = name ? match.maps[index].chosenBy : null;
    if (match.loserPicks && name) {
      if (index === 0) {
        // First map is chosen by home team (A)
        newChosenBy = 'A';
      } else {
        // Find the last map with a winner to determine who picks
        let lastLoser: 'A' | 'B' | null = null;
        for (let i = index - 1; i >= 0; i--) {
          const prevMap = match.maps[i];
          if (prevMap.name && (prevMap.completed || i < index)) {
            if (prevMap.scoreA > prevMap.scoreB) {
              lastLoser = 'B';
            } else if (prevMap.scoreB > prevMap.scoreA) {
              lastLoser = 'A';
            } else if (prevMap.chosenBy) {
              // If draw, use the chosenBy from that map
              lastLoser = prevMap.chosenBy;
            }
            break;
          }
        }
        // If no previous loser found, default to home team
        newChosenBy = lastLoser || 'A';
      }
    }

    dispatch({
      type: 'SET_MAP',
      index,
      map: { 
        ...match.maps[index], 
        name,
        type: newType,
        imageAssetId: selectedMapAsset?.id || null,
        chosenBy: newChosenBy
      }
    });
  };

  const handleSetMapType = (index: number, type: string, gameModeAssetId: string | null) => {
    dispatch({
      type: 'SET_MAP',
      index,
      map: { 
        ...match.maps[index], 
        type,
        gameModeAssetId
      }
    });
  };

  const handleSetMapScores = (index: number, scoreA: number, scoreB: number) => {
    dispatch({
      type: 'SET_MAP',
      index,
      map: { ...match.maps[index], scoreA, scoreB }
    });

    // If loserPicks is enabled and this map has a winner, update next map's chosenBy
    if (match.loserPicks && index < match.maps.length - 1) {
      const currentMap = match.maps[index];
      let loser: 'A' | 'B' | null = null;
      
      if (scoreA > scoreB) {
        loser = 'B';
      } else if (scoreB > scoreA) {
        loser = 'A';
      } else if (currentMap.chosenBy) {
        // Draw - keep the same picker
        loser = currentMap.chosenBy;
      }
      
      if (loser) {
        const nextMap = match.maps[index + 1];
        if (nextMap.name && nextMap.chosenBy !== loser) {
          dispatch({
            type: 'SET_MAP',
            index: index + 1,
            map: { ...nextMap, chosenBy: loser }
          });
        }
      }
    }
  };

  const handleSetCurrentMap = (index: number | null) => {
    handleUpdateMatch('currentMap', index);
  };

  const handleToggleManualScore = (enabled: boolean) => {
    handleUpdateMatch('useManualScore', enabled);
  };

  const handleSetManualScore = (side: 'A' | 'B', score: number) => {
    if (side === 'A') {
      handleUpdateMatch('manualScoreA', score);
    } else {
      handleUpdateMatch('manualScoreB', score);
    }
  };

  const mapNameOptions = [
    { value: '', label: 'Select a map...' },
    ...state.assets.maps.map(m => ({ value: m.name, label: m.name }))
  ];

  const gameModeOptions = [
    { value: '', label: 'TBC' },
    ...state.assets.gameModes.map(gm => ({ value: gm.name, label: gm.name }))
  ];

  const handleForceUpdate = async () => {
    if (!serverStatus.running) return;
    await broadcastLiveOverlay();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Match Controller</h1>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="sm" onClick={handleExportMatch} title="Export Match">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </Button>
          <label className={styles.headerImportBtn} title="Import Match">
            <input
              type="file"
              accept=".json"
              onChange={handleImportMatch}
              style={{ display: 'none' }}
            />
            <span className={styles.iconButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </span>
          </label>
          <div className={styles.headerSideButtons}>
            <button
              className={`${styles.headerSideButton} ${match.side === 0 ? styles.active : ''}`}
              onClick={() => handleUpdateMatch('side', 0)}
              title="Neutral"
            >
              N
            </button>
            <button
              className={`${styles.headerSideButton} ${match.side === 1 ? styles.active : ''}`}
              onClick={() => handleUpdateMatch('side', 1)}
              title="Attack / Defend"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path>
                <path d="M13 19l6-6"></path>
                <path d="M16 16l4 4"></path>
                <path d="M19 21l2-2"></path>
                <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"></path>
                <path d="M5 14l6-6"></path>
                <path d="M8 11l-4 4"></path>
                <path d="M3 11l2-2"></path>
              </svg>
            </button>
            <button
              className={`${styles.headerSideButton} ${match.side === 2 ? styles.active : ''}`}
              onClick={() => handleUpdateMatch('side', 2)}
              title="Defend / Attack"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </button>
          </div>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleForceUpdate}
            disabled={!serverStatus.running}
            title="Force Update Overlay"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className={styles.content}>
        {activeTab === 'setup' && (
          <div className={styles.setupGrid}>
            <Panel title="Match Info">
              <div className={styles.formGrid}>
                <Input
                  label="Title"
                  value={match.title}
                  onChange={(e) => handleUpdateMatch('title', e.target.value)}
                  placeholder="e.g., Grand Finals"
                />
                <Input
                  label="Subtitle"
                  value={match.subtitle}
                  onChange={(e) => handleUpdateMatch('subtitle', e.target.value)}
                  placeholder="e.g., Week 4"
                />
                <Select
                  label="Format"
                  value={String(match.firstTo)}
                  onChange={(e) => handleUpdateMatch('firstTo', parseInt(e.target.value))}
                  options={firstToOptions}
                />
              </div>
            </Panel>

            <Panel title="Teams">
              <div className={styles.teamsGrid}>
                <div className={styles.teamSide}>
                  <span className={styles.teamLabel}>Team A</span>
                  <select
                    className={styles.teamSelect}
                    value={match.teamA}
                    onChange={(e) => handleSetTeam('A', e.target.value)}
                  >
                    <option value="">Select Team</option>
                    {state.teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.tag} - {team.name}
                      </option>
                    ))}
                  </select>
                  {teamA && (
                    <div className={styles.teamPreview}>
                      <div className={styles.teamColor} style={{ backgroundColor: teamA.color }} />
                      <span>{teamA.name}</span>
                    </div>
                  )}
                </div>

                <div className={styles.vsDivider}>
                  <span>VS</span>
                  <Toggle
                    checked={!!match.swapSides}
                    onChange={(c) => handleUpdateMatch('swapSides', c)}
                    label="Swap"
                    size="sm"
                  />
                </div>

                <div className={styles.teamSide}>
                  <span className={styles.teamLabel}>Team B</span>
                  <select
                    className={styles.teamSelect}
                    value={match.teamB}
                    onChange={(e) => handleSetTeam('B', e.target.value)}
                  >
                    <option value="">Select Team</option>
                    {state.teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.tag} - {team.name}
                      </option>
                    ))}
                  </select>
                  {teamB && (
                    <div className={styles.teamPreview}>
                      <div className={styles.teamColor} style={{ backgroundColor: teamB.color }} />
                      <span>{teamB.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="Score">
              <div className={styles.scoreSection}>
                <div className={styles.scoreDisplay}>
                  <div className={styles.scoreTeam}>
                    <span className={styles.scoreLabel}>{teamA?.tag || 'Team A'}</span>
                    <span className={styles.scoreValue}>{currentScoreA}</span>
                  </div>
                  <div className={styles.scoreSeparator}>
                    <span>-</span>
                  </div>
                  <div className={styles.scoreTeam}>
                    <span className={styles.scoreLabel}>{teamB?.tag || 'Team B'}</span>
                    <span className={styles.scoreValue}>{currentScoreB}</span>
                  </div>
                </div>
                <div className={styles.scoreInfo}>
                  <span className="text-muted text-sm">
                    Auto-calculated from map wins
                  </span>
                </div>
                <Toggle
                  checked={match.useManualScore}
                  onChange={handleToggleManualScore}
                  label="Use manual score override"
                  size="sm"
                />
                {match.useManualScore && (
                  <div className={styles.manualScoreInputs}>
                    <Input
                      label={`${teamA?.tag || 'Team A'} Score`}
                      type="number"
                      value={match.manualScoreA}
                      onChange={(e) => handleSetManualScore('A', parseInt(e.target.value) || 0)}
                      min={0}
                      max={99}
                    />
                    <Input
                      label={`${teamB?.tag || 'Team B'} Score`}
                      type="number"
                      value={match.manualScoreB}
                      onChange={(e) => handleSetManualScore('B', parseInt(e.target.value) || 0)}
                      min={0}
                      max={99}
                    />
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'config' && (
          <div className={styles.setupGrid}>
            <Panel title="Overlay Appearance">
              <div className={styles.sideSelection}>
                <Toggle
                  checked={teamColorsEnabled}
                  onChange={handleToggleTeamColors}
                  label="Enable team colors on overlay"
                  size="sm"
                />
                <p className="text-muted text-sm">
                  {teamColorsEnabled ? 'Team colors are enabled' : 'Default white background with black text'}
                </p>
              </div>
            </Panel>

            <Panel title="Player Display">
              <div className={styles.sideSelection}>
                <Toggle
                  checked={match.showPlayerPortraits}
                  onChange={(c) => handleUpdateMatch('showPlayerPortraits', c)}
                  label="Show player portraits on roster overlay"
                  size="sm"
                />
                <p className="text-muted text-sm">
                  {match.showPlayerPortraits 
                    ? 'Player portraits will be shown on roster overlays' 
                    : 'Only role icons and player names will be shown'}
                </p>
              </div>
            </Panel>

            <Panel title="Branding">
              <div className={styles.brandingSection}>
                <div className={styles.brandingItem}>
                  <label className={styles.brandingLabel}>Tournament Logo</label>
                  <LogoSelector
                    value={state.tournamentLogoAssetId}
                    onChange={(id) => dispatch({ type: 'SET_TOURNAMENT_LOGO', assetId: id })}
                    category="logos"
                  />
                </div>
                <div className={styles.brandingItem}>
                  <label className={styles.brandingLabel}>Sponsor Logo</label>
                  <LogoSelector
                    value={state.watermarkLogoAssetId}
                    onChange={(id) => dispatch({ type: 'SET_WATERMARK_LOGO', assetId: id })}
                    category="logos"
                  />
                </div>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'maps' && (
          <div className={styles.mapsGrid}>
            <div className={styles.mapsHeader}>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => {
                  if (confirm('Are you sure you want to reset all Maps? This will clear all map names, game modes, and scores.')) {
                    const defaultMaps = Array(8).fill(null).map(() => ({
                      name: '',
                      type: '',
                      gameModeAssetId: null,
                      imageAssetId: null,
                      completed: false,
                      scoreA: 0,
                      scoreB: 0,
                      chosenBy: null
                    }));
                    dispatch({
                      type: 'UPDATE_MATCH',
                      payload: { ...match, maps: defaultMaps, heroBans: defaultMaps.map(() => ({ firstBanTeam: null, teamA: [], teamB: [] })), currentMap: null }
                    });
                  }
                }}
              >
                Reset All Maps
              </Button>
            </div>
            {match.maps.map((map, index) => (
              <Panel key={index} title={index === 7 ? 'Tiebreaker' : `Map ${index + 1}`}>
                <div className={styles.mapSlot}>
                  <Select
                    label="Map Name"
                    value={map.name}
                    onChange={(e) => handleSetMap(index, e.target.value)}
                    options={mapNameOptions}
                  />
                  <Select
                    label="Game Mode"
                    value={map.type || ''}
                    onChange={(e) => {
                      const selectedGameMode = state.assets.gameModes.find(gm => gm.name === e.target.value);
                      handleSetMapType(index, e.target.value, selectedGameMode?.id || null);
                    }}
                    options={gameModeOptions}
                  />
                  <Toggle
                    checked={match.currentMap === index}
                    onChange={(c) => handleSetCurrentMap(c ? index : null)}
                    label="Current Map"
                    size="sm"
                  />
                  <Toggle
                    checked={map.completed}
                    onChange={(c) => {
                      dispatch({
                        type: 'SET_MAP',
                        index,
                        map: { ...map, completed: c }
                      });
                    }}
                    label="Complete"
                    size="sm"
                  />
                  {!match.loserPicks && map.name && (
                    <div className={styles.chosenBySection}>
                      <span className="text-secondary text-sm">Chosen By</span>
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={`chosenBy-${index}`}
                            checked={map.chosenBy === 'A'}
                            onChange={() => {
                              dispatch({
                                type: 'SET_MAP',
                                index,
                                map: { ...map, chosenBy: 'A' }
                              });
                            }}
                          />
                          <span>{teamA?.tag || 'Team A'}</span>
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={`chosenBy-${index}`}
                            checked={map.chosenBy === 'B'}
                            onChange={() => {
                              dispatch({
                                type: 'SET_MAP',
                                index,
                                map: { ...map, chosenBy: 'B' }
                              });
                            }}
                          />
                          <span>{teamB?.tag || 'Team B'}</span>
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={`chosenBy-${index}`}
                            checked={map.chosenBy === null}
                            onChange={() => {
                              dispatch({
                                type: 'SET_MAP',
                                index,
                                map: { ...map, chosenBy: null }
                              });
                            }}
                          />
                          <span>None</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div className={styles.mapScores}>
                    <span className="text-secondary text-sm">Map Scores</span>
                    <div className={styles.scoreInputs}>
                      <Input
                        label={teamA?.tag || 'Team A'}
                        type="number"
                        value={map.scoreA}
                        onChange={(e) => handleSetMapScores(index, parseInt(e.target.value) || 0, map.scoreB)}
                        min={0}
                        max={999}
                      />
                      <span className={styles.scoreVs}>vs</span>
                      <Input
                        label={teamB?.tag || 'Team B'}
                        type="number"
                        value={map.scoreB}
                        onChange={(e) => handleSetMapScores(index, map.scoreA, parseInt(e.target.value) || 0)}
                        min={0}
                        max={999}
                      />
                    </div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {activeTab === 'mappool' && (
          <div className={styles.mapPoolSection}>
            <Panel title="Map Pool Selection">
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                Select which maps to include in the Map Pool overlay. Maps are grouped by game mode.
              </p>
              <div className={styles.mapPoolGrid}>
                {state.assets.gameModes
                  .filter(gm => gm.name !== 'Flashpoint' && gm.name !== 'Push')
                  .map(gameMode => {
                    const mapsWithPoolStatus = state.assets.maps.map(map => ({
                      ...map,
                      inPool: match.mapPool?.includes(map.name) || false
                    })).filter(map => {
                      const mapAsset = state.assets.maps.find(m => m.id === map.id);
                      return mapAsset?.gameModeAssetId === gameMode.id;
                    });

                    return (
                      <div key={gameMode.id} className={styles.mapPoolMode}>
                        <h4 className={styles.mapPoolModeName}>{gameMode.name}</h4>
                        <div className={styles.mapPoolMaps}>
                          {mapsWithPoolStatus.map(map => (
                            <label key={map.id} className={styles.mapPoolItem}>
                              <input
                                type="checkbox"
                                checked={match.mapPool?.includes(map.name) || false}
                                onChange={(e) => {
                                  const newPool = e.target.checked
                                    ? [...(match.mapPool || []), map.name]
                                    : (match.mapPool || []).filter(n => n !== map.name);
                                  dispatch({ type: 'UPDATE_MATCH', payload: { mapPool: newPool } });
                                }}
                              />
                              <span>{map.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                <div className={styles.mapPoolStackedModes}>
                  {state.assets.gameModes
                    .filter(gm => gm.name === 'Flashpoint' || gm.name === 'Push')
                    .map(gameMode => {
                      const mapsWithPoolStatus = state.assets.maps.map(map => ({
                        ...map,
                        inPool: match.mapPool?.includes(map.name) || false
                      })).filter(map => {
                        const mapAsset = state.assets.maps.find(m => m.id === map.id);
                        return mapAsset?.gameModeAssetId === gameMode.id;
                      });

                      return (
                        <div key={gameMode.id} className={styles.mapPoolMode}>
                          <h4 className={styles.mapPoolModeName}>{gameMode.name}</h4>
                          <div className={styles.mapPoolMaps}>
                            {mapsWithPoolStatus.map(map => (
                              <label key={map.id} className={styles.mapPoolItem}>
                                <input
                                  type="checkbox"
                                  checked={match.mapPool?.includes(map.name) || false}
                                  onChange={(e) => {
                                    const newPool = e.target.checked
                                      ? [...(match.mapPool || []), map.name]
                                      : (match.mapPool || []).filter(n => n !== map.name);
                                    dispatch({ type: 'UPDATE_MATCH', payload: { mapPool: newPool } });
                                  }}
                                />
                                <span>{map.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'bans' && (
          <div className={styles.bansSection}>
            <div className={styles.bansHeader}>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => {
                  if (confirm('Are you sure you want to reset all Hero Bans?')) {
                    const defaultBans = match.maps.map(() => ({
                      firstBanTeam: null as 'A' | 'B' | null,
                      teamA: [] as string[],
                      teamB: [] as string[]
                    }));
                    dispatch({ type: 'SET_HERO_BANS', bans: defaultBans });
                  }
                }}
              >
                Reset All Bans
              </Button>
            </div>
            <Panel title="Hero Bans">
              <table className={styles.bansTable}>
                <thead>
                  <tr>
                    <th>Map #</th>
                    <th>Map Name</th>
                    <th>First Ban</th>
                    <th>{teamA?.tag || 'Team A'}</th>
                    <th>{teamB?.tag || 'Team B'}</th>
                  </tr>
                </thead>
                <tbody>
                  {match.maps.map((map, index) => {
                    const bans = match.heroBans[index] || { firstBanTeam: null, teamA: [], teamB: [] };

                    const handleSetFirstBanTeam = (team: 'A' | 'B' | '') => {
                      const mapBans = [...match.heroBans];
                      mapBans[index] = { 
                        firstBanTeam: team || null, 
                        teamA: bans.teamA, 
                        teamB: bans.teamB 
                      };
                      dispatch({ type: 'SET_HERO_BANS', bans: mapBans });
                    };

                    const handleSetBan = (team: 'A' | 'B', hero: string) => {
                      const mapBans = [...match.heroBans];
                      if (!mapBans[index]) {
                        mapBans[index] = { firstBanTeam: null, teamA: [], teamB: [] };
                      }
                      mapBans[index][`team${team}`] = hero ? [hero] : [];
                      dispatch({ type: 'SET_HERO_BANS', bans: mapBans });
                    };

                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{map.name || 'TBD'}</td>
                        <td>
                          <select
                            className={styles.banSelect}
                            value={bans.firstBanTeam || ''}
                            onChange={(e) => handleSetFirstBanTeam(e.target.value as 'A' | 'B' | '')}
                          >
                            <option value="">-</option>
                            <option value="A">{teamA?.tag || 'Team A'}</option>
                            <option value="B">{teamB?.tag || 'Team B'}</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className={styles.banSelect}
                            value={bans.teamA[0] || ''}
                            onChange={(e) => handleSetBan('A', e.target.value)}
                          >
                            <option value="">-</option>
                            {state.assets.heroes.map(hero => (
                              <option key={hero.id} value={hero.name}>{hero.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className={styles.banSelect}
                            value={bans.teamB[0] || ''}
                            onChange={(e) => handleSetBan('B', e.target.value)}
                          >
                            <option value="">-</option>
                            {state.assets.heroes.map(hero => (
                              <option key={hero.id} value={hero.name}>{hero.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </div>
        )}

        {activeTab === 'talent' && (
          <div className={styles.talentSection}>
            <Panel title="Talent Assignments">
              <div className={styles.talentGroup}>
                <div className={styles.talentGroupTitle}>Casters</div>
                <div className={styles.talentGrid}>
                  {(['caster1', 'caster2'] as const).map(role => {
                    const talentSlot = match?.talent?.[role];
                    const labelMap: Record<string, string> = {
                      caster1: 'Caster 1',
                      caster2: 'Caster 2'
                    };
                    
                    return (
                      <div key={role} className={styles.talentSlot}>
                        <label className={styles.talentLabel}>{labelMap[role]}</label>
                        <select
                          className={styles.talentSelect}
                          value={talentSlot?.talentId || ''}
                          onChange={(e) => {
                            if (!match) return;
                            const newTalent = { 
                              ...match.talent, 
                              [role]: { 
                                talentId: e.target.value || undefined
                              } 
                            };
                            dispatch({ 
                              type: 'UPDATE_MATCH', 
                              payload: { ...match, talent: newTalent } 
                            });
                          }}
                        >
                          <option value="">-- Select --</option>
                          {state.talents.map(t => (
                            <option key={t.id} value={t.id}>{t.displayName}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.talentGroup}>
                <div className={styles.talentGroupTitle}>Panel</div>
                <div className={styles.talentGrid}>
                  {(['panel1', 'panel2', 'panel3'] as const).map(role => {
                    const talentSlot = match?.talent?.[role];
                    const labelMap: Record<string, string> = {
                      panel1: 'Panel 1',
                      panel2: 'Panel 2',
                      panel3: 'Panel 3'
                    };
                    
                    return (
                      <div key={role} className={styles.talentSlot}>
                        <label className={styles.talentLabel}>{labelMap[role]}</label>
                        <select
                          className={styles.talentSelect}
                          value={talentSlot?.talentId || ''}
                          onChange={(e) => {
                            if (!match) return;
                            const newTalent = { 
                              ...match.talent, 
                              [role]: { 
                                talentId: e.target.value || undefined
                              } 
                            };
                            dispatch({ 
                              type: 'UPDATE_MATCH', 
                              payload: { ...match, talent: newTalent } 
                            });
                          }}
                        >
                          <option value="">-- Select --</option>
                          {state.talents.map(t => (
                            <option key={t.id} value={t.id}>{t.displayName}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.talentGroup}>
                <div className={styles.talentGroupTitle}>Interview</div>
                <div className={styles.talentGrid}>
                  <div className={styles.talentSlot}>
                    <label className={styles.talentLabel}>Interviewer</label>
                    <select
                      className={styles.talentSelect}
                      value={match?.talent?.interviewer?.talentId || ''}
                      onChange={(e) => {
                        if (!match) return;
                        const newTalent = { 
                          ...match.talent, 
                          interviewer: { 
                            talentId: e.target.value || undefined
                          } 
                        };
                        dispatch({ 
                          type: 'UPDATE_MATCH', 
                          payload: { ...match, talent: newTalent } 
                        });
                      }}
                    >
                      <option value="">-- Select --</option>
                      {state.talents.map(t => (
                        <option key={t.id} value={t.id}>{t.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.talentSlot}>
                    <label className={styles.talentLabel}>Interviewee</label>
                    <select
                      className={styles.talentSelect}
                      value={match?.talent?.interviewee?.talentId || 'custom'}
                      onChange={(e) => {
                        if (!match) return;
                        const newTalent = { 
                          ...match.talent, 
                          interviewee: { 
                            ...match.talent?.interviewee,
                            talentId: e.target.value === 'custom' ? undefined : e.target.value || undefined
                          } 
                        };
                        dispatch({ 
                          type: 'UPDATE_MATCH', 
                          payload: { ...match, talent: newTalent } 
                        });
                      }}
                    >
                      <option value="">-- Select --</option>
                      <optgroup label="Players">
                        {teamA?.players.filter(p => p.name).map(p => (
                          <option key={`${teamA.id}-${p.id}`} value={`player:${teamA.id}:${p.id}`}>
                            {teamA.tag} - {p.name}
                          </option>
                        ))}
                        {teamB?.players.filter(p => p.name).map(p => (
                          <option key={`${teamB.id}-${p.id}`} value={`player:${teamB.id}:${p.id}`}>
                            {teamB.tag} - {p.name}
                          </option>
                        ))}
                      </optgroup>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>
                </div>
                {match?.talent?.interviewee?.talentId === undefined && (
                  <div className={styles.talentCustomFields}>
                    <div>
                      <label className={styles.talentLabel}>Interviewee Name</label>
                      <Input
                        placeholder="Enter name"
                        value={match?.talent?.interviewee?.customName || ''}
                        onChange={(e) => {
                          if (!match) return;
                          const newTalent = { 
                            ...match.talent, 
                            interviewee: { 
                              ...match.talent?.interviewee,
                              customName: e.target.value
                            } 
                          };
                          dispatch({ 
                            type: 'UPDATE_MATCH', 
                            payload: { ...match, talent: newTalent } 
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className={styles.talentLabel}>Interviewee Subtext</label>
                      <Input
                        placeholder="e.g., Team, Role"
                        value={match?.talent?.interviewee?.customSubtext || ''}
                        onChange={(e) => {
                          if (!match) return;
                          const newTalent = { 
                            ...match.talent, 
                            interviewee: { 
                              ...match.talent?.interviewee,
                              customSubtext: e.target.value
                            } 
                          };
                          dispatch({ 
                            type: 'UPDATE_MATCH', 
                            payload: { ...match, talent: newTalent } 
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'live' && (
          <div className={styles.timerSection}>
            <Panel title="Timer Settings">
              <div className={styles.timerModeSelect}>
                <Select
                  label="Timer Mode"
                  value={timerMode}
                  onChange={(e) => {
                    setTimerMode(e.target.value as 'countup' | 'countdown' | 'target');
                    setTimer({ running: false, seconds: 0, hours: 0, minutes: 0, secondsDisplay: 0 });
                  }}
                  options={[
                    { value: 'countup', label: 'Count Up' },
                    { value: 'countdown', label: 'Countdown (Duration)' },
                    { value: 'target', label: 'Countdown (Target Time)' }
                  ]}
                />
              </div>
              
              {timerMode === 'countdown' && (
                <div className={styles.timerInputs}>
                  <div className={styles.timerInputGroup}>
                    <label>Hours</label>
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={timer.hours}
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        setTimer(t => ({ ...t, hours: h, seconds: h * 3600 + t.minutes * 60 + t.secondsDisplay }));
                      }}
                    />
                  </div>
                  <div className={styles.timerInputGroup}>
                    <label>Minutes</label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={timer.minutes}
                      onChange={(e) => {
                        const m = parseInt(e.target.value) || 0;
                        setTimer(t => ({ ...t, minutes: m, seconds: t.hours * 3600 + m * 60 + t.secondsDisplay }));
                      }}
                    />
                  </div>
                  <div className={styles.timerInputGroup}>
                    <label>Seconds</label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={timer.secondsDisplay}
                      onChange={(e) => {
                        const s = parseInt(e.target.value) || 0;
                        setTimer(t => ({ ...t, secondsDisplay: s, seconds: t.hours * 3600 + t.minutes * 60 + s }));
                      }}
                    />
                  </div>
                </div>
              )}

              {timerMode === 'target' && (
                <div className={styles.timerInputGroup}>
                  <label>Target Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={targetDateTime}
                    onChange={(e) => setTargetDateTime(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.timerSettings}>
                <div className={styles.timerSettingGroup}>
                  <label>Alignment</label>
                  <div className={styles.timerSettingButtons}>
                    <Button 
                      size="sm" 
                      variant={timerSettings.alignment === 'left' ? 'primary' : 'secondary'}
                      onClick={() => setTimerSettings(s => ({ ...s, alignment: 'left' }))}
                    >
                      Left
                    </Button>
                    <Button 
                      size="sm" 
                      variant={timerSettings.alignment === 'center' ? 'primary' : 'secondary'}
                      onClick={() => setTimerSettings(s => ({ ...s, alignment: 'center' }))}
                    >
                      Center
                    </Button>
                    <Button 
                      size="sm" 
                      variant={timerSettings.alignment === 'right' ? 'primary' : 'secondary'}
                      onClick={() => setTimerSettings(s => ({ ...s, alignment: 'right' }))}
                    >
                      Right
                    </Button>
                  </div>
                </div>
                <div className={styles.timerSettingGroup}>
                  <label>Leading Zeroes</label>
                  <Button 
                    size="sm" 
                    variant={timerSettings.leadingZeroes ? 'primary' : 'secondary'}
                    onClick={() => setTimerSettings(s => ({ ...s, leadingZeroes: !s.leadingZeroes }))}
                  >
                    {timerSettings.leadingZeroes ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className={styles.timerSettingGroup}>
                  <label>Standalone Timer</label>
                  <Button 
                    size="sm" 
                    variant={timerSettings.standalone ? 'primary' : 'secondary'}
                    onClick={() => setTimerSettings(s => ({ ...s, standalone: !s.standalone }))}
                  >
                    {timerSettings.standalone ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="Timer">
              <div className={styles.timerDisplay}>
                <span className={styles.timerValue}>
                  {String(timer.hours).padStart(2, '0')}:{String(timer.minutes).padStart(2, '0')}:{String(timer.secondsDisplay).padStart(2, '0')}
                </span>
              </div>
              <div className={styles.timerButtons}>
                <Button
                  variant="primary"
                  onClick={startTimer}
                  disabled={timer.running}
                >
                  Start
                </Button>
                <Button
                  variant="secondary"
                  onClick={pauseTimer}
                  disabled={!timer.running}
                >
                  Pause
                </Button>
                <Button
                  variant="secondary"
                  onClick={resetTimer}
                >
                  Reset
                </Button>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
};
