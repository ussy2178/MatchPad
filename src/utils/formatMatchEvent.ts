import type { MatchEvent, SubstitutionEvent } from '../types/match';
import { isFormationChangeEvent } from '../types/match';

/** 個人スタンプの表示名（イベント一覧・Event Detail Modal で使用） */
export const STAMP_LABELS: Record<string, string> = {
  pass: 'パス',
  trap: 'トラップ',
  post_play: 'ポストプレー',
  dribble: 'ドリブル',
  shot: 'シュート',
  cross: 'クロス',
  defense: 'ディフェンス',
  save: 'セーブ',
  positioning: 'ポジショニング',
  running: 'ランニング',
};

export interface PlayerInfo {
  name: string;
  jerseyNumber: number;
}

/**
 * Format a match event for display.
 * - Player event: "#10 山田太郎 — Pass"
 * - Substitution: "#8 Tanaka ↔ #14 Suzuki" ([Player OUT] ↔ [Player IN], with numbers and names)
 */
export function formatMatchEvent(
  event: MatchEvent,
  playersMap: Map<string, PlayerInfo>
): string {
  if (isFormationChangeEvent(event)) {
    return `Formation changed: ${event.fromFormation} → ${event.toFormation}`;
  }

  if (event.type === 'team') {
    const TEAM_STAMP_LABELS: Record<string, string> = {
      buildUp: 'ビルドアップ',
      counter: 'カウンター',
      break: '崩し',
      defense: 'ディフェンス',
    };
    return TEAM_STAMP_LABELS[event.stamp] ?? event.stamp;
  }

  if (event.type === 'Substitution') {
    const sub = event as SubstitutionEvent;
    if (sub.playerInId && sub.playerOutId) {
      const inPlayer = playersMap.get(sub.playerInId);
      const outPlayer = playersMap.get(sub.playerOutId);
      const inNum = inPlayer?.jerseyNumber ?? '?';
      const inName = inPlayer?.name ?? '?';
      const outNum = outPlayer?.jerseyNumber ?? '?';
      const outName = outPlayer?.name ?? '?';
      return `#${outNum} ${outName} ↔ #${inNum} ${inName}`;
    }
    return sub.comment ?? 'Substitution';
  }

  const player = event.playerId ? playersMap.get(event.playerId) : null;
  const number = player?.jerseyNumber ?? event.playerNumber;
  const name = player?.name ?? (number ? `#${number}` : '');
  const playerPart = number && name ? `#${number} ${name}` : name || (number ? `#${number}` : '-');

  if (event.type === 'Goal') {
    return `${playerPart} — ⚽ GOAL`;
  }
  if (event.type === 'Stamp' && event.stampType) {
    const label = STAMP_LABELS[event.stampType] ?? event.stampType;
    return `${playerPart} — ${label}`;
  }

  const typeLabel = event.type in STAMP_LABELS ? STAMP_LABELS[event.type as string] : event.type;
  return `${playerPart} — ${typeLabel}`;
}
