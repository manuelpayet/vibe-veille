// Badge "nouvelle veille" : compare la date de la dernière veille publiée
// (data/index.json) avec la dernière date vue stockée en localStorage.
const KEY = 'veille:lastSeenDate';

export function getLastSeenDate(storage: Storage): string | null {
  try {
    return storage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markVeilleSeen(date: string, storage: Storage): void {
  try {
    storage.setItem(KEY, date);
  } catch {
    // stockage indisponible (navigation privée...) : on ignore
  }
}

export function hasNewVeille(latestDate: string | null, storage: Storage): boolean {
  if (!latestDate) return false;
  return getLastSeenDate(storage) !== latestDate;
}

// URL d'abonnement ntfy : la notif push passe par l'app web ntfy.sh/app (ou l'app
// mobile ntfy) — la Push API ne permet pas de s'abonner cross-origin depuis la PWA.
export function ntfySubscribeUrl(topic: string | null): string {
  return topic ? `https://ntfy.sh/${topic}` : 'https://ntfy.sh';
}

export interface AppConfig {
  ntfyTopic?: string;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const r = await fetch('/config.json');
    if (!r.ok) return {};
    return (await r.json()) as AppConfig;
  } catch {
    return {};
  }
}
