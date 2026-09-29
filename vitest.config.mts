import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Testes contra o banco (Supabase local) só rodam com `npm run test:db`.
    exclude: process.env.RUN_DB_TESTS ? [] : ["src/**/*.db.test.ts"],
  },
});
