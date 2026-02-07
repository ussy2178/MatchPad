import { useState, useEffect, type FormEvent } from 'react';
import { type Player } from '../../db/db';
import { playerService } from '../../hooks/usePlayers';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import styles from './PlayerForm.module.css';

interface PlayerFormProps {
  teamId: string;
  player?: Player; // If provided, edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export function PlayerForm({ teamId, player, onSuccess, onCancel }: PlayerFormProps) {
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState<'GK' | 'DF' | 'MF' | 'FW'>('MF');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setJerseyNumber(player.jerseyNumber.toString());
      setPosition(player.position);
      setExternalUrl(player.externalUrl || '');
    }
  }, [player]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const jerseyNum = parseInt(jerseyNumber, 10);
      if (isNaN(jerseyNum)) throw new Error('背番号は数字でなければなりません');

      const playerData = {
        teamId,
        name,
        jerseyNumber: jerseyNum,
        position,
        externalUrl: externalUrl || undefined,
      };

      if (player) {
        await playerService.updatePlayer(player.id, playerData);
      } else {
        await playerService.addPlayer(playerData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Player Name"
      />

      <div className={styles.row}>
        <Input
          label="Jersey Number"
          type="number"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          required
          placeholder="10"
          className={styles.shortInput}
        />
        <Select
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value as any)}
        >
          <option value="GK">GK</option>
          <option value="DF">DF</option>
          <option value="MF">MF</option>
          <option value="FW">FW</option>
        </Select>
      </div>

      <Input
        label="External Link (Optional)"
        type="url"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        placeholder="https://..."
      />

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {player ? 'Update Player' : 'Add Player'}
        </Button>
      </div>
    </form>
  );
}
