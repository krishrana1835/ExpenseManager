import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load all environment variables with the VITE_ prefix
  const env = loadEnv(mode, process.cwd());

  return {
    base: "/",   // <---- IMPORTANT FIX (prevents MIME-type errors in deployment)

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    plugins: [react()],

    define: {
      "process.env": {
        GEMINI_API_KEY: JSON.stringify(env.VITE_GEMINI_API_KEY),
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    css: {
      postcss: "./postcss.config.cjs", // Tailwind v4 config
    },
  };
});