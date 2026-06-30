import { Copy, Download, Images, Palette } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { cardStyles, styleRecommendation } from '../lib/card-news-styles';
import { PublishCopyPanel } from './PublishCopyPanel';
import { SelectedProductionBrief } from './SelectedProductionBrief';

export function ControlPanel({ card, styleKey, setStyleKey, studio, plan, templateProduction, productionSettings, setProductionSettings, channelName, setChannelName, actions }) {
  const recommendation = styleRecommendation(studio, plan);
  const recommendedKey = recommendation.key;
  const toggleProductionSetting = (group, item) => {
    setProductionSettings?.((current = {}) => {
      const values = Array.isArray(current[group]) ? current[group] : [];
      const nextValues = values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
      return {
        ...current,
        [group]: nextValues
      };
    });
  };
  return (
    <aside className="sticky top-4 h-fit rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Images className="h-5 w-5 text-slate-500" />
        <div>
          <h3 className="text-base font-semibold text-slate-950">출력 설정</h3>
          <p className="text-xs font-semibold text-slate-500">브랜드, 템플릿, 원고 복사</p>
        </div>
      </div>
      <div className="space-y-4">
        <TemplateProductionControls data={templateProduction} settings={productionSettings} onToggle={toggleProductionSetting} />
        <label className="grid gap-1.5 rounded-lg border bg-white p-3">
          <span className="text-xs font-semibold text-slate-500">채널명</span>
          <input
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
            value={channelName}
            onChange={(event) => setChannelName(event.target.value)}
            placeholder="@my_channel"
          />
          <span className="text-[11px] font-semibold text-muted-foreground">AI 이미지 하단 브랜드 표기에 사용됩니다.</span>
        </label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-600">추천 템플릿</div>
              <strong className="mt-1 block text-sm">{recommendation.style?.name}</strong>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600/80">{recommendation.reason}</p>
            </div>
            <Button size="sm" variant={styleKey === recommendedKey ? 'secondary' : 'default'} onClick={() => setStyleKey(recommendedKey)} disabled={styleKey === recommendedKey}>
              {styleKey === recommendedKey ? '적용됨' : '추천 적용'}
            </Button>
          </div>
        </div>
        <SelectedProductionBrief card={card} actions={actions} />
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4" />캔버스 템플릿</div>
          <div className="grid gap-2">
            {Object.entries(cardStyles).map(([key, item]) => (
              <Button key={key} variant={styleKey === key ? 'default' : 'outline'} className="h-auto justify-start p-3 text-left" onClick={() => setStyleKey(key)}>
                <span>
                  <b className="block">{item.name}{key === recommendedKey ? ' · 추천' : ''}</b>
                  <small className="text-xs opacity-75">{item.desc}</small>
                </span>
              </Button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={actions.downloadCurrentCard}><Download className="h-4 w-4" />현재 카드 PNG 다운로드</Button>
        <Button className="w-full" variant="outline" onClick={actions.copyCarouselScript}><Copy className="h-4 w-4" />전체 원고 복사</Button>
        <PublishCopyPanel plan={plan} actions={actions} />
      </div>
    </aside>
  );
}

function TemplateProductionControls({ data, settings = {}, onToggle }) {
  const groups = data?.editorControls?.length ? data.editorControls : data?.production?.groups ?? [];
  if (!groups.length) return null;
  const selectedCount = Object.values(settings ?? {}).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">편집 옵션</div>
          <h4 className="mt-1 truncate text-sm font-semibold text-slate-950">{data.label || '템플릿 기준'}</h4>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">{selectedCount}개 선택</span>
      </div>
      <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">{data.production?.nextStep || '카드 제작 전 필요한 기준을 고정합니다.'}</p>
      <div className="mt-3 grid gap-2">
        {groups.map(([group, items]) => (
          <div key={group} className="rounded-md bg-white p-2">
            <div className="text-[11px] font-semibold text-slate-500">{group}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <button key={item} type="button" className={productionChipClass(isSelected(settings, group, item))} onClick={() => onToggle?.(group, item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {data.cardPlan?.length ? (
        <div className="mt-3 rounded-md bg-white p-2">
          <div className="text-[11px] font-semibold text-slate-500">현재 카드 기준</div>
          <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">{cardPlanHint(data.cardPlan)}</div>
        </div>
      ) : null}
    </section>
  );
}

function isSelected(settings, group, item) {
  return Array.isArray(settings?.[group]) && settings[group].includes(item);
}

function productionChipClass(active) {
  return [
    'rounded-full px-2 py-1 text-[11px] font-bold transition',
    active ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
  ].join(' ');
}

function cardPlanHint(cardPlan = []) {
  return cardPlan.slice(0, 3).map(([title]) => title).join(' → ');
}
