import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Écoute sur toutes les interfaces : le dashboard est consulté depuis un
    // autre poste du réseau local, pas seulement depuis cette machine.
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
