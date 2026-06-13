import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.VITE_BACKEND_PORT || "8081";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/ws": {
          target: `http://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
