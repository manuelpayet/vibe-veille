// Client minimal de l'API Chat Completions de Mistral (compatible OpenAI).
// - base URL overridable via MISTRAL_BASE_URL (utile pour les tests)
// - retry avec backoff exponentiel sur 429 (rate limit), respecte Retry-After

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface ChatOpts {
  model: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean; // response_format: json_object
  retries?: number;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1';

export async function chat(messages: ChatMessage[], opts: ChatOpts): Promise<ChatResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('Variable d’environnement MISTRAL_API_KEY manquante');
  const baseUrl = (opts.baseUrl ?? process.env.MISTRAL_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const retries = opts.retries ?? 4;

  let lastErr: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(90_000),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
      lastErr = new Error(`Mistral 429 (rate limit), nouvel essai ${attempt + 1}/${retries + 1} dans ${waitMs} ms`);
      console.error(`[mistral] ${lastErr.message}`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Mistral API HTTP ${res.status} : ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== 'string') {
      lastErr = new Error(`Réponse Mistral sans contenu texte (finish_reason=${choice?.finish_reason ?? '?'}, refusal=${JSON.stringify(choice?.message?.refusal ?? null)}, content=${JSON.stringify(content)?.slice(0, 120)}), nouvel essai ${attempt + 1}/${retries + 1}`);
      console.error(`[mistral] ${lastErr.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      }
    };
  }
  throw lastErr ?? new Error('Mistral: échec après retries');
}

// Ordres de grandeur (USD / 1M tokens) pour le log de coût — indicatifs.
const COST_PER_1M_USD: Record<string, { input: number; output: number }> = {
  'mistral-small-latest': { input: 0.2, output: 0.6 },
  'mistral-medium-latest': { input: 0.4, output: 2 },
  'mistral-large-latest': { input: 2, output: 6 }
};
const USD_TO_EUR = 0.92;

export function estimateCostEur(model: string, promptTokens: number, completionTokens: number): number {
  const c = COST_PER_1M_USD[model] ?? COST_PER_1M_USD['mistral-medium-latest'];
  return ((promptTokens * c.input + completionTokens * c.output) / 1_000_000) * USD_TO_EUR;
}
