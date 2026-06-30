import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { CardTextOverlayEditor } from '../editor/CardTextOverlayEditor';

export function GeneratedImage({ image, card, selected, cards, onSelectCard, style, studio, backgroundActions, copyImagePrompt }) {
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
        <Button size="sm" variant="outline" className="flex-1" onClick={copyImagePrompt}>
          프롬프트 복사
        </Button>
      </div>
    </div>
  );
}
