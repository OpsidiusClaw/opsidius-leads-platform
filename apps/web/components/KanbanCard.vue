<template>
  <div class="kanban-card" :class="{ 'border-l-4 border-l-orange-500': !lead.hasWebsite }">
    <div class="flex items-start justify-between">
      <h4 class="font-medium text-gray-900 truncate">{{ lead.name }}</h4>
      <span class="score-badge" :class="scoreClass">{{ lead.score }}</span>
    </div>
    <p class="text-sm text-gray-500 mt-1">📍 {{ lead.city }}</p>
    <div class="flex items-center mt-2 space-x-2">
      <span v-if="!lead.hasWebsite" class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">No website</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Lead {
  id: string;
  name: string;
  city: string;
  score: number;
  hasWebsite: boolean;
  status: string;
}

const props = defineProps<{
  lead: Lead;
}>();

const scoreClass = computed(() => {
  if (props.lead.score >= 70) return 'score-high';
  if (props.lead.score >= 40) return 'score-medium';
  return 'score-low';
});
</script>