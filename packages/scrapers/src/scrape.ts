#!/usr/bin/env node
/**
 * CLI entry point for Pappers scraper
 */

import { PappersAPIClient } from './pappers-api.js';
import { toCSV, saveToFile } from './export.js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Try multiple .env locations
dotenv.config({ path: resolve(__dirname, '../../../../.env') }); // From packages/scrapers/src/
dotenv.config({ path: resolve(process.cwd(), '.env') }); // From cwd
dotenv.config(); // Default

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const days = parseInt(args.find((a, i) => args[i - 1] === '--days' || args[i] === '-d')?.replace(/\D/g, '') || '') || 30;
  const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit' || args[i] === '-l')?.replace(/\D/g, '') || '') || 50;
  const department = args.find((a, i) => args[i - 1] === '--dept') || '';
  const city = args.find((a, i) => args[i - 1] === '--city') || '';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Opsidius Leads Scraper v1.0        ║');
  console.log('║         (Pappers API Edition)          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📅 Days: ${days} | 🎯 Limit: ${limit}${department ? ` | 📮 Dept: ${department}` : ''}${city ? ` | 🏙️ City: ${city}` : ''}\n`);

  // Get API key from environment
  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey) {
    console.error('❌ PAPPERS_API_KEY not found in environment');
    console.error('   Add PAPPERS_API_KEY=your_key to .env file in project root');
    console.error(`   Looking in: ${resolve(process.cwd(), '.env')}`);
    process.exit(1);
  }

  const client = new PappersAPIClient(apiKey);
  
  try {
    const startTime = Date.now();
    const companies = await client.searchCompanies({ days, limit, department, city });
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

      // Export CSV
      const csv = toCSV(companies);
      const filename = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      saveToFile(csv, filename);

      // Output JSON if requested
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