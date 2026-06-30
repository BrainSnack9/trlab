import { useEffect, useState } from 'react';
import { generateContentImage, previewContentImagePrompt } from '@/core/TrLab/modules/clients/api';
import { cardImageControllerHelpers } from './cardImageController.helpers';

export function useCardImageController({
  card,
  selected,
  style,
  studio,
  plan,
  generatedImage,
  generatedImageHistory = [],
  onGenerated,
  onSelectGenerated
}) {
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPrompt('');
    setCustomPrompt('');
    setError('');
    setEditInstruction('');
    setPromptLoading(true);
    previewContentImagePrompt({ card, index: selected, style, studio, plan })
      .then((data) => {
        if (!active) return;
        setPrompt(data.prompt ?? '');
        setCustomPrompt(data.prompt ?? '');
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : '프롬프트 미리보기 실패'))
      .finally(() => active && setPromptLoading(false));
    return () => { active = false; };
  }, [card, selected, style, studio, plan]);

  async function generateImage({ mode = 'fresh', imageSourceMode = '' } = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await generateContentImage({
        card: imageSourceMode ? { ...card, imageSourceMode } : card,
        index: selected,
        style,
        studio,
        plan,
        customImagePrompt: customPrompt.trim() || prompt,
        editInstruction: mode === 'revision' ? editInstruction : '',
        previousImagePrompt: mode === 'revision' ? generatedImage?.prompt : ''
      });
      onGenerated?.(data.image);
      if (data.image?.prompt) {
        setPrompt(data.image.prompt);
        setCustomPrompt(data.image.prompt);
      }
      if (mode === 'revision') setEditInstruction('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성 실패');
    } finally {
      setLoading(false);
    }
  }

  const image = generatedImage?.url ? generatedImage : cardImageControllerHelpers.makeBlankCardImage(card, selected);
  const copyPrompt = () => cardImageControllerHelpers.copyText(customPrompt.trim() || prompt);

  return {
    image,
    loading,
    promptLoading,
    prompt,
    customPrompt,
    setCustomPrompt,
    error,
    editInstruction,
    setEditInstruction,
    generateImage,
    backgroundActions: {
      loading,
      promptLoading,
      prompt,
      customPrompt,
      setCustomPrompt,
      error,
      editInstruction,
      setEditInstruction,
      generateFresh: () => generateImage({ mode: 'fresh', imageSourceMode: 'pexels_first' }),
      generateAi: () => generateImage({ mode: 'fresh', imageSourceMode: 'ai_only' }),
      generateRevision: () => generateImage({ mode: 'revision', imageSourceMode: 'ai_only' }),
      copyPrompt,
      setBackgroundImage: (nextImage) => onGenerated?.(nextImage),
      backgroundHistory: generatedImageHistory,
      selectBackgroundImage: (nextImage) => onSelectGenerated?.(nextImage)
    },
    copyPrompt,
    copyImagePrompt: () => cardImageControllerHelpers.copyText(image.prompt)
  };
}
