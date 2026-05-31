const PROVIDERS = [
  ['openai', 'OPENAI_API_KEY', callOpenAI],
  ['gemini', 'GEMINI_API_KEY', callGemini],
  ['anthropic', 'ANTHROPIC_API_KEY', callAnthropic],
  ['xai', 'XAI_API_KEY', (prompt, key) => callCompat(prompt, key, 'https://api.x.ai/v1/chat/completions', process.env.XAI_MODEL ?? 'grok-3-mini')],
  ['groq', 'GROQ_API_KEY', (prompt, key) => callCompat(prompt, key, 'https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant')],
  ['deepseek', 'DEEPSEEK_API_KEY', (prompt, key) => callCompat(prompt, key, 'https://api.deepseek.com/chat/completions', process.env.DEEPSEEK_MODEL ?? 'deepseek-chat')],
  ['mistral', 'MISTRAL_API_KEY', (prompt, key) => callCompat(prompt, key, 'https://api.mistral.ai/v1/chat/completions', process.env.MISTRAL_MODEL ?? 'mistral-small-latest')],
  ['deepinfra', 'DEEPINFRA_API_KEY', (prompt, key) => callCompat(prompt, key, 'https://api.deepinfra.com/v1/openai/chat/completions', process.env.DEEPINFRA_MODEL ?? 'meta-llama/Meta-Llama-3.1-8B-Instruct')]
];

export function hasAIProvider() {
  return PROVIDERS.some(([, env]) => Boolean(process.env[env]));
}

export async function generateAIJson(prompt) {
  const preferred = process.env.AI_PROVIDER?.toLowerCase();
  const ordered = [...PROVIDERS].sort(([nameA], [nameB]) => (nameA === preferred ? -1 : nameB === preferred ? 1 : 0));
  const errors = [];
  for (const [name, env, caller] of ordered) {
    const key = process.env[env];
    if (!key) continue;
    try {
      const text = await caller(prompt, key);
      return { provider: name, data: parseJson(text) };
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  throw new Error(`AI providers failed: ${errors.join(' | ')}`);
}

async function callOpenAI(prompt, key) {
  const body = { model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2 };
  const json = await postJson('https://api.openai.com/v1/chat/completions', key, body);
  return json.choices?.[0]?.message?.content ?? '';
}

async function callGemini(prompt, key) {
  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt()}\n\n${prompt}` }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callAnthropic(prompt, key) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest', max_tokens: 3000, temperature: 0.2, system: systemPrompt(), messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}`);
  const json = await response.json();
  return json.content?.map((part) => part.text ?? '').join('\n') ?? '';
}

async function callCompat(prompt, key, url, model) {
  const body = { model, messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: prompt }], temperature: 0.2, response_format: { type: 'json_object' } };
  const json = await postJson(url, key, body);
  return json.choices?.[0]?.message?.content ?? '';
}

async function postJson(url, key, body) {
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

function parseJson(text) {
  const cleaned = `${text ?? ''}`.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const match = cleaned.match(/\{[\s\S]*}/);
  return JSON.parse(match ? match[0] : cleaned);
}

function systemPrompt() {
  return '당신은 한국어 마케팅 콘텐츠 편집장입니다. 수집 신호를 카드뉴스 제작 가능성 기준으로 냉정하게 평가하고, 반드시 유효한 JSON만 반환합니다.';
}
