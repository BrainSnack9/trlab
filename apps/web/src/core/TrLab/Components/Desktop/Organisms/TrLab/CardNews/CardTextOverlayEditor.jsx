import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Download, ImagePlus, Layers, Loader2, MousePointer2, PenLine, Plus, RotateCcw, Sparkles, Trash2, Type, X } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { formatCardText } from '@/lib/card-text';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const FONT_FAMILY = 'Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif';
const colorSwatches = ['#ffffff', '#0f172a', '#ef4444', '#2563eb', '#16a34a', '#f59e0b'];
const boxSwatches = ['#000000', '#ffffff', '#0f172a', '#facc15', '#ef4444', '#2563eb'];
const frameSwatches = ['#000000', '#ffffff', '#09090b', '#facc15', '#e5e7eb', '#2563eb'];
const darkButtonClass = 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-white';
const lightButtonClass = 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700 hover:text-white';
const darkPanelClass = 'rounded-md border border-slate-700 bg-slate-900/85 p-2 text-slate-100 shadow-sm';
const darkNestedPanelClass = 'rounded border border-slate-700 bg-slate-950/70 p-2';
const darkInputClass = 'rounded border border-slate-700 bg-slate-950 px-2 font-bold text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400';
const darkTextareaClass = 'rounded border border-slate-700 bg-slate-950 p-2 font-bold text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400';
const darkLabelClass = 'grid gap-1 text-[11px] font-black text-slate-300';
const darkSummaryClass = 'cursor-pointer text-xs font-black text-slate-100';
const SEGMENT_COLORS = ['accent', 'sub', 'green'];
const segmentColorValue = {
  accent: (overlay) => overlay.accent,
  sub: (overlay) => overlay.sub,
  green: () => '#22c55e'
};

