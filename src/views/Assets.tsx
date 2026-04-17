import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button, Input, TagModal } from '../components';
import { AssetEntry } from '../types';
import { useImageSrc, useThumbnailSrc } from '../hooks';
import { v4 as uuidv4 } from 'uuid';
import styles from './Assets.module.css';

type ActiveTab = 'heroes' | 'gameModes' | 'maps' | 'logos' | 'portraits' | 'roles' | 'sides' | null;

export const Assets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  return (
    <div className={styles.assetsContainer}>
      <div className={styles.assetsHeader}>
        <div className={styles.assetsHeaderTop}>
          <h1>Asset Manager</h1>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'logos' ? styles.active : ''}`}
              onClick={() => setActiveTab('logos')}
            >
              Logos
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'portraits' ? styles.active : ''}`}
              onClick={() => setActiveTab('portraits')}
            >
              Portraits
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'maps' ? styles.active : ''}`}
              onClick={() => setActiveTab('maps')}
            >
              Maps
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'gameModes' ? styles.active : ''}`}
              onClick={() => setActiveTab('gameModes')}
            >
              Game Modes
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'heroes' ? styles.active : ''}`}
              onClick={() => setActiveTab('heroes')}
            >
              Heroes
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'roles' ? styles.active : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              Roles
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'sides' ? styles.active : ''}`}
              onClick={() => setActiveTab('sides')}
            >
              Sides
            </button>
          </div>
        </div>
      </div>

      <div className={styles.assetsContent}>
        {!activeTab ? (
          <div className={styles.noTabSelected}>
            <div className={styles.noTabSelectedContent}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h2>Select a category to get started</h2>
              <p className="text-muted">Choose from the tabs above to manage your assets</p>
            </div>
          </div>
        ) : activeTab === 'logos' ? (
          <GallerySection category="logos" label="Logos" />
        ) : activeTab === 'portraits' ? (
          <GallerySection category="portraits" label="Portraits" />
        ) : activeTab === 'maps' ? (
          <MapsSection />
        ) : activeTab === 'gameModes' ? (
          <GameModesSection />
        ) : activeTab === 'heroes' ? (
          <HeroesSection />
        ) : activeTab === 'roles' ? (
          <RolesSection />
        ) : activeTab === 'sides' ? (
          <SidesSection />
        ) : null}
      </div>
    </div>
  );
};

