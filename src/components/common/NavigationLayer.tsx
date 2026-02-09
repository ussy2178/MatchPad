import { useNavigate, useLocation } from 'react-router-dom';
import styles from './NavigationLayer.module.css';

export function NavigationLayer() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isWatchMode = /^\/match\/[^/]+\/watch$/.test(location.pathname);

  if (isHome || isWatchMode) return null;

  return (
    <div className={styles.navigationLayer}>
      {/* Home Button (Top-Left) */}
      <button
        className={styles.homeButton}
        onClick={() => navigate('/')}
        aria-label="Go to Home"
      >
        HOME
      </button>

      {/* Back Button (Bottom-Left) */}
      <button
        className={styles.backButton}
        onClick={() => navigate(-1)}
        aria-label="Go Back"
      >
        ← Back
      </button>
    </div>
  );
}
