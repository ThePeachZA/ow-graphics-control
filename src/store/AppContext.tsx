import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { Team, Player, Match, Talent, MapSlot, MapHeroBans, AssetManifest, AssetEntry, Tournament, BracketMatch, BracketRound, BundledAssets } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  teams: Team[];
  matches: Match[];
  currentMatch: Match | null;
  talents: Talent[];
  assets: AssetManifest;
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  tournamentLogoAssetId: string | null;
  watermarkLogoAssetId: string | null;
  teamColorsEnabled: boolean;
  overlayServer: {
    running: boolean;
    port: number;
  };
  ndi: {
    enabled: boolean;
    outputName: string;
  };
  loaded: boolean;
}

type AppAction =
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'SET_LOADED'; payload: boolean }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'ADD_PLAYER'; teamId: string; payload: Player }
  | { type: 'UPDATE_PLAYER'; teamId: string; payload: Player }
  | { type: 'DELETE_PLAYER'; teamId: string; playerId: string }
  | { type: 'SET_CURRENT_MATCH'; payload: Match | null }
  | { type: 'UPDATE_MATCH'; payload: Partial<Match> }
  | { type: 'SET_MATCH_TEAM'; side: 'A' | 'B'; teamId: string }
  | { type: 'UPDATE_SCORE'; side: 'A' | 'B'; score: number }
  | { type: 'SET_MAP'; index: number; map: MapSlot }
  | { type: 'SET_HERO_BANS'; bans: MapHeroBans[] }
  | { type: 'ADD_TALENT'; payload: Talent }
  | { type: 'UPDATE_TALENT'; payload: Talent }
  | { type: 'DELETE_TALENT'; payload: string }
  | { type: 'ADD_ASSET'; category: keyof AssetManifest; payload: AssetEntry }
  | { type: 'ADD_ASSETS'; category: keyof AssetManifest; payload: AssetEntry[] }
  | { type: 'UPDATE_ASSET'; category: keyof AssetManifest; payload: AssetEntry }
  | { type: 'REMOVE_ASSET'; category: keyof AssetManifest; id: string }
  | { type: 'SET_OVERLAY_SERVER'; payload: { running?: boolean; port?: number } }
  | { type: 'SET_NDI'; payload: { enabled?: boolean; outputName?: string } }
  | { type: 'ADD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: Tournament }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'SET_TOURNAMENT_LOGO'; assetId: string | null }
  | { type: 'SET_WATERMARK_LOGO'; assetId: string | null }
  | { type: 'SET_TEAM_COLORS_ENABLED'; enabled: boolean }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: Tournament | null }
  | { type: 'UPDATE_BRACKET_MATCH'; payload: { tournamentId: string; match: BracketMatch; bracketType?: 'winners' | 'losers' | 'finals' } }
  | { type: 'SET_CHAMPION'; payload: { tournamentId: string; teamId: string } };

