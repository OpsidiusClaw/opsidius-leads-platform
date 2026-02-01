#!/usr/bin/env node
/**
 * CLI entry point - Uses data.gouv.fr API (free, no key)
 */

import { INPIClient } from './inpi-client.js';
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
  console.log('║     Opsidius Leads Scraper v1.5        ║');
  console.log('║     (data.gouv.fr - Free API)          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${department ? ` | 📮 Dept: ${department}` : ''}\n`);

  const client = new INPIClient();
  
  try {
    const startTime = Date.now();
    const companies = await client.searchCompanies({ days, limit, department });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Complete in ${duration}s`);
    console.log(`📊 Total leads: ${companies.length}`);
    console.log(`⭐ Without website: ${companies.filter(c => !c.hasWebsite).length}`);

    if (companies.length > 0) {
      console.log('\n🏆 Top leads (sorted by score):');
      console.log('─'.repeat(80));
      companies.slice(0, 10).forEach((c, i) => {
        const badge = !c.hasWebsite ? '🔥' : '  ';
        console.log(`${badge} #${i + 1} [${c.score}/100] ${c.name}`);
        console.log(`   📍 ${c.city} (${c.postalCode}) | 🏢 ${c.nafLabel}`);
        console.log(`   📅 Created: ${c.createdAt.toLocaleDateString('fr-FR')}`);
        console.log('');
      });

      // Export
      const csv = toCSV(companies);
      const filename = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      saveToFile(csv, filename);
      console.log(`\n💾 Exported ${companies.length} leads to ${filename}`);
    } else {
      console.log('\n⚠️ No companies found.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();