import { useState } from 'react';
import { Download, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { generateContentImage } from '@/core/TrLab/modules/clients/api';

export function CardImageGenerator({ card, selected, style, studio, plan }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const data = await generateContentImage({ card, index: selected, style, studio, plan });
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
        <div><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-indigo-600" />한글 고정 이미지</div><p className="mt-1 text-xs text-muted-foreground">선택한 카드 1장을 한글이 깨지지 않는 SVG 이미지로 렌더링합니다.</p></div>
      </div>
      <Button className="w-full" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {loading ? '이미지 생성 중' : '한글 이미지 생성'}
      </Button>
      {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-600">{error}</p>}
      {image?.url && <GeneratedImage image={image} />}
    </div>
  );
}

function GeneratedImage({ image }) {
  return (
    <div className="mt-3 space-y-2">
      <img src={image.url} alt="Korean exact text card draft" className="aspect-[4/5] w-full rounded-md border bg-white object-cover" />
      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1"><a href={image.url} download><Download className="h-4 w-4" />이미지 저장</a></Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(image.prompt)}>프롬프트 복사</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{image.model} · 한글 텍스트는 TrLab SVG 렌더러가 직접 출력합니다.</p>
    </div>
  );
}
