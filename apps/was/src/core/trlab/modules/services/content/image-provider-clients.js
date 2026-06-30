export const DEFAULT_CARD_IMAGE_SIZE = '1024x1536';

export async function tryGenerateRemoteImage(prompt, options = {}) {
  const errors = [];
  const availableProviders = providers(options.preferredProvider);
  if (!availableProviders.length) {
    errors.push('AI 이미지 provider가 설정되지 않았습니다. OPENAI_API_KEY, XAI_API_KEY, DEEPINFRA_API_KEY 또는 GEMINI_API_KEY를 설정하세요.');
    return { image: null, errors };
  }
  for (const provider of availableProviders) {
    try {
      return { image: await provider.call(prompt), errors };
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }
  return { image: null, errors };
}

function providers(preferredProvider = '') {
  const list = [
    process.env.XAI_API_KEY && { name: 'xai', call: (prompt) => generateXAI(prompt, process.env.XAI_API_KEY) },
    process.env.DEEPINFRA_API_KEY && { name: 'deepinfra', call: (prompt) => generateDeepInfra(prompt, process.env.DEEPINFRA_API_KEY) },
    process.env.OPENAI_API_KEY && { name: 'openai', call: (prompt) => generateOpenAI(prompt, process.env.OPENAI_API_KEY) },
    process.env.GEMINI_API_KEY && process.env.GEMINI_IMAGE_FALLBACK === '1' && { name: 'gemini', call: (prompt) => generateGemini(prompt, process.env.GEMINI_API_KEY) }
  ].filter(Boolean);
  if (!preferredProvider) return list;
  return [
    ...list.filter((provider) => provider.name === preferredProvider),
    ...list.filter((provider) => provider.name !== preferredProvider)
  ];
}

async function generateXAI(prompt, key) {
  const model = process.env.XAI_IMAGE_MODEL ?? 'grok-imagine-image-quality';
  const json = await postJson('https://api.x.ai/v1/images/generations', key, { model, prompt });
  const url = json.data?.[0]?.url ?? json.url;
  const buffer = await fetchUrlImage(url);
  if (!buffer) throw new Error('xAI 이미지 응답이 비어 있습니다.');
  return { provider: 'xai', model, buffer, ext: 'jpg' };
}

async function generateDeepInfra(prompt, key) {
  const body = { prompt, size: imageSizeFromEnv('IMAGE_SIZE'), n: 1, response_format: 'b64_json' };
  if (process.env.DEEPINFRA_IMAGE_MODEL) body.model = process.env.DEEPINFRA_IMAGE_MODEL;
  const json = await postJson('https://api.deepinfra.com/v1/openai/images/generations', key, body);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('DeepInfra 이미지 응답이 비어 있습니다.');
  return { provider: 'deepinfra', model: body.model ?? 'default-flux-schnell', buffer: Buffer.from(b64, 'base64'), ext: 'png' };
}

async function generateOpenAI(prompt, key) {
  const { model, json } = await requestOpenAIImage(key, prompt);
  const item = json.data?.[0];
  const buffer = item?.b64_json ? Buffer.from(item.b64_json, 'base64') : await fetchUrlImage(item?.url);
  if (!buffer) throw new Error('OpenAI 이미지 응답이 비어 있습니다.');
  return { provider: 'openai', model, buffer, ext: 'png' };
}

async function requestOpenAIImage(key, prompt) {
  const errors = [];
  for (const model of openAIModels()) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: imageSizeFromEnv('OPENAI_IMAGE_SIZE'), quality: process.env.OPENAI_IMAGE_QUALITY ?? 'medium', n: 1 }),
      signal: AbortSignal.timeout(120000)
    });
    if (response.ok) return { model, json: await response.json() };
    const message = await response.text();
    errors.push(`${model} ${response.status}: ${message}`);
    if (!(response.status === 403 || response.status === 404 || /model_not_found|does not have access/i.test(message))) break;
  }
  throw new Error(`OpenAI image failed: ${errors.join(' | ')}`);
}

async function generateGemini(prompt, key) {
  const model = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const json = await postJson(url, null, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['Image'] } });
  const part = json.candidates?.[0]?.content?.parts?.find((item) => item.inlineData || item.inline_data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) throw new Error('Gemini 이미지 응답이 비어 있습니다.');
  return { provider: 'gemini', model, buffer: Buffer.from(inline.data, 'base64'), ext: 'png' };
}

async function postJson(url, key, body) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers.authorization = `Bearer ${key}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}

async function fetchUrlImage(url) {
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`image download ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export function imageSizeFromEnv(envName) {
  return process.env[envName] ?? DEFAULT_CARD_IMAGE_SIZE;
}

export function openAIModels() {
  return [process.env.OPENAI_IMAGE_MODEL, 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'].filter(Boolean);
}
