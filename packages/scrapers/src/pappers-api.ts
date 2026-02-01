/**
 * Pappers API Client - CORRECT implementation
 * Documentation: https://www.pappers.fr/api/documentation
 */

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
  department?: string;
}

const B2C_NAF_CODES = ['47', '56', '96', '41', '43', '46', '10', '14', '15', '16', '31', '32', '33', '52', '55', '68', '77', '82', '90', '93', '95'];
const PDL_PREFIXES = ['44', '49', '53', '72', '85'];

export class PappersAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.pappers.fr/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchCompanies(options: ScrapeOptions = {}): Promise<ScrapedCompany[]> {
    const { days = 30, limit = 50, department } = options;
    const companies: ScrapedCompany[] = [];
    
    try {
      // Strategy: Search by department prefix with date filter
      // Pappers API requires at least one search parameter
      
      // Build search params - using code_postal as primary filter
      const params = new URLSearchParams({
        api_token: this.apiKey,
        par_page: Math.min(limit, 100).toString(),
      });

      // Add department filter if provided (e.g., "44*" for Loire-Atlantique)
      if (department) {
        params.set('code_postal', `${department}*`);
      } else {
        // Search all with a wildcard that matches everything
        // Use a common search pattern that returns recent companies
        params.set('code_postal', '*');
      }

      // Date range - format: YYYY-MM-DD
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      params.set('date_creation_min', startDate.toISOString().split('T')[0]);
      params.set('date_creation_max', endDate.toISOString().split('T')[0]);

      const url = `${this.baseUrl}/recherche?${params.toString()}`;
      console.log(`📡 Calling Pappers API...`);
      console.log(`   URL: ${url.replace(this.apiKey, '***')}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`Pappers API ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Handle response format
      const results = data.resultats || data.entreprises || data.results || [];
      console.log(`📊 Found ${results.length} companies`);

      for (const result of results.slice(0, limit)) {
        const processed = await this.processCompany(result);
        if (processed) companies.push(processed);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }

    return companies.sort((a, b) => b.score - a.score);
  }

  private async processCompany(data: any): Promise<ScrapedCompany | null> {
    const siege = data.siege || data;
    const company = data;
    
    const websiteUrl = company.site_web || undefined;
    const hasWebsite = websiteUrl ? await this.checkWebsite(websiteUrl) : false;
    
    const createdAtStr = company.date_creation || company.date_immatriculation;
    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
    
    const scraped: ScrapedCompany = {
      id: crypto.randomUUID(),
      name: company.nom_entreprise || company.denomination || 'Unknown',
      siren: company.siren || '',
      city: siege.ville || '',
      postalCode: siege.code_postal || '',
      createdAt,
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl : undefined,
      nafCode: company.code_naf || '',
      nafLabel: company.libelle_code_naf || this.getNafLabel(company.code_naf),
      email: company.email || undefined,
      phone: company.telephone || undefined,
      score: 0,
    };

    scraped.score = this.calculateScore(scraped);
    return scraped;
  }

  private async checkWebsite(url: string): Promise<boolean> {
    if (!url) return false;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(fullUrl, { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private getNafLabel(code?: string): string {
    if (!code) return '';
    const prefix = code.substring(0, 2);
    const labels: Record<string, string> = {
      '47': 'Commerce de détail',
      '56': 'Restauration',
      '96': 'Services personnels',
      '41': 'Construction',
      '43': 'Travaux de construction',
    };
    return labels[prefix] || 'Autre';
  }

  private calculateScore(c: ScrapedCompany): number {
    let score = 0;
    if (!c.hasWebsite) score += 30;
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (c.createdAt > threeMonthsAgo) score += 20;
    
    if (B2C_NAF_CODES.some(code => c.nafCode?.startsWith(code))) score += 20;
    if (PDL_PREFIXES.some(p => c.postalCode?.startsWith(p))) score += 10;
    if (c.email) score += 10;
    if (c.phone) score += 10;
    
    return Math.min(score, 100);
  }
}