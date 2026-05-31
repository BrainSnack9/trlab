import { useState } from 'react';
import { Download, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CardImageGenerator({ card, selected, style, studio, plan }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/content/image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ card, index: selected, style, studio, plan })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? `이미지 생성 실패: ${response.status}`);
      setImage(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-indigo-600" />AI 이미지 시안</div><p className="mt-1 text-xs text-muted-foreground">선택한 카드 1장을 인스타 정보 계정 스타일로 고급 렌더링합니다.</p></div>
      </div>
      <Button className="w-full" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {loading ? '이미지 생성 중' : 'AI 이미지 생성'}
      </Button>
      {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-600">{error}</p>}
      {image?.url && <GeneratedImage image={image} />}
    </div>
  );
}

function GeneratedImage({ image }) {
  return (
    <div className="mt-3 space-y-2">
      <img src={image.url} alt="AI generated card draft" className="aspect-square w-full rounded-md border bg-white object-cover" />
      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1"><a href={image.url} download><Download className="h-4 w-4" />이미지 저장</a></Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(image.prompt)}>프롬프트 복사</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{image.model} · 생성 이미지는 시안용입니다. 최종 텍스트는 SVG/PNG 출력본으로 교정하세요.</p>
    </div>
  );
}
