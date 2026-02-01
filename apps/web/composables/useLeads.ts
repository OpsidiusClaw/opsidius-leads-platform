export interface Lead {
  id: string;
  name: string;
  siren: string | null;
  city: string;
  postal_code: string | null;
  department: string | null;
  region: string | null;
  company_created_at: string | null;
  has_website: boolean;
  website_url: string | null;
  website_checked_at: string | null;
  naf_code: string | null;
  naf_label: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  score: number;
  score_breakdown: any;
  status: 'new' | 'qualified' | 'contacted' | 'meeting_scheduled' | 'proposal_sent' | 'negotiation' | 'won' | 'lost' | 'unqualified';
  notes: string | null;
  tags: string[] | null;
  emails_sent: number;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  source: string;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export function useLeads() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const leads = ref<Lead[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchLeads(filters?: {
    status?: string;
    city?: string;
    minScore?: number;
    noWebsiteOnly?: boolean;
  }) {
    loading.value = true;
    error.value = null;

    let query = supabase.from('leads').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters?.minScore) {
      query = query.gte('score', filters.minScore);
    }
    if (filters?.noWebsiteOnly) {
      query = query.eq('has_website', false);
    }

    const { data, error: err } = await query.order('score', { ascending: false });

    if (err) {
      error.value = err.message;
    } else {
      leads.value = data || [];
    }

    loading.value = false;
    return leads.value;
  }

  async function updateLead(lead: Partial<Lead> & { id: string }) {
    const { error: err } = await supabase
      .from('leads')
      .update({ ...lead, updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    if (err) {
      error.value = err.message;
      return false;
    }

    // Refresh leads
    await fetchLeads();
    return true;
  }

  async function insertLeads(newLeads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) {
    const { error: err } = await supabase.from('leads').insert(newLeads);

    if (err) {
      error.value = err.message;
      return false;
    }

    await fetchLeads();
    return true;
  }

  const leadsByStatus = computed(() => ({
    new: leads.value.filter(l => l.status === 'new'),
    qualified: leads.value.filter(l => l.status === 'qualified'),
    contacted: leads.value.filter(l => l.status === 'contacted'),
    meeting_scheduled: leads.value.filter(l => l.status === 'meeting_scheduled'),
    proposal_sent: leads.value.filter(l => l.status === 'proposal_sent'),
    negotiation: leads.value.filter(l => l.status === 'negotiation'),
    won: leads.value.filter(l => l.status === 'won'),
    lost: leads.value.filter(l => l.status === 'lost'),
  }));

  return {
    leads,
    leadsByStatus,
    loading,
    error,
    fetchLeads,
    updateLead,
    insertLeads,
  };
}