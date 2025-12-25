import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const hmrProtocol = env.VITE_HMR_PROTOCOL || undefined;
  const hmrHost = env.VITE_HMR_HOST || undefined;
  const hmrPort = env.VITE_HMR_PORT ? Number(env.VITE_HMR_PORT) : undefined;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        protocol: hmrProtocol,
        host: hmrHost,
        port: hmrPort,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        axios: path.resolve(__dirname, "./src/lib/http/axios.ts"),
      },
    },
  };
});
