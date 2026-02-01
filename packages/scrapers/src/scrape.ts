#!/usr/bin/env node
/**
 * CLI - Pappers API (avec paramètre q obligatoire)
 */

import { PappersAPIClient } from './pappers-api.js';
import { toCSV, saveToFile } from './export.js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const args = process.argv.slice(2);
  
  const days = parseInt(args.find((a, i) => args[i - 1] === '--days' || args[i] === '-d')?.replace(/\D/g, '') || '') || 30;
  const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit' || args[i] === '-l')?.replace(/\D/g, '') || '') || 50;
  const department = args.find((a, i) => args[i - 1] === '--dept') || '';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Opsidius Leads Scraper v1.6        ║');
  console.log('║         (Pappers API)                  ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${department ? ` | 📮 Dept: ${department}` : ''}\n`);

  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey) {
    console.error('❌ PAPPERS_API_KEY required in .env');
    process.exit(1);
  }

  const client = new PappersAPIClient(apiKey);
  
  try {
    const companies = await client.searchCompanies({ days, limit, department });

    console.log(`\n📊 Found: ${companies.length}`);
    console.log(`⭐ No website: ${companies.filter(c => !c.hasWebsite).length}`);

    if (companies.length > 0) {
      console.log('\n🏆 Top leads:');
      companies.slice(0, 10).forEach((c, i) => {
        const badge = !c.hasWebsite ? '🔥' : '  ';
        console.log(`${badge} #${i + 1} [${c.score}] ${c.name} (${c.city})`);
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