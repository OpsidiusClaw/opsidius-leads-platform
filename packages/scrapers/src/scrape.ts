#!/usr/bin/env node
/**
 * CLI entry point for Pappers scraper
 * 
 * Usage: pnpm scrape -- --days 30 --limit 50 --dept 44
 */

import { PappersAPIClient } from './pappers-api.js';
import { toCSV, saveToFile } from './export.js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const days = parseInt(args.find((a, i) => args[i - 1] === '--days' || args[i] === '-d')?.replace(/\D/g, '') || '') || 30;
  const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit' || args[i] === '-l')?.replace(/\D/g, '') || '') || 50;
  const department = args.find((a, i) => args[i - 1] === '--dept' || args[i] === '--department') || '';
  const city = args.find((a, i) => args[i - 1] === '--city' || args[i] === '-c') || '';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Opsidius Leads Scraper v1.0        ║');
  console.log('║         (Pappers API Edition)          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${department ? ` | 📮 Dept: ${department}` : ''}${city ? ` | 🏙️ City: ${city}` : ''}\n`);

  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey) {
    console.error('❌ PAPPERS_API_KEY not found');
    console.error('   Add to .env: PAPPERS_API_KEY=your_key');
    process.exit(1);
  }

  const client = new PappersAPIClient(apiKey);
  
  try {
    const startTime = Date.now();
    const companies = await client.searchCompanies({ days, limit, department, city });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Complete in ${duration}s`);
    console.log(`📊 Total leads: ${companies.length}`);
    console.log(`⭐ Without website: ${companies.filter(c => !c.hasWebsite).length}`);

    if (companies.length === 0) {
      console.log('\n⚠️ No companies found. Try:');
      console.log('   - Increase --days (e.g., 90, 365)');
      console.log('   - Remove --dept filter');
      console.log('   - Check API key has credits');
    } else {
      console.log('\n🏆 Top leads:');
      console.log('─'.repeat(80));
      companies.slice(0, 10).forEach((c, i) => {
        const badge = !c.hasWebsite ? '🔥' : '  ';
        console.log(`${badge} #${i + 1} [${c.score}/100] ${c.name} (${c.city})`);
      });

      const csv = toCSV(companies);
      saveToFile(csv, `leads-${new Date().toISOString().split('T')[0]}.csv`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();