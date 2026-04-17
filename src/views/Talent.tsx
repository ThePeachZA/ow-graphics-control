import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Button, Input } from '../components';
import { PortraitSelector } from '../components/ImageSelector';
import type { Talent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import styles from './Talent.module.css';

const socialPlatforms = [
  { value: 'twitter', label: 'Twitter/X', icon: '𝕏' },
  { value: 'twitch', label: 'Twitch', icon: '◈' },
  { value: 'youtube', label: 'YouTube', icon: '▶' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'tiktok', label: 'TikTok', icon: '♪' }
];

export const TalentView: React.FC = () => {
  const { state, dispatch } = useApp();
  const [editingTalent, setEditingTalent] = useState<Talent | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleAddTalent = () => {
    setEditingTalent({
      id: uuidv4(),
      displayName: ''
    });
    setShowForm(true);
  };

  const handleUpdateTalent = <K extends keyof Talent>(field: K, value: Talent[K]) => {
    if (!editingTalent) return;
    setEditingTalent({ ...editingTalent, [field]: value });
  };

  const handleUpdateSocial = (updates: Partial<NonNullable<Talent['socialMedia']>>) => {
    if (!editingTalent) return;
    const current = editingTalent.socialMedia || { platform: 'twitter' as const, handle: '' };
    handleUpdateTalent('socialMedia', { ...current, ...updates });
  };

  const handleSave = () => {
    if (!editingTalent || !editingTalent.displayName.trim()) return;
    
    const exists = state.talents.find(t => t.id === editingTalent.id);
    if (exists) {
      dispatch({ type: 'UPDATE_TALENT', payload: editingTalent });
    } else {
      dispatch({ type: 'ADD_TALENT', payload: editingTalent });
    }
    setEditingTalent(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this talent member?')) {
      dispatch({ type: 'DELETE_TALENT', payload: id });
      if (editingTalent?.id === id) {
        setEditingTalent(null);
        setShowForm(false);
      }
    }
  };

  const handleEdit = (talent: Talent) => {
    setEditingTalent(talent);
    setShowForm(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Talent</h1>
        <Button onClick={handleAddTalent}>Add Talent</Button>
      </div>

      <div className={styles.layout}>
        <div className={styles.talentList}>
          <Panel title="Talent Members" noPadding>
            <div className={styles.list}>
              {state.talents.length === 0 ? (
                <div className={styles.empty}>
                  <p className="text-muted">No talent members yet</p>
                </div>
              ) : (
                state.talents.map(talent => (
                  <button
                    key={talent.id}
                    className={`${styles.talentItem} ${editingTalent?.id === talent.id ? styles.active : ''}`}
                    onClick={() => handleEdit(talent)}
                  >
                    <div className={styles.talentName}>
                      {talent.displayName || 'Unnamed'}
                    </div>
                    {talent.pronouns && (
                      <div className={styles.talentPronouns}>
                        {talent.pronouns}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className={styles.talentDetail}>
          {showForm && editingTalent ? (
            <Panel title={editingTalent.displayName ? `Edit: ${editingTalent.displayName}` : 'New Talent'}>
              <div className={styles.form}>
                <Input
                  label="Display Name *"
                  value={editingTalent.displayName}
                  onChange={(e) => handleUpdateTalent('displayName', e.target.value)}
                  placeholder="Enter display name"
                  required
                />

                <Input
                  label="Real Name"
                  value={editingTalent.realName || ''}
                  onChange={(e) => handleUpdateTalent('realName', e.target.value || undefined)}
                  placeholder="Enter real name (optional)"
                />

                <Input
                  label="Pronouns"
                  value={editingTalent.pronouns || ''}
                  onChange={(e) => handleUpdateTalent('pronouns', e.target.value || undefined)}
                  placeholder="e.g. he/him, she/her, they/them"
                />

                <div className={styles.socialSection}>
                  <label className={styles.fieldLabel}>Social Media</label>
                  <div className={styles.socialRow}>
                    <select
                      className={styles.platformSelect}
                      value={editingTalent.socialMedia?.platform || 'twitter'}
                      onChange={(e) => handleUpdateSocial({ platform: e.target.value as 'twitter' | 'twitch' | 'youtube' | 'instagram' | 'tiktok' })}
                    >
                      {socialPlatforms.map(p => (
                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                    <Input
                      value={editingTalent.socialMedia?.handle || ''}
                      onChange={(e) => handleUpdateSocial({ handle: e.target.value })}
                      placeholder="@handle"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className={styles.portraitSection}>
                  <label className={styles.fieldLabel}>Portrait Image</label>
                  <PortraitSelector
                    value={editingTalent.portraitAssetId || null}
                    onChange={(assetId) => handleUpdateTalent('portraitAssetId', assetId || undefined)}
                  />
                </div>

                <div className={styles.formActions}>
                  <Button onClick={handleSave} disabled={!editingTalent.displayName.trim()}>Save</Button>
                  <Button variant="danger" onClick={() => handleDelete(editingTalent.id)}>
                    Delete
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setEditingTalent(null);
                    setShowForm(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Panel>
          ) : (
            <div className={styles.noSelection}>
              <p className="text-muted">Select or add a talent member</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
