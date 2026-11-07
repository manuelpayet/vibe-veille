// Petit client HTTP : fetch natif Node avec timeout, user-agent et retries.

interface FetchOpts {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'user-agent': 'vibe-veille/0.1 (+https://github.com/manuelpayet/vibe-veille)'
};

async function fetchWithRetry(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 15_000, retries = 2, headers = {} } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ...DEFAULT_HEADERS, ...headers }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*', ...opts.headers }
  });
  return res.text();
}

export async function fetchJson(url: string, opts: FetchOpts = {}): Promise<unknown> {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { accept: 'application/json', ...opts.headers }
  });
  return res.json();
}

// map avec concurrence limitée (utile pour l'API Hacker News : un appel par item)
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}
