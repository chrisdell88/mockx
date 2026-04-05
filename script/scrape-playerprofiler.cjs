#!/usr/bin/env node
/**
 * Scrape PlayerProfiler for:
 * - headshot (og:image)
 * - comparable player (static HTML)
 * - player_profiler_url
 *
 * Run: DATABASE_URL=... node script/scrape-playerprofiler.cjs
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    }, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseHeadshot(html) {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  return m ? m[1] : null;
}

function parseComparable(html) {
  const m = html.match(/Best Comparable Player[\s\S]{0,200}?<div[^>]*class="[^"]*font-display[^"]*"[^>]*>([^<]+)<\/div>/);
  return m ? m[1].trim() : null;
}

function isNotFound(html) {
  return html.includes('Page not found | PlayerProfiler') || html.includes('error404');
}

async function findPlayerUrl(name) {
  const slug = toSlug(name);
  const base = 'https://www.playerprofiler.com/nfl/';

  // Try different slug variations
  const slugs = [
    slug,
    // Handle Jr., III, II suffixes
    slug.replace(/-jr$/, '').replace(/-iii$/, '').replace(/-ii$/, '').replace(/-iv$/, ''),
  ];

  for (const s of slugs) {
    const url = base + s + '/';
    try {
      const { status, html } = await fetchPage(url);
      if (status === 200 && !isNotFound(html)) {
        return { url, html };
      }
    } catch (e) {
      // continue
    }
    await sleep(300);
  }
  return null;
}

async function main() {
  const { rows: players } = await pool.query(
    `SELECT id, name, position, image_url, comparable_player FROM players ORDER BY id`
  );

  console.log(`Processing ${players.length} players...`);

  let updated = 0;
  let headshots = 0;
  let comparables = 0;
  let notFound = 0;

  for (const player of players) {
    const needsImage = !player.image_url;
    const needsComparable = !player.comparable_player;

    if (!needsImage && !needsComparable) {
      console.log(`  SKIP ${player.name} — already has image + comparable`);
      continue;
    }

    console.log(`  Fetching ${player.name}...`);
    const result = await findPlayerUrl(player.name);

    if (!result) {
      console.log(`    NOT FOUND on PlayerProfiler`);
      notFound++;
      await sleep(500);
      continue;
    }

    const { url, html } = result;
    const headshot = needsImage ? parseHeadshot(html) : null;
    const comparable = needsComparable ? parseComparable(html) : null;

    // Build update
    const updates = ['player_profiler_url = $1'];
    const values = [url];
    let idx = 2;

    if (headshot) {
      updates.push(`image_url = $${idx++}`);
      values.push(headshot);
      headshots++;
    }
    if (comparable) {
      updates.push(`comparable_player = $${idx++}`);
      values.push(comparable);
      comparables++;
    }

    values.push(player.id);
    await pool.query(
      `UPDATE players SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
    updated++;
    console.log(`    ✓ ${headshot ? 'headshot' : 'no headshot'} | comparable: ${comparable || 'not found'}`);

    await sleep(600); // polite delay
  }

  console.log(`\nDone: ${updated} updated, ${headshots} headshots, ${comparables} comparables, ${notFound} not on PlayerProfiler`);
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
