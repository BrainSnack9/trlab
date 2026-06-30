import { Copy, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { useCardImageController } from '@/core/TrLab/modules/controller/card-news/useCardImageController';
import { GeneratedImage } from './components/GeneratedImage';

export function CardImageGenerator({ card, selected, style, studio, plan, generatedImage, generatedImageHistory = [], onGenerated, onSelectGenerated, cards = [], onSelectCard, assetLibrary }) {
  const {
    image,
    loading,
    promptLoading,
    customPrompt,
    error,
    backgroundActions,
    generateImage,
    copyPrompt,
    copyImagePrompt
  } = useCardImageController({
    card,
    selected,
    style,
    studio,
    plan,
    generatedImage,
    generatedImageHistory,
    onGenerated,
    onSelectGenerated
  });

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
          <Button size="sm" variant="outline" onClick={copyPrompt} disabled={!customPrompt.trim() || promptLoading}>
            <Copy className="h-3.5 w-3.5" />
            추천 프롬프트 복사
          </Button>
          <Button size="sm" onClick={() => generateImage({ mode: 'fresh', imageSourceMode: 'ai_only' })} disabled={loading || promptLoading}>
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
        copyImagePrompt={copyImagePrompt}
        assetLibrary={assetLibrary}
      />
    </div>
  );
}
