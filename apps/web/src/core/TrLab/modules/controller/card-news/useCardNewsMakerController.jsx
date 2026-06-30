import { useEffect, useMemo, useState } from 'react';
import { autoStyle, cardStyles } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/CardNews/lib/card-news-styles';
import { downloadCard, makeCarouselScript, makePostCopy } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/CardNews/lib/card-news-export';
import { cardNewsMakerControllerHelpers } from './cardNewsMakerController.helpers';

const {
  addImageToHistory,
  cardImageKey,
  clampIndex,
  copyText,
  loadMakerDraft,
  makeMakerDraftKey,
  normalizeChannelName,
  sanitizeProductionSettings,
  sanitizeGeneratedImageHistory,
  sanitizeGeneratedImages,
  saveMakerDraft
} = cardNewsMakerControllerHelpers;

export function useCardNewsMakerController({ studio, plan, initialProductionSettings }) {
  const draftKey = useMemo(() => makeMakerDraftKey(studio, plan), [studio, plan]);
  const [selected, setSelected] = useState(0);
  const [styleKey, setStyleKey] = useState(() => autoStyle(studio, plan));
  const [channelName, setChannelName] = useState(() => studio?.channelName || studio?.manualBrief?.channelName || '@trlab.insight');
  const [generatedImages, setGeneratedImages] = useState({});
  const [generatedImageHistory, setGeneratedImageHistory] = useState({});
  const [productionSettings, setProductionSettings] = useState({});
  const [loadedDraftKey, setLoadedDraftKey] = useState('');
  const cards = useMemo(() => (plan.cards ?? []).map((card, index) => ({ ...card, page: card.page ?? index + 1 })), [plan]);
  const safeSelected = clampIndex(selected, cards.length);
  const card = cards[safeSelected] ?? cards[0];
  const resolvedStyleKey = cardStyles[styleKey] ? styleKey : autoStyle(studio, plan);
  const style = cardStyles[resolvedStyleKey] ?? Object.values(cardStyles)[0];
  const displayStudio = useMemo(() => ({ ...studio, channelName: normalizeChannelName(channelName) }), [studio, channelName]);
  const currentImageKey = cardImageKey(card, safeSelected);
  const generatedImage = generatedImages[currentImageKey];
  const generatedImageHistoryForCard = generatedImageHistory[currentImageKey] ?? [];

  useEffect(() => {
    const draft = loadMakerDraft(draftKey);
    setSelected(clampIndex(draft.selected ?? 0, cards.length));
    setStyleKey(cardStyles[draft.styleKey] ? draft.styleKey : autoStyle(studio, plan));
    setChannelName(draft.channelName || studio?.channelName || studio?.manualBrief?.channelName || '@trlab.insight');
    setProductionSettings(sanitizeProductionSettings(Object.keys(draft.productionSettings ?? {}).length ? draft.productionSettings : initialProductionSettings));
    setGeneratedImages(sanitizeGeneratedImages(draft.generatedImages, cards));
    setGeneratedImageHistory(sanitizeGeneratedImageHistory(draft.generatedImageHistory, draft.generatedImages, cards));
    setLoadedDraftKey(draftKey);
  }, [draftKey, initialProductionSettings]);

  useEffect(() => {
    setSelected((value) => clampIndex(value, cards.length));
    setGeneratedImages((value) => sanitizeGeneratedImages(value, cards));
    setGeneratedImageHistory((value) => sanitizeGeneratedImageHistory(value, generatedImages, cards));
  }, [cards.length]);

  useEffect(() => {
    if (loadedDraftKey !== draftKey) return;
    saveMakerDraft(draftKey, {
      selected: safeSelected,
      styleKey: resolvedStyleKey,
      channelName: normalizeChannelName(channelName),
      productionSettings: sanitizeProductionSettings(productionSettings),
      generatedImages: sanitizeGeneratedImages(generatedImages, cards),
      generatedImageHistory: sanitizeGeneratedImageHistory(generatedImageHistory, generatedImages, cards)
    });
  }, [draftKey, loadedDraftKey, safeSelected, resolvedStyleKey, channelName, productionSettings, generatedImages, generatedImageHistory, cards]);

  function setCardGeneratedImage(nextImage) {
    const key = cardImageKey(card, safeSelected);
    setGeneratedImages((value) => ({ ...value, [key]: nextImage }));
    setGeneratedImageHistory((value) => ({
      ...value,
      [key]: addImageToHistory(value[key], nextImage)
    }));
  }

  function selectGeneratedImage(nextImage) {
    const key = cardImageKey(card, safeSelected);
    setGeneratedImages((value) => ({ ...value, [key]: nextImage }));
  }

  return {
    cards,
    selected: safeSelected,
    setSelected,
    card,
    styleKey: resolvedStyleKey,
    setStyleKey,
    style,
    channelName,
    setChannelName,
    productionSettings: sanitizeProductionSettings(productionSettings),
    setProductionSettings,
    studio: displayStudio,
    generatedImage,
    generatedImageHistory: generatedImageHistoryForCard,
    setGeneratedImage: setCardGeneratedImage,
    selectGeneratedImage,
    actions: {
      downloadCurrentCard: () => downloadCard(card, safeSelected, displayStudio, style, 'png'),
      copyCarouselScript: () => copyText(makeCarouselScript({ ...plan, cards })),
      copyPost: () => copyText(makePostCopy(plan)),
      copyText,
      makePostCopy: () => makePostCopy(plan)
    }
  };
}
