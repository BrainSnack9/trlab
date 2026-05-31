export async function searchExternalProviders(query) {
  const freshQuery = `${query} 최신`;
  const jobs = [
    process.env.BRAVE_API_KEY && searchBrave(freshQuery),
    process.env.TAVILY_API_KEY && searchTavily(freshQuery),
    process.env.EXA_API_KEY && searchExa(freshQuery)
  ].filter(Boolean);
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

async function searchBrave(query) {
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=KR&search_lang=ko&count=8&freshness=pm`, {
    headers: { accept: 'application/json', 'x-subscription-token': process.env.BRAVE_API_KEY },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Brave ${response.status}`);
  const json = await response.json();
  return [{
    source: 'Brave Search',
    status: 'ok',
    count: json.web?.results?.length ?? 0,
    results: (json.web?.results ?? []).map((item) => ({ title: item.title, url: item.url, snippet: item.description })).slice(0, 8)
  }];
}

async function searchTavily(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 8, search_depth: 'basic', include_answer: false, time_range: 'month' }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Tavily ${response.status}`);
  const json = await response.json();
  return [{
    source: 'Tavily',
    status: 'ok',
    count: json.results?.length ?? 0,
    results: (json.results ?? []).map((item) => ({ title: item.title, url: item.url, snippet: item.content })).slice(0, 8)
  }];
}

async function searchExa(query) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.EXA_API_KEY },
    body: JSON.stringify({ query, numResults: 8, useAutoprompt: true, startPublishedDate: recentIso() }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Exa ${response.status}`);
  const json = await response.json();
  return [{
    source: 'Exa',
    status: 'ok',
    count: json.results?.length ?? 0,
    results: (json.results ?? []).map((item) => ({ title: item.title, url: item.url, snippet: item.text })).slice(0, 8)
  }];
}

function recentIso() {
  return new Date(Date.now() - 45 * 86400000).toISOString();
}
