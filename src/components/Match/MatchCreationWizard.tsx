import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useLiveQuery } from 'dexie-react-hooks'; // Unused
import { db, type Match } from '../../db/db';
import { useTeams } from '../../hooks/useTeams';
import { usePlayers } from '../../hooks/usePlayers';
import { debugTeamStorage } from '../../utils/storageDebug';
import { normalizeTeamId } from '../../utils/idUtils';
import { Button } from '../common/Button';
import { TacticalBoard } from '../Formation/TacticalBoard';
import type { FormationName } from '../../constants/formations';
import styles from './Match.module.css';

// Helper for smart kickoff time (nearest 30m)
const getSmartKickoffTime = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const hour = now.getHours();

  // If < 15, current hour : 30
  // If < 45, next hour : 00
  // Else next hour : 30
  let targetHour = hour;
  let targetMin = 30;

  if (minutes < 15) {
    targetMin = 30;
  } else if (minutes < 45) {
    targetHour = hour + 1;
    targetMin = 0;
  } else {
    targetHour = hour + 1;
    targetMin = 30;
  }

  if (targetHour >= 24) targetHour = 0;

  return `${targetHour.toString().padStart(2, '0')}:${targetMin.toString().padStart(2, '0')}`;
};

/** Preset colors for per-match team selection. */
export const PRESET_MATCH_COLORS: { hex: string; label: string }[] = [
  { hex: '#dc2626', label: 'Red' },
  { hex: '#2563eb', label: 'Blue' },
  { hex: '#15803d', label: 'Dark green' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#0ea5e9', label: 'Light blue' },
  { hex: '#7c3aed', label: 'Purple' },
  { hex: '#ea580c', label: 'Orange' },
  { hex: '#171717', label: 'Black' },
  { hex: '#ffffff', label: 'White' },
];

// Default initial state
const INITIAL_MATCH: Partial<Match> = {
  date: new Date(),
  kickoffTime: getSmartKickoffTime(),
  homeFormation: '4-4-2',
  awayFormation: '4-4-2',
  homeLineup: {},
  awayLineup: {},
};

export function MatchCreationWizard() {
  const navigate = useNavigate();
  const teams = useTeams();

  // State
  const [step, setStep] = useState(0); // 0: Info, 1: Home Setup, 2: Away Setup
  const [matchData, setMatchData] = useState<Partial<Match>>({
    ...INITIAL_MATCH,
    homeTeamId: 'kashima-antlers', // Default
    awayTeamId: 'urawa-reds', // Default
  });
  const [openColorPicker, setOpenColorPicker] = useState<'home' | 'away' | null>(null);
  const homeColorPopoverRef = useRef<HTMLDivElement>(null);
  const awayColorPopoverRef = useRef<HTMLDivElement>(null);

  // Computed
  const homeTeam = teams?.find(t => t.id === matchData.homeTeamId);
  const awayTeam = teams?.find(t => t.id === matchData.awayTeamId);

  // Centralized player loading
  const homePlayers = usePlayers(matchData.homeTeamId || '');
  const awayPlayers = usePlayers(matchData.awayTeamId || '');

  useEffect(() => {
    debugTeamStorage();
  }, []);

  // Close color picker when clicking outside
  useEffect(() => {
    if (openColorPicker === null) return;
    const handleClick = (e: MouseEvent) => {
      const homeEl = homeColorPopoverRef.current;
      const awayEl = awayColorPopoverRef.current;
      const target = e.target as Node;
      if (openColorPicker === 'home' && homeEl && !homeEl.contains(target)) setOpenColorPicker(null);
      if (openColorPicker === 'away' && awayEl && !awayEl.contains(target)) setOpenColorPicker(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openColorPicker]);

  const handleUpdate = (updates: Partial<Match>) => {
    setMatchData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!matchData.homeTeamId || !matchData.awayTeamId) return;

    try {
      const newMatch: Match = {
        id: crypto.randomUUID(),
        date: matchData.date!,
        kickoffTime: matchData.kickoffTime,
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        homeFormation: matchData.homeFormation!,
        awayFormation: matchData.awayFormation!,
        homeLineup: matchData.homeLineup!,
        awayLineup: matchData.awayLineup!,
        homeTeamColor: matchData.homeTeamColor,
        awayTeamColor: matchData.awayTeamColor,
      };

      await db.matches.add(newMatch);
      // Navigate to Watch Mode
      navigate(`/match/${newMatch.id}/watch`);
    } catch (e) {
      console.error(e);
      alert('Error saving match');
    }
  };

  // --- Steps ---

  const renderStep1_Info = () => (
    <div className={styles.formStack}>

      <div className={styles.formGroup}>
        <label className={styles.label}>Date</label>
        <input
          type="date"
          className={styles.input}
          value={matchData.date?.toISOString().split('T')[0]}
          onChange={e => handleUpdate({ date: new Date(e.target.value) })}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Kickoff</label>
        <input
          type="time"
          className={styles.input}
          value={matchData.kickoffTime}
          onChange={e => handleUpdate({ kickoffTime: e.target.value })}
        />
      </div>

      <div className={styles.teamSelectGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Home Team</label>
          <select
            className={styles.select}
            value={matchData.homeTeamId}
            onChange={e => handleUpdate({ homeTeamId: normalizeTeamId(e.target.value) })}
          >
            {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {homeTeam && (
            <div className={`${styles.teamSelectCard} ${styles.active}`}>
              {homeTeam.logoPath && <img src={homeTeam.logoPath} className={styles.teamLogoOnly} onError={(e) => e.currentTarget.style.display = 'none'} />}
            </div>
          )}
          <div className={styles.colorPickerWrap} ref={homeColorPopoverRef}>
            <button
              type="button"
              className={styles.colorPickerTrigger}
              onClick={() => setOpenColorPicker(openColorPicker === 'home' ? null : 'home')}
              aria-expanded={openColorPicker === 'home'}
              aria-haspopup="listbox"
              aria-label="Home team marker color"
            >
              <span className={styles.colorPickerLabel}>Team color</span>
              {matchData.homeTeamColor ? (
                <span
                  className={matchData.homeTeamColor.toLowerCase() === '#ffffff' ? `${styles.colorChip} ${styles.colorChipWhite}` : styles.colorChip}
                  style={{ backgroundColor: matchData.homeTeamColor }}
                  aria-hidden
                />
              ) : (
                <>
                  <span className={styles.colorChipEmpty} aria-hidden />
                  <span className={styles.colorPickerPlaceholder}>Select color</span>
                </>
              )}
            </button>
            {openColorPicker === 'home' && (
              <div className={styles.colorPopover} role="listbox" aria-label="Home team color">
                {PRESET_MATCH_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    role="option"
                    aria-selected={matchData.homeTeamColor === hex}
                    className={hex.toLowerCase() === '#ffffff' ? `${styles.colorSwatch} ${styles.colorSwatchWhite}` : styles.colorSwatch}
                    style={{ backgroundColor: hex }}
                    title={label}
                    onClick={() => {
                      handleUpdate({ homeTeamColor: hex });
                      setOpenColorPicker(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Away Team</label>
          <select
            className={styles.select}
            value={matchData.awayTeamId}
            onChange={e => handleUpdate({ awayTeamId: normalizeTeamId(e.target.value) })}
          >
            {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {awayTeam && (
            <div className={`${styles.teamSelectCard} ${styles.active}`}>
              {awayTeam.logoPath && <img src={awayTeam.logoPath} className={styles.teamLogoOnly} onError={(e) => e.currentTarget.style.display = 'none'} />}
            </div>
          )}
          <div className={styles.colorPickerWrap} ref={awayColorPopoverRef}>
            <button
              type="button"
              className={styles.colorPickerTrigger}
              onClick={() => setOpenColorPicker(openColorPicker === 'away' ? null : 'away')}
              aria-expanded={openColorPicker === 'away'}
              aria-haspopup="listbox"
              aria-label="Away team marker color"
            >
              <span className={styles.colorPickerLabel}>Team color</span>
              {matchData.awayTeamColor ? (
                <span
                  className={matchData.awayTeamColor.toLowerCase() === '#ffffff' ? `${styles.colorChip} ${styles.colorChipWhite}` : styles.colorChip}
                  style={{ backgroundColor: matchData.awayTeamColor }}
                  aria-hidden
                />
              ) : (
                <>
                  <span className={styles.colorChipEmpty} aria-hidden />
                  <span className={styles.colorPickerPlaceholder}>Select color</span>
                </>
              )}
            </button>
            {openColorPicker === 'away' && (
              <div className={styles.colorPopover} role="listbox" aria-label="Away team color">
                {PRESET_MATCH_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    role="option"
                    aria-selected={matchData.awayTeamColor === hex}
                    className={hex.toLowerCase() === '#ffffff' ? `${styles.colorSwatch} ${styles.colorSwatchWhite}` : styles.colorSwatch}
                    style={{ backgroundColor: hex }}
                    title={label}
                    onClick={() => {
                      handleUpdate({ awayTeamColor: hex });
                      setOpenColorPicker(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentTacticalBoard = () => {
    const isHome = step === 1;
    const teamName = isHome ? homeTeam?.name : awayTeam?.name;
    const players = isHome ? homePlayers : awayPlayers;
    const formation = isHome ? matchData.homeFormation : matchData.awayFormation;
    const lineup = isHome ? matchData.homeLineup : matchData.awayLineup;

    if (!teamName || !players) return null;

    if (players.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <p>No players found for {teamName} (debug mode)</p>
          <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
            Team ID: {isHome ? matchData.homeTeamId : matchData.awayTeamId}
          </p>
        </div>
      );
    }

    return (
      <TacticalBoard
        teamName={teamName}
        teamId={isHome ? matchData.homeTeamId : matchData.awayTeamId}
        logoUrl={isHome ? homeTeam?.logoPath : awayTeam?.logoPath}
        players={players}
        formationName={formation as FormationName}
        onFormationChange={(fmt) =>
          isHome ? handleUpdate({ homeFormation: fmt }) : handleUpdate({ awayFormation: fmt })
        }
        lineup={lineup || {}}
        onLineupChange={(newLineup) =>
          isHome ? handleUpdate({ homeLineup: newLineup }) : handleUpdate({ awayLineup: newLineup })
        }
      />
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {step === 0 && 'Match Info'}
          {step === 1 && 'Home Tactics'}
          {step === 2 && 'Away Tactics'}
        </h1>
      </header>

      <div className={styles.content} style={step > 0 ? { maxWidth: 'none', padding: 0 } : {}}>
        {step === 0 && renderStep1_Info()}
        {step > 0 && renderCurrentTacticalBoard()}
      </div>

      <div className={styles.footer}>
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}

        <div style={{ flex: 1 }} />

        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button variant="primary" onClick={handleSave}>Create Match</Button>
        )}
      </div>
    </div>
  );
}
