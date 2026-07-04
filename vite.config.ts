import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore
import { keycloakify } from 'keycloakify/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      themeName: 'sistema-clinico',
      accountThemeImplementation: 'none',
    }),
  ],
});
