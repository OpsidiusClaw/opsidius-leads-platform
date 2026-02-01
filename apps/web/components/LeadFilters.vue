<template>
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="flex flex-wrap gap-4 items-end">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select v-model="filters.status" class="border rounded-lg px-3 py-2">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="contacted">Contacted</option>
          <option value="meeting_scheduled">Meeting</option>
          <option value="proposal_sent">Proposal</option>
          <option value="won">Won</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
        <input v-model="filters.city" type="text" placeholder="Filter by city..." class="border rounded-lg px-3 py-2">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
        <input v-model.number="filters.minScore" type="number" min="0" max="100" class="border rounded-lg px-3 py-2 w-20">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">No Website Only</label>
        <input v-model="filters.noWebsiteOnly" type="checkbox" class="w-5 h-5">
      </div>
      <button @click="$emit('scrape')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
        🚀 Scrape New Leads
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const filters = defineModel<{
  status: string;
  city: string;
  minScore: number;
  noWebsiteOnly: boolean;
}>({ required: true });

defineEmits<{
  scrape: [];
}>();
</script>