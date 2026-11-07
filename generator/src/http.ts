// Petit client HTTP : fetch natif Node avec timeout, user-agent et retries.
export async function fetchText(
  url: string,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<string> {
  const { timeoutMs = 15_000, retries = 2 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': 'vibe-veille/0.1 (+https://github.com/manuelpayet/vibe-veille)',
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}
