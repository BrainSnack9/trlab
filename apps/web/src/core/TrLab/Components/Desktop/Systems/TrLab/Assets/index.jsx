'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Assets() {
  const { currentWork, assetLibrary, deleteAsset, updateCurrentWork, setView } = useTrLabWorkspace();
  const [imageDialog, setImageDialog] = useState(null);

  const workCharacters = currentWork?.planningDraft?.characterAssets ?? [];
  const libraryCharacters = assetLibrary?.characters ?? [];
  const workIds = new Set(workCharacters.map((asset) => asset.id));
  const reusableCharacters = libraryCharacters.filter((asset) => !workIds.has(asset.id));

  const addToCurrentWork = (asset) => {
    if (!asset?.url) return;
    updateCurrentWork((work) => {
      const planningDraft = work.planningDraft ?? {};
      const characterAssets = [asset, ...(planningDraft.characterAssets ?? []).filter((item) => item.id !== asset.id)].slice(0, 12);
      return {
        ...work,
        planningDraft: {
          ...planningDraft,
          characterAssets,
          selectedCharacterId: asset.id
        }
      };
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">에셋</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{libraryCharacters.length}개 저장됨</p>
        </div>
        {currentWork ? <Button variant="outline" onClick={() => setView('planning')}>캐릭터 만들기</Button> : null}
      </header>

      {currentWork ? (
        <AssetSection
          title="현재 작업물"
          count={workCharacters.length}
          emptyText="현재 작업물에 연결된 캐릭터가 없습니다. 기획의 캐릭터 설정에서 생성하거나 저장소에서 추가하세요."
          assets={workCharacters}
          onOpen={setImageDialog}
        />
      ) : null}

      <AssetSection
        title="전체 저장소"
        count={libraryCharacters.length}
        emptyText="아직 저장된 캐릭터 에셋이 없습니다. 캐릭터를 생성하면 자동으로 여기에 저장됩니다."
        assets={currentWork ? reusableCharacters : libraryCharacters}
        onOpen={setImageDialog}
        onAdd={currentWork ? addToCurrentWork : null}
        onDelete={deleteAsset}
      />

      {imageDialog ? <AssetImageDialog image={imageDialog} onClose={() => setImageDialog(null)} /> : null}
    </div>
  );
}

function AssetSection({ title, count, emptyText, assets, onOpen, onAdd, onDelete }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <Badge variant="outline">{count}</Badge>
      </div>
      {assets.length ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <article key={asset.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <button type="button" className="aspect-[4/5] w-full overflow-hidden bg-white" onClick={() => onOpen(asset)} title={asset.name}>
                <img src={assetUrl(asset.url)} alt={asset.name} className="h-full w-full object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <div className="truncate text-xs font-semibold text-white">{asset.name}</div>
              </div>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                {onAdd ? (
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:text-indigo-700" onClick={() => onAdd(asset)} aria-label="현재 작업물에 추가">
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
                {onDelete ? (
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:text-red-600" onClick={() => onDelete(asset.id)} aria-label="에셋 삭제">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-medium leading-6 text-slate-500">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function AssetImageDialog({ image, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="grid max-h-[92vh] w-full max-w-4xl gap-3 rounded-lg bg-white p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{image.name || '이미지 에셋'}</h2>
            {image.sourceWorkTitle ? <p className="mt-1 truncate text-xs font-medium text-slate-500">{image.sourceWorkTitle}</p> : null}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="닫기">×</Button>
        </div>
        <div className="grid min-h-0 place-items-center overflow-auto rounded-lg bg-slate-100 p-3">
          <img src={assetUrl(image.url)} alt={image.name || '이미지 에셋'} className="max-h-[76vh] max-w-full rounded-lg object-contain shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function assetUrl(url = '') {
  if (!url || /^(data:|https?:\/\/)/.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
}
