import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Écoute sur toutes les interfaces : le dashboard est consulté depuis un
    // autre poste du réseau local, pas seulement depuis cette machine.
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    watch: {
      // Le venv du service Python vit dans l'arborescence du dépôt : le
      // surveiller épuise la limite d'inotify du Raspberry (8192 watches) et
      // fait planter le serveur de dev avec ENOSPC quelques secondes après
      // son démarrage. Rien de ce dossier n'est servi par Vite.
      ignored: ["**/garmin-service/**"],
    },
  },
});
