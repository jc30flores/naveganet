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
      allowedHosts: [
        'naveganet.cheros.dev',
        'localhost',
        '.trycloudflare.com',
        '.cheros.dev',
      ],
      hmr: {
        protocol: hmrProtocol,
        host: hmrHost,
        port: hmrPort,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
      cors: true,
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
