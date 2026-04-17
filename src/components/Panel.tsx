import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  title,
  actions,
  noPadding = false,
  className = ''
}) => {
  return (
    <div className={`${styles.panel} ${className}`}>
      {(title || actions) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
        {children}
      </div>
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  selected = false,
  className = ''
}) => {
  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
