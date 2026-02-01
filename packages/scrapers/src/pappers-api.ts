/**
 * Pappers API Client - Official API integration
 * API Documentation: https://www.pappers.fr/api/documentation
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
  department?: string;
  city?: string;
}

interface PappersCompany {
  siren: string;
  nom_entreprise: string;
  personne_morale: boolean;
  denomination: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  code_naf: string;
  libelle_code_naf: string;
  domaine_activite: string;
  conventions_collectives: string[];
  date_creation: string;
  date_creation_formate: string;
  entreprise_cessee: boolean;
  date_cessation: string | null;
  entreprise_employeuse: boolean;
  societe_a_mission: boolean;
  categorie_juridique: string;
  forme_juridique: string;
  capital_social: number;
  capital_formate: string;
  statut_rcs: string;
  siege: {
    siret: string;
    etablissement_cesse: boolean;
    etablissement_employeur: boolean;
    etablissement_siege: boolean;
    date_debut_activite: string;
    date_cessation: string | null;
    adresse_ligne_1: string;
    adresse_ligne_2: string;
    code_postal: string;
    ville: string;
    pays: string;
    latitude: string;
    longitude: string;
  };
  diffusable: boolean;
  email: string | null;
  telephone: string | null;
  site_web: string | null;
}

interface PappersSearchResult {
  entreprises: PappersCompany[];
  page: number;
  total: number;
}

// B2C sectors for scoring
const B2C_NAF_CODES = [
  '47', '56', '96', '41', '43', '46', '10', '14', '15', '16', '31', '32', '33',
  '52', '55', '68', '77', '82', '90', '93', '95'
];

// Pays de la Loire cities
const PDL_POSTAL_PREFIXES = ['44', '49', '53', '72', '85'];

export class PappersAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.pappers.fr/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchCompanies(options: ScrapeOptions = {}): Promise<ScrapedCompany[]> {
    const { days = 30, limit = 50, department, city } = options;
    console.log(`🔍 Searching Pappers API: last ${days} days, max ${limit} companies`);

    const companies: ScrapedCompany[] = [];
    
    try {
      // Build search parameters
      const params = new URLSearchParams({
        api_token: this.apiKey,
        par_page: Math.min(limit, 100).toString(), // Max 100 per page
      });

      // Filter by creation date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      params.set('date_creation_min', startDate.toISOString().split('T')[0]);

      if (department) {
        params.set('code_postal', `${department}*`);
      }

      // Search endpoint
      const searchUrl = `${this.baseUrl}/recherche?${params.toString()}`;
      console.log(`📡 Calling: ${searchUrl.replace(this.apiKey, '***')}`);

      const response = await fetch(searchUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        throw new Error(`Pappers API error: ${response.status}`);
      }

      const data: PappersSearchResult = await response.json();
      console.log(`📊 Found ${data.entreprises?.length || 0} companies`);

      for (const company of (data.entreprises || []).slice(0, limit)) {
        const scraped = await this.processCompany(company);
        if (scraped) {
          companies.push(scraped);
        }
      }

    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }

    return companies.sort((a, b) => b.score - a.score);
  }

  private async processCompany(company: PappersCompany): Promise<ScrapedCompany | null> {
    // Skip if no siege info
    if (!company.siege) return null;

    const websiteUrl = company.site_web || undefined;
    const hasWebsite = websiteUrl ? await this.checkWebsiteAlive(websiteUrl) : false;

    const createdAt = new Date(company.date_creation);

    const scraped: ScrapedCompany = {
      id: randomUUID(),
      name: company.denomination || company.nom_entreprise || 'Unknown',
      siren: company.siren,
      city: company.siege.ville,
      postalCode: company.siege.code_postal,
      createdAt,
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl : undefined,
      nafCode: company.code_naf,
      nafLabel: company.libelle_code_naf,
      email: company.email || undefined,
      phone: company.telephone || undefined,
      score: 0,
    };

    scraped.score = this.calculateScore(scraped);

    return scraped;
  }

  private async checkWebsiteAlive(url: string): Promise<boolean> {
    if (!url) return false;
    
    // Normalize URL
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = `https://${url}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeout);
      return response.ok;
    } catch {
      // Try http if https fails
      if (fullUrl.startsWith('https://')) {
        try {
          const httpUrl = fullUrl.replace('https://', 'http://');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(httpUrl, {
            method: 'HEAD',
            signal: controller.signal,
          });
          clearTimeout(timeout);
          return response.ok;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  private calculateScore(company: ScrapedCompany): number {
    let score = 0;

    // No website = big opportunity (+30)
    if (!company.hasWebsite) {
      score += 30;
    }

    // Recent creation (< 3 months) (+20)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (company.createdAt > threeMonthsAgo) {
      score += 20;
    }

    // B2C sector (+20)
    if (B2C_NAF_CODES.some(code => company.nafCode.startsWith(code))) {
      score += 20;
    }

    // Pays de la Loire proximity (+10)
    if (PDL_POSTAL_PREFIXES.some(prefix => company.postalCode.startsWith(prefix))) {
      score += 10;
    }

    // Has contact info (+10 each, max +20)
    if (company.email) score += 10;
    if (company.phone) score += 10;

    return Math.min(score, 100);
  }
}

// CLI usage
if (import.meta.main) {
  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey) {
    console.error('❌ PAPPERS_API_KEY environment variable required');
    process.exit(1);
  }

  const client = new PappersAPIClient(apiKey);
  
  const days = parseInt(process.argv[2]) || 30;
  const limit = parseInt(process.argv[3]) || 50;
  
  client.searchCompanies({ days, limit }).then(companies => {
    console.log(`\n🎉 Found ${companies.length} qualified leads`);
    console.log('\n🏆 Top leads:');
    companies.slice(0, 10).forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.city}) - Score: ${c.score}${!c.hasWebsite ? ' ⭐ NO WEBSITE' : ''}`);
    });
  }).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
}