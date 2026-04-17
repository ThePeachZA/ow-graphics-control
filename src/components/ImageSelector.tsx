import React, { useState, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { Button } from './Button';
import { AssetEntry, AssetManifest } from '../types';
import { useImageSrc } from '../hooks';
import styles from './ImageSelector.module.css';

interface PickerItemProps {
  asset: AssetEntry;
  isSelected: boolean;
  onClick: () => void;
}

const PickerItem: React.FC<PickerItemProps> = ({ asset, isSelected, onClick }) => {
  const src = useImageSrc(asset.path);
  return (
    <button
      className={`${styles.pickerItem} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {src ? (
        <img src={src} alt={asset.name} />
      ) : (
        <div className={styles.pickerItemPlaceholder}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
      <span>{asset.name}</span>
    </button>
  );
};

interface ImageSelectorProps {
  value: string | null;
  previousValue?: string | null;
  onChange: (assetId: string | null) => void;
  category: keyof AssetManifest;
  label?: string;
  showFromAssets?: boolean;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  value,
  previousValue,
  onChange,
  category,
  label,
  showFromAssets = true
}) => {
  const { state, dispatch } = useApp();
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const assets = state.assets[category] || [];
  const selectedAsset = value ? assets.find(a => a.id === value) : null;
  const imageSrc = useImageSrc(selectedAsset?.path);

  const movePreviousToTemp = useCallback(async (prevId: string | null | undefined) => {
    if (!prevId) return;
    const prevAsset = assets.find(a => a.id === prevId);
    if (prevAsset && prevAsset.path) {
      await window.electronAPI.moveAssetToTemp(prevAsset.path);
    }
  }, [assets]);

  const handleSelectFromFile = async () => {
    const result = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]
    });

    if (!result.canceled && result.filePaths[0]) {
      const filePath = result.filePaths[0];
      const filename = filePath.split(/[\\/]/).pop() || 'unknown';
      const name = filename.replace(/\.[^.]+$/, '');
      
      const existingByName = assets.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (existingByName) {
        onChange(existingByName.id);
        return;
      }
      
      const existingByPath = assets.find(a => a.path.toLowerCase() === filePath.toLowerCase());
      if (existingByPath) {
        onChange(existingByPath.id);
        return;
      }
      
      const newAssetId = crypto.randomUUID();
      const storedPath = await window.electronAPI.importAssetFile(filePath, category, newAssetId);
      
      if (storedPath) {
        if (previousValue) {
          await movePreviousToTemp(previousValue);
        }
        
        const newAsset: AssetEntry = {
          id: newAssetId,
          name,
          filename,
          path: storedPath,
          category,
          addedAt: new Date().toISOString()
        };
        dispatch({ type: 'ADD_ASSET', category, payload: newAsset });
        onChange(newAsset.id);
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (urlInput.trim()) {
      const filename = urlInput.split(/[\\/]/).pop()?.split('?')[0] || 'Image';
      const name = filename.replace(/\.[^.]+$/, '');
      
      const existingByName = assets.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (existingByName) {
        onChange(existingByName.id);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }
      
      const existingByUrl = assets.find(a => a.filename === urlInput);
      if (existingByUrl) {
        onChange(existingByUrl.id);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }
      
      const storedPath = await window.electronAPI.downloadAssetUrl(urlInput, category);
      
      if (storedPath) {
        if (previousValue) {
          await movePreviousToTemp(previousValue);
        }
        
        const newAsset: AssetEntry = {
          id: crypto.randomUUID(),
          name,
          filename: urlInput,
          path: storedPath,
          category,
          addedAt: new Date().toISOString()
        };
        dispatch({ type: 'ADD_ASSET', category, payload: newAsset });
        onChange(newAsset.id);
      }
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleSelectAsset = async (assetId: string) => {
    if (previousValue && previousValue !== assetId) {
      await movePreviousToTemp(previousValue);
    }
    onChange(assetId);
    setShowPicker(false);
  };

  const handleClear = async () => {
    if (value) {
      await movePreviousToTemp(value);
    }
    onChange(null);
  };

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      
      <div className={styles.preview}>
        {imageSrc ? (
          <img 
            src={imageSrc}
            alt={selectedAsset?.name || 'Selected'}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleSelectFromFile}>
          Browse Files
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowUrlInput(!showUrlInput)}>
          From URL
        </Button>
        {showFromAssets && (
          <Button variant="ghost" size="sm" onClick={() => setShowPicker(true)}>
            From Assets
          </Button>
        )}
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {showUrlInput && (
        <div className={styles.urlInput}>
          <input
            type="url"
            placeholder="Enter image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button size="sm" onClick={handleUrlSubmit}>Add</Button>
        </div>
      )}

      {showPicker && (
        <div className={styles.pickerOverlay} onClick={() => setShowPicker(false)}>
          <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerHeader}>
              <h4>Select from {category}</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)}>Close</Button>
            </div>
            <div className={styles.pickerGrid}>
              {assets.length === 0 ? (
                <div className={styles.empty}>
                  <p>No assets in this category</p>
                  <Button size="sm" onClick={handleSelectFromFile}>Import Asset</Button>
                </div>
              ) : (
                assets.map(asset => (
                  <PickerItem
                    key={asset.id}
                    asset={asset}
                    isSelected={asset.id === value}
                    onClick={() => handleSelectAsset(asset.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface LogoSelectorProps {
  value: string | null;
  onChange: (assetId: string | null) => void;
  category: 'logos';
}

export const LogoSelector: React.FC<LogoSelectorProps> = ({ value, onChange, category }) => {
  const { state } = useApp();
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allAssets = state.assets[category] || [];
  const filteredAssets = allAssets
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const selectedAsset = value ? allAssets.find(a => a.id === value) : null;
  const imageSrc = useImageSrc(selectedAsset?.path);

  const handleSelectAsset = (assetId: string) => {
    onChange(assetId);
    setShowPicker(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        {imageSrc ? (
          <img 
            src={imageSrc}
            alt={selectedAsset?.name || 'Selected'}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={() => setShowPicker(true)}>
          Select from Assets
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {showPicker && (
        <div className={styles.pickerOverlay} onClick={() => { setShowPicker(false); setSearchTerm(''); }}>
          <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerHeader}>
              <h4>Select from {category}</h4>
              <Button variant="ghost" size="sm" onClick={() => { setShowPicker(false); setSearchTerm(''); }}>Close</Button>
            </div>
            <div className={styles.pickerSearch}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.pickerGrid}>
              {filteredAssets.length === 0 ? (
                <div className={styles.empty}>
                  <p>{searchTerm ? 'No matching assets' : 'No assets in this category'}</p>
                  {!searchTerm && <p className="text-muted">Add logos in Asset Manager first</p>}
                </div>
              ) : (
                filteredAssets.map(asset => (
                  <PickerItem
                    key={asset.id}
                    asset={asset}
                    isSelected={asset.id === value}
                    onClick={() => handleSelectAsset(asset.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PortraitSelectorProps {
  value: string | null;
  onChange: (assetId: string | null) => void;
}

export const PortraitSelector: React.FC<PortraitSelectorProps> = ({ value, onChange }) => {
  const { state } = useApp();
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allAssets = state.assets.portraits || [];
  const filteredAssets = allAssets
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const selectedAsset = value ? allAssets.find(a => a.id === value) : null;
  const imageSrc = useImageSrc(selectedAsset?.path);

  const handleSelectAsset = (assetId: string) => {
    onChange(assetId);
    setShowPicker(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        {imageSrc ? (
          <img 
            src={imageSrc}
            alt={selectedAsset?.name || 'Selected'}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={() => setShowPicker(true)}>
          Select from Assets
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {showPicker && (
        <div className={styles.pickerOverlay} onClick={() => { setShowPicker(false); setSearchTerm(''); }}>
          <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerHeader}>
              <h4>Select Portrait</h4>
              <Button variant="ghost" size="sm" onClick={() => { setShowPicker(false); setSearchTerm(''); }}>Close</Button>
            </div>
            <div className={styles.pickerSearch}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.pickerGrid}>
              {filteredAssets.length === 0 ? (
                <div className={styles.empty}>
                  <p>{searchTerm ? 'No matching assets' : 'No portraits in this category'}</p>
                  {!searchTerm && <p className="text-muted">Add portraits in Asset Manager first</p>}
                </div>
              ) : (
                filteredAssets.map(asset => (
                  <PickerItem
                    key={asset.id}
                    asset={asset}
                    isSelected={asset.id === value}
                    onClick={() => handleSelectAsset(asset.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
