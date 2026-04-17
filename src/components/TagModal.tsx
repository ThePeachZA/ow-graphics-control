import React from 'react';
import { Button } from './Button';
import styles from './TagModal.module.css';

interface TagOption {
  id: string;
  name: string;
}

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedId: string | null) => void;
  title: string;
  options: TagOption[];
  selectedCount: number;
  untagOption?: boolean;
}

export const TagModal: React.FC<TagModalProps> = ({
  isOpen,
  onClose,
  onApply,
  title,
  options,
  selectedCount,
  untagOption = true
}) => {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [untag, setUntag] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setUntag(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (untag) {
      onApply(null);
    } else if (selectedOption) {
      onApply(selectedOption);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.subtitle}>
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </p>
          
          <div className={styles.optionsList}>
            {options.map(option => (
              <button
                key={option.id}
                className={`${styles.optionItem} ${selectedOption === option.id && !untag ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedOption(option.id);
                  setUntag(false);
                }}
              >
                <span className={styles.optionRadio}>
                  {selectedOption === option.id && !untag && <span className={styles.radioInner} />}
                </span>
                <span>{option.name}</span>
              </button>
            ))}
            {untagOption && (
              <button
                className={`${styles.optionItem} ${untag ? styles.selected : ''}`}
                onClick={() => {
                  setUntag(true);
                  setSelectedOption(null);
                }}
              >
                <span className={styles.optionRadio}>
                  {untag && <span className={styles.radioInner} />}
                </span>
                <span>Untag (remove from all)</span>
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.footer}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button 
            size="sm" 
            onClick={handleApply}
            disabled={!selectedOption && !untag}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};
