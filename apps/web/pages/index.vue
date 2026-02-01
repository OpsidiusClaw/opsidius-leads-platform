<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
      <p class="text-gray-500">Manage and track your prospects</p>
    </div>

    <LeadFilters v-model="filters" @scrape="runScraper" />

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-4 text-gray-500">Loading leads...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {{ error }}
    </div>

    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <KanbanColumn
        title="New"
        :leads="leadsByStatus.new"
        @select="openLead"
      />
      <KanbanColumn
        title="Qualified"
        :leads="leadsByStatus.qualified"
        @select="openLead"
      />
      <KanbanColumn
        title="Contacted"
        :leads="leadsByStatus.contacted"
        @select="openLead"
      />
      <KanbanColumn
        title="Meeting"
        :leads="leadsByStatus.meeting_scheduled"
        @select="openLead"
      />
      <KanbanColumn
        title="Proposal"
        :leads="leadsByStatus.proposal_sent"
        @select="openLead"
      />
      <KanbanColumn
        title="Won"
        :leads="leadsByStatus.won"
        @select="openLead"
      />
    </div>

    <LeadModal
      :lead="selectedLead"
      @close="selectedLead = null"
      @update="updateLead"
    />
  </div>
</template>

<script setup lang="ts">
import type { Lead } from '~/composables/useLeads';

const { leads, leadsByStatus, loading, error, fetchLeads, updateLead: updateLeadInDb } = useLeads();

const filters = ref({
  status: '',
  city: '',
  minScore: 0,
  noWebsiteOnly: false,
});

const selectedLead = ref<Lead | null>(null);

// Fetch leads on mount and when filters change
watch(filters, () => {
  fetchLeads(filters.value);
}, { deep: true });

onMounted(() => {
  fetchLeads(filters.value);
});

function openLead(lead: Lead) {
  selectedLead.value = lead;
}

async function updateLead(lead: Lead) {
  await updateLeadInDb(lead);
  selectedLead.value = null;
}

async function runScraper() {
  // TODO: Call API endpoint to trigger scraper
  alert('Scraper would run here - connect to API');
}
</script>
