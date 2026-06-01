import { useEffect, useState } from 'react';
import { Copy, Download, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { generateContentImage, previewContentImagePrompt } from '@/core/TrLab/modules/clients/api';

export function CardImageGenerator({ card, selected, style, studio, plan }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPrompt('');
    setError('');
    setPromptLoading(true);
    previewContentImagePrompt({ card, index: selected, style, studio, plan })
      .then((data) => active && setPrompt(data.prompt ?? ''))
      .catch((err) => active && setError(err instanceof Error ? err.message : '프롬프트 미리보기 실패'))
      .finally(() => active && setPromptLoading(false));
    return () => { active = false; };
  }, [card, selected, style, studio, plan]);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const data = await generateContentImage({ card, index: selected, style, studio, plan });
      setImage(data.image);
      if (data.image?.prompt) setPrompt(data.image.prompt);
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
            카드 {selected + 1}의 시각 배경을 이미지 모델에 요청하고, 한글 문구는 TrLab이 정확히 오버레이합니다.
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

        <Button className="h-full min-h-20 w-full" onClick={generate} disabled={loading || promptLoading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading ? '이미지 생성 중' : '이 카드 이미지 생성'}
        </Button>
      </div>

      {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-600">{error}</p>}
      {image?.url && <GeneratedImage image={image} />}
    </div>
  );
}

function GeneratedImage({ image }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveAsPng = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await downloadImageAsPng(image.url);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'PNG 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <img src={image.url} alt="Korean exact text card draft" className="aspect-[4/5] w-full rounded-md border bg-white object-cover" />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={saveAsPng} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          PNG 저장
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(image.prompt)}>
          프롬프트 복사
        </Button>
      </div>
      {saveError ? <p className="rounded-md bg-red-50 p-2 text-xs font-semibold text-red-600">{saveError}</p> : null}
      <p className="text-[11px] text-muted-foreground">{image.model} · 한글 텍스트는 TrLab SVG 렌더러가 직접 출력합니다.</p>
    </div>
  );
}

async function downloadImageAsPng(url) {
  if (!url) throw new Error('저장할 이미지가 없습니다.');
  const response = await fetch(url);
  if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.');
  const blob = await response.blob();
  const isSvg = blob.type.includes('svg') || url.toLowerCase().split('?')[0].endsWith('.svg');
  if (!isSvg) return downloadBlob(blob, filenameFromUrl(url, 'png'));

  const svg = await blob.text();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(svgUrl);
    const canvas = Object.assign(document.createElement('canvas'), { width: 1080, height: 1350 });
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG 변환에 실패했습니다.')), 'image/png');
    });
    downloadBlob(pngBlob, filenameFromUrl(url, 'png'));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지 렌더링에 실패했습니다.'));
    image.src = src;
  });
}

function filenameFromUrl(url, ext) {
  const raw = `${url}`.split('/').pop()?.split('?')[0] || 'cardnews';
  const name = raw.replace(/\.[a-z0-9]+$/i, '') || 'cardnews';
  return `${name}.${ext}`;
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
