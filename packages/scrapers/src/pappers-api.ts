/**
 * Pappers API Client
 * 
 * API docs: https://www.pappers.fr/api/documentation
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
  city?: string;
}

// B2C sectors
const B2C_NAF_CODES = ['47', '56', '96', '41', '43', '46', '10', '14', '15', '16', '31', '32', '33', '52', '55', '68', '77', '82', '90', '93', '95'];
const PDL_PREFIXES = ['44', '49', '53', '72', '85'];

export class PappersAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.pappers.fr/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchCompanies(options: ScrapeOptions = {}): Promise<ScrapedCompany[]> {
    const { days = 30, limit = 50, department, city } = options;
    const companies: ScrapedCompany[] = [];
    
    try {
      // Build search params
      const params = new URLSearchParams({
        api_token: this.apiKey,
        par_page: '100',
      });

      // Date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      params.set('date_creation_min', startDate.toISOString().split('T')[0]);
      params.set('date_creation_max', new Date().toISOString().split('T')[0]);

      // Location filters
      if (department) {
        params.set('code_postal', `${department}*`);
      }
      if (city) {
        params.set('ville', city);
      }

      // Try /recherche endpoint
      const searchUrl = `${this.baseUrl}/recherche?${params.toString()}`;
      console.log(`📡 Calling: ${searchUrl.replace(this.apiKey, '***')}`);

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const results = data.entreprises || data.resultats || data.results || [];
      console.log(`📊 API returned ${results.length} results`);

      for (const company of results.slice(0, limit)) {
        const processed = await this.processCompany(company);
        if (processed) companies.push(processed);
      }

    } catch (error) {
      console.error('❌ API Error:', error.message);
      throw error;
    }

    return companies.sort((a, b) => b.score - a.score);
  }

  private async processCompany(data: any): Promise<ScrapedCompany | null> {
    const siege = data.siege || data.etablissement || {};
    if (!siege.ville && !data.ville) return null;

    const websiteUrl = data.site_web || data.website || undefined;
    const hasWebsite = websiteUrl ? await this.checkWebsite(websiteUrl) : false;
    
    const createdAt = new Date(data.date_creation || data.dateCreation || Date.now());
    const postalCode = siege.code_postal || data.code_postal || '';
    const city = siege.ville || data.ville || '';

    const company: ScrapedCompany = {
      id: crypto.randomUUID(),
      name: data.denomination || data.nom_entreprise || data.name || 'Unknown',
      siren: data.siren || '',
      city,
      postalCode,
      createdAt,
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl : undefined,
      nafCode: data.code_naf || data.codeNaf || '',
      nafLabel: data.libelle_code_naf || data.activite || '',
      email: data.email || undefined,
      phone: data.telephone || data.phone || undefined,
      score: 0,
    };

    company.score = this.calculateScore(company);
    return company;
  }

  private async checkWebsite(url: string): Promise<boolean> {
    if (!url) return false;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000);
      const res = await fetch(fullUrl, { 
        method: 'HEAD', 
        signal: controller.signal,
        redirect: 'follow'
      });
      return res.ok;
    } catch {
      return false;
    }
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