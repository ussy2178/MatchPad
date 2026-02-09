export interface Team {
  id: string;
  name: string;
  logoPath?: string;
  /** Team theme color (e.g. player marker border). Fallback: DEFAULT_TEAM_PRIMARY. */
  primaryColor?: string;
  /** Secondary theme color. Fallback: DEFAULT_TEAM_SECONDARY. */
  secondaryColor?: string;
}

export const DEFAULT_TEAM_PRIMARY = '#2563eb';
export const DEFAULT_TEAM_SECONDARY = '#1e40af';

/** Default per-match team marker color when none is selected (neutral gray). */
export const DEFAULT_MATCH_TEAM_COLOR = '#9ca3af';

export const J1_TEAMS: Team[] = [
  { id: 'kashima-antlers', name: '鹿島アントラーズ', logoPath: '/logos/kashima-antlers.png' },
  { id: 'mito-hollyhock', name: '水戸ホーリーホック', logoPath: '/logos/mito-hollyhock.png' },
  { id: 'urawa-reds', name: '浦和レッズ', logoPath: '/logos/urawa-reds.png' },
  { id: 'jef-united-chiba', name: 'ジェフユナイテッド千葉', logoPath: '/logos/jef-united-chiba.png' },
  { id: 'kashiwa-reysol', name: '柏レイソル', logoPath: '/logos/kashiwa-reysol.png' },
  { id: 'fc-tokyo', name: 'FC東京', logoPath: '/logos/fc-tokyo.png' },
  { id: 'tokyo-verdy', name: '東京ヴェルディ', logoPath: '/logos/tokyo-verdy.png' },
  { id: 'machida-zelvia', name: 'FC町田ゼルビア', logoPath: '/logos/machida-zelvia.png' },
  { id: 'kawasaki-frontale', name: '川崎フロンターレ', logoPath: '/logos/kawasaki-frontale.png' },
  { id: 'yokohama-f-marinos', name: '横浜F・マリノス', logoPath: '/logos/yokohama-f-marinos.png' },
  { id: 'shimizu-s-pulse', name: '清水エスパルス', logoPath: '/logos/shimizu-s-pulse.png' },
  { id: 'nagoya-grampus', name: '名古屋グランパス', logoPath: '/logos/nagoya-grampus.png' },
  { id: 'kyoto-sanga', name: '京都サンガF.C.', logoPath: '/logos/kyoto-sanga.png' },
  { id: 'gamba-osaka', name: 'ガンバ大阪', logoPath: '/logos/gamba-osaka.png' },
  { id: 'cerezo-osaka', name: 'セレッソ大阪', logoPath: '/logos/cerezo-osaka.png' },
  { id: 'vissel-kobe', name: 'ヴィッセル神戸', logoPath: '/logos/vissel-kobe.png' },
  { id: 'fagiano-okayama', name: 'ファジアーノ岡山', logoPath: '/logos/fagiano-okayama.png' },
  { id: 'sanfrecce-hiroshima', name: 'サンフレッチェ広島', logoPath: '/logos/sanfrecce-hiroshima.png' },
  { id: 'avispa-fukuoka', name: 'アビスパ福岡', logoPath: '/logos/avispa-fukuoka.png' },
  { id: 'v-varen-nagasaki', name: 'V・ファーレン長崎', logoPath: '/logos/v-varen-nagasaki.png' },
];
