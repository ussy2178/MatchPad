import styles from './MatchPadTitle.module.css';

type MatchPadTitleProps = {
  compact?: boolean;
};

export function MatchPadTitle({ compact = false }: MatchPadTitleProps) {
  return (
    <div className={`${styles.titleWrap} ${compact ? styles.compactTitleWrap : ''}`}>
      <h1 className={`${styles.title} ${compact ? styles.compactTitle : ''}`}>Match Pad</h1>
      <span className={`${styles.version} ${compact ? styles.compactVersion : ''}`}>v{__APP_VERSION__}</span>
    </div>
  );
}