const initialState: AppState = {
  teams: [],
  matches: [],
  currentMatch: null,
  talents: [],
  assets: {
    logos: [],
    portraits: [],
    gameModes: [],
    roles: [],
    sides: [],
    maps: [],
    heroes: []
  },
  tournaments: [],
  currentTournament: null,
  tournamentLogoAssetId: null,
  watermarkLogoAssetId: null,
  teamColorsEnabled: false,
  overlayServer: {
    running: false,
    port: 3000
  },
  ndi: {
    enabled: false,
    outputName: 'OW Graphics - Scoreboard'
  },
  loaded: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };

    case 'SET_LOADED':
      return { ...state, loaded: action.payload };

    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };

    case 'UPDATE_TEAM':
      return {
        ...state,
        teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t)
      };

    case 'DELETE_TEAM':
      return {
        ...state,
        teams: state.teams.filter(t => t.id !== action.payload)
      };

    case 'ADD_PLAYER':
      return {
        ...state,
        teams: state.teams.map(t => 
          t.id === action.teamId 
            ? { ...t, players: [...t.players, action.payload] }
            : t
        )
      };

    case 'UPDATE_PLAYER':
      return {
        ...state,
        teams: state.teams.map(t =>
          t.id === action.teamId
            ? { ...t, players: t.players.map(p => p.id === action.payload.id ? action.payload : p) }
            : t
        )
      };

    case 'DELETE_PLAYER':
      return {
        ...state,
        teams: state.teams.map(t =>
          t.id === action.teamId
            ? { ...t, players: t.players.filter(p => p.id !== action.playerId) }
            : t
        )
      };

    case 'SET_CURRENT_MATCH':
      return { ...state, currentMatch: action.payload };

    case 'UPDATE_MATCH':
      if (!state.currentMatch) return state;
      return {
        ...state,
        currentMatch: { ...state.currentMatch, ...action.payload }
      };

    case 'SET_MATCH_TEAM':
      if (!state.currentMatch) return state;
      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          [action.side === 'A' ? 'teamA' : 'teamB']: action.teamId
        }
      };

    case 'UPDATE_SCORE':
      if (!state.currentMatch) return state;
      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          [action.side === 'A' ? 'scoreA' : 'scoreB']: action.score
        }
      };

    case 'SET_MAP':
      if (!state.currentMatch) return state;
      const newMaps = [...state.currentMatch.maps];
      newMaps[action.index] = action.map;
      return {
        ...state,
        currentMatch: { ...state.currentMatch, maps: newMaps }
      };

    case 'SET_HERO_BANS':
      if (!state.currentMatch) return state;
      return {
        ...state,
        currentMatch: { ...state.currentMatch, heroBans: action.bans }
      };

    case 'ADD_TALENT':
      return { ...state, talents: [...state.talents, action.payload] };

    case 'UPDATE_TALENT':
      return {
        ...state,
        talents: state.talents.map(t => t.id === action.payload.id ? action.payload : t)
      };

    case 'DELETE_TALENT':
      return {
        ...state,
        talents: state.talents.filter(t => t.id !== action.payload)
      };

    case 'ADD_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          [action.category]: [...(state.assets[action.category] || []), action.payload]
        }
      };

    case 'ADD_ASSETS':
      return {
        ...state,
        assets: {
          ...state.assets,
          [action.category]: [...(state.assets[action.category] || []), ...action.payload]
        }
      };

    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          [action.category]: state.assets[action.category].map(a => 
            a.id === action.payload.id ? action.payload : a
          )
        }
      };

    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          [action.category]: state.assets[action.category].filter(a => a.id !== action.id)
        }
      };

    case 'SET_OVERLAY_SERVER':
      return {
        ...state,
        overlayServer: { ...state.overlayServer, ...action.payload }
      };

    case 'SET_NDI':
      return {
        ...state,
        ndi: { ...state.ndi, ...action.payload }
      };

    case 'ADD_TOURNAMENT':
      return { ...state, tournaments: [...state.tournaments, action.payload] };

    case 'UPDATE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.map(t => t.id === action.payload.id ? action.payload : t),
        currentTournament: state.currentTournament?.id === action.payload.id ? action.payload : state.currentTournament
      };

    case 'DELETE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.filter(t => t.id !== action.payload),
        currentTournament: state.currentTournament?.id === action.payload ? null : state.currentTournament
      };

    case 'SET_CURRENT_TOURNAMENT':
      return { ...state, currentTournament: action.payload };

    case 'UPDATE_BRACKET_MATCH': {
      const { tournamentId, match, bracketType } = action.payload as { tournamentId: string; match: BracketMatch; bracketType?: 'winners' | 'losers' | 'finals' };
      const tournament = state.tournaments.find(t => t.id === tournamentId);
      if (!tournament) return state;

      const updateRounds = (rounds: BracketRound[]): BracketRound[] => {
        return rounds.map(round => ({
          ...round,
          matches: round.matches.map(m => m.id === match.id ? match : m)
        }));
      };

      let updatedTournament: Tournament;
      
      if (bracketType === 'winners') {
        updatedTournament = {
          ...tournament,
          winnersBracket: updateRounds(tournament.winnersBracket)
        };
      } else if (bracketType === 'losers') {
        updatedTournament = {
          ...tournament,
          losersBracket: updateRounds(tournament.losersBracket)
        };
      } else if (bracketType === 'finals') {
        updatedTournament = {
          ...tournament,
          grandFinal: updateRounds(tournament.grandFinal)
        };
      } else {
        updatedTournament = {
          ...tournament,
          winnersBracket: updateRounds(tournament.winnersBracket),
          losersBracket: updateRounds(tournament.losersBracket),
          grandFinal: updateRounds(tournament.grandFinal)
        };
      }

      return {
        ...state,
        tournaments: state.tournaments.map(t => t.id === tournamentId ? updatedTournament : t),
        currentTournament: state.currentTournament?.id === tournamentId ? updatedTournament : state.currentTournament
      };
    }

    case 'SET_CHAMPION': {
      const { tournamentId, teamId } = action.payload as { tournamentId: string; teamId: string };
      const updatedTournaments = state.tournaments.map(t => 
        t.id === tournamentId ? { ...t, championTeamId: teamId, status: 'completed' as const } : t
      );
      const updatedCurrent = state.currentTournament?.id === tournamentId 
        ? { ...state.currentTournament, championTeamId: teamId, status: 'completed' as const } 
        : state.currentTournament;
      return {
        ...state,
        tournaments: updatedTournaments,
        currentTournament: updatedCurrent
      };
    }

    case 'SET_TOURNAMENT_LOGO':
      return { ...state, tournamentLogoAssetId: action.assetId };

    case 'SET_WATERMARK_LOGO':
      return { ...state, watermarkLogoAssetId: action.assetId };

    case 'SET_TEAM_COLORS_ENABLED':
      return { ...state, teamColorsEnabled: action.enabled };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  createNewMatch: () => Match;
  getTeamById: (id: string) => Team | undefined;
  getAssetById: (category: keyof AssetManifest, id: string) => AssetEntry | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  const createNewMatch = (): Match => {
    const match: Match = {
      id: uuidv4(),
      title: '',
      subtitle: '',
      teamA: '',
      teamB: '',
      maps: Array(8).fill(null).map(() => ({ 
        name: '', 
        type: '', 
        gameModeAssetId: null,
        imageAssetId: null, 
        completed: false,
        scoreA: 0,
        scoreB: 0,
        chosenBy: null
      })),
      heroBans: Array(8).fill(null).map(() => ({
        firstBanTeam: null,
        teamA: [],
        teamB: []
      })),
      mapPool: [],
      firstTo: 3,
      status: 'pre',
      currentMap: null,
      swapSides: false,
      useManualScore: false,
      manualScoreA: 0,
      manualScoreB: 0,
      side: 0,
      loserPicks: true,
      showPlayerPortraits: true,
      substitutions: []
    };
    dispatch({ type: 'SET_CURRENT_MATCH', payload: match });
    return match;
  };

  const getTeamById = (id: string): Team | undefined => {
    return state.teams.find(t => t.id === id);
  };

  const getAssetById = (category: keyof AssetManifest, id: string): AssetEntry | undefined => {
    return state.assets[category].find(a => a.id === id);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    
    if (!state.loaded) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveData();
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.teams, state.matches, state.currentMatch, state.talents, state.assets, state.tournaments, state.tournamentLogoAssetId, state.watermarkLogoAssetId, state.teamColorsEnabled, state.overlayServer, state.ndi]);

  const loadData = async () => {
    try {
      const paths = await window.electronAPI.getPaths();
      const dataFile = `${paths.data}/app.json`;
      const exists = await window.electronAPI.exists(dataFile);
      
      if (exists) {
        const content = await window.electronAPI.readFile(dataFile);
        if (content) {
          try {
            const data = JSON.parse(content);
            const normalizeCategory = (asset: any) => ({
              ...asset,
              category: asset.category === 'teamLogos' ? 'logos' : asset.category
            });

            let bundledAssets: BundledAssets = { maps: [], gameModes: [], roles: [], sides: [], heroes: [], logos: [], portraits: [] };
            try {
              bundledAssets = await window.electronAPI.getBundledAssets() as BundledAssets;
            } catch (e) {
              console.error('Failed to load bundled assets:', e);
            }

            const mergeAssets = (savedAssets: any[], bundled: any[]): any[] => {
              const savedById = new Map((savedAssets || []).map(a => [a.id, a]));
              for (const b of bundled) {
                if (!savedById.has(b.id)) {
                  savedById.set(b.id, b);
                }
              }
              return Array.from(savedById.values());
            };

            const normalizedAssets = {
              logos: [
                ...(data.assets?.logos || []).map(normalizeCategory),
                ...(data.assets?.teamLogos || []).map(normalizeCategory)
              ],
              portraits: data.assets?.portraits || [],
              gameModes: mergeAssets(data.assets?.gameModes, bundledAssets.gameModes),
              roles: mergeAssets(data.assets?.roles, bundledAssets.roles),
              sides: mergeAssets(data.assets?.sides, bundledAssets.sides),
              maps: mergeAssets(data.assets?.maps, bundledAssets.maps),
              heroes: mergeAssets(data.assets?.heroes, bundledAssets.heroes)
            };
            
            let currentMatch = data.currentMatch || null;
            if (!currentMatch) {
              currentMatch = {
                id: uuidv4(),
                title: '',
                subtitle: '',
                teamA: '',
                teamB: '',
                maps: Array(8).fill(null).map(() => ({ 
                  name: '', 
                  type: '', 
                  gameModeAssetId: null,
                  imageAssetId: null, 
                  completed: false,
                  scoreA: 0,
                  scoreB: 0,
                  chosenBy: null
                })),
                heroBans: Array(8).fill(null).map(() => ({
                  firstBanTeam: null,
                  teamA: [],
                  teamB: []
                })),
                mapPool: [],
                firstTo: 3,
                status: 'pre',
                currentMap: null,
                swapSides: false,
                useManualScore: false,
                manualScoreA: 0,
                manualScoreB: 0,
                side: 0,
                loserPicks: true
              };
            } else {
              if (currentMatch.side === undefined) {
                currentMatch.side = 0;
              }
              if (!currentMatch.mapPool) {
                currentMatch.mapPool = [];
              }
              if (currentMatch.loserPicks === undefined) {
                currentMatch.loserPicks = true;
              }
              if (currentMatch.showPlayerPortraits === undefined) {
                currentMatch.showPlayerPortraits = true;
              }
              // Normalize maps to include chosenBy field
              currentMatch.maps = currentMatch.maps.map((map: MapSlot) => ({
                ...map,
                chosenBy: map.chosenBy ?? null
              }));
            }
            
            dispatch({ type: 'SET_STATE', payload: { 
              ...data, 
              assets: normalizedAssets, 
              tournaments: data.tournaments || [],
              tournamentLogoAssetId: data.tournamentLogoAssetId || null,
              watermarkLogoAssetId: data.watermarkLogoAssetId || null,
              teamColorsEnabled: data.teamColorsEnabled ?? false,
              currentMatch,
              loaded: true 
            } });
            return;
          } catch (parseError) {
            console.error('Failed to parse saved data:', parseError);
          }
        }
      }
      
      const newMatch: Match = {
        id: uuidv4(),
        title: '',
        subtitle: '',
        teamA: '',
        teamB: '',
        maps: Array(8).fill(null).map(() => ({ 
          name: '', 
          type: '', 
          gameModeAssetId: null,
          imageAssetId: null, 
          completed: false,
          scoreA: 0,
          scoreB: 0,
          chosenBy: null
        })),
        heroBans: Array(8).fill(null).map(() => ({
          firstBanTeam: null,
          teamA: [],
          teamB: []
        })),
        mapPool: [],
        firstTo: 3,
        status: 'pre',
        currentMap: null,
        swapSides: false,
        useManualScore: false,
        manualScoreA: 0,
        manualScoreB: 0,
        side: 0,
        loserPicks: true,
        showPlayerPortraits: true,
        substitutions: []
      };
      dispatch({ type: 'SET_STATE', payload: { currentMatch: newMatch, loaded: true } });
    } catch (error) {
      console.error('Failed to load data:', error);
      const newMatch: Match = {
        id: uuidv4(),
        title: '',
        subtitle: '',
        teamA: '',
        teamB: '',
        maps: Array(8).fill(null).map(() => ({ 
          name: '', 
          type: '', 
          gameModeAssetId: null,
          imageAssetId: null, 
          completed: false,
          scoreA: 0,
          scoreB: 0,
          chosenBy: null
        })),
        heroBans: Array(8).fill(null).map(() => ({
          firstBanTeam: null,
          teamA: [],
          teamB: []
        })),
        mapPool: [],
        firstTo: 3,
        status: 'pre',
        currentMap: null,
        swapSides: false,
        useManualScore: false,
        manualScoreA: 0,
        manualScoreB: 0,
        side: 0,
        loserPicks: true,
        showPlayerPortraits: true,
        substitutions: []
      };
      dispatch({ type: 'SET_STATE', payload: { currentMatch: newMatch, loaded: true } });
    }
  };

  const saveData = async () => {
    try {
      const paths = await window.electronAPI.getPaths();
      const dataFile = `${paths.data}/app.json`;
      const dataToSave = {
        teams: state.teams,
        matches: state.matches,
        currentMatch: state.currentMatch,
        talents: state.talents,
        assets: state.assets,
        tournaments: state.tournaments,
        tournamentLogoAssetId: state.tournamentLogoAssetId,
        watermarkLogoAssetId: state.watermarkLogoAssetId,
        teamColorsEnabled: state.teamColorsEnabled,
        overlayServer: state.overlayServer,
        ndi: state.ndi
      };
      const success = await window.electronAPI.writeFile(dataFile, JSON.stringify(dataToSave, null, 2));
      if (!success) {
        console.error('Failed to write data file');
      }
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, createNewMatch, getTeamById, getAssetById }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
