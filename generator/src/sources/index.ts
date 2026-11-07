import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { sourceConfigSchema, type SourceConfig } from '../types.js';

export function loadSources(configPath: string): SourceConfig[] {
  const raw = JSON.parse(readFileSync(configPath, 'utf8'));
  const sources = z.array(sourceConfigSchema).parse(raw);
  return sources.filter((s) => s.enabled);
}
