import { useMemo } from 'react';
import { useCardNewsMakerController } from '@/core/TrLab/modules/controller/card-news/useCardNewsMakerController';
import { CardWorkspace } from './components/CardWorkspace';
import { ControlPanel } from './components/ControlPanel';
import { InstatoonWorkflowBoard } from './components/InstatoonWorkflowBoard';
import { MakerHeader } from './components/MakerHeader';

export function CardNewsMaker({ studio, plan, work }) {
  const templateProduction = useMemo(() => resolveTemplateProduction({ work, studio, plan }), [work, studio, plan]);
  const maker = useCardNewsMakerController({ studio, plan, initialProductionSettings: templateProduction?.settings });
  const {
    cards,
    selected,
    setSelected,
    card,
    styleKey,
    setStyleKey,
    style,
    channelName,
    setChannelName,
    productionSettings,
    setProductionSettings,
    generatedImage,
    generatedImageHistory,
    setGeneratedImage,
    selectGeneratedImage,
    actions
  } = maker;

  if (!card) return null;
  return (
    <div className="space-y-5">
      <InstatoonWorkflowBoard studio={maker.studio} plan={plan} styleKey={styleKey} templateProduction={templateProduction} />
      <TemplateProductionGuide data={templateProduction} />
      <MakerHeader studio={maker.studio} plan={plan} cards={cards} selected={selected} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <CardWorkspace
          cards={cards}
          selected={selected}
          setSelected={setSelected}
          card={card}
          style={style}
          studio={maker.studio}
          plan={plan}
          generatedImage={generatedImage}
          generatedImageHistory={generatedImageHistory}
          setGeneratedImage={setGeneratedImage}
          selectGeneratedImage={selectGeneratedImage}
        />
        <ControlPanel
          card={card}
          styleKey={styleKey}
          setStyleKey={setStyleKey}
          studio={maker.studio}
          plan={plan}
          templateProduction={templateProduction}
          productionSettings={productionSettings}
          setProductionSettings={setProductionSettings}
          channelName={channelName}
          setChannelName={setChannelName}
          actions={actions}
        />
      </div>
    </div>
  );
}

