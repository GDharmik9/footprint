import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build a map of all .ts files in src/ to their .js counterparts
function buildJsToTsAliases(srcDir: string): Record<string, string> {
  const aliases: Record<string, string> = {};
  
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        const jsPath = full.replace(/\.ts$/, '.js');
        aliases[jsPath] = full;
      }
    }
  }
  
  walk(srcDir);
  return aliases;
}

const srcDir = resolve(__dirname, 'src');
const jsToTsAliases = buildJsToTsAliases(srcDir);

export default defineConfig({
  resolve: {
    alias: jsToTsAliases
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/server.ts']
    }
  }
});
