import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  srcDir: 'routes',
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  },
  routeRules: {
    '/api/**': { cors: true },
  },
});