function TemplateProductionGuide({ data }) {
  const controlGroups = data?.editorControls?.length ? data.editorControls : data?.production?.groups ?? [];
  const productionFlow = data?.productionFlow ?? [];
  const layoutSlots = data?.layoutSlots ?? [];
  const channelStrategy = data?.channelStrategy ?? [];
  const blueprint = data?.templateBlueprint ?? null;
  if (!controlGroups.length && !productionFlow.length && !data?.cardPlan?.length && !layoutSlots.length && !channelStrategy.length && !blueprint) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">템플릿 제작 기준</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{data.label || '선택 템플릿'}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{data.production?.nextStep || data.description || '템플릿 기준으로 카드별 배경, 이미지, 텍스트 배치를 맞춥니다.'}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-xs font-medium text-slate-600">
          {data.canvas ? <GuideMeta label="캔버스" value={data.canvas} /> : null}
          {data.formatSignal ? <GuideMeta label="유형" value={data.formatSignal} /> : null}
        </div>
      </div>

      {blueprint ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">{blueprint.format}</div>
              <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{blueprint.planningRule}</p>
            </div>
            {blueprint.idealCards ? <BadgeText>{blueprint.idealCards}</BadgeText> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(blueprint.productionChecklist ?? []).map((item) => <BadgeText key={item}>{item}</BadgeText>)}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {controlGroups.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">편집 컨트롤</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {controlGroups.map(([title, items]) => (
                <div key={title} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-800">{title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {productionFlow.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">다음 작업 순서</div>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-1">
              {productionFlow.map(([title, note], index) => (
                <div key={`${title}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-400">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{title}</div>
                    <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data.cardPlan?.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">컷별 배치 기준</div>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-1">
              {data.cardPlan.map(([title, note], index) => (
                <div key={`${title}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-400">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{title}</div>
                    <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {layoutSlots.length || channelStrategy.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {layoutSlots.length ? (
            <GuideList title="배치 슬롯" items={layoutSlots} />
          ) : null}
          {channelStrategy.length ? (
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">채널 전략</div>
              <div className="grid gap-1.5">
                {channelStrategy.map(([platform, items]) => (
                  <div key={platform} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-800">{platform}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(items ?? []).map((item) => (
                        <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {blueprint?.cardBlueprints?.length || blueprint?.platformExport?.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {blueprint.cardBlueprints?.length ? <GuideList title="카드 유형" items={blueprint.cardBlueprints.map(([title, note, items]) => [title, `${note}${Array.isArray(items) && items.length ? ` / ${items.join(', ')}` : ''}`])} /> : null}
          {blueprint.platformExport?.length ? (
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">출력 체크</div>
              <div className="grid gap-1.5">
                {blueprint.platformExport.map((item) => (
                  <div key={item.platform} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-800">{item.platform}</div>
                    <div className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{(item.ratios ?? []).join(' / ')}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(item.exportCheck ?? []).slice(0, 4).map((check) => <BadgeText key={check}>{check}</BadgeText>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function BadgeText({ children }) {
  return <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">{children}</span>;
}

function GuideList({ title, items }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-slate-500">{title}</div>
      <div className="grid gap-1.5">
        {items.map(([itemTitle, note]) => (
          <div key={itemTitle} className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-xs font-semibold text-slate-800">{itemTitle}</div>
            <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideMeta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 max-w-36 truncate text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function resolveTemplateProduction({ work, studio, plan }) {
  const template = work?.equippedItems?.template || studio?.contentSetup?.template || null;
  const planning = work?.planningDraft || studio?.planningDraft || plan?.contentSetup?.planningDraft || {};
  const production = planning.templateProduction || plan?.contentSetup?.templateProduction || studio?.contentSetup?.templateProduction || template?.production || null;
  const cardPlan = planning.templateCardPlan || plan?.contentSetup?.templateCardPlan || studio?.contentSetup?.templateCardPlan || template?.cardPlan || [];
  const editorControls = planning.templateEditorControls || plan?.contentSetup?.templateEditorControls || studio?.contentSetup?.templateEditorControls || template?.editorControls || [];
  const platformSpecs = planning.templatePlatformSpecs || plan?.contentSetup?.templatePlatformSpecs || studio?.contentSetup?.templatePlatformSpecs || template?.platformSpecs || [];
  const productionFlow = planning.templateProductionFlow || plan?.contentSetup?.templateProductionFlow || studio?.contentSetup?.templateProductionFlow || template?.productionFlow || [];
  const layoutSlots = planning.templateLayoutSlots || plan?.contentSetup?.templateLayoutSlots || studio?.contentSetup?.templateLayoutSlots || template?.layoutSlots || [];
  const channelStrategy = planning.templateChannelStrategy || plan?.contentSetup?.templateChannelStrategy || studio?.contentSetup?.templateChannelStrategy || template?.channelStrategy || [];
  const templateBlueprint = planning.templateBlueprint || plan?.contentSetup?.templateBlueprint || studio?.contentSetup?.templateBlueprint || template?.templateBlueprint || null;
  const settings = planning.templateSettings || plan?.contentSetup?.templateSettings || {};
  if (!template && !production && !cardPlan?.length && !editorControls?.length && !productionFlow?.length && !layoutSlots?.length && !channelStrategy?.length && !templateBlueprint) return null;
  return {
    id: template?.id || planning.templateId || '',
    label: template?.label || planning.templateLabel || '',
    description: template?.description || planning.goal || '',
    formatSignal: template?.formatSignal || planning.templateFormatSignal || '',
    canvas: template?.canvas || planning.templateCanvas || '',
    platformSpecs,
    production,
    cardPlan,
    editorControls,
    productionFlow,
    layoutSlots,
    channelStrategy,
    templateBlueprint,
    settings
  };
}
