const MAKER_DRAFT_PREFIX = 'trlab.cardnews.maker.v1';

export const cardNewsMakerControllerHelpers = {
  makeMakerDraftKey(studio, plan) {
    const id = studio?.id || studio?.label || plan?.topic || 'draft';
    return `${MAKER_DRAFT_PREFIX}:${encodeURIComponent(`${id}`)}`;
  },

  loadMakerDraft(key) {
    if (typeof window === 'undefined') return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  },

  saveMakerDraft(key, draft) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        savedAt: new Date().toISOString(),
        selected: Number.isFinite(draft.selected) ? draft.selected : 0,
        styleKey: draft.styleKey,
        channelName: cardNewsMakerControllerHelpers.normalizeChannelName(draft.channelName),
        productionSettings: cardNewsMakerControllerHelpers.sanitizeProductionSettings(draft.productionSettings),
        generatedImages: draft.generatedImages ?? {},
        generatedImageHistory: draft.generatedImageHistory ?? {}
      }));
    } catch {
      // Ignore localStorage quota/private mode failures.
    }
  },

  sanitizeProductionSettings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.entries(value).reduce((result, [group, values]) => {
      const cleanValues = Array.isArray(values)
        ? values.map((item) => `${item ?? ''}`.trim()).filter(Boolean).slice(0, 16)
        : [];
      if (!cleanValues.length) return result;
      return { ...result, [`${group}`.trim()]: cleanValues };
    }, {});
  },

  cardImageKey(card, index) {
    return `${card?.page ?? index + 1}`;
  },

  sanitizeGeneratedImages(value, cards = []) {
    if (!value || typeof value !== 'object') return {};
    const allowed = new Set(cards.map((card, index) => cardNewsMakerControllerHelpers.cardImageKey(card, index)));
    const entries = Object.entries(value).filter(([key, image]) => {
      return (!allowed.size || allowed.has(key)) && image && typeof image === 'object' && typeof image.url === 'string';
    });
    return Object.fromEntries(entries);
  },

  sanitizeGeneratedImageHistory(value, currentImages = {}, cards = []) {
    const allowed = new Set(cards.map((card, index) => cardNewsMakerControllerHelpers.cardImageKey(card, index)));
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const key of allowed) {
      const items = Array.isArray(source[key]) ? source[key] : [];
      const current = currentImages?.[key];
      const history = current?.url ? cardNewsMakerControllerHelpers.addImageToHistory(items, current) : items;
      const cleaned = history.filter((image) => image && typeof image === 'object' && typeof image.url === 'string');
      if (cleaned.length) result[key] = cardNewsMakerControllerHelpers.dedupeImages(cleaned).slice(0, 12);
    }
    return result;
  },

  addImageToHistory(history = [], image) {
    if (!image?.url) return Array.isArray(history) ? history : [];
    return cardNewsMakerControllerHelpers.dedupeImages([image, ...(Array.isArray(history) ? history : [])]).slice(0, 12);
  },

  dedupeImages(images = []) {
    const seen = new Set();
    return images.filter((image) => {
      const key = image?.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  clampIndex(value, length) {
    if (!length) return 0;
    const number = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(length - 1, number));
  },

  normalizeChannelName(value) {
    const text = `${value ?? ''}`.trim();
    if (!text) return '@trlab.insight';
    return text.startsWith('@') ? text : `@${text}`;
  },

  copyText(value) {
    return navigator.clipboard?.writeText(`${value ?? ''}`);
  }
};
