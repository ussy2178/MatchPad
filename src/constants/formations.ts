export const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { id: 0, x: 50, y: 90, label: 'GK' },
      { id: 1, x: 20, y: 70, label: 'LB' },
      { id: 2, x: 40, y: 75, label: 'CB' },
      { id: 3, x: 60, y: 75, label: 'CB' },
      { id: 4, x: 80, y: 70, label: 'RB' },
      { id: 5, x: 20, y: 45, label: 'LMF' },
      { id: 6, x: 40, y: 50, label: 'CMF' },
      { id: 7, x: 60, y: 50, label: 'CMF' },
      { id: 8, x: 80, y: 45, label: 'RMF' },
      { id: 9, x: 35, y: 20, label: 'CF' },
      { id: 10, x: 65, y: 20, label: 'CF' },
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { id: 0, x: 50, y: 90, label: 'GK' },
      { id: 1, x: 15, y: 70, label: 'LB' },
      { id: 2, x: 38, y: 75, label: 'CB' },
      { id: 3, x: 62, y: 75, label: 'CB' },
      { id: 4, x: 85, y: 70, label: 'RB' },
      { id: 5, x: 50, y: 55, label: 'DMF' },
      { id: 6, x: 30, y: 40, label: 'CMF' },
      { id: 7, x: 70, y: 40, label: 'CMF' },
      { id: 8, x: 20, y: 20, label: 'LWG' },
      { id: 9, x: 50, y: 15, label: 'CF' },
      { id: 10, x: 80, y: 20, label: 'RWG' },
    ],
  },
  '3-4-2-1': {
    name: '3-4-2-1',
    positions: [
      { id: 0, x: 50, y: 92, label: 'GK' },
      { id: 1, x: 25, y: 78, label: 'CB' },
      { id: 2, x: 50, y: 80, label: 'CB' },
      { id: 3, x: 75, y: 78, label: 'CB' },
      { id: 4, x: 10, y: 50, label: 'WB' },
      { id: 5, x: 35, y: 55, label: 'DMF' },
      { id: 6, x: 65, y: 55, label: 'DMF' },
      { id: 7, x: 90, y: 50, label: 'WB' },
      { id: 8, x: 30, y: 25, label: 'OMF' },
      { id: 9, x: 70, y: 25, label: 'OMF' },
      { id: 10, x: 50, y: 12, label: 'CF' },
    ]
  },
  '5-3-2': {
    name: '5-3-2',
    positions: [
      { id: 0, x: 50, y: 92, label: 'GK' },
      { id: 1, x: 15, y: 70, label: 'LB' },
      { id: 2, x: 32, y: 80, label: 'CB' },
      { id: 3, x: 50, y: 80, label: 'CB' },
      { id: 4, x: 68, y: 80, label: 'CB' },
      { id: 5, x: 85, y: 70, label: 'RB' },
      { id: 6, x: 50, y: 55, label: 'DMF' },
      { id: 7, x: 30, y: 45, label: 'CMF' },
      { id: 8, x: 70, y: 45, label: 'CMF' },
      { id: 9, x: 35, y: 15, label: 'CF' },
      { id: 10, x: 65, y: 15, label: 'CF' },
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    positions: [
      { id: 0, x: 50, y: 92, label: 'GK' },
      { id: 1, x: 20, y: 80, label: 'CB' },
      { id: 2, x: 50, y: 82, label: 'CB' },
      { id: 3, x: 80, y: 80, label: 'CB' },
      { id: 4, x: 10, y: 50, label: 'WB' },
      { id: 5, x: 35, y: 60, label: 'DMF' },
      { id: 6, x: 65, y: 60, label: 'DMF' },
      { id: 7, x: 90, y: 50, label: 'WB' },
      { id: 8, x: 50, y: 40, label: 'OMF' },
      { id: 9, x: 35, y: 15, label: 'CF' },
      { id: 10, x: 65, y: 15, label: 'CF' },
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: [
      { id: 0, x: 50, y: 92, label: 'GK' },
      { id: 1, x: 15, y: 75, label: 'LB' },
      { id: 2, x: 38, y: 80, label: 'CB' },
      { id: 3, x: 62, y: 80, label: 'CB' },
      { id: 4, x: 85, y: 75, label: 'RB' },
      { id: 5, x: 35, y: 60, label: 'DMF' },
      { id: 6, x: 65, y: 60, label: 'DMF' },
      { id: 7, x: 15, y: 35, label: 'LMF' },
      { id: 8, x: 50, y: 35, label: 'OMF' },
      { id: 9, x: 85, y: 35, label: 'RMF' },
      { id: 10, x: 50, y: 12, label: 'CF' },
    ]
  }
} as const;

export type FormationName = keyof typeof FORMATIONS;