export function CardTextOverlayEditor({ image, card, style, studio, backgroundActions }) {
  const draftKey = useMemo(() => `overlay:${image?.id || image?.url || ''}:${card?.page || 1}`, [image?.id, image?.url, card?.page]);
  const dataDraftKey = useMemo(() => `data:${image?.id || image?.url || ''}:${card?.page || 1}`, [image?.id, image?.url, card?.page]);
  const frameDraftKey = useMemo(() => `frame:${image?.id || image?.url || ''}:${card?.page || 1}`, [image?.id, image?.url, card?.page]);
  const shapeDraftKey = useMemo(() => `shape:${image?.id || image?.url || ''}:${card?.page || 1}`, [image?.id, image?.url, card?.page]);
  const [layers, setLayers] = useState(() => initialTextLayers(draftKey, card, style, studio));
  const [dataOverlay, setDataOverlay] = useState(() => initialDataOverlay(dataDraftKey, card, style));
  const [frame, setFrame] = useState(() => initialFrameSettings(frameDraftKey, card));
  const [shapes, setShapes] = useState(() => initialShapeLayers(shapeDraftKey));
  const [selectedId, setSelectedId] = useState('');
  const [selectedShapeId, setSelectedShapeId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    const nextLayers = initialTextLayers(draftKey, card, style, studio);
    const nextDataOverlay = initialDataOverlay(dataDraftKey, card, style);
    const nextFrame = initialFrameSettings(frameDraftKey, card);
    const nextShapes = initialShapeLayers(shapeDraftKey);
    setLayers(nextLayers);
    setDataOverlay(nextDataOverlay);
    setFrame(nextFrame);
    setShapes(nextShapes);
    setSelectedId(nextLayers[0]?.id ?? '');
    setSelectedShapeId('');
    setEditingId('');
    setFinalUrl('');
    setError('');
    let active = true;
    if (image?.url) {
      setBusy(true);
      composeFinalImage(image.url, nextLayers, nextDataOverlay, nextFrame, nextShapes)
        .then((url) => active && setFinalUrl(url))
        .catch((err) => active && setError(err instanceof Error ? err.message : '자동 합성에 실패했습니다.'))
        .finally(() => active && setBusy(false));
    }
    return () => { active = false; };
  }, [draftKey, dataDraftKey, frameDraftKey, shapeDraftKey, card, style, studio, image?.url]);

  useEffect(() => {
    saveLayerDraft(draftKey, layers);
  }, [draftKey, layers]);

  useEffect(() => {
    saveDataOverlayDraft(dataDraftKey, dataOverlay);
  }, [dataDraftKey, dataOverlay]);

  useEffect(() => {
    saveFrameDraft(frameDraftKey, frame);
  }, [frameDraftKey, frame]);

  useEffect(() => {
    saveShapeDraft(shapeDraftKey, shapes);
  }, [shapeDraftKey, shapes]);

  useEffect(() => {
    if (!editingId) return;
    window.requestAnimationFrame(() => editRef.current?.focus());
  }, [editingId]);

  const selectedLayer = selectedId ? layers.find((layer) => layer.id === selectedId) || null : null;
  const editingLayer = layers.find((layer) => layer.id === editingId) || selectedLayer;
  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId) || null;

  function selectTextLayer(id, edit = false) {
    setSelectedId(id);
    setSelectedShapeId('');
    if (edit) setEditingId(id);
  }

  function selectShapeLayer(id) {
    setSelectedShapeId(id);
    setSelectedId('');
    setEditingId('');
  }

  function patchLayer(id, patch) {
    setLayers((value) => value.map((layer) => layer.id === id ? clampTextLayerPosition({ ...layer, ...patch }) : layer));
    setFinalUrl('');
  }

  function beginDrag(event, layer) {
    event.preventDefault();
    const point = svgPoint(event, svgRef.current);
    dragRef.current = { type: 'text', id: layer.id, x: point.x, y: point.y, layerX: layer.x, layerY: layer.y };
    selectTextLayer(layer.id);
  }

  function beginShapeDrag(event, shape) {
    event.preventDefault();
    event.stopPropagation();
    const point = svgPoint(event, svgRef.current);
    dragRef.current = { type: 'shape', id: shape.id, x: point.x, y: point.y, layerX: shape.x, layerY: shape.y };
    selectShapeLayer(shape.id);
  }

  function beginDataDrag(event) {
    if (!dataOverlay) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId('');
    setSelectedShapeId('');
    setEditingId('');
    const point = svgPoint(event, svgRef.current);
    dragRef.current = { type: 'data', id: 'data-overlay', x: point.x, y: point.y, layerX: dataOverlay.x, layerY: dataOverlay.y };
  }

  function dragMove(event) {
    if (!dragRef.current) return;
    event.preventDefault();
    const point = svgPoint(event, svgRef.current);
    const drag = dragRef.current;
    const patch = {
      x: clamp(drag.layerX + point.x - drag.x, 0, CANVAS_WIDTH),
      y: clamp(drag.layerY + point.y - drag.y, 0, CANVAS_HEIGHT)
    };
    if (drag.type === 'data') patchDataOverlay(clampDataOverlayPosition(dataOverlay, patch.x, patch.y));
    else if (drag.type === 'shape') patchShape(drag.id, patch);
    else patchLayer(drag.id, patch);
  }

  function endDrag() {
    dragRef.current = null;
  }

  function addTextLayer() {
    const layer = {
      id: `text-${Date.now()}`,
      text: '새 문구',
      x: 540,
      y: 640,
      fontSize: 42,
      lineHeight: 1.18,
      color: style?.ink || '#0f172a',
      weight: 900,
      align: 'center',
      ...defaultBoxStyle(false)
    };
    setLayers((value) => [...value, clampTextLayerPosition(layer)]);
    selectTextLayer(layer.id, true);
    setEditingId(layer.id);
    setFinalUrl('');
  }

  function removeSelected() {
    if (!selectedLayer || layers.length <= 1) return;
    const nextLayers = removeTextLayer(layers, selectedLayer.id);
    setLayers(nextLayers);
    setSelectedId(nextLayers[0]?.id ?? '');
    setSelectedShapeId('');
    setEditingId('');
    setFinalUrl('');
  }

  function duplicateSelected() {
    if (!selectedLayer) return;
    const nextLayers = duplicateTextLayer(layers, selectedLayer.id, Date.now());
    setLayers(nextLayers);
    const copy = nextLayers.find((layer) => layer.id.startsWith(`${selectedLayer.id}-copy-`));
    setSelectedId(copy?.id ?? selectedLayer.id);
    setSelectedShapeId('');
    setEditingId(copy?.id ?? '');
    setFinalUrl('');
  }

  function duplicateSelectedShape() {
    if (!selectedShape) return;
    const nextShapes = duplicateShapeLayer(shapes, selectedShape.id, Date.now());
    setShapes(nextShapes);
    const copy = nextShapes.find((shape) => shape.id.startsWith(`${selectedShape.id}-copy-`));
    setSelectedShapeId(copy?.id ?? selectedShape.id);
    setSelectedId('');
    setEditingId('');
    setFinalUrl('');
  }

  function duplicateSelection() {
    if (selectedShapeId) duplicateSelectedShape();
    else duplicateSelected();
  }

  function deleteSelection() {
    if (selectedShapeId) removeSelectedShape();
    else removeSelected();
  }

  function nudgeSelection(dx, dy) {
    if (selectedShapeId) {
      setShapes((value) => nudgeShapeLayer(value, selectedShapeId, dx, dy));
      setFinalUrl('');
      return;
    }
    if (!selectedId) return;
    setLayers((value) => nudgeTextLayer(value, selectedId, dx, dy));
    setFinalUrl('');
  }

  function moveSelected(direction) {
    if (!selectedLayer) return;
    setLayers((value) => moveTextLayer(value, selectedLayer.id, direction));
    setFinalUrl('');
  }

  function resetLayers() {
    const nextLayers = defaultTextLayers(card, style, studio);
    setLayers(nextLayers);
    setSelectedId(nextLayers[0]?.id ?? '');
    setSelectedShapeId('');
    setEditingId('');
    setFinalUrl('');
  }

  function resetDataOverlay() {
    setDataOverlay(defaultDataOverlay(card, style));
    setFinalUrl('');
  }

  function patchDataOverlay(patch) {
    setDataOverlay((value) => value ? { ...value, ...patch } : value);
    setFinalUrl('');
  }

  function nudgeDataOverlay(dx, dy) {
    setDataOverlay((value) => value ? { ...value, ...clampDataOverlayPosition(value, value.x + dx, value.y + dy) } : value);
    setFinalUrl('');
  }

  function patchDataItem(index, patch) {
    setDataOverlay((value) => value ? {
      ...value,
      items: (value.items ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    } : value);
    setFinalUrl('');
  }

  function patchDataRow(rowIndex, cellIndex, nextCell) {
    setDataOverlay((value) => value ? {
      ...value,
      rows: (value.rows ?? []).map((row, index) => index === rowIndex
        ? row.map((cell, innerIndex) => innerIndex === cellIndex ? nextCell : cell)
        : row)
    } : value);
    setFinalUrl('');
  }

  function patchDataColumn(columnIndex, nextColumn) {
    setDataOverlay((value) => value ? {
      ...value,
      columns: (value.columns ?? []).map((column, index) => index === columnIndex ? nextColumn : column)
    } : value);
    setFinalUrl('');
  }

  function addDataItem() {
    setDataOverlay((value) => value ? addDataOverlayItem(value) : value);
    setFinalUrl('');
  }

  function removeDataItem(index) {
    setDataOverlay((value) => value ? removeDataOverlayItem(value, index) : value);
    setFinalUrl('');
  }

  function addDataRow() {
    setDataOverlay((value) => value ? addDataOverlayRow(value) : value);
    setFinalUrl('');
  }

  function removeDataRow(index) {
    setDataOverlay((value) => value ? removeDataOverlayRow(value, index) : value);
    setFinalUrl('');
  }

  function patchFrame(patch) {
    setFrame((value) => ({ ...value, ...patch }));
    setFinalUrl('');
  }

  function addShape(type) {
    const shape = defaultShapeLayer(type, style, Date.now());
    setShapes((value) => [...value, shape]);
    selectShapeLayer(shape.id);
    setFinalUrl('');
  }

  function patchShape(id, patch) {
    setShapes((value) => value.map((shape) => shape.id === id ? clampShapeLayer({ ...shape, ...patch }) : shape));
    setFinalUrl('');
  }

  function removeSelectedShape() {
    if (!selectedShape) return;
    const nextShapes = shapes.filter((shape) => shape.id !== selectedShape.id);
    setShapes(nextShapes);
    setSelectedShapeId(nextShapes[0]?.id ?? '');
    setSelectedId('');
    setEditingId('');
    setFinalUrl('');
  }

  function resetShapes() {
    setShapes([]);
    setSelectedShapeId('');
    setFinalUrl('');
  }

  function resetFrame() {
    setFrame(defaultFrameSettings(card));
    setFinalUrl('');
  }

  async function confirmComposite() {
    setBusy(true);
    setError('');
    try {
      const url = await composeFinalImage(image.url, layers, dataOverlay, frame, shapes);
      setFinalUrl(url);
      setEditorOpen(false);
      setEditingId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 합성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function saveFinal() {
    setBusy(true);
    setError('');
    try {
      const url = finalUrl || await composeFinalImage(image.url, layers, dataOverlay, frame, shapes);
      downloadUrl(url, filenameFromUrl(image.url, 'png'));
      if (!finalUrl) setFinalUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!editorOpen) return undefined;
    function onKeyDown(event) {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setEditorOpen(false);
        setEditingId('');
        return;
      }
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const command = event.metaKey || event.ctrlKey;
      if (command && key === 's') {
        event.preventDefault();
        if (!busy) saveFinal();
        return;
      }
      if (command && event.key === 'Enter') {
        event.preventDefault();
        if (!busy) confirmComposite();
        return;
      }
      if (command && key === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
        return;
      }
      const nudge = event.shiftKey ? 10 : event.altKey ? 40 : 1;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nudgeSelection(-nudge, 0);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeSelection(nudge, 0);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        nudgeSelection(0, -nudge);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nudgeSelection(0, nudge);
        return;
      }
      if (command || event.altKey) return;
      if (key === 't') {
        event.preventDefault();
        addTextLayer();
      } else if (key === 'r') {
        event.preventDefault();
        addShape('rect');
      } else if (key === 'h') {
        event.preventDefault();
        addShape('highlight');
      } else if (key === 'o') {
        event.preventDefault();
        addShape('circle');
      } else if (key === 'l') {
        event.preventDefault();
        addShape('line');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorOpen, busy, selectedId, selectedShapeId, layers, shapes, dataOverlay, frame, finalUrl, image?.url]);

  const canDeleteSelection = Boolean(selectedShapeId || (selectedId && layers.length > 1));
  const canDuplicateSelection = Boolean(selectedShapeId || selectedId);

  if (!editorOpen) {
    return (
      <div className="mt-3 space-y-2 rounded-lg border bg-white p-3">
        <img src={finalUrl || image.url} alt="확정된 카드뉴스 이미지" className="aspect-[4/5] w-full rounded-md border bg-white object-cover" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className={`flex-1 ${lightButtonClass}`} onClick={() => setEditorOpen(true)}>
            <PenLine className="h-4 w-4" />
            편집 열기
          </Button>
          <Button size="sm" className="flex-1" onClick={saveFinal} disabled={busy}>
            <Download className="h-4 w-4" />
            PNG 저장
          </Button>
        </div>
        {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-semibold text-red-600">{error}</p> : null}
        <p className="text-[11px] text-muted-foreground">
          {image.model} · {busy ? '검증 데이터와 한글 문구를 합성하고 있습니다.' : '편집 열기를 누르면 포토샵/Figma처럼 별도 작업 화면에서 수정합니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 p-3 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="SVG 카드 편집 스튜디오" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300">
              <MousePointer2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-black">카드 편집</div>
              <div className="text-[11px] font-semibold text-slate-400">캔버스에서 선택하고, 오른쪽에서 필요한 속성만 조정합니다.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className={darkButtonClass} onClick={saveFinal} disabled={busy}>
              <Download className="h-4 w-4" />
              PNG 저장
            </Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={confirmComposite} disabled={busy}>
              <Type className="h-4 w-4" />
              확정
            </Button>
            <Button size="sm" variant="outline" className={darkButtonClass} onClick={() => setEditorOpen(false)}>
              <X className="h-4 w-4" />
              닫기
            </Button>
          </div>
        </div>

        <QuickToolbar
          addTextLayer={addTextLayer}
          addShape={addShape}
          duplicateSelection={duplicateSelection}
          deleteSelection={deleteSelection}
          canDeleteSelection={canDeleteSelection}
          canDuplicateSelection={canDuplicateSelection}
        />

        <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="trlab-dark-scrollbar min-h-0 overflow-y-auto overflow-x-hidden border-r border-slate-800 bg-slate-950 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-200">
              <Layers className="h-4 w-4 text-indigo-300" />
              레이어 목록
            </div>
            <LayerListControls
              layers={layers}
              selectedId={selectedId}
              selectTextLayer={selectTextLayer}
              setEditingId={setEditingId}
              duplicateSelected={duplicateSelected}
              moveSelected={moveSelected}
              resetLayers={resetLayers}
            />
            <div className="mt-3">
              <ShapeControls
                shapes={shapes}
                selectedShape={selectedShape}
                selectedShapeId={selectedShapeId}
                selectShapeLayer={selectShapeLayer}
                addShape={addShape}
                patchShape={patchShape}
                removeSelectedShape={removeSelectedShape}
                resetShapes={resetShapes}
              />
            </div>
            <ShortcutHelp />
          </aside>

          <main className="trlab-dark-scrollbar min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,#1e293b_0,#020617_46%,#000_100%)] p-5">
            <div className="mx-auto flex min-h-full max-w-[min(78vh,820px)] items-center justify-center">
              <div className="relative aspect-[4/5] max-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-md border border-slate-600 bg-slate-900 shadow-2xl shadow-black/50">
                <img src={image.url} alt="텍스트 없는 AI 배경" className="h-full w-full object-cover" draggable={false} />
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                  className="absolute inset-0 h-full w-full touch-none"
                  onPointerMove={dragMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                >
                  <SvgFrameOverlay frame={frame} />
                  <SvgShapeLayers shapes={shapes} selectedId={selectedShapeId} beginDrag={beginShapeDrag} />
                  <SvgDataOverlay overlay={dataOverlay} beginDrag={beginDataDrag} />
                  {layers.map((layer) => (
                    <g
                      key={layer.id}
                      transform={`translate(${layer.x} ${layer.y})`}
                      className="cursor-move"
                      onPointerDown={(event) => beginDrag(event, layer)}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        selectTextLayer(layer.id);
                        setEditingId(layer.id);
                      }}
                    >
                      {selectedId === layer.id ? <SelectionBox layer={layer} /> : null}
                      <SvgText layer={layer} />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </main>

          <aside className="trlab-dark-scrollbar min-h-0 overflow-y-auto border-l border-slate-800 bg-slate-950 p-3 text-slate-100">
            <div className="mb-3">
              <div className="text-xs font-black text-slate-100">속성</div>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">선택한 요소와 카드 전체 레이어를 조정합니다.</p>
            </div>
            <div className="space-y-3">
              {selectedLayer ? (
                <details className={`${darkPanelClass} border-indigo-500/40 bg-indigo-950/25`} open>
                  <summary className="cursor-pointer text-xs font-black text-indigo-200">선택 문구</summary>
                  <div className="mt-2 space-y-3">
              <label className="grid gap-1.5 text-xs font-black text-slate-300">
                문구 내용
                <textarea
                  ref={editingId === editingLayer?.id ? editRef : undefined}
                  className={`${darkTextareaClass} min-h-28 resize-y text-sm leading-5`}
                  value={editingLayer?.text ?? ''}
                  onFocus={() => setEditingId(editingLayer?.id ?? '')}
                  onChange={(event) => patchLayer(editingLayer.id, { text: event.target.value })}
                  placeholder="엔터로 줄바꿈"
                />
              </label>

              <div className={darkNestedPanelClass}>
                <span className="text-xs font-black text-slate-300">글자 색</span>
                <div className="flex flex-wrap gap-1.5">
                  {colorSwatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`${color} 색상 적용`}
                      className={`h-7 w-7 rounded-full border-2 ${selectedLayer.color === color ? 'border-indigo-500' : 'border-white'} shadow`}
                      style={{ background: color }}
                      onClick={() => patchLayer(selectedLayer.id, { color })}
                    />
                  ))}
                  <input
                    aria-label="직접 색상 선택"
                    type="color"
                    className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-slate-900"
                    value={selectedLayer.color}
                    onChange={(event) => patchLayer(selectedLayer.id, { color: event.target.value })}
                  />
                </div>
              </div>

              <div className={`grid gap-2 ${darkNestedPanelClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-300">자막 박스</span>
                  <Button
                    size="sm"
                    variant={hasTextBox(selectedLayer) ? 'outline' : 'default'}
                    className={hasTextBox(selectedLayer) ? lightButtonClass : undefined}
                    onClick={() => patchLayer(selectedLayer.id, hasTextBox(selectedLayer)
                      ? { backgroundOpacity: 0 }
                      : { ...defaultBoxStyle(true), color: selectedLayer.color === '#0f172a' ? '#ffffff' : selectedLayer.color })}
                  >
                    {hasTextBox(selectedLayer) ? '끄기' : '켜기'}
                  </Button>
                </div>
                {hasTextBox(selectedLayer) ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {boxSwatches.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`${color} 박스 색상 적용`}
                          className={`h-7 w-7 rounded-md border-2 ${selectedLayer.backgroundColor === color ? 'border-indigo-500' : 'border-white'} shadow`}
                          style={{ background: color }}
                          onClick={() => patchLayer(selectedLayer.id, { backgroundColor: color })}
                        />
                      ))}
                      <input
                        aria-label="직접 박스 색상 선택"
                        type="color"
                        className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-slate-900"
                        value={selectedLayer.backgroundColor || '#000000'}
                        onChange={(event) => patchLayer(selectedLayer.id, { backgroundColor: event.target.value })}
                      />
                    </div>
                    <label className={darkLabelClass}>
                      박스 불투명도 {Math.round((selectedLayer.backgroundOpacity ?? 0) * 100)}%
                      <input type="range" min="0.05" max="1" step="0.05" value={selectedLayer.backgroundOpacity ?? 0.55} onChange={(event) => patchLayer(selectedLayer.id, { backgroundOpacity: Number(event.target.value) })} />
                    </label>
                    <label className={darkLabelClass}>
                      안쪽 여백 {selectedLayer.paddingX ?? 26}px
                      <input type="range" min="4" max="64" value={selectedLayer.paddingX ?? 26} onChange={(event) => patchLayer(selectedLayer.id, { paddingX: Number(event.target.value), paddingY: Math.max(4, Math.round(Number(event.target.value) * 0.62)) })} />
                    </label>
                    <label className={darkLabelClass}>
                      모서리 {selectedLayer.radius ?? 16}px
                      <input type="range" min="0" max="48" value={selectedLayer.radius ?? 16} onChange={(event) => patchLayer(selectedLayer.id, { radius: Number(event.target.value) })} />
                    </label>
                  </>
                ) : null}
              </div>

              <label className="grid gap-1.5 text-xs font-black text-slate-300">
                글자 크기 {selectedLayer.fontSize}px
                <input type="range" min="18" max="110" value={selectedLayer.fontSize} onChange={(event) => patchLayer(selectedLayer.id, { fontSize: Number(event.target.value) })} />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-black text-slate-300">
                  X {Math.round(selectedLayer.x)}
                  <input type="range" min="24" max={CANVAS_WIDTH - 24} value={selectedLayer.x} onChange={(event) => patchLayer(selectedLayer.id, { x: Number(event.target.value) })} />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-300">
                  Y {Math.round(selectedLayer.y)}
                  <input type="range" min="24" max={CANVAS_HEIGHT - 24} value={selectedLayer.y} onChange={(event) => patchLayer(selectedLayer.id, { y: Number(event.target.value) })} />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-black text-slate-300">
                줄 간격 {selectedLayer.lineHeight.toFixed(2)}
                <input type="range" min="0.9" max="1.6" step="0.02" value={selectedLayer.lineHeight} onChange={(event) => patchLayer(selectedLayer.id, { lineHeight: Number(event.target.value) })} />
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {['start', 'middle', 'end'].map((align) => (
                  <Button key={align} size="sm" variant={selectedLayer.align === align ? 'default' : 'outline'} className={selectedLayer.align === align ? undefined : lightButtonClass} onClick={() => patchLayer(selectedLayer.id, { align })}>
                    {align === 'start' ? '좌' : align === 'middle' ? '중' : '우'}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[600, 700, 800, 900].map((weight) => (
                  <Button key={weight} size="sm" variant={Number(selectedLayer.weight) === weight ? 'default' : 'outline'} className={Number(selectedLayer.weight) === weight ? undefined : lightButtonClass} onClick={() => patchLayer(selectedLayer.id, { weight })}>
                    {weight}
                  </Button>
                ))}
              </div>

              <Button size="sm" variant="outline" className={`w-full ${lightButtonClass}`} onClick={removeSelected} disabled={layers.length <= 1}>
                <Trash2 className="h-4 w-4" />
                선택 문구 삭제
              </Button>
                  </div>
                </details>
              ) : null}
              {dataOverlay ? (
                <DataOverlayControls
                  overlay={dataOverlay}
                  patchOverlay={patchDataOverlay}
                  patchItem={patchDataItem}
                  patchRow={patchDataRow}
                  patchColumn={patchDataColumn}
                  addItem={addDataItem}
                  removeItem={removeDataItem}
                  addRow={addDataRow}
                  removeRow={removeDataRow}
                  nudgeOverlay={nudgeDataOverlay}
                  reset={resetDataOverlay}
                />
              ) : null}
              <BackgroundImageControls image={image} actions={backgroundActions} />
              <FrameControls frame={frame} patchFrame={patchFrame} reset={resetFrame} />
            </div>
          </aside>
        </div>
        {error ? <p className="shrink-0 border-t border-red-900/40 bg-red-950 px-4 py-2 text-xs font-semibold text-red-200">{error}</p> : null}
      </div>
    </div>
  );
}

function SvgText({ layer }) {
  const lines = `${layer.text ?? ''}`.split('\n');
  return (
    <>
      <LayerBox layer={layer} />
      <text
        fontFamily={FONT_FAMILY}
        fontSize={layer.fontSize}
        fontWeight={layer.weight}
        fill={layer.color}
        textAnchor={layer.align}
        paintOrder="stroke"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth={layer.color === '#ffffff' && !hasTextBox(layer) ? 8 : 0}
        strokeLinejoin="round"
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? 0 : layer.fontSize * layer.lineHeight}>
            {line || ' '}
          </tspan>
        ))}
      </text>
    </>
  );
}

function QuickToolbar({ addTextLayer, addShape, duplicateSelection, deleteSelection, canDeleteSelection, canDuplicateSelection }) {
  const toolClass = `h-8 px-2 text-[11px] font-black ${darkButtonClass}`;
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 text-white">
      <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 p-1">
        <span className="px-1 text-[11px] font-black text-slate-400">추가</span>
        <Button size="sm" variant="outline" className={toolClass} onClick={addTextLayer}>
          <Type className="h-3.5 w-3.5" />
          문구 <kbd className="rounded bg-slate-800 px-1 text-[10px]">T</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('rect')}>
          <Plus className="h-3.5 w-3.5" />
          박스 <kbd className="rounded bg-slate-800 px-1 text-[10px]">R</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('highlight')}>
          <Plus className="h-3.5 w-3.5" />
          강조 <kbd className="rounded bg-slate-800 px-1 text-[10px]">H</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('circle')}>
          <Plus className="h-3.5 w-3.5" />
          원 <kbd className="rounded bg-slate-800 px-1 text-[10px]">O</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('line')}>
          <Plus className="h-3.5 w-3.5" />
          선 <kbd className="rounded bg-slate-800 px-1 text-[10px]">L</kbd>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 p-1">
        <span className="px-1 text-[11px] font-black text-slate-400">선택</span>
        <Button size="sm" variant="outline" className={toolClass} onClick={duplicateSelection} disabled={!canDuplicateSelection}>
          <Copy className="h-3.5 w-3.5" />
          복제 <kbd className="rounded bg-slate-800 px-1 text-[10px]">⌘D</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={deleteSelection} disabled={!canDeleteSelection}>
          <Trash2 className="h-3.5 w-3.5" />
          삭제 <kbd className="rounded bg-slate-800 px-1 text-[10px]">Del</kbd>
        </Button>
      </div>
    </div>
  );
}

function ShortcutHelp() {
  const rows = [
    ['이동', '방향키'],
    ['크게 이동', 'Shift + 방향키'],
    ['아주 크게 이동', 'Option/Alt + 방향키'],
    ['복제', '⌘/Ctrl + D'],
    ['삭제', 'Delete'],
    ['문구 추가', 'T'],
    ['박스/강조/원/선', 'R / H / O / L'],
    ['PNG 저장', '⌘/Ctrl + S'],
    ['확정', '⌘/Ctrl + Enter'],
    ['닫기', 'Esc']
  ];
  return (
    <details className="mt-3 rounded-md border border-slate-700 bg-slate-950 p-2">
      <summary className="cursor-pointer text-xs font-black text-slate-200">단축키</summary>
      <div className="mt-2 grid gap-1">
        {rows.map(([label, key]) => (
          <div key={label} className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-bold text-slate-300">
            <span>{label}</span>
            <kbd className="shrink-0 rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-indigo-200">{key}</kbd>
          </div>
        ))}
      </div>
    </details>
  );
}

function LayerListControls({ layers, selectedId, selectTextLayer, setEditingId, duplicateSelected, moveSelected, resetLayers }) {
  return (
    <details className="min-w-0 rounded-md border border-slate-700 bg-slate-950 p-2" open>
      <summary className="cursor-pointer text-xs font-black text-slate-100">문구 레이어</summary>
      <div className="mt-2 space-y-2">
        <div className="grid min-w-0 gap-1.5">
          {layers.map((layer, index) => (
            <button
              key={layer.id}
              type="button"
              className={`flex min-h-9 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border px-2 py-1.5 text-left text-[11px] font-black hover:border-slate-600 hover:bg-slate-800 hover:text-white ${selectedId === layer.id ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-800 bg-slate-900 text-slate-200'}`}
              onClick={() => {
                selectTextLayer(layer.id, true);
                setEditingId(layer.id);
              }}
            >
              <span className="min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap">{index + 1}. {layerName(layer)}</span>
              <span className="shrink-0 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-slate-400">{Math.round(layer.x)}, {Math.round(layer.y)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => moveSelected(-1)}>
            <ArrowUp className="h-4 w-4" />
            위
          </Button>
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => moveSelected(1)}>
            <ArrowDown className="h-4 w-4" />
            아래
          </Button>
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={duplicateSelected}>
            <Copy className="h-4 w-4" />
            복제
          </Button>
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={resetLayers}>
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
        </div>
      </div>
    </details>
  );
}

function layerName(layer = {}) {
  const text = `${layer.text ?? ''}`.replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 42);
  return layer.id || '문구';
}

function BackgroundImageControls({ image, actions }) {
  if (!actions) return null;
  const loading = Boolean(actions.loading || actions.promptLoading);
  const canRevise = Boolean(actions.editInstruction?.trim()) && !loading;
  return (
    <details className={darkPanelClass}>
      <summary className={darkSummaryClass}>배경 이미지 · 새로 생성/수정</summary>
      <div className="mt-2 space-y-2">
        <p className="rounded border border-sky-500/20 bg-sky-950/25 p-2 text-[11px] font-bold leading-4 text-sky-200">
          글자와 표는 유지하고, 텍스트 없는 AI 배경만 다시 만들 수 있습니다.
        </p>
        <Button size="sm" variant="outline" className={`w-full ${lightButtonClass}`} onClick={actions.generateFresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          배경 새로 생성
        </Button>
        <label className={darkLabelClass}>
          배경 수정 요청
          <textarea
            className={`${darkTextareaClass} min-h-20 resize-y text-xs leading-5 focus:border-sky-400`}
            value={actions.editInstruction ?? ''}
            onChange={(event) => actions.setEditInstruction?.(event.target.value)}
            placeholder="예: 배경을 밝게, 제품을 더 크게, 표가 올라갈 중앙은 비워줘"
          />
        </label>
        <Button size="sm" className="w-full" onClick={actions.generateRevision} disabled={!canRevise}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          요청 반영 재생성
        </Button>
        <p className="text-[10px] font-semibold leading-4 text-slate-400">{image?.model || 'image'} · 재생성 후에도 SVG 문구와 데이터 레이어는 다시 합성됩니다.</p>
      </div>
    </details>
  );
}

function FrameControls({ frame, patchFrame, reset }) {
  return (
    <details className={darkPanelClass}>
      <summary className={darkSummaryClass}>배경/프레임 · 안전영역/테두리</summary>
      <div className="mt-2 space-y-2">
        <label className={darkLabelClass}>
          전체 어둡기 {Math.round((frame.shadeOpacity ?? 0) * 100)}%
          <input type="range" min="0" max="0.55" step="0.01" value={frame.shadeOpacity ?? 0} onChange={(event) => patchFrame({ shadeOpacity: Number(event.target.value) })} />
        </label>

        <div className={`grid gap-2 ${darkNestedPanelClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-300">자막 안전영역</span>
            <Button size="sm" variant={frame.safeAreaEnabled ? 'default' : 'outline'} className={frame.safeAreaEnabled ? undefined : lightButtonClass} onClick={() => patchFrame({ safeAreaEnabled: !frame.safeAreaEnabled })}>
              {frame.safeAreaEnabled ? '켜짐' : '꺼짐'}
            </Button>
          </div>
          {frame.safeAreaEnabled ? (
            <>
              <ColorPicker
                value={frame.safeAreaColor}
                colors={frameSwatches}
                label="안전영역 색"
                onChange={(color) => patchFrame({ safeAreaColor: color })}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className={darkLabelClass}>
                  X {Math.round(frame.safeAreaX)}
                  <input type="range" min="0" max="240" value={frame.safeAreaX} onChange={(event) => patchFrame({ safeAreaX: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  너비 {Math.round(frame.safeAreaWidth)}
                  <input type="range" min="360" max={CANVAS_WIDTH} value={frame.safeAreaWidth} onChange={(event) => patchFrame({ safeAreaWidth: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  Y {Math.round(frame.safeAreaY)}
                  <input type="range" min="650" max="1180" value={frame.safeAreaY} onChange={(event) => patchFrame({ safeAreaY: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  높이 {Math.round(frame.safeAreaHeight)}
                  <input type="range" min="80" max="420" value={frame.safeAreaHeight} onChange={(event) => patchFrame({ safeAreaHeight: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  불투명도 {Math.round((frame.safeAreaOpacity ?? 0) * 100)}%
                  <input type="range" min="0.05" max="0.95" step="0.01" value={frame.safeAreaOpacity ?? 0.28} onChange={(event) => patchFrame({ safeAreaOpacity: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  모서리 {Math.round(frame.safeAreaRadius)}
                  <input type="range" min="0" max="60" value={frame.safeAreaRadius} onChange={(event) => patchFrame({ safeAreaRadius: Number(event.target.value) })} />
                </label>
              </div>
            </>
          ) : null}
        </div>

        <div className={`grid gap-2 ${darkNestedPanelClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-300">테두리 프레임</span>
            <Button size="sm" variant={frame.frameEnabled ? 'default' : 'outline'} className={frame.frameEnabled ? undefined : lightButtonClass} onClick={() => patchFrame({ frameEnabled: !frame.frameEnabled, frameStrokeWidth: frame.frameStrokeWidth || 6 })}>
              {frame.frameEnabled ? '켜짐' : '꺼짐'}
            </Button>
          </div>
          {frame.frameEnabled ? (
            <>
              <ColorPicker
                value={frame.frameStrokeColor}
                colors={frameSwatches}
                label="프레임 색"
                onChange={(color) => patchFrame({ frameStrokeColor: color })}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className={darkLabelClass}>
                  두께 {Math.round(frame.frameStrokeWidth)}
                  <input type="range" min="2" max="28" value={frame.frameStrokeWidth} onChange={(event) => patchFrame({ frameStrokeWidth: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  안쪽 {Math.round(frame.frameInset)}
                  <input type="range" min="0" max="90" value={frame.frameInset} onChange={(event) => patchFrame({ frameInset: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  불투명도 {Math.round((frame.frameOpacity ?? 0) * 100)}%
                  <input type="range" min="0.05" max="1" step="0.01" value={frame.frameOpacity ?? 0.7} onChange={(event) => patchFrame({ frameOpacity: Number(event.target.value) })} />
                </label>
                <label className={darkLabelClass}>
                  모서리 {Math.round(frame.frameRadius)}
                  <input type="range" min="0" max="80" value={frame.frameRadius} onChange={(event) => patchFrame({ frameRadius: Number(event.target.value) })} />
                </label>
              </div>
            </>
          ) : null}
        </div>

        <Button size="sm" variant="outline" className={`w-full ${lightButtonClass}`} onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          배경/프레임 초기화
        </Button>
      </div>
    </details>
  );
}

function ColorPicker({ value, colors, label, onChange }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-black text-slate-300">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 적용`}
            className={`h-7 w-7 rounded-md border-2 ${value === color ? 'border-indigo-500' : 'border-white'} shadow`}
            style={{ background: color }}
            onClick={() => onChange(color)}
          />
        ))}
        <input
          aria-label={`${label} 직접 선택`}
          type="color"
          className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-slate-900"
          value={value || '#000000'}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function ShapeControls({ shapes, selectedShape, selectedShapeId, selectShapeLayer, addShape, patchShape, removeSelectedShape, resetShapes }) {
  return (
    <details className={darkPanelClass} open={Boolean(selectedShape || shapes.length)}>
      <summary className={darkSummaryClass}>도형 레이어 · 박스/강조/원/선</summary>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          <Button size="sm" variant="outline" className={`px-2 text-[11px] ${lightButtonClass}`} onClick={() => addShape('rect')}>
            <Plus className="h-3.5 w-3.5" />
            박스
          </Button>
          <Button size="sm" variant="outline" className={`px-2 text-[11px] ${lightButtonClass}`} onClick={() => addShape('highlight')}>
            <Plus className="h-3.5 w-3.5" />
            강조
          </Button>
          <Button size="sm" variant="outline" className={`px-2 text-[11px] ${lightButtonClass}`} onClick={() => addShape('circle')}>
            <Plus className="h-3.5 w-3.5" />
            원
          </Button>
          <Button size="sm" variant="outline" className={`px-2 text-[11px] ${lightButtonClass}`} onClick={() => addShape('line')}>
            <Plus className="h-3.5 w-3.5" />
            선
          </Button>
        </div>

        {shapes.length ? (
          <div className="grid gap-1">
            {shapes.map((shape, index) => (
              <button
                key={shape.id}
                type="button"
                className={`flex h-8 items-center justify-between rounded border px-2 text-[11px] font-black hover:border-slate-500 hover:bg-slate-800 hover:text-white ${selectedShapeId === shape.id ? 'border-amber-400 bg-amber-500/20 text-amber-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}
                onClick={() => selectShapeLayer(shape.id)}
              >
                <span>{index + 1}. {shapeLabel(shape)}</span>
                <span className="text-[10px] text-slate-500">{Math.round(shape.x)}, {Math.round(shape.y)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-2 text-[11px] font-bold leading-4 text-slate-400">
            보조 박스나 하이라이트가 필요할 때만 추가하세요.
          </p>
        )}

        {selectedShape ? (
          <div className={`space-y-2 ${darkNestedPanelClass}`}>
            <ColorPicker
              value={selectedShape.fill}
              colors={frameSwatches}
              label="채움 색"
              onChange={(fill) => patchShape(selectedShape.id, { fill })}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className={darkLabelClass}>
                X {Math.round(selectedShape.x)}
                <input type="range" min="0" max={CANVAS_WIDTH} value={selectedShape.x} onChange={(event) => patchShape(selectedShape.id, { x: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                Y {Math.round(selectedShape.y)}
                <input type="range" min="0" max={CANVAS_HEIGHT} value={selectedShape.y} onChange={(event) => patchShape(selectedShape.id, { y: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                너비 {Math.round(selectedShape.width)}
                <input type="range" min="20" max={CANVAS_WIDTH} value={selectedShape.width} onChange={(event) => patchShape(selectedShape.id, { width: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                높이 {Math.round(selectedShape.height)}
                <input type="range" min="8" max={CANVAS_HEIGHT} value={selectedShape.height} onChange={(event) => patchShape(selectedShape.id, { height: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                불투명도 {Math.round((selectedShape.opacity ?? 0) * 100)}%
                <input type="range" min="0.05" max="1" step="0.01" value={selectedShape.opacity} onChange={(event) => patchShape(selectedShape.id, { opacity: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                모서리 {Math.round(selectedShape.radius ?? 0)}
                <input type="range" min="0" max="90" value={selectedShape.radius ?? 0} onChange={(event) => patchShape(selectedShape.id, { radius: Number(event.target.value) })} disabled={selectedShape.type === 'circle' || selectedShape.type === 'line'} />
              </label>
              <label className={darkLabelClass}>
                선 두께 {Math.round(selectedShape.strokeWidth ?? 0)}
                <input type="range" min="0" max="28" value={selectedShape.strokeWidth ?? 0} onChange={(event) => patchShape(selectedShape.id, { strokeWidth: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                회전 {Math.round(selectedShape.rotate ?? 0)}
                <input type="range" min="-35" max="35" value={selectedShape.rotate ?? 0} onChange={(event) => patchShape(selectedShape.id, { rotate: Number(event.target.value) })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" className={lightButtonClass} onClick={removeSelectedShape}>
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
              <Button size="sm" variant="outline" className={lightButtonClass} onClick={resetShapes}>
                <RotateCcw className="h-4 w-4" />
                전체 초기화
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function shapeLabel(shape = {}) {
  if (shape.type === 'circle') return '원';
  if (shape.type === 'line') return '선';
  if (shape.type === 'highlight') return '강조';
  return '박스';
}

function DataOverlayControls({ overlay, patchOverlay, patchItem, patchRow, patchColumn, addItem, removeItem, addRow, removeRow, nudgeOverlay, reset }) {
  const [open, setOpen] = useState(false);
  return (
    <details className={darkPanelClass} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={darkSummaryClass}>
        {overlay.kind === 'bar_chart' ? '그래프 SVG · 위치/내용' : '표 SVG · 위치/내용/행간'}
      </summary>
      <div className="mt-2 space-y-2">
        <p className="rounded border border-emerald-500/20 bg-emerald-950/25 p-2 text-[11px] font-bold leading-4 text-emerald-200">
          캔버스의 표/그래프 패널을 잡고 드래그해도 바로 이동합니다.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className={darkLabelClass}>
            X {Math.round(overlay.x)}
            <input type="range" min="24" max="300" value={overlay.x} onChange={(event) => patchOverlay({ x: Number(event.target.value) })} />
          </label>
          <label className={darkLabelClass}>
            Y {Math.round(overlay.y)}
            <input type="range" min="180" max="620" value={overlay.y} onChange={(event) => patchOverlay({ y: Number(event.target.value) })} />
          </label>
          <label className={darkLabelClass}>
            너비 {Math.round(overlay.width)}
            <input type="range" min="560" max="1000" value={overlay.width} onChange={(event) => patchOverlay({ width: Number(event.target.value) })} />
          </label>
          <label className={darkLabelClass}>
            높이 {Math.round(overlay.height)}
            <input type="range" min="360" max="720" value={overlay.height} onChange={(event) => patchOverlay({ height: Number(event.target.value) })} />
          </label>
        </div>
        <div className={`grid grid-cols-5 gap-1.5 ${darkNestedPanelClass}`}>
          <Button size="sm" variant="outline" className={`h-7 px-1 text-[11px] ${lightButtonClass}`} onClick={() => nudgeOverlay(-40, 0)}>←40</Button>
          <Button size="sm" variant="outline" className={`h-7 px-1 text-[11px] ${lightButtonClass}`} onClick={() => nudgeOverlay(0, -40)}>↑40</Button>
          <Button size="sm" variant="outline" className={`h-7 px-1 text-[11px] ${lightButtonClass}`} onClick={() => nudgeOverlay(0, -8)}>↑8</Button>
          <Button size="sm" variant="outline" className={`h-7 px-1 text-[11px] ${lightButtonClass}`} onClick={() => nudgeOverlay(0, 8)}>↓8</Button>
          <Button size="sm" variant="outline" className={`h-7 px-1 text-[11px] ${lightButtonClass}`} onClick={() => nudgeOverlay(40, 0)}>40→</Button>
        </div>
        <label className={darkLabelClass}>
          제목
          <input className={`${darkInputClass} h-8 text-xs`} value={overlay.title} onChange={(event) => patchOverlay({ title: event.target.value })} />
        </label>
        <label className={darkLabelClass}>
          부제
          <input className={`${darkInputClass} h-8 text-xs`} value={overlay.subtitle} onChange={(event) => patchOverlay({ subtitle: event.target.value })} />
        </label>
        {overlay.kind === 'table' ? (
          <div className={`grid grid-cols-2 gap-2 ${darkNestedPanelClass}`}>
            <label className={darkLabelClass}>
              행 간격 {overlay.rowHeight ?? 108}
              <input type="range" min="78" max="138" value={overlay.rowHeight ?? 108} onChange={(event) => patchOverlay({ rowHeight: Number(event.target.value) })} />
            </label>
            <label className={darkLabelClass}>
              헤더 간격 {overlay.headerGap ?? 82}
              <input type="range" min="58" max="116" value={overlay.headerGap ?? 82} onChange={(event) => patchOverlay({ headerGap: Number(event.target.value) })} />
            </label>
            <label className={darkLabelClass}>
              셀 글자 {overlay.cellFontSize ?? 16}
              <input type="range" min="13" max="22" value={overlay.cellFontSize ?? 16} onChange={(event) => patchOverlay({ cellFontSize: Number(event.target.value) })} />
            </label>
            <label className={darkLabelClass}>
              줄 간격 {overlay.cellLineGap ?? 23}
              <input type="range" min="18" max="32" value={overlay.cellLineGap ?? 23} onChange={(event) => patchOverlay({ cellLineGap: Number(event.target.value) })} />
            </label>
          </div>
        ) : null}
        {overlay.kind === 'bar_chart'
          ? <BarChartControls overlay={overlay} patchItem={patchItem} addItem={addItem} removeItem={removeItem} />
          : <TableControls overlay={overlay} patchRow={patchRow} patchColumn={patchColumn} addRow={addRow} removeRow={removeRow} />}
        <label className={darkLabelClass}>
          설명
          <textarea
            className={`${darkTextareaClass} min-h-16 text-xs leading-5`}
            value={(overlay.callouts ?? []).join('\n')}
            onChange={(event) => patchOverlay({ callouts: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 2) })}
          />
        </label>
        <label className={darkLabelClass}>
          출처 표기
          <input className={`${darkInputClass} h-8 text-xs`} value={overlay.sourceLabel ?? ''} onChange={(event) => patchOverlay({ sourceLabel: event.target.value })} />
        </label>
        <Button size="sm" variant="outline" className={`w-full ${lightButtonClass}`} onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          데이터 SVG 초기화
        </Button>
      </div>
    </details>
  );
}

function BarChartControls({ overlay, patchItem, addItem, removeItem }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-black text-slate-300">막대 항목</div>
        <Button size="sm" variant="outline" className={`h-7 px-2 text-[11px] ${lightButtonClass}`} onClick={addItem} disabled={(overlay.items ?? []).length >= 7}>
          <Plus className="h-3.5 w-3.5" />
          항목
        </Button>
      </div>
      {(overlay.items ?? []).map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_74px_minmax(0,1fr)_32px] gap-1">
          <input aria-label={`막대 ${index + 1} 라벨`} className={`${darkInputClass} h-8 text-[11px]`} value={item.label} onChange={(event) => patchItem(index, { label: event.target.value })} />
          <input aria-label={`막대 ${index + 1} 값`} className={`${darkInputClass} h-8 text-[11px]`} type="number" step="0.01" value={item.value} onChange={(event) => patchItem(index, { value: Number(event.target.value) })} />
          <input aria-label={`막대 ${index + 1} 표시값`} className={`${darkInputClass} h-8 text-[11px]`} value={item.display} onChange={(event) => patchItem(index, { display: event.target.value })} />
          <button
            type="button"
            aria-label={`막대 ${index + 1} 삭제`}
            className="inline-flex h-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-40"
            onClick={() => removeItem(index)}
            disabled={(overlay.items ?? []).length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function TableControls({ overlay, patchRow, patchColumn, addRow, removeRow }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-black text-slate-300">표 헤더</div>
      <div className="grid grid-cols-3 gap-1">
        {(overlay.columns ?? []).slice(0, 3).map((column, columnIndex) => (
          <input
            key={`${column}-${columnIndex}`}
            aria-label={`표 헤더 ${columnIndex + 1}`}
            className={`${darkInputClass} h-8 text-[11px]`}
            value={column}
            onChange={(event) => patchColumn(columnIndex, event.target.value)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[11px] font-black text-slate-300">표 셀</div>
        <Button size="sm" variant="outline" className={`h-7 px-2 text-[11px] ${lightButtonClass}`} onClick={addRow} disabled={(overlay.rows ?? []).length >= 4}>
          <Plus className="h-3.5 w-3.5" />
          행
        </Button>
      </div>
      {(overlay.rows ?? []).slice(0, 4).map((row, rowIndex) => (
        <div key={`${row.join('-')}-${rowIndex}`} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-1">
          {row.slice(0, 3).map((cell, cellIndex) => (
            <textarea
              key={`${rowIndex}-${cellIndex}`}
              aria-label={`표 ${rowIndex + 1}행 ${cellIndex + 1}열`}
              className={`${darkTextareaClass} min-h-12 p-1.5 text-[11px] leading-4`}
              value={cell}
              onChange={(event) => patchRow(rowIndex, cellIndex, event.target.value)}
            />
          ))}
          <button
            type="button"
            aria-label={`표 ${rowIndex + 1}행 삭제`}
            className="inline-flex min-h-12 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-40"
            onClick={() => removeRow(rowIndex)}
            disabled={(overlay.rows ?? []).length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SvgDataOverlay({ overlay, beginDrag }) {
  if (!overlay) return null;
  if (overlay.kind === 'bar_chart') return <SvgBarChart overlay={overlay} beginDrag={beginDrag} />;
  if (overlay.kind === 'table') return <SvgEvidenceTable overlay={overlay} beginDrag={beginDrag} />;
  return null;
}

function SvgShapeLayers({ shapes, selectedId, beginDrag }) {
  if (!shapes?.length) return null;
  return (
    <g>
      {shapes.map((shape) => (
        <g
          key={shape.id}
          className="cursor-move"
          transform={`rotate(${shape.rotate ?? 0} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`}
          onPointerDown={(event) => beginDrag(event, shape)}
        >
          <SvgShape shape={shape} />
          {selectedId === shape.id ? <ShapeSelectionBox shape={shape} /> : null}
        </g>
      ))}
    </g>
  );
}

function SvgShape({ shape }) {
  if (shape.type === 'circle') {
    return (
      <ellipse
        cx={shape.x + shape.width / 2}
        cy={shape.y + shape.height / 2}
        rx={shape.width / 2}
        ry={shape.height / 2}
        fill={shape.fill}
        opacity={shape.opacity}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
    );
  }
  if (shape.type === 'line') {
    return (
      <line
        x1={shape.x}
        y1={shape.y}
        x2={shape.x + shape.width}
        y2={shape.y + shape.height}
        stroke={shape.fill}
        strokeWidth={shape.strokeWidth || 8}
        strokeLinecap="round"
        opacity={shape.opacity}
      />
    );
  }
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.radius}
      fill={shape.fill}
      opacity={shape.opacity}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
    />
  );
}

function ShapeSelectionBox({ shape }) {
  const pad = 10;
  return (
    <rect
      x={shape.x - pad}
      y={shape.y - pad}
      width={shape.width + pad * 2}
      height={shape.height + pad * 2}
      rx="18"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="4"
      strokeDasharray="12 10"
      pointerEvents="none"
    />
  );
}

function SvgFrameOverlay({ frame }) {
  if (!frame) return null;
  return (
    <g>
      {Number(frame.shadeOpacity ?? 0) > 0 ? (
        <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#000000" opacity={frame.shadeOpacity} />
      ) : null}
      {frame.safeAreaEnabled ? (
        <rect
          x={frame.safeAreaX}
          y={frame.safeAreaY}
          width={frame.safeAreaWidth}
          height={frame.safeAreaHeight}
          rx={frame.safeAreaRadius}
          fill={frame.safeAreaColor}
          opacity={frame.safeAreaOpacity}
        />
      ) : null}
      {frame.frameEnabled ? (
        <rect
          x={frame.frameInset}
          y={frame.frameInset}
          width={CANVAS_WIDTH - frame.frameInset * 2}
          height={CANVAS_HEIGHT - frame.frameInset * 2}
          rx={frame.frameRadius}
          fill="none"
          stroke={frame.frameStrokeColor}
          strokeWidth={frame.frameStrokeWidth}
          opacity={frame.frameOpacity}
        />
      ) : null}
    </g>
  );
}

function SvgBarChart({ overlay, beginDrag }) {
  const items = overlay.items.slice(0, 7);
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  const chartX = overlay.x + 52;
  const chartY = overlay.y + 136;
  const chartW = overlay.width - 104;
  const chartH = overlay.height - 320;
  const gap = items.length > 5 ? 14 : 24;
  const barW = Math.max(46, (chartW - gap * (items.length - 1)) / items.length);
  return (
    <g className="cursor-move" onPointerDown={beginDrag}>
      <OverlayPanel overlay={overlay} />
      <DataDragHandle overlay={overlay} />
      <text x={overlay.x + 44} y={overlay.y + 62} fontFamily={FONT_FAMILY} fontSize="34" fontWeight="900" fill={overlay.ink}>{overlay.title}</text>
      {overlay.subtitle ? <text x={overlay.x + 44} y={overlay.y + 100} fontFamily={FONT_FAMILY} fontSize="20" fontWeight="800" fill={overlay.sub}>{overlay.subtitle}</text> : null}
      <line x1={chartX} x2={chartX + chartW} y1={chartY + chartH} y2={chartY + chartH} stroke="#cbd5e1" strokeWidth="3" />
      {(overlay.referenceLines ?? []).map((line, index) => {
        const y = chartY + chartH - Math.max(0, Math.min(1, line.value / max)) * chartH;
        const color = index === 0 ? overlay.accent : overlay.sub;
        return (
          <g key={`${line.label}-${index}`}>
            <line x1={chartX} x2={chartX + chartW} y1={y} y2={y} stroke={color} strokeWidth="2" strokeDasharray="8 8" opacity="0.72" />
            <text x={chartX + chartW} y={y - 6} fontFamily={FONT_FAMILY} fontSize="14" fontWeight="900" fill={color} textAnchor="end">{line.label} {line.display}</text>
          </g>
        );
      })}
      {items.map((item, index) => {
        const value = Math.max(0, Number(item.value) || 0);
        const height = Math.max(12, (value / max) * chartH);
        const x = chartX + index * (barW + gap);
        const y = chartY + chartH - height;
        const segments = item.segments?.length ? item.segments : [{ label: '', value, display: '' }];
        const total = Math.max(segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0), value, 0.01);
        let cursorY = chartY + chartH;
        return (
          <g key={`${item.label}-${index}`}>
            {segments.map((segment, segmentIndex) => {
              const segmentHeight = Math.max(6, height * Math.max(0, segment.value) / total);
              cursorY -= segmentHeight;
              const colorKey = SEGMENT_COLORS[segmentIndex % SEGMENT_COLORS.length];
              return <rect key={`${segment.label}-${segmentIndex}`} x={x} y={cursorY} width={barW} height={segmentHeight} rx={segmentIndex === 0 ? 16 : 8} fill={segmentColorValue[colorKey](overlay)} opacity={index < 3 ? 0.92 : 0.82} />;
            })}
            <text x={x + barW / 2} y={y - 14} fontFamily={FONT_FAMILY} fontSize={items.length > 5 ? 16 : 22} fontWeight="900" fill={overlay.ink} textAnchor="middle">{wrapSvgLines(item.display, items.length > 5 ? 12 : 18, 1)[0]}</text>
            <text x={x + barW / 2} y={chartY + chartH + 26} fontFamily={FONT_FAMILY} fontSize={items.length > 5 ? 13 : 17} fontWeight="900" fill={overlay.ink} textAnchor="middle">{wrapSvgLines(item.label, items.length > 5 ? 7 : 8, 1)[0]}</text>
          </g>
        );
      })}
      <SvgLegend overlay={overlay} items={items} />
      <SvgCallouts overlay={overlay} y={overlay.y + overlay.height - 76} />
    </g>
  );
}

function SvgLegend({ overlay, items }) {
  const labels = [...new Set(items.flatMap((item) => (item.segments ?? []).map((segment) => segment.label)).filter(Boolean))].slice(0, 3);
  if (!labels.length) return null;
  const y = overlay.y + overlay.height - 126;
  return (
    <g>
      {labels.map((label, index) => {
        const x = overlay.x + 44 + index * 118;
        const colorKey = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
        return (
          <g key={`${label}-${index}`}>
            <rect x={x} y={y - 14} width="18" height="18" rx="5" fill={segmentColorValue[colorKey](overlay)} />
            <text x={x + 26} y={y} fontFamily={FONT_FAMILY} fontSize="15" fontWeight="900" fill="#475569">{label}</text>
          </g>
        );
      })}
    </g>
  );
}

function SvgEvidenceTable({ overlay, beginDrag }) {
  const rows = overlay.rows.slice(0, 4);
  const columns = overlay.columns.slice(0, 3);
  const left = overlay.x + 38;
  const top = overlay.y + 124;
  const tableW = overlay.width - 76;
  const colWidths = [0.24, 0.36, 0.4].map((ratio) => tableW * ratio);
  const rowH = overlay.rowHeight ?? 108;
  const headerGap = overlay.headerGap ?? 82;
  const cellFontSize = overlay.cellFontSize ?? 16;
  const cellLineGap = overlay.cellLineGap ?? 23;
  return (
    <g className="cursor-move" onPointerDown={beginDrag}>
      <OverlayPanel overlay={overlay} />
      <DataDragHandle overlay={overlay} />
      <text x={overlay.x + 44} y={overlay.y + 58} fontFamily={FONT_FAMILY} fontSize="32" fontWeight="900" fill={overlay.ink}>{overlay.title}</text>
      {overlay.subtitle ? <text x={overlay.x + 44} y={overlay.y + 94} fontFamily={FONT_FAMILY} fontSize="20" fontWeight="800" fill={overlay.sub}>{overlay.subtitle}</text> : null}
      <rect x={left} y={top} width={tableW} height="48" rx="16" fill="#f1f5f9" />
      {columns.map((column, index) => {
        const x = left + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0) + 16;
        return <text key={column} x={x} y={top + 31} fontFamily={FONT_FAMILY} fontSize="17" fontWeight="900" fill={overlay.sub}>{column}</text>;
      })}
      {rows.map((row, rowIndex) => {
        const y = top + headerGap + rowIndex * rowH;
        return (
          <g key={`${row.join('-')}-${rowIndex}`}>
            <rect x={left} y={y - 34} width={tableW} height={rowH - 14} rx="18" fill={rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'} stroke="#e2e8f0" strokeWidth="2" />
            {row.slice(0, 3).map((cell, index) => {
              const x = left + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0) + 16;
              const maxChars = index === 0 ? 7 : index === 1 ? 14 : 15;
              return (
                <text key={`${cell}-${index}`} x={x} y={y} fontFamily={FONT_FAMILY} fontSize={index === 0 ? cellFontSize + 2 : cellFontSize} fontWeight="900" fill={index === 0 ? overlay.ink : '#334155'}>
                  {wrapSvgLines(cell, maxChars, 2).map((line, lineIndex) => (
                    <tspan key={`${line}-${lineIndex}`} x={x} dy={lineIndex === 0 ? 0 : cellLineGap}>{line}</tspan>
                  ))}
                </text>
              );
            })}
          </g>
        );
      })}
      <SvgCallouts overlay={overlay} y={overlay.y + overlay.height - 74} />
    </g>
  );
}

function DataDragHandle({ overlay }) {
  return (
    <g pointerEvents="none">
      <rect x={overlay.x + overlay.width - 126} y={overlay.y + 18} width="84" height="28" rx="14" fill="#0f172a" opacity="0.08" />
      <circle cx={overlay.x + overlay.width - 102} cy={overlay.y + 32} r="3" fill="#64748b" opacity="0.7" />
      <circle cx={overlay.x + overlay.width - 84} cy={overlay.y + 32} r="3" fill="#64748b" opacity="0.7" />
      <circle cx={overlay.x + overlay.width - 66} cy={overlay.y + 32} r="3" fill="#64748b" opacity="0.7" />
    </g>
  );
}

function OverlayPanel({ overlay }) {
  return (
    <rect
      x={overlay.x}
      y={overlay.y}
      width={overlay.width}
      height={overlay.height}
      rx="34"
      fill="#fffffff0"
      stroke="#e2e8f0"
      strokeWidth="4"
    />
  );
}

function SvgCallouts({ overlay, y }) {
  const callouts = overlay.callouts.slice(0, 2);
  return (
    <g>
      {callouts.map((callout, index) => (
        <text key={callout} x={overlay.x + 44} y={y + index * 24} fontFamily={FONT_FAMILY} fontSize="16" fontWeight="800" fill="#475569">
          {wrapSvgLines(callout, 44, 1)[0]}
        </text>
      ))}
      {overlay.sourceLabel ? (
        <text x={overlay.x + overlay.width - 44} y={overlay.y + overlay.height - 24} fontFamily={FONT_FAMILY} fontSize="13" fontWeight="800" fill="#64748b" textAnchor="end">{overlay.sourceLabel}</text>
      ) : null}
    </g>
  );
}

function LayerBox({ layer }) {
  if (!hasTextBox(layer)) return null;
  const box = textBoxMetrics(layer);
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      rx={layer.radius ?? 16}
      fill={layer.backgroundColor || '#000000'}
      opacity={layer.backgroundOpacity ?? 0.55}
    />
  );
}

function SelectionBox({ layer }) {
  const box = textBoxMetrics({ ...layer, paddingX: Math.max(14, layer.paddingX ?? 14), paddingY: Math.max(14, layer.paddingY ?? 14) });
  return <rect x={box.x - 10} y={box.y - 10} width={box.width + 20} height={box.height + 20} rx="18" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="12 10" />;
}

function defaultTextLayers(card = {}, style = {}, studio = {}) {
  const isCover = card.layout === 'cover_text' || card.layout === 'cover_photo' || card.role === 'cover';
  const hasVerifiedData = Boolean(card.visualData);
  if (hasVerifiedData && !isCover) return verifiedDataTextLayers(card, style, studio);
  const titleColor = isCover ? '#ffffff' : style.ink || '#0f172a';
  const bodyColor = isCover ? '#ffffff' : style.ink || '#0f172a';
  const base = [
    {
      id: 'title',
      text: wrapForEditor(card.title || studio.label || '카드 제목', isCover ? 10 : 12),
      x: isCover ? 78 : 76,
      y: isCover ? 900 : 150,
      fontSize: isCover ? 84 : 62,
      lineHeight: 1.08,
      color: titleColor,
      weight: 900,
      align: 'start',
      ...defaultBoxStyle(false)
    },
    {
      id: 'body',
      text: formatCardText(card.body || '').trim() || '본문 문구를 입력하세요.',
      x: isCover ? 82 : 82,
      y: isCover ? 1120 : 1040,
      fontSize: isCover ? 32 : 36,
      lineHeight: 1.28,
      color: bodyColor,
      weight: 800,
      align: 'start',
      ...defaultBoxStyle(isCover)
    },
    {
      id: 'emphasis',
      text: card.emphasis || '핵심 포인트',
      x: isCover ? 84 : 82,
      y: isCover ? 780 : 255,
      fontSize: isCover ? 34 : 30,
      lineHeight: 1.16,
      color: style.accent || '#ef4444',
      weight: 900,
      align: 'start',
      ...defaultBoxStyle(false)
    },
    {
      id: 'channel',
      text: displayChannelName(studio),
      x: 540,
      y: 1292,
      fontSize: 26,
      lineHeight: 1.1,
      color: isCover ? '#ffffff' : style.sub || '#64748b',
      weight: 900,
      align: 'middle',
      ...defaultBoxStyle(false)
    }
  ];

  const labels = (Array.isArray(card.visualItems) ? card.visualItems : []).filter(Boolean).slice(0, 4);
  if (card.layout === 'comparison_board' || card.role === 'comparison') {
    if (card.visualData) return base;
    const verifiedRows = verifiedComparisonRows(card);
    if (!verifiedRows.length) return [...base, dataRequiredLayer(card, style, 'comparison')];
    return [
      ...base,
      tableTitleLayer(card, style),
      ...verifiedRows.map((text, index) => ({
        id: `row-${index}`,
        text,
        x: 150,
        y: 430 + index * 92,
        fontSize: 28,
        lineHeight: 1.16,
        color: style.ink || '#0f172a',
        weight: 900,
        align: 'start',
        ...defaultBoxStyle(false)
      }))
    ];
  }
  if (card.layout === 'data_chart' || card.role === 'data_scene') {
    if (card.visualData) return base;
    const metrics = verifiedMetricRows(card);
    if (!metrics.length) return [...base, dataRequiredLayer(card, style, 'data')];
    return [
      ...base,
      tableTitleLayer(card, style),
      ...metrics.map((text, index) => ({
        id: `metric-${index}`,
        text,
        x: 150,
        y: 430 + index * 92,
        fontSize: 30,
        lineHeight: 1.1,
        color: style.ink || '#0f172a',
        weight: 900,
        align: 'start',
        ...defaultBoxStyle(false)
      }))
    ];
  }
  return base;
}

function verifiedDataTextLayers(card = {}, style = {}, studio = {}) {
  return [
    {
      id: 'body',
      text: formatCardText(card.body || '').trim() || '본문 문구를 입력하세요.',
      x: 82,
      y: 1060,
      fontSize: 34,
      lineHeight: 1.25,
      color: '#ffffff',
      weight: 900,
      align: 'start',
      backgroundColor: '#000000',
      backgroundOpacity: 0.68,
      paddingX: 30,
      paddingY: 20,
      radius: 16
    },
    {
      id: 'channel',
      text: displayChannelName(studio),
      x: 540,
      y: 1292,
      fontSize: 24,
      lineHeight: 1.1,
      color: '#ffffff',
      weight: 900,
      align: 'middle',
      backgroundColor: '#000000',
      backgroundOpacity: 0.42,
      paddingX: 24,
      paddingY: 10,
      radius: 14
    }
  ];
}

function initialTextLayers(draftKey, card, style, studio) {
  const draft = loadLayerDraft(draftKey);
  if (card?.visualData && Array.isArray(draft) && draft.some((layer) => ['title', 'emphasis'].includes(layer?.id))) {
    return clampTextLayers(defaultTextLayers(card, style, studio));
  }
  return clampTextLayers(draft || defaultTextLayers(card, style, studio));
}

function initialDataOverlay(draftKey, card, style) {
  const base = defaultDataOverlay(card, style);
  if (!base) return null;
  const draft = loadDataOverlayDraft(draftKey);
  return draft && draft.kind === base.kind ? { ...base, ...draft } : base;
}

function duplicateTextLayer(layers = [], id, suffix = Date.now()) {
  const index = layers.findIndex((layer) => layer.id === id);
  if (index < 0) return layers;
  const source = layers[index];
  const copy = {
    ...source,
    id: `${source.id}-copy-${suffix}`,
    text: `${source.text ?? ''}`,
    x: Number(source.x ?? 540) + 32,
    y: Number(source.y ?? 640) + 42
  };
  return [...layers.slice(0, index + 1), clampTextLayerPosition(copy), ...layers.slice(index + 1)];
}

function moveTextLayer(layers = [], id, direction) {
  const index = layers.findIndex((layer) => layer.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) return layers;
  const nextLayers = [...layers];
  const [layer] = nextLayers.splice(index, 1);
  nextLayers.splice(nextIndex, 0, layer);
  return nextLayers;
}

function removeTextLayer(layers = [], id) {
  if (layers.length <= 1) return layers;
  return layers.filter((layer) => layer.id !== id);
}

function addDataOverlayItem(overlay) {
  if (!overlay || overlay.kind !== 'bar_chart') return overlay;
  const items = overlay.items ?? [];
  if (items.length >= 7) return overlay;
  return {
    ...overlay,
    items: [
      ...items,
      {
        label: `항목 ${items.length + 1}`,
        value: 1,
        display: '1',
        segments: []
      }
    ]
  };
}

function removeDataOverlayItem(overlay, index) {
  if (!overlay || overlay.kind !== 'bar_chart') return overlay;
  const items = overlay.items ?? [];
  if (items.length <= 1) return overlay;
  return {
    ...overlay,
    items: items.filter((_, itemIndex) => itemIndex !== index)
  };
}

function addDataOverlayRow(overlay) {
  if (!overlay || overlay.kind !== 'table') return overlay;
  const rows = overlay.rows ?? [];
  if (rows.length >= 4) return overlay;
  const columnCount = Math.max(1, Math.min(3, (overlay.columns ?? []).length || 3));
  return {
    ...overlay,
    rows: [
      ...rows,
      Array.from({ length: columnCount }, (_, index) => index === 0 ? `항목 ${rows.length + 1}` : '내용')
    ]
  };
}

function removeDataOverlayRow(overlay, index) {
  if (!overlay || overlay.kind !== 'table') return overlay;
  const rows = overlay.rows ?? [];
  if (rows.length <= 1) return overlay;
  return {
    ...overlay,
    rows: rows.filter((_, rowIndex) => rowIndex !== index)
  };
}

function initialShapeLayers(draftKey) {
  return loadShapeDraft(draftKey) || [];
}

function defaultShapeLayer(type, style = {}, suffix = Date.now()) {
  const base = {
    id: `shape-${type}-${suffix}`,
    type,
    x: 120,
    y: 760,
    width: 360,
    height: 118,
    radius: 28,
    fill: style?.accent || '#facc15',
    opacity: 0.32,
    stroke: '#ffffff',
    strokeWidth: 0,
    rotate: 0
  };
  if (type === 'highlight') {
    return { ...base, y: 930, width: 560, height: 72, radius: 22, fill: '#000000', opacity: 0.42 };
  }
  if (type === 'circle') {
    return { ...base, x: 720, y: 250, width: 180, height: 180, radius: 90, fill: style?.sub || '#2563eb', opacity: 0.2, strokeWidth: 8 };
  }
  if (type === 'line') {
    return { ...base, x: 130, y: 720, width: 420, height: 0, radius: 0, fill: style?.accent || '#ef4444', opacity: 0.82, strokeWidth: 10 };
  }
  return base;
}

function duplicateShapeLayer(shapes = [], id, suffix = Date.now()) {
  const index = shapes.findIndex((shape) => shape.id === id);
  if (index < 0) return shapes;
  const source = shapes[index];
  const copy = clampShapeLayer({
    ...source,
    id: `${source.id}-copy-${suffix}`,
    x: Number(source.x ?? 120) + 32,
    y: Number(source.y ?? 760) + 42
  });
  return [...shapes.slice(0, index + 1), copy, ...shapes.slice(index + 1)];
}

function nudgeShapeLayer(shapes = [], id, dx, dy) {
  return shapes.map((shape) => shape.id === id
    ? clampShapeLayer({ ...shape, x: Number(shape.x ?? 0) + dx, y: Number(shape.y ?? 0) + dy })
    : shape);
}

function clampShapeLayer(shape = {}) {
  const width = Math.max(shape.type === 'line' ? 0 : 8, Number(shape.width ?? 0));
  const height = Math.max(shape.type === 'line' ? 0 : 8, Number(shape.height ?? 0));
  return {
    ...shape,
    width,
    height,
    x: clamp(Number(shape.x ?? 0), 0, Math.max(0, CANVAS_WIDTH - width)),
    y: clamp(Number(shape.y ?? 0), 0, Math.max(0, CANVAS_HEIGHT - height))
  };
}

function initialFrameSettings(draftKey, card) {
  const base = defaultFrameSettings(card);
  const draft = loadFrameDraft(draftKey);
  return draft ? { ...base, ...draft } : base;
}

function defaultFrameSettings(card = {}) {
  const hasVerifiedData = Boolean(card.visualData);
  const isCover = card.layout === 'cover_text' || card.layout === 'cover_photo' || card.role === 'cover';
  return {
    shadeOpacity: hasVerifiedData ? 0.08 : isCover ? 0.14 : 0,
    safeAreaEnabled: hasVerifiedData || isCover,
    safeAreaX: 64,
    safeAreaY: hasVerifiedData ? 1018 : isCover ? 874 : 980,
    safeAreaWidth: 952,
    safeAreaHeight: hasVerifiedData ? 214 : isCover ? 330 : 230,
    safeAreaColor: '#000000',
    safeAreaOpacity: hasVerifiedData ? 0.2 : 0.34,
    safeAreaRadius: 24,
    frameEnabled: false,
    frameInset: 28,
    frameRadius: 34,
    frameStrokeColor: '#ffffff',
    frameStrokeWidth: 6,
    frameOpacity: 0.72
  };
}

function tableTitleLayer(card, style) {
  return {
    id: 'verified-data-title',
    text: verifiedDataTitle(card),
    x: 150,
    y: 360,
    fontSize: 34,
    lineHeight: 1.1,
    color: style.accent || '#ef4444',
    weight: 900,
    align: 'start',
    ...defaultBoxStyle(false)
  };
}

function dataRequiredLayer(card, style, type) {
  const productHint = beautyTopic(card) ? '화장품 하나를 먼저 선택하고' : '비교 대상을 먼저 선택하고';
  const dataHint = type === 'comparison'
    ? '성분/효능/가격 출처 확인 후\n비교표를 만들어야 해요.'
    : '검증된 수치나 출처 확인 후\n그래프를 만들어야 해요.';
  return {
    id: 'data-required',
    text: `데이터 미확정\n${productHint}\n${dataHint}`,
    x: 150,
    y: 470,
    fontSize: 34,
    lineHeight: 1.22,
    color: style.accent || '#ef4444',
    weight: 900,
    align: 'start',
    ...defaultBoxStyle(true, { backgroundColor: '#ffffff', backgroundOpacity: 0.82 })
  };
}

function verifiedComparisonRows(card = {}) {
  const source = [card.dataPoint, card.sourceLine, ...(Array.isArray(card.visualItems) ? card.visualItems : [])]
    .filter(Boolean)
    .map((item) => `${item}`.trim());
  const useful = source.filter((item) => {
    if (isGenericDataLabel(item)) return false;
    return /\d|%|원|ml|g|mg|ppm|성분|나이아신아마이드|레티놀|비타민|세라마이드|히알루론산|판테놀|살리실산|AHA|BHA|PHA|효능|미백|주름|보습|진정|자외선|SPF|PA/i.test(item);
  });
  return useful.slice(0, 5).map((item) => item.length > 34 ? `${item.slice(0, 34)}…` : item);
}

function verifiedMetricRows(card = {}) {
  const source = [card.dataPoint, card.sourceLine, card.body, ...(Array.isArray(card.visualItems) ? card.visualItems : [])]
    .filter(Boolean)
    .map((item) => `${item}`.trim());
  const useful = source.filter((item) => {
    if (isGenericDataLabel(item)) return false;
    return /\d|%|원|ml|g|mg|ppm|건|개|회|배|점|SPF|PA/i.test(item);
  });
  return useful.slice(0, 5).map((item) => item.length > 34 ? `${item.slice(0, 34)}…` : item);
}

function verifiedDataTitle(card = {}) {
  if (beautyTopic(card)) return '검증 데이터';
  if (card.role === 'comparison' || card.layout === 'comparison_board') return '비교 기준';
  return '데이터 기준';
}

function beautyTopic(card = {}) {
  return /K뷰티|뷰티|화장품|스킨케어|세럼|토너|크림|선크림|선케어|성분|효능|피부|보습|미백|주름|진정/i.test([
    card.title,
    card.body,
    card.emphasis,
    card.dataPoint,
    card.sourceLine,
    ...(Array.isArray(card.visualItems) ? card.visualItems : [])
  ].filter(Boolean).join(' '));
}

function isGenericDataLabel(value) {
  return /^(성분|효능|가격|리뷰|사용감|구매 이유|비교 기준|성분 기준|사용 조건|확인 필요|제품 기준|반복 언급|대표 신호|댓글 반응|핵심 포인트)$/i.test(`${value ?? ''}`.trim());
}

function defaultBoxStyle(enabled, override = {}) {
  return {
    backgroundColor: enabled ? '#000000' : '#000000',
    backgroundOpacity: enabled ? 0.55 : 0,
    paddingX: 26,
    paddingY: 16,
    radius: 16,
    ...override
  };
}

function hasTextBox(layer = {}) {
  return Boolean(layer.backgroundColor) && Number(layer.backgroundOpacity ?? 0) > 0;
}

function textBoxMetrics(layer = {}) {
  const lines = `${layer.text ?? ''}`.split('\n');
  const longest = Math.max(...lines.map((line) => [...line].length), 1);
  const textWidth = Math.min(980, Math.max(42, longest * Number(layer.fontSize ?? 36) * 0.64));
  const textHeight = Math.max(
    Number(layer.fontSize ?? 36),
    (lines.length - 1) * Number(layer.fontSize ?? 36) * Number(layer.lineHeight ?? 1.16) + Number(layer.fontSize ?? 36) * 1.08
  );
  const paddingX = Number(layer.paddingX ?? 26);
  const paddingY = Number(layer.paddingY ?? 16);
  const width = textWidth + paddingX * 2;
  const height = textHeight + paddingY * 2;
  const anchorX = layer.align === 'middle' ? -textWidth / 2 : layer.align === 'end' ? -textWidth : 0;
  return {
    x: anchorX - paddingX,
    y: -Number(layer.fontSize ?? 36) * 0.94 - paddingY,
    width,
    height
  };
}

function clampTextLayerPosition(layer = {}) {
  const box = textBoxMetrics(layer);
  const minX = 12 - box.x;
  const maxX = CANVAS_WIDTH - 12 - box.x - box.width;
  const minY = 12 - box.y;
  const maxY = CANVAS_HEIGHT - 12 - box.y - box.height;
  return {
    ...layer,
    x: maxX >= minX ? clamp(Number(layer.x ?? 540), minX, maxX) : CANVAS_WIDTH / 2,
    y: maxY >= minY ? clamp(Number(layer.y ?? 640), minY, maxY) : CANVAS_HEIGHT / 2
  };
}

function clampTextLayers(layers = []) {
  return layers.map((layer) => clampTextLayerPosition(layer));
}

function nudgeTextLayer(layers = [], id, dx, dy) {
  return layers.map((layer) => layer.id === id
    ? clampTextLayerPosition({ ...layer, x: Number(layer.x ?? 0) + dx, y: Number(layer.y ?? 0) + dy })
    : layer);
}

function wrapForEditor(value, limit) {
  const text = `${value ?? ''}`.trim();
  if (!text || text.includes('\n')) return text;
  const chars = [...text];
  const lines = [];
  for (let index = 0; index < chars.length; index += limit) lines.push(chars.slice(index, index + limit).join(''));
  return lines.slice(0, 3).join('\n');
}

function svgPoint(event, svg) {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
  };
}

function isTypingTarget(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element.closest('[contenteditable="true"]')) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

async function composeFinalImage(url, layers, dataOverlay, frame, shapes = []) {
  const canvas = Object.assign(document.createElement('canvas'), { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const baseImage = await loadImage(url);
  drawCover(context, baseImage, CANVAS_WIDTH, CANVAS_HEIGHT);
  const overlayUrl = URL.createObjectURL(new Blob([overlaySvg(layers, dataOverlay, frame, shapes)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const overlayImage = await loadImage(overlayUrl);
    context.drawImage(overlayImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } finally {
    URL.revokeObjectURL(overlayUrl);
  }
  return canvas.toDataURL('image/png');
}

function overlaySvg(layers, dataOverlay, frame, shapes = []) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
${frameOverlaySvg(frame)}
${shapeLayersSvg(shapes)}
${dataOverlaySvg(dataOverlay)}
${layers.map((layer) => `${layerBoxSvg(layer)}<text x="${number(layer.x)}" y="${number(layer.y)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="${number(layer.fontSize)}" font-weight="${number(layer.weight)}" fill="${escapeXml(layer.color)}" text-anchor="${escapeXml(layer.align)}" paint-order="stroke" stroke="${layer.color === '#ffffff' && !hasTextBox(layer) ? 'rgba(0,0,0,0.16)' : 'none'}" stroke-width="${layer.color === '#ffffff' && !hasTextBox(layer) ? 8 : 0}" stroke-linejoin="round">${`${layer.text ?? ''}`.split('\n').map((line, index) => `<tspan x="${number(layer.x)}" dy="${index === 0 ? 0 : number(layer.fontSize * layer.lineHeight)}">${escapeXml(line || ' ')}</tspan>`).join('')}</text>`).join('\n')}
</svg>`;
}

function shapeLayersSvg(shapes = []) {
  return shapes.map((shape) => {
    const rotate = Number(shape.rotate ?? 0)
      ? ` transform="rotate(${number(shape.rotate)} ${number(shape.x + shape.width / 2)} ${number(shape.y + shape.height / 2)})"`
      : '';
    if (shape.type === 'circle') {
      return `<ellipse cx="${number(shape.x + shape.width / 2)}" cy="${number(shape.y + shape.height / 2)}" rx="${number(shape.width / 2)}" ry="${number(shape.height / 2)}" fill="${escapeXml(shape.fill)}" opacity="${number(shape.opacity)}" stroke="${escapeXml(shape.stroke)}" stroke-width="${number(shape.strokeWidth)}"${rotate}/>`;
    }
    if (shape.type === 'line') {
      return `<line x1="${number(shape.x)}" y1="${number(shape.y)}" x2="${number(shape.x + shape.width)}" y2="${number(shape.y + shape.height)}" stroke="${escapeXml(shape.fill)}" stroke-width="${number(shape.strokeWidth || 8)}" stroke-linecap="round" opacity="${number(shape.opacity)}"${rotate}/>`;
    }
    return `<rect x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" rx="${number(shape.radius)}" fill="${escapeXml(shape.fill)}" opacity="${number(shape.opacity)}" stroke="${escapeXml(shape.stroke)}" stroke-width="${number(shape.strokeWidth)}"${rotate}/>`;
  }).join('\n');
}

function frameOverlaySvg(frame) {
  if (!frame) return '';
  return [
    Number(frame.shadeOpacity ?? 0) > 0
      ? `<rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#000000" opacity="${number(frame.shadeOpacity)}"/>`
      : '',
    frame.safeAreaEnabled
      ? `<rect x="${number(frame.safeAreaX)}" y="${number(frame.safeAreaY)}" width="${number(frame.safeAreaWidth)}" height="${number(frame.safeAreaHeight)}" rx="${number(frame.safeAreaRadius)}" fill="${escapeXml(frame.safeAreaColor)}" opacity="${number(frame.safeAreaOpacity)}"/>`
      : '',
    frame.frameEnabled
      ? `<rect x="${number(frame.frameInset)}" y="${number(frame.frameInset)}" width="${number(CANVAS_WIDTH - frame.frameInset * 2)}" height="${number(CANVAS_HEIGHT - frame.frameInset * 2)}" rx="${number(frame.frameRadius)}" fill="none" stroke="${escapeXml(frame.frameStrokeColor)}" stroke-width="${number(frame.frameStrokeWidth)}" opacity="${number(frame.frameOpacity)}"/>`
      : ''
  ].filter(Boolean).join('\n');
}

function dataOverlaySvg(overlay) {
  if (!overlay) return '';
  if (overlay.kind === 'bar_chart') return dataBarChartSvg(overlay);
  if (overlay.kind === 'table') return dataTableSvg(overlay);
  return '';
}

function dataBarChartSvg(overlay) {
  const items = overlay.items.slice(0, 7);
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  const chartX = overlay.x + 52;
  const chartY = overlay.y + 136;
  const chartW = overlay.width - 104;
  const chartH = overlay.height - 320;
  const gap = items.length > 5 ? 14 : 24;
  const barW = Math.max(46, (chartW - gap * (items.length - 1)) / items.length);
  const segmentColors = SEGMENT_COLORS.map((key) => segmentColorValue[key](overlay));
  return [
    panelSvg(overlay),
    `<text x="${number(overlay.x + 44)}" y="${number(overlay.y + 62)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="34" font-weight="900" fill="${escapeXml(overlay.ink)}">${escapeXml(overlay.title)}</text>`,
    overlay.subtitle ? `<text x="${number(overlay.x + 44)}" y="${number(overlay.y + 100)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="20" font-weight="800" fill="${escapeXml(overlay.sub)}">${escapeXml(overlay.subtitle)}</text>` : '',
    `<line x1="${number(chartX)}" x2="${number(chartX + chartW)}" y1="${number(chartY + chartH)}" y2="${number(chartY + chartH)}" stroke="#cbd5e1" stroke-width="3"/>`,
    ...(overlay.referenceLines ?? []).map((line, index) => {
      const y = chartY + chartH - Math.max(0, Math.min(1, line.value / max)) * chartH;
      return `<line x1="${number(chartX)}" x2="${number(chartX + chartW)}" y1="${number(y)}" y2="${number(y)}" stroke="${escapeXml(index === 0 ? overlay.accent : overlay.sub)}" stroke-width="2" stroke-dasharray="8 8" opacity="0.72"/>
<text x="${number(chartX + chartW)}" y="${number(y - 6)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="14" font-weight="900" fill="${escapeXml(index === 0 ? overlay.accent : overlay.sub)}" text-anchor="end">${escapeXml(`${line.label} ${line.display}`)}</text>`;
    }),
    ...items.map((item, index) => {
      const value = Math.max(0, Number(item.value) || 0);
      const height = Math.max(12, (value / max) * chartH);
      const x = chartX + index * (barW + gap);
      const y = chartY + chartH - height;
      const segments = item.segments?.length ? item.segments : [{ label: '', value, display: '' }];
      const total = Math.max(segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0), value, 0.01);
      let cursorY = chartY + chartH;
      const bars = segments.map((segment, segmentIndex) => {
        const segmentHeight = Math.max(6, height * Math.max(0, segment.value) / total);
        cursorY -= segmentHeight;
        return `<rect x="${number(x)}" y="${number(cursorY)}" width="${number(barW)}" height="${number(segmentHeight)}" rx="${segmentIndex === 0 ? 16 : 8}" fill="${escapeXml(segmentColors[segmentIndex % segmentColors.length])}" opacity="${index < 3 ? '0.92' : '0.82'}"/>`;
      }).join('\n');
      return `${bars}
<text x="${number(x + barW / 2)}" y="${number(y - 14)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="${items.length > 5 ? 16 : 22}" font-weight="900" fill="${escapeXml(overlay.ink)}" text-anchor="middle">${escapeXml(wrapSvgLines(item.display, items.length > 5 ? 12 : 18, 1)[0])}</text>
<text x="${number(x + barW / 2)}" y="${number(chartY + chartH + 26)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="${items.length > 5 ? 13 : 17}" font-weight="900" fill="${escapeXml(overlay.ink)}" text-anchor="middle">${escapeXml(wrapSvgLines(item.label, items.length > 5 ? 7 : 8, 1)[0])}</text>`;
    }),
    legendSvg(overlay, segmentColors, items),
    calloutsSvg(overlay, overlay.y + overlay.height - 76)
  ].filter(Boolean).join('\n');
}

function legendSvg(overlay, colors, items) {
  const labels = [...new Set(items.flatMap((item) => (item.segments ?? []).map((segment) => segment.label)).filter(Boolean))].slice(0, 3);
  if (!labels.length) return '';
  const y = overlay.y + overlay.height - 126;
  return labels.map((label, index) => {
    const x = overlay.x + 44 + index * 118;
    return `<rect x="${number(x)}" y="${number(y - 14)}" width="18" height="18" rx="5" fill="${escapeXml(colors[index % colors.length])}"/>
<text x="${number(x + 26)}" y="${number(y)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="15" font-weight="900" fill="#475569">${escapeXml(label)}</text>`;
  }).join('\n');
}

function dataTableSvg(overlay) {
  const rows = overlay.rows.slice(0, 4);
  const columns = overlay.columns.slice(0, 3);
  const left = overlay.x + 38;
  const top = overlay.y + 124;
  const tableW = overlay.width - 76;
  const colWidths = [0.24, 0.36, 0.4].map((ratio) => tableW * ratio);
  const rowH = overlay.rowHeight ?? 108;
  const headerGap = overlay.headerGap ?? 82;
  const cellFontSize = overlay.cellFontSize ?? 16;
  const cellLineGap = overlay.cellLineGap ?? 23;
  return [
    panelSvg(overlay),
    `<text x="${number(overlay.x + 44)}" y="${number(overlay.y + 58)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="32" font-weight="900" fill="${escapeXml(overlay.ink)}">${escapeXml(overlay.title)}</text>`,
    overlay.subtitle ? `<text x="${number(overlay.x + 44)}" y="${number(overlay.y + 94)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="20" font-weight="800" fill="${escapeXml(overlay.sub)}">${escapeXml(overlay.subtitle)}</text>` : '',
    `<rect x="${number(left)}" y="${number(top)}" width="${number(tableW)}" height="48" rx="16" fill="#f1f5f9"/>`,
    ...columns.map((column, index) => `<text x="${number(left + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0) + 16)}" y="${number(top + 31)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="17" font-weight="900" fill="${escapeXml(overlay.sub)}">${escapeXml(column)}</text>`),
    ...rows.map((row, rowIndex) => {
      const y = top + headerGap + rowIndex * rowH;
      return `<rect x="${number(left)}" y="${number(y - 34)}" width="${number(tableW)}" height="${number(rowH - 14)}" rx="18" fill="${rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="2"/>
${row.slice(0, 3).map((cell, index) => {
  const x = left + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0) + 16;
  const maxChars = index === 0 ? 7 : index === 1 ? 14 : 15;
  return `<text x="${number(x)}" y="${number(y)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="${index === 0 ? cellFontSize + 2 : cellFontSize}" font-weight="900" fill="${index === 0 ? escapeXml(overlay.ink) : '#334155'}">${wrapSvgLines(cell, maxChars, 2).map((line, lineIndex) => `<tspan x="${number(x)}" dy="${lineIndex === 0 ? 0 : number(cellLineGap)}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}).join('\n')}`;
    }),
    calloutsSvg(overlay, overlay.y + overlay.height - 74)
  ].filter(Boolean).join('\n');
}

function panelSvg(overlay) {
  return `<rect x="${number(overlay.x)}" y="${number(overlay.y)}" width="${number(overlay.width)}" height="${number(overlay.height)}" rx="34" fill="#fffffff0" stroke="#e2e8f0" stroke-width="4"/>`;
}

function calloutsSvg(overlay, y) {
  const callouts = overlay.callouts.slice(0, 2).map((callout, index) => (
    `<text x="${number(overlay.x + 44)}" y="${number(y + index * 24)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="16" font-weight="800" fill="#475569">${escapeXml(wrapSvgLines(callout, 44, 1)[0])}</text>`
  ));
  if (overlay.sourceLabel) {
    callouts.push(`<text x="${number(overlay.x + overlay.width - 44)}" y="${number(overlay.y + overlay.height - 24)}" font-family="${escapeXml(FONT_FAMILY)}" font-size="13" font-weight="800" fill="#64748b" text-anchor="end">${escapeXml(overlay.sourceLabel)}</text>`);
  }
  return callouts.join('\n');
}

function defaultDataOverlay(card = {}, style = {}) {
  const data = card.visualData;
  if (!data || typeof data !== 'object') return null;
  const sourceLabel = Array.isArray(data.sources) && data.sources.length
    ? `출처: ${data.sources.map((source) => shortSourceLabel(source.label)).filter(Boolean).slice(0, 2).join(', ')}`
    : '';
  const base = {
    x: 72,
    y: 338,
    width: 936,
    height: 560,
    title: `${data.title ?? '검증 데이터'}`,
    subtitle: `${data.subtitle ?? ''}`,
    callouts: Array.isArray(data.callouts) ? data.callouts.map((item) => `${item}`) : [],
    sourceLabel,
    ink: style.ink || '#0f172a',
    sub: style.sub || '#2563eb',
    accent: style.accent || '#ef4444'
  };
  if (data.type === 'bar_chart' && Array.isArray(data.items)) {
    return {
      ...base,
      kind: 'bar_chart',
      items: data.items.map((item) => ({
        label: `${item.label ?? ''}`,
        value: Number(item.value) || 0,
        display: `${item.display ?? item.value ?? ''}`,
        segments: Array.isArray(item.segments)
          ? item.segments.map((segment) => ({
            label: `${segment.label ?? ''}`,
            value: Number(segment.value) || 0,
            display: `${segment.display ?? segment.value ?? ''}`
          })).filter((segment) => segment.label && segment.value > 0)
          : []
      })).filter((item) => item.label && item.display).slice(0, 7),
      referenceLines: Array.isArray(data.referenceLines)
        ? data.referenceLines.map((line) => ({
          label: `${line.label ?? ''}`,
          value: Number(line.value) || 0,
          display: `${line.display ?? line.value ?? ''}`
        })).filter((line) => line.label && line.value > 0).slice(0, 3)
        : []
    };
  }
  if ((data.type === 'evidence_table' || data.type === 'comparison_table') && Array.isArray(data.rows)) {
    return {
      ...base,
      kind: 'table',
      rowHeight: 108,
      headerGap: 82,
      cellFontSize: 16,
      cellLineGap: 23,
      columns: Array.isArray(data.columns) && data.columns.length ? data.columns.map((item) => `${item}`) : ['기준', '근거', '해석'],
      rows: data.rows.map((row) => Array.isArray(row) ? row.map((cell) => `${cell}`) : [`${row}`]).filter((row) => row.length)
    };
  }
  return null;
}

function shortSourceLabel(value = '') {
  const text = `${value ?? ''}`;
  if (/NIH|ODS/i.test(text)) return 'NIH ODS';
  if (/American Heart Association|AHA/i.test(text)) return 'AHA';
  if (/NCCIH/i.test(text)) return 'NCCIH';
  return text.replace(/Omega-3|Health Professional|Fact Sheet|Supplements|Fish and/gi, '').replace(/\s+/g, ' ').trim().slice(0, 28);
}

function wrapSvgLines(value, limit, maxLines) {
  const chars = [...`${value ?? ''}`.trim()];
  if (!chars.length) return [' '];
  const lines = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += limit) {
    lines.push(chars.slice(index, index + limit).join(''));
  }
  if (chars.length > limit * maxLines && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, limit - 1))}…`;
  return lines;
}

function layerBoxSvg(layer) {
  if (!hasTextBox(layer)) return '';
  const box = textBoxMetrics(layer);
  return `<rect x="${number(layer.x + box.x)}" y="${number(layer.y + box.y)}" width="${number(box.width)}" height="${number(box.height)}" rx="${number(layer.radius ?? 16)}" fill="${escapeXml(layer.backgroundColor || '#000000')}" opacity="${number(layer.backgroundOpacity ?? 0.55)}"/>`;
}

function drawCover(context, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    image.src = src;
  });
}

function downloadUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function filenameFromUrl(url, ext) {
  const raw = `${url}`.split('/').pop()?.split('?')[0] || 'cardnews';
  const name = raw.replace(/\.[a-z0-9]+$/i, '') || 'cardnews';
  return `${name}-text.${ext}`;
}

function displayChannelName(studio = {}) {
  const value = `${studio.channelName || studio.manualBrief?.channelName || '@trlab.insight'}`.trim();
  return value.startsWith('@') ? value : `@${value}`;
}

function loadLayerDraft(key) {
  const storage = localStorageSafe();
  if (!storage || !key) return null;
  try {
    const parsed = JSON.parse(storage.getItem(`trlab.cardnews.${key}`) || 'null');
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function loadDataOverlayDraft(key) {
  const storage = localStorageSafe();
  if (!storage || !key) return null;
  try {
    const parsed = JSON.parse(storage.getItem(`trlab.cardnews.${key}`) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function loadFrameDraft(key) {
  const storage = localStorageSafe();
  if (!storage || !key) return null;
  try {
    const parsed = JSON.parse(storage.getItem(`trlab.cardnews.${key}`) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function loadShapeDraft(key) {
  const storage = localStorageSafe();
  if (!storage || !key) return null;
  try {
    const parsed = JSON.parse(storage.getItem(`trlab.cardnews.${key}`) || 'null');
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveLayerDraft(key, layers) {
  const storage = localStorageSafe();
  if (!storage || !key) return;
  try {
    storage.setItem(`trlab.cardnews.${key}`, JSON.stringify(layers));
  } catch {
    // Ignore localStorage limits.
  }
}

function saveDataOverlayDraft(key, overlay) {
  const storage = localStorageSafe();
  if (!storage || !key || !overlay) return;
  try {
    storage.setItem(`trlab.cardnews.${key}`, JSON.stringify(overlay));
  } catch {
    // Ignore localStorage limits.
  }
}

function saveFrameDraft(key, frame) {
  const storage = localStorageSafe();
  if (!storage || !key || !frame) return;
  try {
    storage.setItem(`trlab.cardnews.${key}`, JSON.stringify(frame));
  } catch {
    // Ignore localStorage limits.
  }
}

function saveShapeDraft(key, shapes) {
  const storage = localStorageSafe();
  if (!storage || !key) return;
  try {
    storage.setItem(`trlab.cardnews.${key}`, JSON.stringify(shapes));
  } catch {
    // Ignore localStorage limits.
  }
}

function localStorageSafe() {
  return globalThis.window?.localStorage || globalThis.localStorage || null;
}

function escapeXml(value) {
  return `${value ?? ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function number(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampDataOverlayPosition(overlay = {}, x, y) {
  const width = Number(overlay.width ?? 936);
  const height = Number(overlay.height ?? 560);
  return {
    x: clamp(Number(x) || 0, 12, Math.max(12, CANVAS_WIDTH - width - 12)),
    y: clamp(Number(y) || 0, 120, Math.max(120, CANVAS_HEIGHT - height - 120))
  };
}

export const __cardTextOverlayEditorTestUtils = {
  defaultTextLayers,
  defaultDataOverlay,
  defaultFrameSettings,
  duplicateTextLayer,
  moveTextLayer,
  removeTextLayer,
  addDataOverlayItem,
  removeDataOverlayItem,
  addDataOverlayRow,
  removeDataOverlayRow,
  clampDataOverlayPosition,
  defaultShapeLayer,
  duplicateShapeLayer,
  nudgeShapeLayer,
  clampShapeLayer,
  initialShapeLayers,
  clampTextLayerPosition,
  nudgeTextLayer,
  shapeLayersSvg,
  dataOverlaySvg,
  frameOverlaySvg,
  initialTextLayers,
  initialDataOverlay,
  initialFrameSettings
};
