/**
 * Parses raw CSV string into a list of player rows (name, jerseyNumber, position).
 * Expects columns: name, jerseyNumber, position. Skips header row if present.
 */
export function parsePlayerCSV(content: string): { name: string; jerseyNumber: number; position: 'GK' | 'DF' | 'MF' | 'FW' }[] {
  const lines = content.split('\n');
  const players: { name: string; jerseyNumber: number; position: 'GK' | 'DF' | 'MF' | 'FW' }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const firstCol = parts[0].toLowerCase();
    if (i === 0 && (firstCol.includes('name') || parts[1].toLowerCase().includes('jerseynumber'))) {
      continue;
    }

    const name = parts[0].trim();
    const jerseyNumber = parseInt(parts[1].trim(), 10);
    const position = parts[2].trim().toUpperCase() as 'GK' | 'DF' | 'MF' | 'FW';

    if (!name || isNaN(jerseyNumber)) {
      console.warn(`Skipping invalid line: ${line}`);
      continue;
    }

    players.push({ name, jerseyNumber, position });
  }

  return players;
}
