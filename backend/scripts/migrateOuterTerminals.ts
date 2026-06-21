import fs from 'fs/promises';
import path from 'path';
import { getPrismaClient } from '../src/config/database.js';

function parseJikokuToMinute(jikoku?: string | null): number | null {
  if (!jikoku) return null;
  const s = jikoku.trim();
  if (/^\d+$/.test(s)) {
    return Number(s);
  }
  // HH:MM または H:MM 形式
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    return hh * 60 + mm;
  }
  return null;
}

async function main() {
  const prisma = getPrismaClient();
  try {
    const file = path.resolve(process.cwd(), 'stations.json');
    const buf = await fs.readFile(file, 'utf-8');
    const stations = JSON.parse(buf) as any[];

    const rows: any[] = [];
    for (const st of stations) {
      const stationId = Number(st.id);
      if (!Array.isArray(st.outerterminal)) continue;
      for (const ot of st.outerterminal) {
        rows.push({
          station_id: stationId,
          terminal_id: ot.id != null ? Number(ot.id) : null,
          name: ot.name ?? '',
          jikoku_raw: ot.jikoku ?? null,
          diaryaku: ot.diaryaku ?? null,
        });
      }
    }

    if (rows.length === 0) {
      console.log('No outerterminal entries found in stations.json');
      return;
    }

    // バルク挿入（重複はスキップ）
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      await prisma.outerTerminalStation.createMany({ data: slice, skipDuplicates: true });
      console.log(`Inserted ${i + slice.length} / ${rows.length}`);
    }

    console.log('Migration completed');
  } catch (err: any) {
    console.error('Migration failed:', err.message ?? err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrateOuterTerminals.ts')) {
  main();
}
