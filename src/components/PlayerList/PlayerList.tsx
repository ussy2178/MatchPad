import { useState, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../../hooks/useTeams';
import { usePlayers, playerService } from '../../hooks/usePlayers';
import { type Player } from '../../db/db';
import { parsePlayerCSV } from '../../utils/csvPlayers';
import { sortPlayersForDisplay } from '../../utils/playerSort';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { PlayerForm } from '../PlayerForm/PlayerForm';
import { AddPlayerModal } from '../players/AddPlayerModal';
import styles from './PlayerList.module.css';

export function PlayerList({ embedded }: { embedded?: boolean }) {
  const { teamId } = useParams<{ teamId: string }>();
  const team = useTeam(teamId || '');
  const players = usePlayers(teamId || '');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false); // For Edit
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false); // For Add
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined);

  if (!teamId) return <div>Invalid Team ID</div>;
  if (!team) return <div>Loading Team...</div>;

  const handleAddClick = () => {
    setIsAddPlayerModalOpen(true);
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
    const newPlayers = parsePlayerCSV(text);

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
          {sortPlayersForDisplay(players).map((player) => (
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
        title="Edit Player"
      >
        <PlayerForm
          teamId={teamId}
          player={editingPlayer}
          onSuccess={handleModalClose}
          onCancel={handleModalClose}
        />
      </Modal>

      <AddPlayerModal
        teamId={teamId}
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
      />
    </div>
  );
}
