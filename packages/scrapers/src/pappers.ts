/**
 * Pappers Scraper - Extract new companies without websites
 * Uses crawl + parsing (no API key required)
 */

import { randomUUID } from 'crypto';

export interface ScrapedCompany {
  id: string;
  name: string;
  siren: string;
  city: string;
  postalCode: string;
  createdAt: Date;
  hasWebsite: boolean;
  websiteUrl?: string;
  nafCode: string;
  nafLabel: string;
  email?: string;
  phone?: string;
  score: number;
}

interface ScrapeOptions {
  days?: number;
  limit?: number;
  region?: string;
  department?: string;
}

// B2C sectors that need websites most urgently
const B2C_NAF_CODES = [
  '47', // Retail
  '56', // Food service
  '96', // Personal services
  '41', // Construction
  '43', // Specialized construction
  '46', // Wholesale trade
  '10', // Food manufacturing
  '14', // Clothing manufacturing
  '15', // Leather manufacturing
  '16', // Woodworking
  '31', // Furniture manufacturing
  '32', // Other manufacturing
  '33', // Repair/installation
  '52', // Warehousing/support
  '55', // Accommodation
  '68', // Real estate
  '77', // Rental/leasing
  '82', // Administrative support
  '90', // Arts/entertainment
  '93', // Sports/recreation
  '95', // Repair of computers/personal goods
];

// Pays de la Loire cities for proximity bonus
const PDL_CITIES = [
  'nantes', 'angers', 'le mans', 'saint-nazaire', 'cholet',
  'la roche-sur-yon', 'laval', 'fontenay-le-comte', 'les sables-d\'olonne',
  'reze', 'saint-herblain', 'orvault', 'vertou', 'carquefou',
  'bouguenais', 'sainte-luce-sur-loire', 'treillieres', 'saint-sebastien-sur-loire'
];

const PDL_POSTAL_PREFIXES = ['44', '49', '53', '72', '85'];

