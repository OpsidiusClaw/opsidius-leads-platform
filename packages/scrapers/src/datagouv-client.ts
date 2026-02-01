/**
 * API recherche-entreprises.data.gouv.fr (gratuite, ouverte)
 * https://api.gouv.fr/les-api/api-recherche-entreprises
 * 
 * Cette API permet de rechercher des entreprises mais ne filtre pas par date de création.
 * Stratégie : requêtes par département, puis filtrage local des récentes.
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

export class DataGouvClient {
  private baseUrl = 'https://recherche-entreprises.api.gouv.fr/search';

  async searchCompanies(options: ScrapeOptions = {}): Promise<ScrapedCompany[]> {
    const { days = 30, limit = 50, department } = options;
    const companies: ScrapedCompany[] = [];
    
    // Départements à scraper (PDL par défaut si non spécifié)
    const departments = department ? [department] : PDL_PREFIXES;
    
    console.log(`🔍 Searching ${departments.length} department(s)...`);
    
    for (const dept of departments) {
      try {
        // Récupère beaucoup plus que nécessaire pour avoir assez de récentes après filtrage
        const deptCompanies = await this.searchByDepartment(dept, 500);
        companies.push(...deptCompanies);
        
        console.log(`   📍 Dept ${dept}: ${deptCompanies.length} companies (raw)`);
        
        await this.delay(300);
      } catch (error) {
        console.error(`   ❌ Dept ${dept} failed:`, error.message);
      }
    }

    // Filtrer par date de création
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentCompanies = companies.filter(c => c.createdAt >= cutoffDate);
    console.log(`\n📅 Filtered by ${days} days: ${recentCompanies.length}/${companies.length} recent`);

    return recentCompanies.sort((a, b) => b.score - a.score);
  }

  private async searchByDepartment(department: string, limit: number): Promise<ScrapedCompany[]> {
    const companies: ScrapedCompany[] = [];
    let page = 1;
    const perPage = 25;
    const maxPages = 20; // Augmenté pour trouver des récentes
    
    while (companies.length < limit && page <= maxPages) {
      const params = new URLSearchParams({
        departement: department,
        etat_administratif: 'A',
        page: page.toString(),
        per_page: perPage.toString(),
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];
      
      if (results.length === 0) break;

      for (const result of results) {
        const processed = this.processCompany(result);
        if (processed) companies.push(processed);
      }

      page++;
      
      // Arrêter si on a assez ou s'il n'y a plus de pages
      if (results.length < perPage) break;
    }

    return companies.slice(0, limit);
  }

  private processCompany(data: any): ScrapedCompany | null {
    const siege = data.siege || {};
    const uniLegale = data.unite_legale || data;
    
    // Date de création
    const dateCreation = uniLegale.date_creation || uniLegale.date_debut_activite;
    const createdAt = dateCreation ? new Date(dateCreation) : new Date();
    
    // Nom
    const name = uniLegale.denomination 
      || (uniLegale.nom && `${uniLegale.nom} ${uniLegale.prenom || ''}`)
      || siege.enseigne_1
      || 'Unknown';

    const company: ScrapedCompany = {
      id: crypto.randomUUID(),
      name: name.trim(),
      siren: uniLegale.siren || '',
      city: siege.libelle_commune || siege.commune || '',
      postalCode: siege.code_postal || '',
      createdAt,
      hasWebsite: false, // Pas d'info site web dans cette API
      websiteUrl: undefined,
      nafCode: uniLegale.activite_principale || '',
      nafLabel: this.getNafLabel(uniLegale.activite_principale),
      email: undefined,
      phone: undefined,
      score: 0,
    };

    company.score = this.calculateScore(company);
    return company;
  }

  private getNafLabel(code?: string): string {
    if (!code) return '';
    const prefix = code.substring(0, 2);
    const labels: Record<string, string> = {
      '01': 'Agriculture',
      '10': 'Industrie alimentaire',
      '14': 'Habillement',
      '16': 'Travail du bois',
      '22': 'Caoutchouc/plastique',
      '25': 'Métallurgie',
      '28': 'Machines/equipements',
      '41': 'Construction',
      '43': 'Travaux construction',
      '45': 'Commerce/reparation auto',
      '46': 'Commerce de gros',
      '47': 'Commerce de détail',
      '49': 'Transports terrestres',
      '55': 'Hébergement',
      '56': 'Restauration',
      '62': 'Informatique',
      '64': 'Activités financières',
      '68': 'Immobilier',
      '69': 'Activités juridiques/comptables',
      '70': 'Conseil de gestion',
      '71': 'Architecture/ingénierie',
      '73': 'Publicité',
      '77': 'Location',
      '82': 'Activités administratives',
      '85': 'Enseignement',
      '86': 'Santé humaine',
      '88': 'Action sociale',
      '90': 'Arts/spectacles',
      '93': 'Sports/loisirs',
      '94': 'Activités associatives',
      '95': 'Réparation ordinateurs',
      '96': 'Services personnels',
    };
    return labels[prefix] || 'Autre';
  }

  private calculateScore(c: ScrapedCompany): number {
    let score = 0;
    
    // No website (supposé pour toutes car API ne donne pas l'info)
    score += 30;
    
    // Récent (< 3 mois)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (c.createdAt > threeMonthsAgo) score += 20;
    
    // Très récent (< 1 mois)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (c.createdAt > oneMonthAgo) score += 10;
    
    // Secteur B2C
    if (B2C_NAF_CODES.some(code => c.nafCode?.startsWith(code))) score += 20;
    
    // Pays de la Loire
    if (PDL_PREFIXES.some(p => c.postalCode?.startsWith(p))) score += 10;
    
    // Entreprise individuelle = besoin site web urgent
    if (c.nafCode?.startsWith('0')) score += 10;
    
    return Math.min(score, 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}