const HeroesSection: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [showTagModal, setShowTagModal] = useState(false);

  const selectedHero = selectedHeroId ? state.assets.heroes.find(h => h.id === selectedHeroId) : null;
  const roles = [...state.assets.roles].sort((a, b) => a.name.localeCompare(b.name));

  const filteredHeroes = useMemo(() => {
    let heroes = state.assets.heroes;
    if (filterRoleId) {
      heroes = heroes.filter(h => h.roleAssetId === filterRoleId);
    }
    return [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  }, [state.assets.heroes, filterRoleId]);

  const handleCreateHero = () => {
    const newHero: AssetEntry = {
      id: uuidv4(),
      name: 'New Hero',
      filename: '',
      path: '',
      category: 'heroes',
      addedAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ASSET', category: 'heroes', payload: newHero });
    setSelectedHeroId(newHero.id);
  };

  const handleUpdateHero = (field: keyof AssetEntry, value: any) => {
    if (!selectedHero) return;
    const updated = { ...selectedHero, [field]: value };
    dispatch({ type: 'UPDATE_ASSET', category: 'heroes', payload: updated });
  };

  const handleDeleteHero = () => {
    if (!selectedHero) return;
    if (confirm(`Delete ${selectedHero.name}?`)) {
      dispatch({ type: 'REMOVE_ASSET', category: 'heroes', id: selectedHero.id });
      setSelectedHeroId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkTagRole = (roleAssetId: string | null) => {
    selectedIds.forEach(id => {
      const hero = state.assets.heroes.find(h => h.id === id);
      if (hero) {
        dispatch({ type: 'UPDATE_ASSET', category: 'heroes', payload: { ...hero, roleAssetId } });
      }
    });
    setSelectedIds(new Set());
    setBulkSelectMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} heroes?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category: 'heroes', id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
      if (selectedHeroId && selectedIds.has(selectedHeroId)) {
        setSelectedHeroId(null);
      }
    }
  };

  const getHeroRoleName = (hero: AssetEntry): string => {
    if (!hero.roleAssetId) return 'Unassigned';
    const role = roles.find(r => r.id === hero.roleAssetId);
    return role?.name || 'Unassigned';
  };

  return (
    <div className={styles.assetsLayout}>
      <div className={styles.assetsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Heroes</h2>
          <div className={styles.sidebarHeaderActions}>
            <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button size="sm" onClick={handleCreateHero}>+ Add</Button>
          </div>
        </div>
        {bulkSelectMode && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedIds.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setShowTagModal(true)}>Tag</Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
        
        <TagModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onApply={handleBulkTagRole}
          title="Tag Heroes"
          options={roles.map(r => ({ id: r.id, name: r.name }))}
          selectedCount={selectedIds.size}
        />
        <div className={styles.filterDropdown}>
          <select 
            value={filterRoleId} 
            onChange={(e) => setFilterRoleId(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.assetList}>
          {filteredHeroes.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No heroes yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateHero}>
                Create First Hero
              </Button>
            </div>
          ) : (
            filteredHeroes.map(hero => (
              <HeroListItem
                key={hero.id}
                hero={hero}
                roles={roles}
                isSelected={selectedHeroId === hero.id}
                isBulkSelected={selectedIds.has(hero.id)}
                bulkSelectMode={bulkSelectMode}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelection(hero.id);
                  } else {
                    setSelectedHeroId(hero.id);
                  }
                }}
                onCheckboxClick={() => toggleSelection(hero.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.assetsMain}>
        {selectedHero && !bulkSelectMode ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.itemHeader}>
                <HeroIcon hero={selectedHero} />
                <div>
                  <h1>{selectedHero.name}</h1>
                  <span className={styles.itemMeta}>{getHeroRoleName(selectedHero)}</span>
                </div>
              </div>
              <div className={styles.headerActions}>
                <Button variant="danger" size="sm" onClick={handleDeleteHero}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedHeroId(null)}>Close</Button>
              </div>
            </div>

            <div className={styles.detailContent}>
              <Panel title="Info">
                <div className={styles.formGrid}>
                  <Input
                    label="Hero Name"
                    value={selectedHero.name}
                    onChange={(e) => handleUpdateHero('name', e.target.value)}
                  />
                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>Role</span>
                    <div className={styles.buttonGroup}>
                      {roles.map(role => (
                        <Button
                          key={role.id}
                          variant={selectedHero.roleAssetId === role.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleUpdateHero('roleAssetId', role.id)}
                        >
                          {role.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Hero Image">
                <SideImageSelector
                  value={selectedHero.path || null}
                  assetId={selectedHero.id}
                  onChange={(path) => handleUpdateHero('path', path)}
                  category="heroImage"
                />
              </Panel>

              <Panel title="Hero Icon">
                <SideImageSelector
                  value={selectedHero.iconPath || null}
                  assetId={`${selectedHero.id}-icon`}
                  onChange={(path) => handleUpdateHero('iconPath', path)}
                  category="heroIcon"
                />
              </Panel>
            </div>
            <div className={styles.assetFooter}>
              <span className={styles.footerLabel}>Asset ID:</span>
              <code className={styles.assetId}>{selectedHero.id}</code>
            </div>
          </>
        ) : bulkSelectMode ? (
          <div className={styles.bulkSelectActive}>
            <p className="text-muted">Select items from the list to bulk tag or delete</p>
          </div>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a hero to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface HeroListItemProps {
  hero: AssetEntry;
  roles: AssetEntry[];
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkSelectMode: boolean;
  onClick: () => void;
  onCheckboxClick: () => void;
}

const HeroListItem: React.FC<HeroListItemProps> = ({ hero, roles, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  return (
    <HeroListItemInner
      hero={hero}
      roles={roles}
      isSelected={isSelected}
      isBulkSelected={isBulkSelected}
      bulkSelectMode={bulkSelectMode}
      onClick={onClick}
      onCheckboxClick={onCheckboxClick}
    />
  );
};

const HeroListItemInner: React.FC<HeroListItemProps> = ({ hero, roles, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  const iconSrc = useImageSrc(hero.iconPath || hero.path);
  const roleName = hero.roleAssetId
    ? roles.find(r => r.id === hero.roleAssetId)?.name || 'Unassigned'
    : 'Unassigned';

  return (
    <div
      className={`${styles.assetListItem} ${isSelected && !bulkSelectMode ? styles.active : ''}`}
      onClick={onClick}
    >
      {bulkSelectMode && (
        <button
          className={`${styles.checkbox} ${isBulkSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onCheckboxClick(); }}
          style={{ position: 'static', marginRight: '4px' }}
        >
          {isBulkSelected && '✓'}
        </button>
      )}
      <div className={styles.assetListItemThumb}>
        {iconSrc ? (
          <img src={iconSrc} alt={hero.name} />
        ) : (
          <span>{hero.name.charAt(0)}</span>
        )}
      </div>
      <div className={styles.assetListItemInfo}>
        <span className={styles.assetListItemName}>{hero.name}</span>
        <span className={styles.assetListItemMeta}>{roleName}</span>
      </div>
    </div>
  );
};

const HeroIcon: React.FC<{ hero: AssetEntry }> = ({ hero }) => {
  const iconSrc = useImageSrc(hero.iconPath || hero.path);

  if (!iconSrc) return null;
  return <img src={iconSrc} alt={hero.name} className={styles.itemHeaderIcon} />;
};

const GameModesSection: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedGameModeId, setSelectedGameModeId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedGameMode = selectedGameModeId ? state.assets.gameModes.find(gm => gm.id === selectedGameModeId) : null;

  const handleCreateGameMode = () => {
    const newGameMode: AssetEntry = {
      id: uuidv4(),
      name: 'New Map',
      filename: '',
      path: '',
      category: 'gameModes',
      addedAt: new Date().toISOString(),
      gamemode: 'Control'
    };
    dispatch({ type: 'ADD_ASSET', category: 'gameModes', payload: newGameMode });
    setSelectedGameModeId(newGameMode.id);
  };

  const handleUpdateGameMode = (field: keyof AssetEntry, value: any) => {
    if (!selectedGameMode) return;
    const updated = { ...selectedGameMode, [field]: value };
    dispatch({ type: 'UPDATE_ASSET', category: 'gameModes', payload: updated });
  };

  const handleDeleteGameMode = () => {
    if (!selectedGameMode) return;
    if (confirm(`Delete ${selectedGameMode.name}?`)) {
      dispatch({ type: 'REMOVE_ASSET', category: 'gameModes', id: selectedGameMode.id });
      setSelectedGameModeId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} game modes?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category: 'gameModes', id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    }
  };

  return (
    <div className={styles.assetsLayout}>
      <div className={styles.assetsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Game Modes</h2>
          <div className={styles.sidebarHeaderActions}>
            <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button size="sm" onClick={handleCreateGameMode}>+ Add</Button>
          </div>
        </div>
        {bulkSelectMode && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedIds.size} selected</span>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
        <div className={styles.assetList}>
          {state.assets.gameModes.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No game modes yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateGameMode}>
                Create First Game Mode
              </Button>
            </div>
          ) : (
            [...state.assets.gameModes].sort((a, b) => a.name.localeCompare(b.name)).map(gm => (
              <GameModeListItem
                key={gm.id}
                gameMode={gm}
                isSelected={selectedGameModeId === gm.id}
                isBulkSelected={selectedIds.has(gm.id)}
                bulkSelectMode={bulkSelectMode}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelection(gm.id);
                  } else {
                    setSelectedGameModeId(gm.id);
                  }
                }}
                onCheckboxClick={() => toggleSelection(gm.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.assetsMain}>
        {selectedGameMode ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.itemHeader}>
                <GameModeIcon gameMode={selectedGameMode} />
                <div>
                  <h1>{selectedGameMode.name}</h1>
                </div>
              </div>
              <div className={styles.headerActions}>
                <Button variant="danger" size="sm" onClick={handleDeleteGameMode}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGameModeId(null)}>Close</Button>
              </div>
            </div>

            <div className={styles.detailContent}>
              <Panel title="Info">
                <div className={styles.formGrid}>
                  <Input
                    label="Game Mode Name"
                    value={selectedGameMode.name}
                    onChange={(e) => handleUpdateGameMode('name', e.target.value)}
                  />
                </div>
              </Panel>

              <Panel title="Game Mode Icon">
                <SideImageSelector
                  value={selectedGameMode.path || null}
                  assetId={selectedGameMode.id}
                  onChange={(path) => handleUpdateGameMode('path', path)}
                  category="gameModes"
                />
              </Panel>
            </div>
            <div className={styles.assetFooter}>
              <span className={styles.footerLabel}>Asset ID:</span>
              <code className={styles.assetId}>{selectedGameMode.id}</code>
            </div>
          </>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a game mode to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface GameModeListItemProps {
  gameMode: AssetEntry;
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkSelectMode: boolean;
  onClick: () => void;
  onCheckboxClick: () => void;
}

const GameModeListItem: React.FC<GameModeListItemProps> = ({ gameMode, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  return (
    <GameModeListItemInner
      gameMode={gameMode}
      isSelected={isSelected}
      isBulkSelected={isBulkSelected}
      bulkSelectMode={bulkSelectMode}
      onClick={onClick}
      onCheckboxClick={onCheckboxClick}
    />
  );
};

const GameModeListItemInner: React.FC<GameModeListItemProps> = ({ gameMode, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  const iconSrc = useThumbnailSrc(gameMode.path);

  return (
    <div
      className={`${styles.assetListItem} ${isSelected && !bulkSelectMode ? styles.active : ''}`}
      onClick={onClick}
    >
      {bulkSelectMode && (
        <button
          className={`${styles.checkbox} ${isBulkSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onCheckboxClick(); }}
          style={{ position: 'static', marginRight: '4px' }}
        >
          {isBulkSelected && '✓'}
        </button>
      )}
      <div className={styles.assetListItemThumb}>
        {iconSrc ? (
          <img src={iconSrc} alt={gameMode.name} />
        ) : (
          <span>{gameMode.name.charAt(0)}</span>
        )}
      </div>
      <div className={styles.assetListItemInfo}>
        <span className={styles.assetListItemName}>{gameMode.name}</span>
      </div>
    </div>
  );
};

const GameModeIcon: React.FC<{ gameMode: AssetEntry }> = ({ gameMode }) => {
  const iconSrc = useThumbnailSrc(gameMode.path);
  if (!iconSrc) return null;
  return <img src={iconSrc} alt={gameMode.name} className={styles.itemHeaderIcon} />;
};

const MapsSection: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [filterGamemodeId, setFilterGamemodeId] = useState<string>('');
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTagModal, setShowTagModal] = useState(false);

  const maps = state.assets.maps || [];
  const selectedMap = selectedMapId ? maps.find(m => m.id === selectedMapId) : null;

  const gameModes = [...state.assets.gameModes].sort((a, b) => a.name.localeCompare(b.name));

  const filteredMaps = useMemo(() => {
    return [...maps].sort((a, b) => a.name.localeCompare(b.name)).filter((map: AssetEntry) => {
      if (filterGamemodeId && map.gameModeAssetId !== filterGamemodeId) return false;
      return true;
    });
  }, [maps, filterGamemodeId]);

  const handleCreateMap = () => {
    const newMap: AssetEntry = {
      id: uuidv4(),
      name: 'New Map',
      filename: '',
      path: '',
      category: 'maps',
      addedAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ASSET', category: 'maps', payload: newMap });
    setSelectedMapId(newMap.id);
  };

  const handleUpdateMap = (field: keyof AssetEntry, value: any) => {
    if (!selectedMap) return;
    const updated = { ...selectedMap, [field]: value };
    dispatch({ type: 'UPDATE_ASSET', category: 'maps', payload: updated });
  };

  const handleDeleteMap = () => {
    if (!selectedMap) return;
    if (confirm(`Delete ${selectedMap.name}?`)) {
      dispatch({ type: 'REMOVE_ASSET', category: 'maps', id: selectedMap.id });
      setSelectedMapId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkTagGamemode = (gameModeAssetId: string | null) => {
    selectedIds.forEach(id => {
      const map = maps.find(m => m.id === id);
      if (map) {
        dispatch({ type: 'UPDATE_ASSET', category: 'maps', payload: { ...map, gameModeAssetId } });
      }
    });
    setSelectedIds(new Set());
    setBulkSelectMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} maps?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category: 'maps', id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    }
  };

  const getMapGameModeName = (map: AssetEntry): string => {
    if (!map.gameModeAssetId) return 'Untagged';
    const gm = gameModes.find(g => g.id === map.gameModeAssetId);
    return gm?.name || 'Untagged';
  };

  return (
    <div className={styles.assetsLayout}>
      <div className={styles.assetsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Maps</h2>
          <div className={styles.sidebarHeaderActions}>
            <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button size="sm" onClick={handleCreateMap}>+ Add</Button>
          </div>
        </div>
        <div className={styles.filterDropdown}>
          <select 
            value={filterGamemodeId} 
            onChange={(e) => setFilterGamemodeId(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Game Modes</option>
            {gameModes.map(gm => (
              <option key={gm.id} value={gm.id}>{gm.name}</option>
            ))}
          </select>
        </div>
        {bulkSelectMode && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedIds.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setShowTagModal(true)}>Tag</Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
        
        <TagModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onApply={handleBulkTagGamemode}
          title="Tag Maps"
          options={gameModes.map(gm => ({ id: gm.id, name: gm.name }))}
          selectedCount={selectedIds.size}
        />
        <div className={styles.assetList}>
          {maps.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No maps yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateMap}>
                Create First Map
              </Button>
            </div>
          ) : (
            filteredMaps.map(map => (
              <MapListItem
                key={map.id}
                map={map}
                gameModes={gameModes}
                isSelected={selectedMapId === map.id}
                isBulkSelected={selectedIds.has(map.id)}
                bulkSelectMode={bulkSelectMode}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelection(map.id);
                  } else {
                    setSelectedMapId(map.id);
                  }
                }}
                onCheckboxClick={() => toggleSelection(map.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.assetsMain}>
        {selectedMap && !bulkSelectMode ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.itemHeader}>
                <MapIcon map={selectedMap} />
                <div>
                  <h1>{selectedMap.name}</h1>
                  <span className={styles.itemMeta}>{getMapGameModeName(selectedMap)}</span>
                </div>
              </div>
              <div className={styles.headerActions}>
                <Button variant="danger" size="sm" onClick={handleDeleteMap}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMapId(null)}>Close</Button>
              </div>
            </div>

            <div className={styles.detailContent}>
              <Panel title="Info">
                <div className={styles.formGrid}>
                  <Input
                    label="Map Name"
                    value={selectedMap.name}
                    onChange={(e) => handleUpdateMap('name', e.target.value)}
                  />
                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>Map Type</span>
                    <div className={styles.buttonGroup}>
                      {gameModes.map(gm => (
                        <Button
                          key={gm.id}
                          variant={selectedMap.gameModeAssetId === gm.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleUpdateMap('gameModeAssetId', gm.id)}
                        >
                          {gm.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Map Image">
                <SideImageSelector
                  value={selectedMap.path || null}
                  assetId={selectedMap.id}
                  onChange={(path) => handleUpdateMap('path', path)}
                  category="maps"
                />
              </Panel>
            </div>
            <div className={styles.assetFooter}>
              <span className={styles.footerLabel}>Asset ID:</span>
              <code className={styles.assetId}>{selectedMap.id}</code>
            </div>
          </>
        ) : bulkSelectMode ? (
          <div className={styles.bulkSelectActive}>
            <p className="text-muted">Select items from the list to bulk tag or delete</p>
          </div>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a map to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface MapListItemProps {
  map: AssetEntry;
  gameModes: AssetEntry[];
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkSelectMode: boolean;
  onClick: () => void;
  onCheckboxClick: () => void;
}

const MapListItem: React.FC<MapListItemProps> = ({ map, gameModes, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  return (
    <MapListItemInner
      map={map}
      gameModes={gameModes}
      isSelected={isSelected}
      isBulkSelected={isBulkSelected}
      bulkSelectMode={bulkSelectMode}
      onClick={onClick}
      onCheckboxClick={onCheckboxClick}
    />
  );
};

const MapListItemInner: React.FC<MapListItemProps> = ({ map, gameModes, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  const iconSrc = useThumbnailSrc(map.path);
  const gameModeName = map.gameModeAssetId
    ? gameModes.find(g => g.id === map.gameModeAssetId)?.name || 'Untagged'
    : 'Untagged';

  return (
    <div
      className={`${styles.assetListItem} ${isSelected && !bulkSelectMode ? styles.active : ''}`}
      onClick={onClick}
    >
      {bulkSelectMode && (
        <button
          className={`${styles.checkbox} ${isBulkSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onCheckboxClick(); }}
          style={{ position: 'static', marginRight: '4px' }}
        >
          {isBulkSelected && '✓'}
        </button>
      )}
      <div className={styles.assetListItemThumb}>
        {iconSrc ? (
          <img src={iconSrc} alt={map.name} />
        ) : (
          <span>{map.name.charAt(0)}</span>
        )}
      </div>
      <div className={styles.assetListItemInfo}>
        <span className={styles.assetListItemName}>{map.name}</span>
        <span className={styles.assetListItemMeta}>{gameModeName}</span>
      </div>
    </div>
  );
};

const MapIcon: React.FC<{ map: AssetEntry }> = ({ map }) => {
  const iconSrc = useThumbnailSrc(map.path);
  if (!iconSrc) return null;
  return <img src={iconSrc} alt={map.name} className={styles.itemHeaderIcon} />;
};

const RoleIcon: React.FC<{ role: AssetEntry }> = ({ role }) => {
  const iconSrc = useThumbnailSrc(role.path);
  if (!iconSrc) return null;
  return <img src={iconSrc} alt={role.name} className={styles.itemHeaderIcon} />;
};

interface RoleListItemProps {
  role: AssetEntry;
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkSelectMode: boolean;
  onClick: () => void;
  onCheckboxClick: () => void;
}

const RoleListItem: React.FC<RoleListItemProps> = ({ role, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  const iconSrc = useThumbnailSrc(role.path);

  return (
    <div
      className={`${styles.assetListItem} ${isSelected && !bulkSelectMode ? styles.active : ''}`}
      onClick={onClick}
    >
      {bulkSelectMode && (
        <button
          className={`${styles.checkbox} ${isBulkSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onCheckboxClick(); }}
          style={{ position: 'static', marginRight: '4px' }}
        >
          {isBulkSelected && '✓'}
        </button>
      )}
      <div className={styles.assetListItemThumb}>
        {iconSrc ? <img src={iconSrc} alt={role.name} /> : <span>{role.name.charAt(0)}</span>}
      </div>
      <div className={styles.assetListItemInfo}>
        <span className={styles.assetListItemName}>{role.name}</span>
      </div>
    </div>
  );
};

interface GallerySectionProps {
  category: 'logos' | 'portraits';
  label: string;
}

const GalleryCard: React.FC<{
  asset: AssetEntry;
  isSelected: boolean;
  bulkSelectMode: boolean;
  renamingId: string | null;
  renameValue: string;
  onToggleSelection: () => void;
  onStartRename: () => void;
  onRenameChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}> = ({ asset, isSelected, bulkSelectMode, renamingId, renameValue, onToggleSelection, onStartRename, onRenameChange, onSaveRename, onCancelRename, onDelete }) => {
  const thumbSrc = useThumbnailSrc(asset.path);
  const isRenaming = renamingId === asset.id;

  return (
    <div className={`${styles.galleryCard} ${isSelected ? styles.selected : ''}`}>
      {bulkSelectMode && (
        <button
          className={`${styles.galleryCheckbox} ${isSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
        >
          {isSelected && '✓'}
        </button>
      )}
      <div className={styles.galleryCardContent} onClick={() => bulkSelectMode && onToggleSelection()}>
        <div className={styles.galleryCardThumb}>
          {thumbSrc ? (
            <img src={thumbSrc} alt={asset.name} />
          ) : (
            <span>{asset.name.charAt(0)}</span>
          )}
        </div>
      </div>
      <div className={styles.galleryCardFooter}>
        {isRenaming ? (
          <input
            type="text"
            className={styles.renameInput}
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onSaveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.galleryCardName}>{asset.name}</span>
        )}
      </div>
      {!bulkSelectMode && (
        <>
          <button className={styles.galleryRenameBtn} onClick={onStartRename}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className={styles.galleryDeleteBtn} onClick={onDelete}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

const RolesSection: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const roles = [...state.assets.roles].sort((a, b) => a.name.localeCompare(b.name));
  const selectedRole = selectedRoleId ? roles.find(r => r.id === selectedRoleId) : null;

  const handleCreateRole = () => {
    const newRole: AssetEntry = {
      id: uuidv4(),
      name: 'New Role',
      filename: '',
      path: '',
      category: 'roles',
      addedAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ASSET', category: 'roles', payload: newRole });
    setSelectedRoleId(newRole.id);
  };

  const handleUpdateRole = (field: keyof AssetEntry, value: any) => {
    if (!selectedRole) return;
    const updated = { ...selectedRole, [field]: value };
    dispatch({ type: 'UPDATE_ASSET', category: 'roles', payload: updated });
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    if (confirm(`Delete ${selectedRole.name}?`)) {
      dispatch({ type: 'REMOVE_ASSET', category: 'roles', id: selectedRole.id });
      setSelectedRoleId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} roles?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category: 'roles', id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    }
  };

  return (
    <div className={styles.assetsLayout}>
      <div className={styles.assetsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Roles</h2>
          <div className={styles.sidebarHeaderActions}>
            <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button size="sm" onClick={handleCreateRole}>+ Add</Button>
          </div>
        </div>
        {bulkSelectMode && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedIds.size} selected</span>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
        <div className={styles.assetList}>
          {roles.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No roles yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateRole}>
                Create First Role
              </Button>
            </div>
          ) : (
            roles.map(role => (
              <RoleListItem
                key={role.id}
                role={role}
                isSelected={selectedRoleId === role.id && !bulkSelectMode}
                isBulkSelected={selectedIds.has(role.id)}
                bulkSelectMode={bulkSelectMode}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelection(role.id);
                  } else {
                    setSelectedRoleId(role.id);
                  }
                }}
                onCheckboxClick={() => toggleSelection(role.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.assetsMain}>
        {selectedRole ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.itemHeader}>
                <RoleIcon role={selectedRole} />
                <div>
                  <h1>{selectedRole.name}</h1>
                </div>
              </div>
              <div className={styles.headerActions}>
                <Button variant="danger" size="sm" onClick={handleDeleteRole}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRoleId(null)}>Close</Button>
              </div>
            </div>

            <div className={styles.detailContent}>
              <Panel title="Info">
                <div className={styles.formGrid}>
                  <Input
                    label="Role Name"
                    value={selectedRole.name}
                    onChange={(e) => handleUpdateRole('name', e.target.value)}
                  />
                </div>
              </Panel>

              <Panel title="Role Icon">
                <SideImageSelector
                  value={selectedRole.path || null}
                  assetId={selectedRole.id}
                  onChange={(path) => handleUpdateRole('path', path)}
                  category="roles"
                />
              </Panel>
            </div>
            <div className={styles.assetFooter}>
              <span className={styles.footerLabel}>Asset ID:</span>
              <code className={styles.assetId}>{selectedRole.id}</code>
            </div>
          </>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a role to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface SideImageSelectorProps {
  value: string | null;
  assetId?: string;
  onChange: (path: string | null) => void;
  category: string;
}

const SideImageSelector: React.FC<SideImageSelectorProps> = ({ value, assetId, onChange, category }) => {
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const imageSrc = useImageSrc(value);

  const handleSelectFromFile = async () => {
    const result = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    });

    if (!result.canceled && result.filePaths[0]) {
      const filePath = result.filePaths[0];
      const storedPath = await window.electronAPI.importAssetFile(filePath, category, assetId);
      if (storedPath) {
        onChange(storedPath);
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (urlInput.trim()) {
      const storedPath = await window.electronAPI.downloadAssetUrl(urlInput, category);
      if (storedPath) {
        onChange(storedPath);
      }
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={styles.imageSelectorWrapper}>
      <div className={styles.imagePreview}>
        {imageSrc ? (
          <img src={imageSrc} alt="Selected" className={styles.previewImage} />
        ) : (
          <div className={styles.previewPlaceholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className={styles.imageActions}>
        <Button variant="secondary" size="sm" onClick={handleSelectFromFile}>
          Browse Files
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowUrlInput(!showUrlInput)}>
          From URL
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
      {showUrlInput && (
        <div className={styles.urlInputRow}>
          <input
            type="url"
            placeholder="Enter image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            className={styles.urlInput}
          />
          <Button size="sm" onClick={handleUrlSubmit}>Add</Button>
        </div>
      )}
    </div>
  );
};

const SidesSection: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedSideId, setSelectedSideId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sides = [...state.assets.sides].sort((a, b) => a.name.localeCompare(b.name));
  const selectedSide = selectedSideId ? sides.find(s => s.id === selectedSideId) : null;

  const handleCreateSide = () => {
    const newSide: AssetEntry = {
      id: uuidv4(),
      name: 'New Side',
      filename: '',
      path: '',
      category: 'sides',
      addedAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ASSET', category: 'sides', payload: newSide });
    setSelectedSideId(newSide.id);
  };

  const handleUpdateSide = (field: keyof AssetEntry, value: any) => {
    if (!selectedSide) return;
    const updated = { ...selectedSide, [field]: value };
    dispatch({ type: 'UPDATE_ASSET', category: 'sides', payload: updated });
  };

  const handleDeleteSide = () => {
    if (!selectedSide) return;
    if (confirm(`Delete ${selectedSide.name}?`)) {
      dispatch({ type: 'REMOVE_ASSET', category: 'sides', id: selectedSide.id });
      setSelectedSideId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} sides?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category: 'sides', id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    }
  };

  return (
    <div className={styles.assetsLayout}>
      <div className={styles.assetsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Sides</h2>
          <div className={styles.sidebarHeaderActions}>
            <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button size="sm" onClick={handleCreateSide}>+ Add</Button>
          </div>
        </div>
        {bulkSelectMode && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedIds.size} selected</span>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
        <div className={styles.assetList}>
          {sides.length === 0 ? (
            <div className={styles.emptyList}>
              <p className="text-muted">No sides yet</p>
              <Button variant="secondary" size="sm" onClick={handleCreateSide}>
                Create First Side
              </Button>
            </div>
          ) : (
            sides.map(side => (
              <SideListItem
                key={side.id}
                side={side}
                isSelected={selectedSideId === side.id && !bulkSelectMode}
                isBulkSelected={selectedIds.has(side.id)}
                bulkSelectMode={bulkSelectMode}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelection(side.id);
                  } else {
                    setSelectedSideId(side.id);
                  }
                }}
                onCheckboxClick={() => toggleSelection(side.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.assetsMain}>
        {selectedSide && !bulkSelectMode ? (
          <>
            <div className={styles.mainHeader}>
              <div className={styles.itemHeader}>
                <SideIcon side={selectedSide} />
                <div>
                  <h1>{selectedSide.name}</h1>
                </div>
              </div>
              <div className={styles.headerActions}>
                <Button variant="danger" size="sm" onClick={handleDeleteSide}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSideId(null)}>Close</Button>
              </div>
            </div>

            <div className={styles.detailContent}>
              <Panel title="Info">
                <div className={styles.formGrid}>
                  <Input
                    label="Side Name"
                    value={selectedSide.name}
                    onChange={(e) => handleUpdateSide('name', e.target.value)}
                  />
                </div>
              </Panel>

              <Panel title="Side Icon">
                <SideImageSelector
                  value={selectedSide.path || null}
                  assetId={selectedSide.id}
                  onChange={(path) => handleUpdateSide('path', path)}
                  category="sides"
                />
              </Panel>
            </div>
            <div className={styles.assetFooter}>
              <span className={styles.footerLabel}>Asset ID:</span>
              <code className={styles.assetId}>{selectedSide.id}</code>
            </div>
          </>
        ) : bulkSelectMode ? (
          <div className={styles.bulkSelectActive}>
            <p className="text-muted">Select items from the list to bulk tag or delete</p>
          </div>
        ) : (
          <div className={styles.noSelection}>
            <p className="text-muted">Select a side to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SideIcon: React.FC<{ side: AssetEntry }> = ({ side }) => {
  const iconSrc = useThumbnailSrc(side.path);
  if (!iconSrc) return null;
  return <img src={iconSrc} alt={side.name} className={styles.itemHeaderIcon} />;
};

interface SideListItemProps {
  side: AssetEntry;
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkSelectMode: boolean;
  onClick: () => void;
  onCheckboxClick: () => void;
}

const SideListItem: React.FC<SideListItemProps> = ({ side, isSelected, isBulkSelected, bulkSelectMode, onClick, onCheckboxClick }) => {
  const sideSrc = useThumbnailSrc(side.path);
  
  return (
    <div
      className={`${styles.assetListItem} ${isSelected ? styles.active : ''}`}
      onClick={onClick}
    >
      {bulkSelectMode && (
        <button
          className={`${styles.checkbox} ${isBulkSelected ? styles.checked : ''}`}
          onClick={(e) => { e.stopPropagation(); onCheckboxClick(); }}
          style={{ position: 'static', marginRight: '4px' }}
        >
          {isBulkSelected && '✓'}
        </button>
      )}
      <div className={styles.assetListItemThumb}>
        {sideSrc ? <img src={sideSrc} alt={side.name} /> : <span>{side.name.charAt(0)}</span>}
      </div>
      <div className={styles.assetListItemInfo}>
        <span className={styles.assetListItemName}>{side.name}</span>
      </div>
    </div>
  );
};

const GallerySection: React.FC<GallerySectionProps> = ({ category, label }) => {
  const { state, dispatch } = useApp();
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const allCategoryAssets = state.assets[category] || [];
  const assets = allCategoryAssets
    .filter(asset => asset.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleImport = async () => {
    const result = await window.electronAPI.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const existingNames = new Set(assets.map(a => a.name.toLowerCase()));
      const newAssets: AssetEntry[] = [];
      
      for (const filePath of result.filePaths) {
        const filename = filePath.split(/[\\/]/).pop() || '';
        const name = filename.replace(/\.[^.]+$/, '');
        
        if (existingNames.has(name.toLowerCase())) {
          continue;
        }
        
        existingNames.add(name.toLowerCase());
        
        const assetId = uuidv4();
        const storedPath = await window.electronAPI.importAssetFile(filePath, category, assetId);
        
        if (storedPath) {
          newAssets.push({
            id: assetId,
            name,
            filename,
            path: storedPath,
            category,
            addedAt: new Date().toISOString()
          });
        }
      }
      
      if (newAssets.length > 0) {
        dispatch({ type: 'ADD_ASSETS', category, payload: newAssets });
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} assets?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'REMOVE_ASSET', category, id });
      });
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this asset?')) {
      dispatch({ type: 'REMOVE_ASSET', category, id });
    }
  };

  const startRename = (asset: AssetEntry) => {
    setRenamingId(asset.id);
    setRenameValue(asset.name);
  };

  const saveRename = (id: string) => {
    if (renameValue.trim()) {
      const asset = assets.find(a => a.id === id);
      if (asset) {
        dispatch({ type: 'UPDATE_ASSET', category, payload: { ...asset, name: renameValue.trim() } });
      }
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className={styles.galleryLayout}>
      <div className={styles.galleryHeader}>
        <div className={styles.galleryHeaderLeft}>
          <h2>{label}</h2>
          <span className={styles.assetCount}>{assets.length} assets</span>
        </div>
        <div className={styles.galleryActions}>
          {bulkSelectMode && selectedIds.size > 0 && (
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" variant={bulkSelectMode ? 'primary' : 'secondary'} onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedIds(new Set()); }}>
            {bulkSelectMode ? 'Cancel' : 'Select Multiple'}
          </Button>
          <Button size="sm" onClick={handleImport}>+ Import</Button>
        </div>
      </div>

      <div className={styles.galleryGrid}>
        {assets.length === 0 ? (
          <div className={styles.galleryEmpty}>
            <p className="text-muted">No {label.toLowerCase()} yet</p>
            <Button variant="secondary" size="sm" onClick={handleImport}>
              Import {label}
            </Button>
          </div>
        ) : (
          assets.map(asset => (
            <GalleryCard
              key={asset.id}
              asset={asset}
              isSelected={selectedIds.has(asset.id)}
              bulkSelectMode={bulkSelectMode}
              renamingId={renamingId}
              renameValue={renameValue}
              onToggleSelection={() => toggleSelection(asset.id)}
              onStartRename={() => startRename(asset)}
              onRenameChange={setRenameValue}
              onSaveRename={() => saveRename(asset.id)}
              onCancelRename={cancelRename}
              onDelete={() => handleDelete(asset.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
