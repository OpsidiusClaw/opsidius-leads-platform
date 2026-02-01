import { ScrapedCompany } from './pappers.js';

export function toCSV(companies: ScrapedCompany[]): string {
  const headers = [
    'Name',
    'City',
    'PostalCode',
    'CreatedAt',
    'HasWebsite',
    'WebsiteUrl',
    'NAFCode',
    'NAFLabel',
    'Email',
    'Phone',
    'Score',
    'SIREN'
  ];

  const rows = companies.map(c => [
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.city.replace(/"/g, '""')}"`,
    c.postalCode,
    c.createdAt.toISOString().split('T')[0],
    c.hasWebsite ? 'No' : 'Yes',
    c.websiteUrl || '',
    c.nafCode,
    `"${c.nafLabel.replace(/"/g, '""')}"`,
    c.email || '',
    c.phone || '',
    c.score.toString(),
    c.siren
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function saveToFile(content: string, filename: string): void {
  const fs = require('fs');
  const path = require('path');
  
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`💾 Saved to: ${filepath}`);
}