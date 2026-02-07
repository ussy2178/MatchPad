import { useState, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../../hooks/useTeams';
import { usePlayers, playerService } from '../../hooks/usePlayers';
import { type Player } from '../../db/db';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { PlayerForm } from '../PlayerForm/PlayerForm';
import styles from './PlayerList.module.css';

export function PlayerList({ embedded }: { embedded?: boolean }) {
  const { teamId } = useParams<{ teamId: string }>();
  const team = useTeam(teamId || '');
  const players = usePlayers(teamId || '');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined);

  if (!teamId) return <div>Invalid Team ID</div>;
  if (!team) return <div>Loading Team...</div>;

  const handleAddClick = () => {
    setEditingPlayer(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (player: Player) => {
    if (confirm(`${player.name} を削除してもよろしいですか？`)) {
      await playerService.deletePlayer(player.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPlayer(undefined);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !teamId) return;

    const text = await file.text();
    const lines = text.split('\n');
    // Header: name,jerseyNumber,position
    // Skip header if present or assume structure? Plan said "Expecting CSV with headers".
    // Let's standardise: skip first line if it contains "name" or "jersey"

    // We expect valid rows.
    const newPlayers: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parse, assuming no quoted commas
      const parts = line.split(',');
      if (parts.length < 3) continue;

      // Check if header
      if (i === 0 && (parts[0].toLowerCase().includes('name') || parts[1].toLowerCase().includes('jerseynumber'))) {
        continue;
      }

      const name = parts[0].trim();
      const jerseyNumber = parseInt(parts[1].trim(), 10);
      const position = parts[2].trim().toUpperCase() as any;

      if (!name || isNaN(jerseyNumber)) {
        console.warn(`Skipping invalid line: ${line}`);
        continue;
      }

      newPlayers.push({ name, jerseyNumber, position });
    }

    if (newPlayers.length > 0) {
      try {
        await playerService.importPlayers(teamId, newPlayers);
        alert(`${newPlayers.length} 人の選手をインポートしました。`);
      } catch (e: any) {
        alert(`インポートに失敗しました: ${e.message}`);
      }
    } else {
      alert('インポートできる有効なデータが見つかりませんでした。');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container} style={embedded ? { padding: 0, maxWidth: 'none' } : undefined}>
      <header className={styles.header}>
        {!embedded ? (
          <div className={styles.headerLeft}>
            <Button variant="ghost" onClick={() => navigate('/')} aria-label="Back">
              &larr;
            </Button>
            <h1 className={styles.title}>
              {team.name} <span className={styles.subtitle}>｜ メンバー</span>
            </h1>
          </div>
        ) : (
          <div className={styles.headerLeft}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Players</h2>
          </div>
        )}
        <div className={styles.headerActions}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileChange}
          />
          <Button variant="secondary" onClick={handleImportClick}>CSVインポート</Button>
          <Button onClick={handleAddClick}>+ 選手を追加</Button>
        </div>
      </header>

      {players.length === 0 ? (
        <div className={styles.emptyState}>
          <p>選手が登録されていません。追加してください。</p>
        </div>
      ) : (
        <div className={styles.list}>
          {players.map((player) => (
            <div key={player.id} className={styles.playerRow}>
              <div className={styles.playerInfo}>
                <span className={styles.jersey}>{player.jerseyNumber}</span>
                <div className={styles.details}>
                  <span className={styles.name}>{player.name}</span>
                  <span className={styles.position}>{player.position}</span>
                </div>
              </div>
              <div className={styles.actions}>
                {player.externalUrl && (
                  <a href={player.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    詳細 &rarr;
                  </a>
                )}
                <Button variant="secondary" size="sm" onClick={() => handleEditClick(player)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteClick(player)}>削除</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingPlayer ? '選手を編集' : '選手を追加'}
      >
        <PlayerForm
          teamId={teamId}
          player={editingPlayer}
          onSuccess={handleModalClose}
          onCancel={handleModalClose}
        />
      </Modal>
    </div>
  );
}
