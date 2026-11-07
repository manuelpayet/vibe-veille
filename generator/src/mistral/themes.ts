import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const themesConfigSchema = z.object({
  themes: z.array(z.object({ id: z.string(), label: z.string(), description: z.string() })),
  horsPerimetre: z.string()
});
export type ThemesConfig = z.infer<typeof themesConfigSchema>;

export function loadThemesConfig(path: string): ThemesConfig {
  return themesConfigSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}
