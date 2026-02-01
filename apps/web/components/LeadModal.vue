<template>
  <div v-if="lead" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ lead.name }}</h2>
            <p class="text-gray-500">{{ lead.city }} {{ lead.postal_code }}</p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <span class="text-sm text-gray-500">Score</span>
            <div class="text-3xl font-bold" :class="scoreColor">{{ lead.score }}/100</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <span class="text-sm text-gray-500">Status</span>
            <select v-model="lead.status" @change="updateStatus" class="mt-1 block w-full border rounded-lg px-3 py-2">
              <option value="new">New</option>
              <option value="qualified">Qualified</option>
              <option value="contacted">Contacted</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div v-if="lead.siren">
            <span class="text-sm text-gray-500">SIREN</span>
            <p class="font-mono">{{ lead.siren }}</p>
          </div>
          <div v-if="lead.naf_label">
            <span class="text-sm text-gray-500">Activity</span>
            <p>{{ lead.naf_label }}</p>
          </div>
          <div v-if="lead.company_created_at">
            <span class="text-sm text-gray-500">Created</span>
            <p>{{ formatDate(lead.company_created_at) }}</p>
          </div>
          <div v-if="lead.website_url">
            <span class="text-sm text-gray-500">Website</span>
            <a :href="lead.website_url" target="_blank" class="text-indigo-600 hover:underline">{{ lead.website_url }}</a>
          </div>
          <div v-if="lead.email">
            <span class="text-sm text-gray-500">Email</span>
            <a :href="`mailto:${lead.email}`" class="text-indigo-600 hover:underline">{{ lead.email }}</a>
          </div>
          <div v-if="lead.phone">
            <span class="text-sm text-gray-500">Phone</span>
            <a :href="`tel:${lead.phone}`" class="text-indigo-600 hover:underline">{{ lead.phone }}</a>
          </div>
        </div>

        <div class="mt-6">
          <span class="text-sm text-gray-500">Notes</span>
          <textarea v-model="lead.notes" @blur="updateNotes" rows="4" class="mt-1 block w-full border rounded-lg px-3 py-2" placeholder="Add notes...">
          </textarea>
        </div>

        <div class="mt-6 flex gap-3">
          <button @click="contactLead" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            ✉️ Mark as Contacted
          </button>
          <button @click="$emit('close')" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Lead } from '~/composables/useLeads';

const props = defineProps<{
  lead: Lead | null;
}>();

const emit = defineEmits<{
  close: [];
  update: [lead: Lead];
}>();

const scoreColor = computed(() => {
  if (!props.lead) return '';
  if (props.lead.score >= 70) return 'text-green-600';
  if (props.lead.score >= 40) return 'text-yellow-600';
  return 'text-gray-600';
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

function updateStatus() {
  if (props.lead) emit('update', props.lead);
}

function updateNotes() {
  if (props.lead) emit('update', props.lead);
}

function contactLead() {
  if (props.lead) {
    props.lead.status = 'contacted';
    emit('update', props.lead);
  }
}
</script>