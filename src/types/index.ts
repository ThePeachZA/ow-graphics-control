export interface BundledAssets {
  maps: any[];
  gameModes: any[];
  roles: any[];
  sides: any[];
  heroes: any[];
  logos: any[];
  portraits: any[];
}

export interface OpenDialogOptions {
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

export interface ElectronAPI {
  getPaths: () => Promise<{ userData: string; data: string; assets: string }>;
  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  exists: (filePath: string) => Promise<boolean>;
  readDir: (dirPath: string) => Promise<string[]>;
  mkdir: (dirPath: string) => Promise<boolean>;
  copyFile: (src: string, dest: string) => Promise<boolean>;
  readImageAsDataUrl: (filePath: string) => Promise<string | null>;
  getBundledAssets: () => Promise<BundledAssets>;
  importAssetFile: (srcPath: string, category: string, assetId?: string) => Promise<string | null>;
  downloadAssetUrl: (url: string, category: string) => Promise<string | null>;
  moveAssetToTemp: (filePath: string) => Promise<boolean>;
  deleteTempAsset: (filename: string) => Promise<boolean>;
  getTempAssets: () => Promise<string[]>;
  clearTempAssets: () => Promise<{ success: boolean; count: number }>;
  getTempAssetCount: () => Promise<number>;
  openFile: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  saveFile: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  overlayStart: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
  overlayStop: () => Promise<{ success: boolean; error?: string }>;
  overlayStatus: () => Promise<{ running: boolean; port: number | null }>;
  overlayBroadcast: (type: string, data: any) => Promise<boolean>;
  overlayOpenUrl: (path: string) => Promise<string | null>;
  onMenuImport: (callback: () => void) => void;
  onMenuExport: (callback: () => void) => void;
  onOverlayStart: (callback: () => void) => void;
  onOverlayStop: (callback: () => void) => void;
  removeMenuListeners: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type PlayerPosition = 'core' | 'sub' | 'manager' | 'coach';
export type PlayerRole = 'tank' | 'damage' | 'support';

export interface Team {
  id: string;
  name: string;
  tag: string;
  record?: string;
  color: string;
  textColor: string;
  auxColor: string;
  logoAssetId: string | null;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  position: PlayerPosition;
  portraitAssetId: string | null;
  featuredHeroAssetId: string | null;
  pronouns?: string;
}

export interface MapSlot {
  name: string;
  type: string;
  gameModeAssetId: string | null;
  imageAssetId: string | null;
  completed: boolean;
  scoreA: number;
  scoreB: number;
  chosenBy: 'A' | 'B' | null;
}

export interface MapHeroBans {
  firstBanTeam: 'A' | 'B' | null;
  teamA: string[];
  teamB: string[];
}

export interface Match {
  id: string;
  title: string;
  subtitle: string;
  teamA: string;
  teamB: string;
  maps: MapSlot[];
  heroBans: MapHeroBans[];
  mapPool: string[];
  firstTo: number;
  status: 'pre' | 'live' | 'post';
  currentMap: number | null;
  swapSides: boolean;
  useManualScore: boolean;
  manualScoreA: number;
  manualScoreB: number;
  side: 0 | 1 | 2;
  talent?: MatchTalent;
  loserPicks: boolean;
  showPlayerPortraits: boolean;
  substitutions: Substitution[];
}

export interface Talent {
  id: string;
  displayName: string;
  realName?: string;
  pronouns?: string;
  socialMedia?: {
    platform: 'twitter' | 'twitch' | 'youtube' | 'instagram' | 'tiktok';
    handle: string;
  };
  portraitAssetId?: string;
}

export interface MatchTalent {
  caster1?: { talentId?: string };
  caster2?: { talentId?: string };
  panel1?: { talentId?: string };
  panel2?: { talentId?: string };
  panel3?: { talentId?: string };
  interviewer?: { talentId?: string };
  interviewee?: {
    talentId?: string;
    customName?: string;
    customSubtext?: string;
  };
}

export interface Substitution {
  id: string;
  team: 'A' | 'B';
  playerIn: string;
  playerOut: string;
  timestamp: string;
}

export interface AppData {
  teams: Team[];
  matches: Match[];
  tournaments: Tournament[];
  currentMatch: Match | null;
  talents: Talent[];
}

export interface AssetManifest {
  logos: AssetEntry[];
  portraits: AssetEntry[];
  gameModes: AssetEntry[];
  roles: AssetEntry[];
  sides: AssetEntry[];
  maps: AssetEntry[];
  heroes: AssetEntry[];
}

export interface AssetEntry {
  id: string;
  name: string;
  filename: string;
  path: string;
  category: string;
  addedAt: string;
  iconPath?: string | null;
  portraitPath?: string | null;
  gamemode?: string;
  gameModeAssetId?: string | null;
  imageAssetId?: string | null;
  roleAssetId?: string | null;
}

export type BracketFormat = 'single-elim' | 'double-elim' | 'round-robin';
export type MatchStatus = 'pending' | 'live' | 'completed';

export interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
  status: MatchStatus;
  nextMatchId: string | null;
  nextMatchSlot: 1 | 2;
  loserNextMatchId: string | null;
  loserNextMatchSlot: 1 | 2;
  firstTo: number;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface TournamentGroup {
  id: string;
  name: string;
  teamIds: string[];
}

export interface RoundRobinStandings {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: BracketFormat;
  teams: { teamId: string; seed: number }[];
  rounds: BracketRound[];
  winnersBracket: BracketRound[];
  losersBracket: BracketRound[];
  grandFinal: BracketRound[];
  groups: TournamentGroup[];
  roundRobinStandings: Record<string, RoundRobinStandings[]>;
  championTeamId: string | null;
  createdAt: string;
  status: 'setup' | 'in-progress' | 'completed';
  defaultFirstTo: number;
  grandFinalsReset: boolean;
}
