#!/usr/bin/env node
/**
 * CLI entry point for Pappers scraper
 */

import { PappersScraper } from './pappers.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const days = parseInt(args.find((a, i) => args[i - 1] === '--days' || args[i] === '-d')?.replace(/\D/g, '') || '') || 30;
  const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit' || args[i] === '-l')?.replace(/\D/g, '') || '') || 50;
  const region = args.find((a, i) => args[i - 1] === '--region' || args[i] === '-r') || '';
  const department = args.find((a, i) => args[i - 1] === '--dept') || '';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Opsidius Leads Scraper v1.0        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${region ? ` | 📍 Region: ${region}` : ''}${department ? ` | 📮 Dept: ${department}` : ''}\n`);

  const scraper = new PappersScraper();
  
  try {
    const startTime = Date.now();
    const companies = await scraper.scrape({ days, limit, region, department });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Scraping complete in ${duration}s`);
    console.log(`📊 Total leads found: ${companies.length}`);
    
    const noWebsite = companies.filter(c => !c.hasWebsite);
    console.log(`⭐ Without website: ${noWebsite.length}`);
    console.log(`💯 Avg score: ${(companies.reduce((a, c) => a + c.score, 0) / companies.length || 0).toFixed(1)}`);

    if (companies.length > 0) {
      console.log('\n🏆 Top 10 scoring leads:');
      console.log('─'.repeat(80));
      companies.slice(0, 10).forEach((c, i) => {
        const score = c.score.toString().padStart(2, ' ');
        const badge = !c.hasWebsite ? '🔥' : '  ';
        console.log(`${badge} #${(i + 1).toString().padStart(2, '0')} [${score}/100] ${c.name}`);
        console.log(`        📍 ${c.city}${c.postalCode ? ` (${c.postalCode})` : ''}${c.email ? ` | ✉️ ${c.email}` : ''}${c.phone ? ` | 📞 ${c.phone}` : ''}`);
        console.log(`        🏢 ${c.nafLabel || 'N/A'}`);
        console.log('');
      });

      // Output JSON for piping
      if (args.includes('--json')) {
        console.log('\n--- JSON OUTPUT ---');
        console.log(JSON.stringify(companies, null, 2));
      }
    }

  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();