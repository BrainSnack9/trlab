const PROVIDERS = [
  ['openai', 'OPENAI_API_KEY', callOpenAI],
  ['gemini', 'GEMINI_API_KEY', callGemini],
  ['anthropic', 'ANTHROPIC_API_KEY', callAnthropic],
  ['xai', 'XAI_API_KEY', (prompt, key, options) => callCompat(prompt, key, 'https://api.x.ai/v1/chat/completions', process.env.XAI_MODEL ?? 'grok-3-mini', options)],
  ['groq', 'GROQ_API_KEY', (prompt, key, options) => callCompat(prompt, key, 'https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant', options)],
  ['deepseek', 'DEEPSEEK_API_KEY', (prompt, key, options) => callCompat(prompt, key, 'https://api.deepseek.com/chat/completions', process.env.DEEPSEEK_MODEL ?? 'deepseek-chat', options)],
  ['mistral', 'MISTRAL_API_KEY', (prompt, key, options) => callCompat(prompt, key, 'https://api.mistral.ai/v1/chat/completions', process.env.MISTRAL_MODEL ?? 'mistral-small-latest', options)],
  ['deepinfra', 'DEEPINFRA_API_KEY', (prompt, key, options) => callCompat(prompt, key, 'https://api.deepinfra.com/v1/openai/chat/completions', process.env.DEEPINFRA_MODEL ?? 'meta-llama/Meta-Llama-3.1-8B-Instruct', options)]
];

export function hasAIProvider() {
  return PROVIDERS.some(([, env]) => Boolean(process.env[env]));
}

export async function generateAIJson(prompt, options = {}) {
  const preferred = process.env.AI_PROVIDER?.toLowerCase();
  const ordered = [...PROVIDERS].sort(([nameA], [nameB]) => (nameA === preferred ? -1 : nameB === preferred ? 1 : 0));
  const errors = [];
  for (const [name, env, caller] of ordered) {
    const key = process.env[env];
    if (!key) continue;
    try {
      const result = await caller(prompt, key, options);
      const text = typeof result === 'string' ? result : result.text;
      return { provider: name, data: parseJson(text), meta: typeof result === 'string' ? {} : { model: result.model, usage: result.usage } };
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  throw new Error(`AI providers failed: ${errors.join(' | ')}`);
}

async function callOpenAI(prompt, key, options = {}) {
  const models = uniqueModels([process.env.OPENAI_MODEL, ...(process.env.OPENAI_FALLBACK_MODELS ?? 'gpt-4o-mini').split(',')]);
  const errors = [];
  for (const model of models) {
    try {
      const system = options.systemPrompt ?? systemPrompt();
      const body = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        response_format: options.schema ? jsonSchemaFormat(options.schemaName ?? 'trlab_result', options.schema) : { type: 'json_object' }
      };
      if (process.env.OPENAI_TEMPERATURE) body.temperature = Number(process.env.OPENAI_TEMPERATURE);
      if (options.promptCacheKey) body.prompt_cache_key = options.promptCacheKey;
      const json = await postJson('https://api.openai.com/v1/chat/completions', key, body);
      return { text: json.choices?.[0]?.message?.content ?? '', model: json.model ?? model, usage: json.usage };
    } catch (error) {
      errors.push(`${model}: ${error.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}

async function callGemini(prompt, key, options = {}) {
  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${options.systemPrompt ?? systemPrompt()}\n\n${prompt}` }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callAnthropic(prompt, key, options = {}) {
  const system = options.systemPrompt ?? systemPrompt();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest', max_tokens: 3000, temperature: 0.2, system, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}`);
  const json = await response.json();
  return json.content?.map((part) => part.text ?? '').join('\n') ?? '';
}

async function callCompat(prompt, key, url, model, options = {}) {
  const body = { model, messages: [{ role: 'system', content: options.systemPrompt ?? systemPrompt() }, { role: 'user', content: prompt }], temperature: 0.2, response_format: { type: 'json_object' } };
  const json = await postJson(url, key, body);
  return { text: json.choices?.[0]?.message?.content ?? '', model: json.model ?? model, usage: json.usage };
}

async function postJson(url, key, body) {
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${url} ${response.status}${await errorMessage(response)}`);
  return response.json();
}

async function errorMessage(response) {
  try {
    const body = await response.json();
    const message = body?.error?.message ?? body?.message;
    return message ? ` - ${message}` : '';
  } catch {
    return '';
  }
}

function uniqueModels(models) {
  return [...new Set(models.map((model) => `${model ?? ''}`.trim()).filter(Boolean))];
}

function parseJson(text) {
  const cleaned = `${text ?? ''}`.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const match = cleaned.match(/\{[\s\S]*}/);
  return JSON.parse(match ? match[0] : cleaned);
}

function jsonSchemaFormat(name, schema) {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: true,
      schema
    }
  };
}

function systemPrompt() {
  return '한국어 인스타그램 트렌드 편집장. 트렌드 키워드의 검색 검증 가능성, 발행가치, 리스크를 평가하고 다음 단계에서 선택할 콘텐츠 제목 후보를 만든다. 카드별 구성은 만들지 않는다. 반드시 JSON만 반환한다.';
}
