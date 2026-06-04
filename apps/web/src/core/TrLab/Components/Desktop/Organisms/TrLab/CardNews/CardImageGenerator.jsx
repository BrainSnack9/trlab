import { useEffect, useState } from 'react';
import { Copy, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { generateContentImage, previewContentImagePrompt } from '@/core/TrLab/modules/clients/api';
import { CardTextOverlayEditor } from './CardTextOverlayEditor';

export function CardImageGenerator({ card, selected, style, studio, plan, generatedImage, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPrompt('');
    setError('');
    setEditInstruction('');
    setPromptLoading(true);
    previewContentImagePrompt({ card, index: selected, style, studio, plan })
      .then((data) => active && setPrompt(data.prompt ?? ''))
      .catch((err) => active && setError(err instanceof Error ? err.message : '프롬프트 미리보기 실패'))
      .finally(() => active && setPromptLoading(false));
    return () => { active = false; };
  }, [card, selected, style, studio, plan]);

  async function generate(mode = 'fresh') {
    setLoading(true);
    setError('');
    try {
      const data = await generateContentImage({
        card,
        index: selected,
        style,
        studio,
        plan,
        editInstruction: mode === 'revision' ? editInstruction : '',
        previousImagePrompt: mode === 'revision' ? generatedImage?.prompt : ''
      });
      onGenerated?.(data.image);
      if (data.image?.prompt) setPrompt(data.image.prompt);
      if (mode === 'revision') setEditInstruction('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            선택 카드 AI 이미지
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            이미지 모델은 글자 없는 배경만 만들고, 한글 문구는 아래 SVG 편집기에서 따로 얹습니다.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <details className="rounded-md border bg-white p-2 text-xs">
          <summary className="cursor-pointer font-black text-slate-700">전달 프롬프트 보기</summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
            {promptLoading ? '프롬프트 구성 중...' : prompt}
          </pre>
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => navigator.clipboard?.writeText(prompt)} disabled={!prompt || promptLoading}>
            <Copy className="h-3.5 w-3.5" />
            프롬프트 복사
          </Button>
        </details>

        <Button className="h-full min-h-20 w-full" onClick={() => generate('fresh')} disabled={loading || promptLoading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading ? '이미지 생성 중' : generatedImage?.url ? '새로 생성' : '이 카드 이미지 생성'}
        </Button>
      </div>

      {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-xs font-semibold leading-5 text-red-600">{error}</p>}
      {generatedImage?.url && (
        <>
          <div className="mt-3 grid gap-2 rounded-md border bg-white p-2">
            <label className="grid gap-1.5 text-xs font-black text-slate-700">
              수정 요청
              <textarea
                className="min-h-20 resize-y rounded-md border border-slate-200 p-2 text-xs font-semibold leading-5 outline-none focus:border-indigo-400"
                value={editInstruction}
                onChange={(event) => setEditInstruction(event.target.value)}
                placeholder="예: 배경을 더 밝게, 제품을 더 크게, 표 영역은 비워줘"
              />
            </label>
            <Button size="sm" onClick={() => generate('revision')} disabled={loading || promptLoading || !editInstruction.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              수정 반영 생성
            </Button>
          </div>
          <GeneratedImage
            image={generatedImage}
            card={card}
            style={style}
            studio={studio}
            backgroundActions={{
              loading,
              promptLoading,
              editInstruction,
              setEditInstruction,
              generateFresh: () => generate('fresh'),
              generateRevision: () => generate('revision')
            }}
          />
        </>
      )}
    </div>
  );
}

function GeneratedImage({ image, card, style, studio, backgroundActions }) {
  return (
    <div>
      <CardTextOverlayEditor image={image} card={card} style={style} studio={studio} backgroundActions={backgroundActions} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(image.prompt)}>
          프롬프트 복사
        </Button>
      </div>
    </div>
  );
}
