<template>
  <div class="kanban-column">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-700">{{ title }}</h3>
      <span class="text-sm text-gray-500">{{ leads.length }}</span>
    </div>
    <div class="flex-1">
      <KanbanCard
        v-for="lead in leads"
        :key="lead.id"
        :lead="lead"
        @click="$emit('select', lead)"
      />
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

defineProps<{
  title: string;
  leads: Lead[];
}>();

defineEmits<{
  select: [lead: Lead];
}>();
</script>
