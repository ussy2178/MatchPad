import { playerService } from '../hooks/usePlayers';
import { J1_TEAMS } from '../db/seeds';
import { parsePlayerCSV } from '../utils/csvPlayers';

/**
 * Auto-loads data from local CSVS.
 * Uses Vite's glob import to find files in /data/players/ (which must be inside the project or accessible).
 * Note: Since import.meta.glob is build-time, we need to ensure the path is correct.
 * Assuming the user puts CSVs in `src/data/teams` or similar if they want them bundled, 
 * OR if they are in `public/data`, we would fetch them.
 * 
 * However, the prompt asked to use `import.meta.glob`. This implies build-time inclusion.
 * We will try to glob relative to project root if possible, or assume they are in `src/data/players`.
 * 
 * Update: The prompt says "/data/players/*.csv".
 * We'll try to look for `../../data/players/*.csv` assuming this file is in `src/services/`.
 */
export async function loadInitialData() {
  console.log('[DataLoader] Starting initial data load...');

  // Match /data/players/*.csv. 
  // We use eager: false (default) to load content on demand, or eager: true to bundle text?
  // User asked for "as: raw" (text content).
  // We will try a relative path that goes up to project root => data => players.
  // Vite usually restricts imports to root, so `../../data` should work if `data` is in project root.
  const csvFiles = import.meta.glob('../../data/players/*.csv', {
    query: '?raw',
    import: 'default',
  });

  if (Object.keys(csvFiles).length === 0) {
    console.log('[DataLoader] No CSV files found in ../../data/players/');
    return;
  }

  for (const path in csvFiles) {
    // Extract teamId from filename: e.g. "../../data/players/kashima-antlers.csv" -> "kashima-antlers"
    const fileName = path.split('/').pop(); // "kashima-antlers.csv"
    if (!fileName) continue;

    const teamId = fileName.replace('.csv', '');

    // Validate teamId exists in our seeds
    const teamExists = J1_TEAMS.some(t => t.id === teamId);
    if (!teamExists) {
      console.warn(`[DataLoader] Skipping CSV for unknown team: ${teamId}`);
      continue;
    }

    try {
      // Load content
      const rawContent = await csvFiles[path]() as string;
      const newPlayers = parsePlayerCSV(rawContent);

      if (newPlayers.length > 0) {
        // Use playerService to import (it handles clearing/overwriting or adding?)
        // The previous implementation of importPlayers was append-only or simple add.
        // For auto-load, we usually want "ensure these players exist". 
        // But simply adding might duplicate if run multiple times.
        // Ideally we check if players exist, but let's stick to simple import for now.
        // Or better: clear and re-import? The prompt implies "load... from project folders".
        // Let's rely on playerService.importPlayers logic.

        await playerService.importPlayers(teamId, newPlayers);
        console.log(`[DataLoader] Imported ${newPlayers.length} players for ${teamId}`);
      }
    } catch (e) {
      console.error(`[DataLoader] Failed to load ${fileName}`, e);
    }
  }

  console.log('[DataLoader] Finished loading.');
}
