import { useEffect, useState } from 'react';
import { Copy, ImagePlus, Loader2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { generateContentImage, previewContentImagePrompt } from '@/core/TrLab/modules/clients/api';
import { CardTextOverlayEditor } from './CardTextOverlayEditor';

export function CardImageGenerator({ card, selected, style, studio, plan, generatedImage, generatedImageHistory = [], onGenerated, onSelectGenerated, cards = [], onSelectCard }) {
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

  async function generate(mode = 'fresh', imageSourceMode = '') {
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

  const image = generatedImage?.url ? generatedImage : blankCardImage(card, selected);
  const backgroundActions = {
    loading,
    promptLoading,
    prompt,
    customPrompt,
    setCustomPrompt,
    error,
    editInstruction,
    setEditInstruction,
    generateFresh: () => generate('fresh', 'pexels_first'),
    generateAi: () => generate('fresh', 'ai_only'),
    generateRevision: () => generate('revision', 'ai_only'),
    copyPrompt: () => navigator.clipboard?.writeText(customPrompt.trim() || prompt),
    setBackgroundImage: (nextImage) => onGenerated?.(nextImage),
    backgroundHistory: generatedImageHistory,
    selectBackgroundImage: (nextImage) => onSelectGenerated?.(nextImage)
  };

  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            선택 카드 제작실
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            빈 캔버스에서 배경, 제품 이미지, 텍스트 박스를 하나씩 쌓아가며 완성합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => backgroundActions.copyPrompt()} disabled={!(customPrompt.trim() || prompt) || promptLoading}>
            <Copy className="h-3.5 w-3.5" />
            추천 프롬프트 복사
          </Button>
          <Button size="sm" onClick={() => generate('fresh', 'ai_only')} disabled={loading || promptLoading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI 배경 생성
          </Button>
        </div>
      </div>

      {error ? <p className="mb-3 rounded-md bg-red-50 p-2 text-xs font-semibold leading-5 text-red-600">{error}</p> : null}
      <GeneratedImage
        image={image}
        card={card}
        selected={selected}
        cards={cards}
        onSelectCard={onSelectCard}
        style={style}
        studio={studio}
        backgroundActions={backgroundActions}
      />
    </div>
  );
}

function GeneratedImage({ image, card, selected, cards, onSelectCard, style, studio, backgroundActions }) {
  return (
      <div>
      <CardTextOverlayEditor
        image={image}
        card={card}
        style={style}
        studio={studio}
        backgroundActions={backgroundActions}
        startOpen
        draftScopeKey={`card:${card?.page ?? selected + 1}`}
        cardNavigation={{ cards, selected, onSelectCard }}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {image.provider ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">source: {image.provider}</span> : null}
        {card.visualBrief?.scenarioType ? <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700">{card.visualBrief.scenarioType}</span> : null}
      </div>
      {image.sourceImage ? (
        <div className="mt-2 rounded-md border bg-white p-2 text-xs font-semibold leading-5 text-slate-600">
          <b className="text-slate-800">소스 이미지</b>
          {image.sourceImage.photographer ? ` · ${image.sourceImage.photographer}` : ''}
          {image.sourceImage.url ? <a className="ml-1 font-black text-indigo-600" href={image.sourceImage.url} target="_blank" rel="noreferrer">Pexels 보기</a> : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(image.prompt)}>
          프롬프트 복사
        </Button>
      </div>
    </div>
  );
}

function blankCardImage(card = {}, selected = 0) {
  const page = card?.page ?? selected + 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<defs><pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="#e2e8f0" stroke-width="2"/></pattern></defs>
<rect width="1080" height="1350" fill="#f8fafc"/>
<rect width="1080" height="1350" fill="url(#grid)" opacity=".65"/>
<rect x="76" y="86" width="928" height="1162" rx="44" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" stroke-dasharray="18 16"/>
</svg>`;
  return {
    id: `blank-${page}`,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    prompt: card?.visualBrief?.backgroundPrompt || card?.visualPrompt || '',
    provider: 'blank-canvas',
    model: 'manual-workspace'
  };
}