export class PappersScraper {
  private baseUrl = 'https://www.pappers.fr/recherche';
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebk',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML',
  ];

  async scrape(options: ScrapeOptions = {}): Promise<ScrapedCompany[]> {
    const { days = 30, limit = 100 } = options;
    console.log(`🔍 Starting scrape: last ${days} days, max ${limit} companies`);

    const companies: ScrapedCompany[] = [];
    const searchUrl = this.buildSearchUrl(options);

    try {
      // Fetch search results
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch: ${response.status} ${response.statusText}`);
        return [];
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log(`📊 Found ${results.length} companies in search results`);

      // Process each result
      for (const result of results.slice(0, limit)) {
        try {
          const company = await this.enrichCompanyData(result);
          if (company) {
            company.score = this.calculateScore(company);
            companies.push(company);
            console.log(`✅ ${company.name} - Score: ${company.score}${!company.hasWebsite ? ' (NO WEBSITE!)' : ''}`);
          }
          // Throttle to avoid rate limiting
          await this.delay(1000 + Math.random() * 2000);
        } catch (err) {
          console.error(`❌ Error processing ${result.name}:`, err);
        }
      }

    } catch (error) {
      console.error('❌ Scrape failed:', error);
    }

    // Sort by score descending
    return companies.sort((a, b) => b.score - a.score);
  }

  private buildSearchUrl(options: ScrapeOptions): string {
    const params = new URLSearchParams({
      q: '',
      sort: 'date_creation',
      order: 'desc',
    });

    if (options.region) {
      params.set('region', options.region);
    }

    if (options.department) {
      params.set('departement', options.department);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  private parseSearchResults(html: string): Array<{ name: string; url: string }> {
    // Simple parser for company cards
    const results: Array<{ name: string; url: string }> = [];
    
    // Match company card patterns
    const regex = /href="(\/entreprise\/[^"]+)"[^>]*>\s*<[^>]*>\s*([^<]+)/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      const url = `https://www.pappers.fr${match[1]}`;
      const name = match[2].trim();
      if (name && name.length > 2) {
        results.push({ name, url });
      }
    }

    // Deduplicate
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  private async enrichCompanyData(result: { name: string; url: string }): Promise<ScrapedCompany | null> {
    try {
      const response = await fetch(result.url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) return null;

      const html = await response.text();
      
      // Extract data from company page
      const siren = this.extractPattern(html, /SIREN[^\d]*(\d{9})/);
      const city = this.extractPattern(html, /<span[^>]*class="[^"]*ville[^"]*"[^>]*>([^<]+)/i) || 
                   this.extractPattern(html, /(\d{5})\s+([^\d<]+)/);
      const postalCode = this.extractPattern(html, /(\d{5})/);
      const creationDate = this.extractPattern(html, /Date de cr[ée]ation[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
      const websiteMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*class="[^"]*site/i);
      const emailMatch = html.match(/href="mailto:([^"]+)"/i);
      const phoneMatch = html.match(/tel:([\d\s.]+)/i);
      const nafCode = this.extractPattern(html, /Code NAF[^\d]*(\d{2}\.\d{2}[A-Z])/i);
      
      let hasWebsite = false;
      let websiteUrl: string | undefined;

      if (websiteMatch) {
        websiteUrl = websiteMatch[1];
        // Verify if website is actually accessible
        hasWebsite = await this.checkWebsiteAlive(websiteUrl);
      }

      // Parse creation date
      let createdAt = new Date();
      if (creationDate) {
        const parts = creationDate.split('/');
        if (parts.length === 3) {
          createdAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      return {
        id: randomUUID(),
        name: result.name.replace(/\s+/g, ' ').trim(),
        siren: siren || '',
        city: city ? city.trim() : '',
        postalCode: postalCode || '',
        createdAt,
        hasWebsite,
        websiteUrl,
        nafCode: nafCode || '',
        nafLabel: this.getNafLabel(nafCode),
        email: emailMatch ? emailMatch[1] : undefined,
        phone: phoneMatch ? phoneMatch[1].replace(/[\s.]/g, '') : undefined,
        score: 0, // Will be calculated later
      };

    } catch (error) {
      console.error(`❌ Error enriching ${result.name}:`, error);
      return null;
    }
  }

  private async checkWebsiteAlive(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  private extractPattern(html: string, regex: RegExp): string | undefined {
    const match = html.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private getNafLabel(code?: string): string {
    if (!code) return '';
    const prefix = code.substring(0, 2);
    const labels: Record<string, string> = {
      '47': 'Commerce de détail',
      '56': 'Restauration',
      '96': 'Services personnels',
      '41': 'Construction de bâtiments',
      '43': 'Travaux de construction',
      '46': 'Commerce de gros',
      '10': 'Industrie alimentaire',
      '14': 'Habillement',
      '16': 'Travail du bois',
      '31': 'Meubles',
      '68': 'Immobilier',
      '95': 'Réparation ordinateurs/biens pers.',
    };
    return labels[prefix] || 'Autre';
  }

  private calculateScore(company: ScrapedCompany): number {
    let score = 0;

    // No website = big opportunity
    if (!company.hasWebsite) {
      score += 30;
    }

    // Recent creation (< 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (company.createdAt > threeMonthsAgo) {
      score += 20;
    }

    // B2C sector
    if (B2C_NAF_CODES.some(code => company.nafCode.startsWith(code))) {
      score += 20;
    }

    // Pays de la Loire proximity
    const isPdl = PDL_CITIES.some(city => 
      company.city.toLowerCase().includes(city.toLowerCase())
    ) || PDL_POSTAL_PREFIXES.some(prefix => 
      company.postalCode.startsWith(prefix)
    );
    if (isPdl) {
      score += 10;
    }

    // Has contact info
    if (company.email) {
      score += 10;
    }
    if (company.phone) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
if (import.meta.main) {
  const scraper = new PappersScraper();
  
  scraper.scrape({
    days: parseInt(process.argv[2]) || 30,
    limit: parseInt(process.argv[3]) || 50,
  }).then(companies => {
    console.log(`\n🎉 Found ${companies.length} qualified leads`);
    console.log('\n🏆 Top 5 scoring leads:');
    companies.slice(0, 5).forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.city}) - Score: ${c.score}${!c.hasWebsite ? ' ⭐ NO WEBSITE' : ''}`);
    });
  });
}
