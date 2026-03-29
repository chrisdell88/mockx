/**
 * seed-thr-bigboard.mjs — Seeds THR Big Board accuracy scores
 * Source: The Huddle Report big-board-scores (2025 annual) + big-board-5-year
 *   Chart PQUUr: https://datawrapper.dwcdn.net/PQUUr/1/dataset.csv  (2025 annual)
 *   Chart E37yz: https://datawrapper.dwcdn.net/E37yz/1/dataset.csv  (5-year, 2021-2025)
 *
 * Scoring: 1pt per player in analyst's top 100 big board who was actually drafted in first 100 picks.
 * Site key: 'thr_bigboard' (separate from 'thr' which is mock draft accuracy)
 *
 * Run: node --env-file=.env server/data/accuracy/seed-thr-bigboard.mjs
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Data fetched from Datawrapper (live at run-time) ---

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseTsv(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split('\t').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

// --- Name normalization ---

function normName(s) {
  return s.toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip outlet suffix "Name - Outlet" → "Name"
function stripOutlet(s) {
  const idx = s.lastIndexOf(' - ');
  if (idx === -1) return s;
  return s.slice(0, idx).trim();
}

// --- DB analyst lookup ---

async function findAnalyst(rawName) {
  const name = stripOutlet(rawName);
  const norm = normName(name);
  const words = norm.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return null;

  // Exact match
  const exact = await pool.query(
    `SELECT id, name FROM analysts WHERE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z ]', '', 'g')) = $1 LIMIT 1`,
    [norm]
  );
  if (exact.rows.length > 0) return exact.rows[0];

  // First + last name
  if (words.length >= 2) {
    const firstName = words[0];
    const lastName = words[words.length - 1];
    const partial = await pool.query(
      `SELECT id, name FROM analysts
       WHERE LOWER(name) LIKE $1 AND LOWER(name) LIKE $2 LIMIT 1`,
      [`%${lastName}%`, `%${firstName}%`]
    );
    if (partial.rows.length > 0) return partial.rows[0];
  }

  // Last name only (when long enough to avoid false positives)
  const lastName = words[words.length - 1];
  if (lastName.length >= 4) {
    const byLast = await pool.query(
      `SELECT id, name FROM analysts WHERE LOWER(name) LIKE $1 LIMIT 1`,
      [`%${lastName}%`]
    );
    if (byLast.rows.length > 0) return byLast.rows[0];
  }

  return null;
}

// --- Z-score computation ---

function computeZScores(entries) {
  const scores = entries.map(e => e.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stddev = Math.sqrt(variance);
  return { mean, stddev, entries: entries.map(e => ({
    ...e,
    zScore: stddev > 0 ? Math.round(((e.score - mean) / stddev) * 10000) / 10000 : 0
  }))};
}

// --- Main ---

async function main() {
  console.log('=== THR Big Board Accuracy Seeder ===\n');

  // Check existing sites
  const sites = await pool.query('SELECT DISTINCT site FROM analyst_accuracy_scores ORDER BY site');
  console.log('Existing sites in DB:', sites.rows.map(r => r.site).join(', '));

  // Fetch live data
  console.log('\nFetching Datawrapper charts...');
  const [csv2025, csv5yr] = await Promise.all([
    fetchCsv('https://datawrapper.dwcdn.net/PQUUr/1/dataset.csv'),
    fetchCsv('https://datawrapper.dwcdn.net/E37yz/1/dataset.csv'),
  ]);
  console.log('  PQUUr (2025 annual): fetched');
  console.log('  E37yz (5-year):      fetched');

  const rows2025 = parseTsv(csv2025);
  const rows5yr  = parseTsv(csv5yr);
  console.log(`  Parsed: ${rows2025.length} rows (2025), ${rows5yr.length} rows (5-year)`);

  // --- Build per-year score map from 5-year data ---
  // years: 2021, 2022, 2023, 2024, 2025
  // Columns: "2025 KING of the HILL", "5 YR", "2025", "2024", "2023", "2022", "2021"
  const YEARS = [2021, 2022, 2023, 2024, 2025];

  // Map: year → array of {rawName, score}
  const yearData = {};
  for (const yr of YEARS) yearData[yr] = [];

  for (const row of rows5yr) {
    const nameCol = row['2025 KING of the HILL'] || '';
    if (!nameCol) continue;
    for (const yr of YEARS) {
      const scoreStr = row[String(yr)];
      const score = parseInt(scoreStr, 10);
      if (!isNaN(score) && score > 0) {
        yearData[yr].push({ rawName: nameCol, score });
      }
    }
  }

  // For 2025: also pull from the annual chart for analysts not in 5-year
  const names5yr2025 = new Set(rows5yr.map(r => normName(stripOutlet(r['2025 KING of the HILL'] || ''))));
  let extraFrom2025 = 0;
  for (const row of rows2025) {
    const nameCol = row['2025 BIG BOARDS'] || '';
    if (!nameCol) continue;
    if (!names5yr2025.has(normName(stripOutlet(nameCol)))) {
      const score = parseInt(row['SCORE'], 10);
      if (!isNaN(score) && score > 0) {
        yearData[2025].push({ rawName: nameCol, score });
        extraFrom2025++;
      }
    }
  }
  if (extraFrom2025 > 0) console.log(`  Added ${extraFrom2025} extra analysts from 2025-annual not in 5-year`);

  // --- Seed data year by year ---
  let totalInserted = 0;
  const notFound = [];
  const affectedAnalystIds = new Set();

  for (const yr of YEARS) {
    const entries = yearData[yr];
    if (entries.length === 0) { console.log(`\n=== ${yr}: no data, skipping ===`); continue; }

    // Resolve DB analysts
    const resolved = [];
    for (const entry of entries) {
      const analyst = await findAnalyst(entry.rawName);
      if (!analyst) {
        notFound.push(`${yr}: "${entry.rawName}" (score=${entry.score})`);
        continue;
      }
      resolved.push({ analystId: analyst.id, name: analyst.name, score: entry.score });
    }

    if (resolved.length === 0) { console.log(`\n=== ${yr}: no matched analysts ===`); continue; }

    // Compute z-scores
    const { mean, stddev, entries: scored } = computeZScores(resolved);
    console.log(`\n=== ${yr}: ${resolved.length}/${entries.length} matched, mean=${mean.toFixed(2)} σ=${stddev.toFixed(2)} ===`);

    // Insert
    for (const s of scored) {
      await pool.query(`
        INSERT INTO analyst_accuracy_scores (analyst_id, site, year, raw_score, z_score, notes)
        VALUES ($1, 'thr_bigboard', $2, $3, $4, 'THR big board accuracy score')
        ON CONFLICT (analyst_id, site, year) DO UPDATE
          SET raw_score = EXCLUDED.raw_score, z_score = EXCLUDED.z_score
      `, [s.analystId, yr, s.score, s.zScore]);

      totalInserted++;
      affectedAnalystIds.add(s.analystId);
      console.log(`  ${s.name}: ${s.score} z=${s.zScore.toFixed(3)}`);
    }
  }

  console.log(`\n=== INSERTED/UPDATED ${totalInserted} thr_bigboard rows ===`);

  if (notFound.length > 0) {
    console.log(`\nNot found in DB (${notFound.length} analysts):`);
    notFound.forEach(n => console.log('  ', n));
  }

  // --- Recompute X Scores for all affected analysts ---
  console.log(`\nRecomputing X Scores for ${affectedAnalystIds.size} analysts...`);

  for (const analystId of affectedAnalystIds) {
    const res = await pool.query(
      `SELECT AVG(z_score)::numeric as avg_z, COUNT(*) as n
       FROM analyst_accuracy_scores WHERE analyst_id = $1 AND z_score IS NOT NULL`,
      [analystId]
    );
    const { avg_z, n } = res.rows[0];
    if (avg_z !== null) {
      await pool.query(
        `UPDATE analysts SET x_score = ROUND($1, 4), x_score_sites_count = $2, x_score_last_updated = NOW() WHERE id = $3`,
        [avg_z, n, analystId]
      );
    }
  }

  // Recompute ranks (analysts with >=2 site-years qualify)
  await pool.query(`
    UPDATE analysts a
    SET x_score_rank = ranked.rn
    FROM (
      SELECT id, RANK() OVER (ORDER BY x_score DESC) as rn
      FROM analysts
      WHERE x_score IS NOT NULL AND x_score_sites_count >= 2
    ) ranked
    WHERE a.id = ranked.id
  `);

  console.log('X Score ranks updated.');

  // --- Print top 20 leaderboard ---
  const top = await pool.query(`
    SELECT name, outlet, x_score, x_score_rank, x_score_sites_count
    FROM analysts
    WHERE x_score IS NOT NULL AND x_score_sites_count >= 2
    ORDER BY x_score DESC LIMIT 20
  `);
  console.log('\n=== UPDATED TOP 20 X SCORE LEADERBOARD ===');
  for (const r of top.rows) {
    console.log(`  #${r.x_score_rank} ${r.name} (${r.outlet}) X=${r.x_score} [${r.x_score_sites_count} site-yrs]`);
  }

  // Summary of thr_bigboard rows
  const summary = await pool.query(
    `SELECT year, COUNT(*) FROM analyst_accuracy_scores WHERE site = 'thr_bigboard' GROUP BY year ORDER BY year`
  );
  console.log('\n=== thr_bigboard rows by year ===');
  summary.rows.forEach(r => console.log(`  ${r.year}: ${r.count} analysts`));

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
