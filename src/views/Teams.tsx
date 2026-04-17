import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button, Input } from '../components';
import { LogoSelector, PortraitSelector } from '../components/ImageSelector';
import { Team, Player, PlayerRole, PlayerPosition } from '../types';
import { useImageSrc } from '../hooks';
import { v4 as uuidv4 } from 'uuid';
import styles from './Teams.module.css';

const roleOptions: { value: PlayerRole; label: string }[] = [
  { value: 'tank', label: 'Tank' },
  { value: 'damage', label: 'Damage' },
  { value: 'support', label: 'Support' }
];

const positionOptions: { value: PlayerPosition; label: string }[] = [
  { value: 'core', label: 'Core' },
  { value: 'sub', label: 'Sub' },
  { value: 'manager', label: 'Manager' },
  { value: 'coach', label: 'Coach' }
];

export const Teams: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'players'>('info');

  const selectedTeam = selectedTeamId ? state.teams.find(t => t.id === selectedTeamId) : null;
  const editingPlayer = selectedTeam && editingPlayerId 
    ? selectedTeam.players.find(p => p.id === editingPlayerId) 
    : null;

  const handleCreateTeam = () => {
    const newTeam: Team = {
      id: uuidv4(),
      name: 'New Team',
      tag: 'TAG',
      color: '#7C3AED',
      textColor: '#FFFFFF',
      auxColor: '#1A1A24',
      logoAssetId: null,
      players: []
    };
    dispatch({ type: 'ADD_TEAM', payload: newTeam });
    setSelectedTeamId(newTeam.id);
    setActiveSection('info');
  };

  const handleUpdateTeam = <K extends keyof Team>(field: K, value: Team[K]) => {
    if (!selectedTeam) return;
    const updated = { ...selectedTeam, [field]: value };
    dispatch({ type: 'UPDATE_TEAM', payload: updated });
  };

  const handleDeleteTeam = () => {
    if (!selectedTeam) return;
    if (confirm(`Delete ${selectedTeam.name}?`)) {
      dispatch({ type: 'DELETE_TEAM', payload: selectedTeam.id });
      setSelectedTeamId(null);
    }
  };

  const handleAddPlayer = () => {
    if (!selectedTeam) return;
    const newPlayer: Player = {
      id: uuidv4(),
      name: 'New Player',
      role: 'damage',
      position: 'core',
      portraitAssetId: null,
      featuredHeroAssetId: null
    };
    const updatedPlayers = [...selectedTeam.players, newPlayer];
    handleUpdateTeam('players', updatedPlayers);
    setEditingPlayerId(newPlayer.id);
    setActiveSection('players');
  };

  const handleUpdatePlayer = (field: keyof Player, value: any) => {
    if (!selectedTeam || !editingPlayerId) return;
    const updatedPlayers = selectedTeam.players.map(p => 
      p.id === editingPlayerId ? { ...p, [field]: value } : p
    );
    handleUpdateTeam('players', updatedPlayers);
  };

  const handleSavePlayer = () => {
    if (!selectedTeam || !editingPlayerId) return;
    const player = selectedTeam.players.find(p => p.id === editingPlayerId);
    if (player) {
      dispatch({ type: 'UPDATE_PLAYER', teamId: selectedTeam.id, payload: player });
    }
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = () => {
    if (!selectedTeam || !editingPlayerId) return;
    const updatedPlayers = selectedTeam.players.filter(p => p.id !== editingPlayerId);
    handleUpdateTeam('players', updatedPlayers);
    dispatch({ type: 'DELETE_PLAYER', teamId: selectedTeam.id, playerId: editingPlayerId });
    setEditingPlayerId(null);
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setEditingPlayerId(null);
    setActiveSection('info');
  };

  const handleEditPlayer = (playerId: string) => {
    setEditingPlayerId(playerId);
    setActiveSection('players');
  };

  const getTeamLogoPath = (team: Team): string | null => {
    if (!team.logoAssetId) return null;
    const logo = state.assets.logos.find(a => a.id === team.logoAssetId);
    return logo?.path || null;
  };

  const getFeaturedHeroSrc = () => {
    if (!editingPlayer?.featuredHeroAssetId) return null;
    const hero = state.assets.heroes.find(h => h.id === editingPlayer.featuredHeroAssetId);
    return hero?.path || null;
  };

  const featuredHeroSrc = getFeaturedHeroSrc();

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Teams</h2>
          <Button size="sm" onClick={handleCreateTeam}>+ Add</Button>
        </div>
        
        <div className={styles.teamList}>
          {state.teams.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No teams yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateTeam}>
                Create First Team
              </Button>
            </div>
          ) : (
            state.teams.map(team => (
              <TeamListItem
                key={team.id}
                team={team}
                logoPath={getTeamLogoPath(team)}
                isSelected={selectedTeamId === team.id}
                onClick={() => handleSelectTeam(team.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.main}>
        {selectedTeam ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.teamHeader}>
                <TeamLogo team={selectedTeam} />
                <div>
                  <h1>{selectedTeam.name}</h1>
                  <span className={styles.teamHeaderTag}>[{selectedTeam.tag}]</span>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={handleDeleteTeam}>
                Delete Team
              </Button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeSection === 'info' ? styles.active : ''}`}
                onClick={() => setActiveSection('info')}
              >
                Team Info
              </button>
              <button
                className={`${styles.tab} ${activeSection === 'players' ? styles.active : ''}`}
                onClick={() => setActiveSection('players')}
              >
                Players ({selectedTeam.players.length})
              </button>
            </div>

            <div className={styles.content}>
              {activeSection === 'info' && (
                <div className={styles.infoSection}>
                  <Panel title="Basic Info">
                    <div className={styles.formGrid}>
                      <Input
                        label="Team Name"
                        value={selectedTeam.name}
                        onChange={(e) => handleUpdateTeam('name', e.target.value)}
                      />
                      <Input
                        label="Team Tag"
                        value={selectedTeam.tag}
                        onChange={(e) => handleUpdateTeam('tag', e.target.value)}
                        placeholder="3-4 letters"
                      />
                    </div>
                  </Panel>

                  <Panel title="Logo">
                    <LogoSelector
                      value={selectedTeam.logoAssetId}
                      onChange={(id) => handleUpdateTeam('logoAssetId', id)}
                      category="logos"
                    />
                  </Panel>

                  <Panel title="Colors">
                    <div className={styles.colorGrid}>
                      <div className={styles.colorField}>
                        <span className={styles.colorLabel}>Background</span>
                        <div className={styles.colorInput}>
                          <input
                            type="color"
                            value={selectedTeam.color}
                            onChange={(e) => handleUpdateTeam('color', e.target.value)}
                          />
                          <span>{selectedTeam.color}</span>
                        </div>
                      </div>
                      <div className={styles.colorField}>
                        <span className={styles.colorLabel}>Text</span>
                        <div className={styles.colorInput}>
                          <input
                            type="color"
                            value={selectedTeam.textColor}
                            onChange={(e) => handleUpdateTeam('textColor', e.target.value)}
                          />
                          <span>{selectedTeam.textColor}</span>
                        </div>
                      </div>
                      <div className={styles.colorField}>
                        <span className={styles.colorLabel}>Logo BG</span>
                        <div className={styles.colorInput}>
                          <input
                            type="color"
                            value={selectedTeam.auxColor}
                            onChange={(e) => handleUpdateTeam('auxColor', e.target.value)}
                          />
                          <span>{selectedTeam.auxColor}</span>
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <Panel title="Preview">
                    <TeamPreview team={selectedTeam} />
                  </Panel>
                </div>
              )}

              {activeSection === 'players' && (
                <div className={styles.playersSection}>
                  {editingPlayer ? (
                    <Panel title={`Edit: ${editingPlayer.name}`}>
                      <div className={styles.playerForm}>
                        <Input
                          label="Player Name"
                          value={editingPlayer.name}
                          onChange={(e) => handleUpdatePlayer('name', e.target.value)}
                        />

                        <div className={styles.formRow}>
                          <div className={styles.formField}>
                            <span className={styles.fieldLabel}>Role</span>
                            <div className={styles.buttonGroup}>
                              {roleOptions.map(opt => (
                                <Button
                                  key={opt.value}
                                  variant={editingPlayer.role === opt.value ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleUpdatePlayer('role', opt.value)}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className={styles.formField}>
                            <span className={styles.fieldLabel}>Position</span>
                            <div className={styles.buttonGroup}>
                              {positionOptions.map(opt => (
                                <Button
                                  key={opt.value}
                                  variant={editingPlayer.position === opt.value ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleUpdatePlayer('position', opt.value)}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <PortraitSelector
                            value={editingPlayer.portraitAssetId}
                            onChange={(id) => handleUpdatePlayer('portraitAssetId', id)}
                          />
                          <div className={styles.formField}>
                            <span className={styles.fieldLabel}>Featured Hero</span>
                            <select
                              className={styles.heroSelect}
                              value={editingPlayer.featuredHeroAssetId || ''}
                              onChange={(e) => handleUpdatePlayer('featuredHeroAssetId', e.target.value || null)}
                            >
                              <option value="">Select Hero...</option>
                              {state.assets.heroes.map(hero => (
                                <option key={hero.id} value={hero.id}>
                                  {hero.name}
                                </option>
                              ))}
                            </select>
                            {featuredHeroSrc && <FeaturedHeroPreview path={featuredHeroSrc} />}
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formField} style={{ flex: 1 }}>
                            <span className={styles.fieldLabel}>Pronouns</span>
                            <Input
                              value={editingPlayer.pronouns || ''}
                              onChange={(e) => handleUpdatePlayer('pronouns', e.target.value || undefined)}
                              placeholder="e.g., he/him"
                            />
                          </div>
                        </div>

                        <div className={styles.formActions}>
                          <Button onClick={handleSavePlayer}>Save</Button>
                          <Button variant="danger" onClick={handleDeletePlayer}>Delete</Button>
                          <Button variant="secondary" onClick={() => setEditingPlayerId(null)}>Cancel</Button>
                        </div>
                      </div>
                    </Panel>
                  ) : (
                    <>
                      <div className={styles.playersHeader}>
                        <h3>Players</h3>
                        <Button size="sm" onClick={handleAddPlayer}>+ Add Player</Button>
                      </div>

                      {selectedTeam.players.length === 0 ? (
                        <div className={styles.emptyPlayers}>
                          <p className="text-muted">No players yet</p>
                          <Button variant="secondary" size="sm" onClick={handleAddPlayer}>
                            Add First Player
                          </Button>
                        </div>
                      ) : (
                        <div className={styles.playersList}>
                          {selectedTeam.players.map(player => (
                            <PlayerCard 
                              key={player.id} 
                              player={player}
                              onClick={() => handleEditPlayer(player.id)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a team to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface TeamListItemProps {
  team: Team;
  logoPath: string | null;
  isSelected: boolean;
  onClick: () => void;
}

const TeamListItem: React.FC<TeamListItemProps> = ({ team, logoPath, isSelected, onClick }) => {
  const logoSrc = useImageSrc(logoPath || undefined);
  
  return (
  <button
    className={`${styles.teamItem} ${isSelected ? styles.active : ''}`}
    onClick={onClick}
  >
    <div className={styles.teamItemColor} style={{ backgroundColor: team.color }} />
    {logoSrc ? (
      <img src={logoSrc} alt={team.name} className={styles.teamItemLogo} />
    ) : (
      <div className={styles.teamItemPlaceholder}>
        {team.tag.charAt(0)}
      </div>
    )}
    <div className={styles.teamItemInfo}>
      <span className={styles.teamItemTag}>{team.tag}</span>
      <span className={styles.teamItemName}>{team.name}</span>
    </div>
    <span className={styles.teamItemCount}>{team.players.length}</span>
  </button>
  );
};

interface TeamLogoProps {
  team: Team;
}

const TeamLogo: React.FC<TeamLogoProps> = ({ team }) => {
  const { state } = useApp();
  if (!team.logoAssetId) return null;
  
  const logoAsset = state.assets.logos.find(a => a.id === team.logoAssetId);
  const logoSrc = useImageSrc(logoAsset?.path);
  
  if (!logoSrc) return null;
  
  return <img src={logoSrc} alt={team.name} className={styles.teamHeaderLogo} />;
};

interface TeamPreviewProps {
  team: Team;
}

const TeamPreview: React.FC<TeamPreviewProps> = ({ team }) => {
  const { state } = useApp();
  const logoAsset = team.logoAssetId 
    ? state.assets.logos.find(a => a.id === team.logoAssetId)
    : null;
  const logoSrc = useImageSrc(logoAsset?.path);
  
  return (
    <div 
      className={styles.teamPreview}
      style={{ 
        backgroundColor: team.color,
        color: team.textColor
      }}
    >
      {logoSrc && <img src={logoSrc} alt="" className={styles.previewLogo} />}
      <span className={styles.previewTag}>[{team.tag}]</span>
      <span className={styles.previewName}>{team.name}</span>
    </div>
  );
};

interface FeaturedHeroPreviewProps {
  path: string;
}

const FeaturedHeroPreview: React.FC<FeaturedHeroPreviewProps> = ({ path }) => {
  const src = useImageSrc(path);
  
  if (!src) return null;
  
  return (
    <div className={styles.heroPreview}>
      <img src={src} alt="Featured Hero" />
    </div>
  );
};

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick }) => {
  const { state } = useApp();
  const portraitAsset = player.portraitAssetId 
    ? state.assets.portraits.find(a => a.id === player.portraitAssetId)
    : null;
  const portraitSrc = useImageSrc(portraitAsset?.path);
  
  const heroAsset = player.featuredHeroAssetId
    ? state.assets.heroes.find(a => a.id === player.featuredHeroAssetId)
    : null;
  const heroSrc = useImageSrc(heroAsset?.path);
  
  return (
    <div className={styles.playerCard} onClick={onClick}>
      <div className={styles.playerAvatar}>
        {portraitSrc ? (
          <img src={portraitSrc} alt={player.name} />
        ) : (
          <span>{player.name.charAt(0)}</span>
        )}
      </div>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{player.name}</span>
        <span className={styles.playerMeta}>
          {player.role} &bull; {player.position}
        </span>
      </div>
      {heroSrc && (
        <div className={styles.playerHero}>
          <img src={heroSrc} alt="" />
        </div>
      )}
    </div>
  );
};
