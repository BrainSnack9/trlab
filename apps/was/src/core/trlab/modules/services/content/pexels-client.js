const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

export async function tryFetchPexelsCardImage(query, options = {}) {
  const key = process.env.PEXELS_API_KEY;
  const cleanedQuery = cleanPexelsQuery(query);
  if (!key || !cleanedQuery) return { image: null, errors: key ? ['Pexels 검색어가 비어 있습니다.'] : ['PEXELS_API_KEY가 설정되지 않았습니다.'] };
  try {
    const photo = await searchPexelsPhoto(cleanedQuery, { key, ...options });
    if (!photo?.src?.large2x && !photo?.src?.large && !photo?.src?.portrait) {
      return { image: null, errors: ['Pexels 이미지 결과가 비어 있습니다.'] };
    }
    const url = photo.src.large2x || photo.src.portrait || photo.src.large;
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Pexels image download ${response.status}`);
    return {
      image: {
        provider: 'pexels',
        model: 'pexels-search',
        buffer: Buffer.from(await response.arrayBuffer()),
        ext: 'jpg',
        source: normalizePexelsPhoto(photo, cleanedQuery, url)
      },
      errors: []
    };
  } catch (error) {
    return { image: null, errors: [`Pexels: ${error instanceof Error ? error.message : 'image fetch failed'}`] };
  }
}

export async function searchPexelsPhoto(query, { key = process.env.PEXELS_API_KEY, orientation = 'portrait', page = 1 } = {}) {
  const cleanedQuery = cleanPexelsQuery(query);
  if (!key || !cleanedQuery) return null;
  const url = new URL(PEXELS_SEARCH_URL);
  url.searchParams.set('query', cleanedQuery);
  url.searchParams.set('per_page', '8');
  url.searchParams.set('page', String(Math.max(1, Number(page) || 1)));
  if (orientation) url.searchParams.set('orientation', orientation);
  const response = await fetch(url, {
    headers: { authorization: key },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`search ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return choosePexelsPhoto(json.photos ?? []);
}

function choosePexelsPhoto(photos = []) {
  if (!photos.length) return null;
  const portrait = photos.find((photo) => Number(photo.height) >= Number(photo.width));
  return portrait ?? photos[0];
}

function normalizePexelsPhoto(photo, query, imageUrl) {
  return {
    id: photo.id,
    query,
    url: photo.url,
    imageUrl,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    avgColor: photo.avg_color,
    width: photo.width,
    height: photo.height,
    alt: photo.alt
  };
}

export function cleanPexelsQuery(value, max = 110) {
  return `${value ?? ''}`
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
