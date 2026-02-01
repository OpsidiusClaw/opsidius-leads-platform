#!/usr/bin/env node
/**
 * CLI - API recherche-entreprises.data.gouv.fr (gratuite)
 */

import { DataGouvClient } from './datagouv-client.js';
import { toCSV, saveToFile } from './export.js';

async function main() {
  const args = process.argv.slice(2);
  
  const days = parseInt(args.find((a, i) => args[i - 1] === '--days' || args[i] === '-d')?.replace(/\D/g, '') || '') || 30;
  const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit' || args[i] === '-l')?.replace(/\D/g, '') || '') || 50;
  const department = args.find((a, i) => args[i - 1] === '--dept') || '';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Opsidius Leads Scraper v2.0        ║');
  console.log('║    (data.gouv.fr - API Gratuite)       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${department ? ` | 📮 Dept: ${department}` : ' | 📍 PDL (44,49,53,72,85)'}\n`);

  const client = new DataGouvClient();
  
  try {
    const startTime = Date.now();
    const companies = await client.searchCompanies({ days, limit, department });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Complete in ${duration}s`);
    console.log(`📊 Recent companies (<${days} days): ${companies.length}`);
    
    const highScore = companies.filter(c => c.score >= 60);
    console.log(`🔥 High score (60+): ${highScore.length}`);

    if (companies.length > 0) {
      console.log('\n🏆 Top leads (no website assumed):');
      console.log('─'.repeat(80));
      companies.slice(0, 10).forEach((c, i) => {
        const badge = c.score >= 70 ? '🔥' : c.score >= 50 ? '⭐' : '  ';
        const age = Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`${badge} #${i + 1} [${c.score}/100] ${c.name}`);
        console.log(`   📍 ${c.city} (${c.postalCode}) | 🏢 ${c.nafLabel}`);
        console.log(`   📅 ${age} days ago | 🔗 SIREN: ${c.siren}`);
        console.log('');
      });

      // Export CSV
      const csv = toCSV(companies);
      const filename = `leads-pdl-${new Date().toISOString().split('T')[0]}.csv`;
      saveToFile(csv, filename);
      console.log(`💾 Exported: ${filename}`);
    } else {
      console.log('\n⚠️ Aucune entreprise récente trouvée.');
      console.log('   Essayez avec --days 90 ou --dept 44');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();