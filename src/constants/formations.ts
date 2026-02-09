/**
 * Weighted vertical ratios for formation lines (0–1 scale; stored as 0–100 for CSS top: y%).
 * y = pitchHeight * ratio → more separation between DF/MF, MF shifted toward FW.
 * GK: 0.90, DF: 0.72, MF: 0.48, AM: 0.32, FW: 0.18
 */
export const FORMATION_Y_BANDS = {
  FW: 18,
  AM: 32,
  MF: 48,
  DF: 72,
  GK: 90,
} as const;

export const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 20, y: FORMATION_Y_BANDS.DF, label: 'LB' },
      { id: 2, x: 40, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 60, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 80, y: FORMATION_Y_BANDS.DF, label: 'RB' },
      { id: 5, x: 20, y: FORMATION_Y_BANDS.MF, label: 'LMF' },
      { id: 6, x: 40, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 7, x: 60, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 8, x: 80, y: FORMATION_Y_BANDS.MF, label: 'RMF' },
      { id: 9, x: 35, y: FORMATION_Y_BANDS.FW, label: 'CF' },
      { id: 10, x: 65, y: FORMATION_Y_BANDS.FW, label: 'CF' },
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 15, y: FORMATION_Y_BANDS.DF, label: 'LB' },
      { id: 2, x: 38, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 62, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 85, y: FORMATION_Y_BANDS.DF, label: 'RB' },
      { id: 5, x: 50, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 6, x: 30, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 7, x: 70, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 8, x: 20, y: FORMATION_Y_BANDS.FW, label: 'LWG' },
      { id: 9, x: 50, y: FORMATION_Y_BANDS.FW, label: 'CF' },
      { id: 10, x: 80, y: FORMATION_Y_BANDS.FW, label: 'RWG' },
    ],
  },
  '3-4-2-1': {
    name: '3-4-2-1',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 25, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 2, x: 50, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 75, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 10, y: FORMATION_Y_BANDS.MF, label: 'WB' },
      { id: 5, x: 35, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 6, x: 65, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 7, x: 90, y: FORMATION_Y_BANDS.MF, label: 'WB' },
      { id: 8, x: 30, y: FORMATION_Y_BANDS.AM, label: 'OMF' },
      { id: 9, x: 70, y: FORMATION_Y_BANDS.AM, label: 'OMF' },
      { id: 10, x: 50, y: FORMATION_Y_BANDS.FW, label: 'CF' },
    ]
  },
  '5-3-2': {
    name: '5-3-2',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 15, y: FORMATION_Y_BANDS.DF, label: 'LB' },
      { id: 2, x: 32, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 50, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 68, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 5, x: 85, y: FORMATION_Y_BANDS.DF, label: 'RB' },
      { id: 6, x: 50, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 7, x: 30, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 8, x: 70, y: FORMATION_Y_BANDS.MF, label: 'CMF' },
      { id: 9, x: 35, y: FORMATION_Y_BANDS.FW, label: 'CF' },
      { id: 10, x: 65, y: FORMATION_Y_BANDS.FW, label: 'CF' },
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 20, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 2, x: 50, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 80, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 10, y: FORMATION_Y_BANDS.MF, label: 'WB' },
      { id: 5, x: 35, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 6, x: 65, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 7, x: 90, y: FORMATION_Y_BANDS.MF, label: 'WB' },
      { id: 8, x: 50, y: FORMATION_Y_BANDS.AM, label: 'OMF' },
      { id: 9, x: 35, y: FORMATION_Y_BANDS.FW, label: 'CF' },
      { id: 10, x: 65, y: FORMATION_Y_BANDS.FW, label: 'CF' },
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: [
      { id: 0, x: 50, y: FORMATION_Y_BANDS.GK, label: 'GK' },
      { id: 1, x: 15, y: FORMATION_Y_BANDS.DF, label: 'LB' },
      { id: 2, x: 38, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 3, x: 62, y: FORMATION_Y_BANDS.DF, label: 'CB' },
      { id: 4, x: 85, y: FORMATION_Y_BANDS.DF, label: 'RB' },
      { id: 5, x: 35, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 6, x: 65, y: FORMATION_Y_BANDS.MF, label: 'DMF' },
      { id: 7, x: 15, y: FORMATION_Y_BANDS.AM, label: 'LMF' },
      { id: 8, x: 50, y: FORMATION_Y_BANDS.AM, label: 'OMF' },
      { id: 9, x: 85, y: FORMATION_Y_BANDS.AM, label: 'RMF' },
      { id: 10, x: 50, y: FORMATION_Y_BANDS.FW, label: 'CF' },
    ]
  }
} as const;

export type FormationName = keyof typeof FORMATIONS;
