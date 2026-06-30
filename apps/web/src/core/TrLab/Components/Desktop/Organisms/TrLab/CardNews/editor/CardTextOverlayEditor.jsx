import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, ImagePlus, Layers, Loader2, MousePointer2, Package, PenLine, Plus, RotateCcw, Search, Sparkles, Trash2, Type, Upload, X } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { useCardTextOverlayActionsController } from '@/core/TrLab/modules/controller/card-news/useCardTextOverlayActionsController';
import { formatCardText } from '@/lib/card-text';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const FONT_FAMILY = 'Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif';
const TEXT_SAFE_MARGIN = 36;
const colorSwatches = ['#ffffff', '#0f172a', '#ef4444', '#2563eb', '#16a34a', '#f59e0b'];
const boxSwatches = ['#000000', '#ffffff', '#0f172a', '#facc15', '#ef4444', '#2563eb'];
const frameSwatches = ['#000000', '#ffffff', '#09090b', '#facc15', '#e5e7eb', '#2563eb'];
const editorBorderClass = 'border-zinc-700/80';
const editorPanelBgClass = 'bg-zinc-900/90';
const editorRailBgClass = 'bg-[#141414]';
const darkButtonClass = 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white';
const lightButtonClass = 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700 hover:text-white';
const darkPanelClass = `rounded-md border ${editorBorderClass} ${editorPanelBgClass} p-2 text-zinc-100 shadow-sm shadow-black/20`;
const darkNestedPanelClass = 'rounded border border-zinc-700/70 bg-[#101010]/80 p-2';
const darkInputClass = 'rounded border border-zinc-700 bg-[#101010] px-2 font-bold text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400';
const darkTextareaClass = 'rounded border border-zinc-700 bg-[#101010] p-2 font-bold text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400';
const darkLabelClass = 'grid gap-1 text-[11px] font-black text-slate-300';
const darkSummaryClass = 'cursor-pointer text-xs font-black text-slate-100';
const SEGMENT_COLORS = ['accent', 'sub', 'green'];
const segmentColorValue = {
  accent: (overlay) => overlay.accent,
  sub: (overlay) => overlay.sub,
  green: () => '#22c55e'
};

export function CardTextOverlayEditor({ image, card, style, studio, backgroundActions, startOpen = false, draftScopeKey = '', cardNavigation }) {
  const scopeKey = draftScopeKey || `${image?.id || image?.url || ''}:${card?.page || 1}`;
  const draftKey = useMemo(() => `overlay:${scopeKey}`, [scopeKey]);
  const dataDraftKey = useMemo(() => `data:${scopeKey}`, [scopeKey]);
  const frameDraftKey = useMemo(() => `frame:${scopeKey}`, [scopeKey]);
  const shapeDraftKey = useMemo(() => `shape:${scopeKey}`, [scopeKey]);
  const productDraftKey = useMemo(() => `product:${scopeKey}`, [scopeKey]);
  const [layers, setLayers] = useState(() => initialTextLayers(draftKey, card, style, studio));
  const [dataOverlay, setDataOverlay] = useState(() => initialDataOverlay(dataDraftKey, card, style));
  const [frame, setFrame] = useState(() => initialFrameSettings(frameDraftKey, card));
  const [shapes, setShapes] = useState(() => initialShapeLayers(shapeDraftKey));
  const [productAssets, setProductAssets] = useState(() => initialProductAssets(productDraftKey, card));
  const [selectedId, setSelectedId] = useState('');
  const [selectedShapeId, setSelectedShapeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [editorOpen, setEditorOpen] = useState(startOpen);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const editRef = useRef(null);
  const commandInputRef = useRef(null);
  const editorActions = useCardTextOverlayActionsController();
  const { busy, error, productAssetBusyId, productAssetError } = editorActions;

  useEffect(() => {
    const nextLayers = initialTextLayers(draftKey, card, style, studio);
    const nextDataOverlay = initialDataOverlay(dataDraftKey, card, style);
    const nextFrame = initialFrameSettings(frameDraftKey, card);
    const nextShapes = initialShapeLayers(shapeDraftKey);
    const nextProducts = initialProductAssets(productDraftKey, card);
    setLayers(nextLayers);
    setDataOverlay(nextDataOverlay);
    setFrame(nextFrame);
    setShapes(nextShapes);
    setProductAssets(nextProducts);
    setSelectedId(nextLayers[0]?.id ?? '');
    setSelectedShapeId('');
    setSelectedProductId('');
    setEditingId('');
    setFinalUrl('');
    let active = true;
    if (image?.url) {
      composeFinalImage(image.url, nextLayers, nextDataOverlay, nextFrame, nextShapes, nextProducts)
        .then((url) => active && setFinalUrl(url))
        .catch(() => {});
    }
    return () => { active = false; };
  }, [draftKey, dataDraftKey, frameDraftKey, shapeDraftKey, productDraftKey, card, style, studio, image?.url]);

  useEffect(() => {
    if (startOpen) setEditorOpen(true);
  }, [startOpen, scopeKey]);

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
    saveProductDraft(productDraftKey, productAssets);
  }, [productDraftKey, productAssets]);

  useEffect(() => {
    if (!editingId) return;
    window.requestAnimationFrame(() => editRef.current?.focus());
  }, [editingId]);

  useEffect(() => {
    if (!commandOpen) return;
    window.requestAnimationFrame(() => commandInputRef.current?.focus());
  }, [commandOpen]);

  const selectedLayer = selectedId ? layers.find((layer) => layer.id === selectedId) || null : null;
  const editingLayer = layers.find((layer) => layer.id === editingId) || selectedLayer;
  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId) || null;
  const selectedProduct = productAssets.find((product) => product.id === selectedProductId) || null;

  function selectTextLayer(id, edit = false) {
    setSelectedId(id);
    setSelectedShapeId('');
    setSelectedProductId('');
    if (edit) setEditingId(id);
  }

  function openCommandPalette() {
    setCommandOpen(true);
    setCommandResult('');
  }

  function closeCommandPalette() {
    setCommandOpen(false);
    setCommandText('');
    setCommandResult('');
  }

  function submitCommandPalette(event) {
    event.preventDefault();
    const command = commandText.trim();
    if (!command) return;
    const result = applyLocalEditCommand(command);
    setCommandResult(result);
  }

  function applyLocalEditCommand(command) {
    const lower = command.toLowerCase();
    const explicitText = extractCommandText(command);
    if (selectedLayer && (explicitText || /문구|텍스트|글|제목|본문|카피/.test(command))) {
      if (explicitText) {
        patchLayer(selectedLayer.id, { text: explicitText });
        return '선택한 문구 레이어의 텍스트를 바꿨어요.';
      }
      return '문구를 실제로 새로 써주는 단계는 AI 명령 API가 필요해요. 지금은 따옴표나 "문구:" 뒤에 넣은 텍스트를 바로 적용할 수 있습니다.';
    }

    if (/배경|이미지/.test(command)) {
      backgroundActions?.setEditInstruction?.(command);
      return '배경 수정 요청에 넣어뒀어요. 오른쪽/왼쪽의 요청 반영 재생성을 누르면 이 카드 배경만 다시 만들 수 있어요.';
    }

    if (/프롬프트|prompt/i.test(command)) {
      const nextPrompt = explicitText || command.replace(/프롬프트|prompt|수정|바꿔줘|변경/gi, '').trim();
      if (nextPrompt) backgroundActions?.setCustomPrompt?.(nextPrompt);
      return nextPrompt ? '배경 프롬프트 입력값을 바꿨어요.' : '프롬프트에 넣을 문장을 함께 적어주세요.';
    }

    if (selectedShape && /박스|도형|강조|원|선|디자인|크기|투명|불투명|오른쪽|왼쪽|위|아래|크게|작게|밝게|어둡게/.test(command)) {
      const patch = shapeCommandPatch(selectedShape, command);
      if (Object.keys(patch).length) {
        patchShape(selectedShape.id, patch);
        return '선택한 도형에 명령을 반영했어요.';
      }
    }

    if (/확정|저장/.test(command)) {
      confirmComposite();
      return '현재 카드 합성을 확정하고 있어요.';
    }

    return '아직 이 명령은 자동 적용 규칙이 없어요. 다음 단계에서 AI 명령 API를 붙이면 문구 재작성, 레이아웃 수정까지 자연어로 처리할 수 있습니다.';
  }

  function selectShapeLayer(id) {
    setSelectedShapeId(id);
    setSelectedId('');
    setSelectedProductId('');
    setEditingId('');
  }

  function selectProductAsset(id) {
    setSelectedProductId(id);
    setSelectedShapeId('');
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

  function beginShapeResize(event, shape, handle) {
    event.preventDefault();
    event.stopPropagation();
    const point = svgPoint(event, svgRef.current);
    dragRef.current = {
      type: 'shape-resize',
      id: shape.id,
      handle,
      x: point.x,
      y: point.y,
      layerX: shape.x,
      layerY: shape.y,
      width: shape.width,
      height: shape.height
    };
    selectShapeLayer(shape.id);
  }

  function beginProductDrag(event, product) {
    event.preventDefault();
    event.stopPropagation();
    const point = svgPoint(event, svgRef.current);
    dragRef.current = { type: 'product', id: product.id, x: point.x, y: point.y, layerX: product.x, layerY: product.y };
    selectProductAsset(product.id);
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
    else if (drag.type === 'product') patchProductAsset(drag.id, patch);
    else if (drag.type === 'shape-resize') patchShape(drag.id, resizeShapePatch(drag, point));
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
    if (selectedProductId) return;
    if (selectedShapeId) duplicateSelectedShape();
    else duplicateSelected();
  }

  function deleteSelection() {
    if (selectedProductId) removeSelectedProduct();
    else if (selectedShapeId) removeSelectedShape();
    else removeSelected();
  }

  function nudgeSelection(dx, dy) {
    if (selectedProductId) {
      setProductAssets((value) => nudgeProductAsset(value, selectedProductId, dx, dy));
      setFinalUrl('');
      return;
    }
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
    setSelectedProductId('');
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
    setSelectedProductId('');
    setEditingId('');
    setFinalUrl('');
  }

  function patchProductAsset(id, patch) {
    setProductAssets((value) => value.map((product) => product.id === id ? clampProductAsset({ ...product, ...patch }) : product));
    setFinalUrl('');
  }

  async function fetchProductAsset(id, mode) {
    await editorActions.fetchProductAsset({ id, mode, productAssets, patchProductAsset, card, studio });
  }

  function addProductAsset(candidate = {}) {
    const product = defaultProductAsset(candidate, productAssets.length);
    setProductAssets((value) => [...value, product]);
    selectProductAsset(product.id);
    setFinalUrl('');
  }

  function addBlankProductAsset() {
    addProductAsset({ name: '추천 제품', role: '짧은 설명을 입력하세요.' });
  }

  function removeSelectedProduct() {
    if (!selectedProduct) return;
    const nextProducts = productAssets.filter((product) => product.id !== selectedProduct.id);
    setProductAssets(nextProducts);
    setSelectedProductId(nextProducts[0]?.id ?? '');
    setFinalUrl('');
  }

  function resetProductAssets() {
    const nextProducts = defaultProductAssets(card);
    setProductAssets(nextProducts);
    setSelectedProductId(nextProducts[0]?.id ?? '');
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
    await editorActions.confirmComposite({
      imageUrl: image.url,
      layers,
      dataOverlay,
      frame,
      shapes,
      productAssets,
      composeFinalImage,
      setFinalUrl,
      setEditorOpen,
      setEditingId
    });
  }

  async function saveFinal() {
    await editorActions.saveFinal({
      imageUrl: image.url,
      finalUrl,
      layers,
      dataOverlay,
      frame,
      shapes,
      productAssets,
      composeFinalImage,
      downloadUrl,
      filenameFromUrl,
      setFinalUrl
    });
  }

  useEffect(() => {
    if (!editorOpen) return undefined;
    function onKeyDown(event) {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (commandOpen) {
          closeCommandPalette();
          return;
        }
        setEditorOpen(false);
        setEditingId('');
        return;
      }

      const key = event.key.toLowerCase();
      const command = event.metaKey || event.ctrlKey;
      if (command && key === 'k') {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (isTypingTarget(event.target)) return;
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
  }, [editorOpen, busy, commandOpen, selectedId, selectedShapeId, selectedProductId, layers, shapes, productAssets, dataOverlay, frame, finalUrl, image?.url]);

  const canDeleteSelection = Boolean(selectedProductId || selectedShapeId || (selectedId && layers.length > 1));
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
    <div className="fixed inset-0 z-[80] bg-[#090909]/88 p-3 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="SVG 카드 편집 스튜디오" className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-700/80 bg-[#121212] shadow-2xl shadow-black/70">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#171717] px-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-indigo-300 shadow-inner shadow-black/30">
              <MousePointer2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-black">카드 편집</div>
              <div className="text-[11px] font-semibold text-zinc-400">캔버스에서 선택하고, 오른쪽에서 필요한 속성만 조정합니다.</div>
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
          addProductAsset={addBlankProductAsset}
          duplicateSelection={duplicateSelection}
          deleteSelection={deleteSelection}
          canDeleteSelection={canDeleteSelection}
          canDuplicateSelection={canDuplicateSelection}
        />

        <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className={`trlab-dark-scrollbar min-h-0 overflow-y-auto overflow-x-hidden border-r border-zinc-800 ${editorRailBgClass} p-3`}>
            <ProductionPromptPanel
              card={card}
              actions={backgroundActions}
              image={image}
            />
            <div className="mb-3 mt-3 flex items-center gap-2 text-xs font-black text-zinc-200">
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
              <ProductAssetControls
                card={card}
                productAssets={productAssets}
                selectedProduct={selectedProduct}
                selectedProductId={selectedProductId}
                selectProductAsset={selectProductAsset}
                patchProductAsset={patchProductAsset}
                addProductAsset={addProductAsset}
                removeSelectedProduct={removeSelectedProduct}
                resetProductAssets={resetProductAssets}
                productAssetBusyId={productAssetBusyId}
                productAssetError={productAssetError}
                fetchProductAsset={fetchProductAsset}
              />
            </div>
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

          <main className="trlab-dark-scrollbar min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,#3a3a3a_0,#1c1c1c_38%,#0b0b0b_100%)] p-5">
            <div className="mx-auto flex min-h-full max-w-[min(78vh,820px)] items-center justify-center">
              <div className="relative aspect-[4/5] max-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-md border border-zinc-500/80 bg-zinc-900 shadow-2xl shadow-black/55 ring-1 ring-white/5">
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
                  <SvgShapeLayers shapes={shapes} selectedId={selectedShapeId} beginDrag={beginShapeDrag} beginResize={beginShapeResize} />
                  <SvgProductAssets products={productAssets} selectedId={selectedProductId} beginDrag={beginProductDrag} />
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

          <aside className={`trlab-dark-scrollbar min-h-0 overflow-y-auto border-l border-zinc-800 ${editorRailBgClass} p-3 text-zinc-100`}>
            <CardNavigationPanel navigation={cardNavigation} />
            <div className="mb-3">
              <div className="text-xs font-black text-zinc-100">속성</div>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-zinc-400">선택한 요소와 카드 전체 레이어를 조정합니다.</p>
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
        <FloatingEditCommand
          open={commandOpen}
          value={commandText}
          result={commandResult}
          context={commandContextLabel({ card, selectedLayer, selectedShape, selectedProduct })}
          inputRef={commandInputRef}
          onChange={setCommandText}
          onSubmit={submitCommandPalette}
          onClose={closeCommandPalette}
        />
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

function FloatingEditCommand({ open, value, result, context, inputRef, onChange, onSubmit, onClose }) {
  if (!open) return null;
  return (
    <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
      <form
        className="w-full max-w-2xl rounded-lg border border-zinc-600/90 bg-[#151515]/95 p-2 shadow-2xl shadow-black/70 ring-1 ring-white/10 backdrop-blur"
        onSubmit={onSubmit}
      >
        <div className="mb-1 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0 text-[11px] font-black text-zinc-300">
            AI 편집 요청 <span className="font-semibold text-zinc-500">· {context}</span>
          </div>
          <button type="button" className="rounded px-2 py-1 text-[11px] font-black text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={onClose}>
            Esc
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-300" />
          <input
            ref={inputRef}
            className="h-10 min-w-0 flex-1 rounded border border-zinc-700 bg-[#0d0d0d] px-3 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 선택한 문구를 “피부 타입별 스킨부스터 가이드”로 바꿔줘"
          />
          <Button size="sm" className="h-10 bg-indigo-600 text-white hover:bg-indigo-500" disabled={!value.trim()}>
            적용
          </Button>
        </div>
        {result ? <p className="mt-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] font-semibold leading-4 text-zinc-300">{result}</p> : null}
        <p className="mt-2 px-1 text-[10px] font-semibold text-zinc-500">
          Cmd/Ctrl+K로 열기 · Enter 적용 · 배경 명령은 이 카드의 배경 수정 요청으로 연결됩니다.
        </p>
      </form>
    </div>
  );
}

function QuickToolbar({ addTextLayer, addShape, addProductAsset, duplicateSelection, deleteSelection, canDeleteSelection, canDuplicateSelection }) {
  const toolClass = `h-8 px-2 text-[11px] font-black ${darkButtonClass}`;
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-zinc-800 bg-[#111111] px-4 text-white">
      <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 p-1 shadow-inner shadow-black/20">
        <span className="px-1 text-[11px] font-black text-zinc-400">추가</span>
        <Button size="sm" variant="outline" className={toolClass} onClick={addTextLayer}>
          <Type className="h-3.5 w-3.5" />
          문구 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">T</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={addProductAsset}>
          <Package className="h-3.5 w-3.5" />
          제품
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('rect')}>
          <Plus className="h-3.5 w-3.5" />
          박스 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">R</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('highlight')}>
          <Plus className="h-3.5 w-3.5" />
          강조 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">H</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('circle')}>
          <Plus className="h-3.5 w-3.5" />
          원 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">O</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={() => addShape('line')}>
          <Plus className="h-3.5 w-3.5" />
          선 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">L</kbd>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 p-1 shadow-inner shadow-black/20">
        <span className="px-1 text-[11px] font-black text-zinc-400">선택</span>
        <Button size="sm" variant="outline" className={toolClass} onClick={duplicateSelection} disabled={!canDuplicateSelection}>
          <Copy className="h-3.5 w-3.5" />
          복제 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">⌘D</kbd>
        </Button>
        <Button size="sm" variant="outline" className={toolClass} onClick={deleteSelection} disabled={!canDeleteSelection}>
          <Trash2 className="h-3.5 w-3.5" />
          삭제 <kbd className="rounded bg-zinc-800 px-1 text-[10px]">Del</kbd>
        </Button>
      </div>
    </div>
  );
}

function ProductionPromptPanel({ card, actions, image }) {
  const brief = card?.visualBrief ?? {};
  const prompt = actions?.customPrompt ?? actions?.prompt ?? brief.backgroundPrompt ?? card?.visualPrompt ?? '';
  const pexelsQuery = brief.pexelsQuery || '';
  async function uploadBackground(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    actions?.setBackgroundImage?.({
      id: `uploaded-bg-${Date.now()}`,
      url: dataUrl,
      prompt,
      provider: 'uploaded',
      model: file.name
    });
    event.target.value = '';
  }
  return (
    <details className={`${darkPanelClass} border-indigo-500/40 bg-indigo-950/20`} open>
      <summary className={darkSummaryClass}>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-indigo-300" />생성 패널</span>
      </summary>
      <div className="mt-2 space-y-2">
        <div className={darkNestedPanelClass}>
          <label className={darkLabelClass}>
            배경 프롬프트
            <textarea
              className={`${darkTextareaClass} min-h-36 resize-y text-[11px] leading-4`}
              value={actions?.promptLoading ? '프롬프트 구성 중...' : prompt}
              onChange={(event) => actions?.setCustomPrompt?.(event.target.value)}
              disabled={actions?.promptLoading}
              placeholder="배경을 어떻게 만들지 직접 입력하세요."
            />
          </label>
          <Button size="sm" variant="outline" className={`mt-2 w-full ${lightButtonClass}`} onClick={actions?.copyPrompt} disabled={!prompt || actions?.promptLoading}>
            <Copy className="h-4 w-4" />
            프롬프트 복사
          </Button>
        </div>
        {brief.scenario ? (
          <p className="rounded border border-slate-700 bg-slate-950/70 p-2 text-[11px] font-bold leading-4 text-slate-300">{brief.scenario}</p>
        ) : null}
        {pexelsQuery ? (
          <div className="rounded border border-sky-500/20 bg-sky-950/25 p-2 text-[11px] font-bold leading-4 text-sky-200">
            <div className="font-black">검색 키워드</div>
            <p className="mt-1 break-words">{pexelsQuery}</p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={actions?.generateFresh} disabled={actions?.loading || actions?.promptLoading}>
            {actions?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Pexels
          </Button>
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={actions?.generateAi} disabled={actions?.loading || actions?.promptLoading}>
            {actions?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI 생성
          </Button>
        </div>
        <BackgroundHistoryPanel
          history={actions?.backgroundHistory}
          currentUrl={image?.url}
          selectBackgroundImage={actions?.selectBackgroundImage}
        />
        <label className={`${darkLabelClass} rounded border border-slate-700 bg-slate-950/70 p-2`}>
          직접 배경 업로드
          <span className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-800 text-[11px] font-black text-slate-100 hover:bg-slate-700">
            <Upload className="h-3.5 w-3.5" />
            파일 선택
          </span>
          <input className="sr-only" type="file" accept="image/*" onChange={uploadBackground} />
        </label>
        <label className={darkLabelClass}>
          배경 수정 요청
          <textarea
            className={`${darkTextareaClass} min-h-16 resize-y text-xs leading-5`}
            value={actions?.editInstruction ?? ''}
            onChange={(event) => actions?.setEditInstruction?.(event.target.value)}
            placeholder="예: 배경을 밝게, 여백을 더 많이"
          />
        </label>
        <Button size="sm" className="w-full" onClick={actions?.generateRevision} disabled={actions?.loading || actions?.promptLoading || !actions?.editInstruction?.trim() || image?.provider === 'blank-canvas'}>
          {actions?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          수정 반영
        </Button>
        {actions?.error ? <p className="rounded border border-red-900/40 bg-red-950/60 p-2 text-[11px] font-semibold leading-4 text-red-200">{actions.error}</p> : null}
      </div>
    </details>
  );
}

function BackgroundHistoryPanel({ history = [], currentUrl = '', selectBackgroundImage }) {
  const items = Array.isArray(history) ? history.filter((item) => item?.url).slice(0, 12) : [];
  if (!items.length) {
    return (
      <div className="rounded border border-dashed border-slate-700 bg-slate-950/50 p-2 text-[11px] font-bold leading-4 text-slate-400">
        배경을 생성하거나 업로드하면 후보가 여기에 남습니다.
      </div>
    );
  }
  return (
    <div className={darkNestedPanelClass}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black text-slate-300">배경 후보</span>
        <span className="text-[10px] font-bold text-slate-500">{items.length}개</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item, index) => (
          <button
            key={`${item.url}-${index}`}
            type="button"
            className={`group overflow-hidden rounded border bg-slate-900 text-left ${currentUrl === item.url ? 'border-indigo-400 ring-2 ring-indigo-500/30' : 'border-slate-700 hover:border-slate-500'}`}
            onClick={() => selectBackgroundImage?.(item)}
            title={item.prompt || item.provider || '배경 후보'}
          >
            <img src={item.url} alt={`배경 후보 ${index + 1}`} className="aspect-[4/5] w-full object-cover" draggable={false} />
            <div className="truncate px-1 py-1 text-[9px] font-black text-slate-300">
              {currentUrl === item.url ? '선택됨' : item.provider || `후보 ${index + 1}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CardNavigationPanel({ navigation }) {
  const cards = Array.isArray(navigation?.cards) ? navigation.cards : [];
  if (!cards.length || !navigation?.onSelectCard) return null;
  const selected = Number(navigation.selected ?? 0);
  return (
    <div className="mb-3 rounded-md border border-zinc-700/80 bg-[#121212] p-2 shadow-sm shadow-black/20">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => navigation.onSelectCard(Math.max(0, selected - 1))} disabled={selected <= 0}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-[11px] font-black text-zinc-300">{selected + 1}/{cards.length}</span>
        <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => navigation.onSelectCard(Math.min(cards.length - 1, selected + 1))} disabled={selected >= cards.length - 1}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {cards.map((item, index) => (
          <button
            key={item.page ?? index}
            type="button"
            className={`aspect-[4/5] rounded border p-1 text-[10px] font-black ${selected === index ? 'border-indigo-400 bg-zinc-800 text-white shadow-inner shadow-indigo-500/20' : 'border-zinc-800 bg-[#181818] text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white'}`}
            onClick={() => navigation.onSelectCard(index)}
            title={item.title}
          >
            {String(item.page ?? index + 1).padStart(2, '0')}
          </button>
        ))}
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
    ['AI 편집 요청', '⌘/Ctrl + K'],
    ['PNG 저장', '⌘/Ctrl + S'],
    ['확정', '⌘/Ctrl + Enter'],
    ['닫기', 'Esc']
  ];
  return (
    <details className="mt-3 rounded-md border border-zinc-700/80 bg-[#121212] p-2">
      <summary className="cursor-pointer text-xs font-black text-zinc-200">단축키</summary>
      <div className="mt-2 grid gap-1">
        {rows.map(([label, key]) => (
          <div key={label} className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-[#181818] px-2 py-1.5 text-[11px] font-bold text-zinc-300">
            <span>{label}</span>
            <kbd className="shrink-0 rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] font-black text-indigo-200">{key}</kbd>
          </div>
        ))}
      </div>
    </details>
  );
}

function LayerListControls({ layers, selectedId, selectTextLayer, setEditingId, duplicateSelected, moveSelected, resetLayers }) {
  return (
    <details className="min-w-0 rounded-md border border-zinc-700/80 bg-[#121212] p-2" open>
      <summary className="cursor-pointer text-xs font-black text-zinc-100">문구 레이어</summary>
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

function ProductAssetControls({ card, productAssets, selectedProduct, selectedProductId, selectProductAsset, patchProductAsset, addProductAsset, removeSelectedProduct, resetProductAssets, productAssetBusyId, productAssetError, fetchProductAsset }) {
  const candidates = Array.isArray(card?.visualBrief?.productCandidates) ? card.visualBrief.productCandidates.filter((item) => item?.name).slice(0, 6) : [];
  async function uploadProductImage(event, product) {
    const file = event.target.files?.[0];
    if (!file || !product) return;
    const dataUrl = await fileToDataUrl(file);
    patchProductAsset(product.id, { imageUrl: dataUrl });
    event.target.value = '';
  }
  return (
    <details className={darkPanelClass} open>
      <summary className={darkSummaryClass}>
        <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-indigo-300" />제품 추천 슬롯</span>
      </summary>
      <div className="mt-2 space-y-2">
        <p className="rounded border border-indigo-500/20 bg-indigo-950/25 p-2 text-[11px] font-bold leading-4 text-indigo-100">
          제품 이미지를 URL이나 파일로 넣으면 배경 위에 제품 카드와 설명이 합성됩니다. 투명 PNG를 쓰면 제품만 잘라 올린 느낌이 가장 좋아요.
        </p>
        <div className="grid gap-1.5">
          {productAssets.map((product, index) => (
            <button
              key={product.id}
              type="button"
              className={`min-w-0 rounded-md border px-2 py-1.5 text-left text-[11px] font-black ${selectedProductId === product.id ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600'}`}
              onClick={() => selectProductAsset(product.id)}
            >
              {index + 1}. {product.name || '제품명'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => addProductAsset()}>
            <Plus className="h-4 w-4" />
            빈 슬롯
          </Button>
          <Button size="sm" variant="outline" className={lightButtonClass} onClick={resetProductAssets}>
            <RotateCcw className="h-4 w-4" />
            후보 복원
          </Button>
        </div>
        {candidates.length ? (
          <div className={darkNestedPanelClass}>
            <div className="mb-1 text-[11px] font-black text-slate-300">기획 후보에서 추가</div>
            <div className="grid gap-1">
              {candidates.map((candidate) => (
                <Button key={candidate.name} size="sm" variant="outline" className={`${lightButtonClass} justify-start`} onClick={() => addProductAsset(candidate)}>
                  {candidate.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {selectedProduct ? (
          <div className={`${darkNestedPanelClass} space-y-2`}>
            <label className={darkLabelClass}>
              제품명
              <input className={`${darkInputClass} h-8 text-xs`} value={selectedProduct.name ?? ''} onChange={(event) => patchProductAsset(selectedProduct.id, { name: event.target.value })} />
            </label>
            <label className={darkLabelClass}>
              설명
              <textarea className={`${darkTextareaClass} min-h-14 resize-y text-xs leading-5`} value={selectedProduct.description ?? ''} onChange={(event) => patchProductAsset(selectedProduct.id, { description: event.target.value })} />
            </label>
            <label className={darkLabelClass}>
              제품 이미지 URL
              <input className={`${darkInputClass} h-8 text-xs`} value={selectedProduct.imageUrl ?? ''} onChange={(event) => patchProductAsset(selectedProduct.id, { imageUrl: event.target.value })} placeholder="https://... 또는 data:image/png;base64,..." />
            </label>
            <label className={darkLabelClass}>
              검색/생성 키워드
              <input className={`${darkInputClass} h-8 text-xs`} value={selectedProduct.searchQuery ?? selectedProduct.name ?? ''} onChange={(event) => patchProductAsset(selectedProduct.id, { searchQuery: event.target.value })} placeholder="예: lip tint product cutout" />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => fetchProductAsset?.(selectedProduct.id, 'search')} disabled={productAssetBusyId === selectedProduct.id}>
                {productAssetBusyId === selectedProduct.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                검색 삽입
              </Button>
              <Button size="sm" variant="outline" className={lightButtonClass} onClick={() => fetchProductAsset?.(selectedProduct.id, 'generate')} disabled={productAssetBusyId === selectedProduct.id}>
                {productAssetBusyId === selectedProduct.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI 제품컷
              </Button>
            </div>
            {selectedProduct.sourceProvider ? (
              <div className="rounded border border-slate-700 bg-slate-950/70 p-2 text-[11px] font-semibold leading-4 text-slate-300">
                <b className="text-slate-100">소스</b> {selectedProduct.sourceProvider}
                {selectedProduct.sourceLabel ? ` · ${selectedProduct.sourceLabel}` : ''}
                {selectedProduct.sourceUrl ? <a className="ml-1 font-black text-indigo-300" href={selectedProduct.sourceUrl} target="_blank" rel="noreferrer">보기</a> : null}
              </div>
            ) : null}
            {productAssetError ? <p className="rounded border border-red-900/40 bg-red-950/60 p-2 text-[11px] font-semibold leading-4 text-red-200">{productAssetError}</p> : null}
            <label className={darkLabelClass}>
              파일 업로드
              <input className="text-[11px] font-bold text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-xs file:font-black file:text-white" type="file" accept="image/*" onChange={(event) => uploadProductImage(event, selectedProduct)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={darkLabelClass}>
                X {Math.round(selectedProduct.x)}
                <input type="range" min="24" max="900" value={selectedProduct.x} onChange={(event) => patchProductAsset(selectedProduct.id, { x: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                Y {Math.round(selectedProduct.y)}
                <input type="range" min="120" max="1060" value={selectedProduct.y} onChange={(event) => patchProductAsset(selectedProduct.id, { y: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                너비 {Math.round(selectedProduct.width)}
                <input type="range" min="260" max="920" value={selectedProduct.width} onChange={(event) => patchProductAsset(selectedProduct.id, { width: Number(event.target.value) })} />
              </label>
              <label className={darkLabelClass}>
                높이 {Math.round(selectedProduct.height)}
                <input type="range" min="120" max="360" value={selectedProduct.height} onChange={(event) => patchProductAsset(selectedProduct.id, { height: Number(event.target.value) })} />
              </label>
            </div>
            <Button size="sm" variant="outline" className={`w-full ${lightButtonClass}`} onClick={removeSelectedProduct}>
              <Trash2 className="h-4 w-4" />
              제품 슬롯 삭제
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result}`);
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
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

function commandContextLabel({ card, selectedLayer, selectedShape, selectedProduct } = {}) {
  const cardLabel = `카드 ${String(card?.page ?? 1).padStart(2, '0')}`;
  if (selectedLayer) return `${cardLabel} · 문구 선택`;
  if (selectedShape) return `${cardLabel} · ${shapeLabel(selectedShape)} 선택`;
  if (selectedProduct) return `${cardLabel} · 제품 선택`;
  return `${cardLabel} · 카드 전체`;
}

function extractCommandText(command = '') {
  const quoted = command.match(/[“"']([^“"']{1,240})[”"']/);
  if (quoted?.[1]) return quoted[1].trim();
  const colon = command.match(/(?:문구|텍스트|글|제목|본문|카피)\s*[:：]\s*(.+)$/);
  if (colon?.[1]) return colon[1].trim().slice(0, 240);
  return '';
}

function shapeCommandPatch(shape = {}, command = '') {
  const patch = {};
  const step = /많이|크게/.test(command) ? 80 : 32;
  if (/오른쪽/.test(command)) patch.x = clamp(Number(shape.x ?? 0) + step, 0, CANVAS_WIDTH - Number(shape.width ?? 0));
  if (/왼쪽/.test(command)) patch.x = clamp(Number(shape.x ?? 0) - step, 0, CANVAS_WIDTH - Number(shape.width ?? 0));
  if (/아래/.test(command)) patch.y = clamp(Number(shape.y ?? 0) + step, 0, CANVAS_HEIGHT - Number(shape.height ?? 0));
  if (/위/.test(command)) patch.y = clamp(Number(shape.y ?? 0) - step, 0, CANVAS_HEIGHT - Number(shape.height ?? 0));
  if (/크게|키워|넓게/.test(command)) {
    patch.width = clamp(Number(shape.width ?? 0) + step, 20, CANVAS_WIDTH - Number(shape.x ?? 0));
    patch.height = clamp(Number(shape.height ?? 0) + Math.round(step * 0.6), 8, CANVAS_HEIGHT - Number(shape.y ?? 0));
  }
  if (/작게|줄여/.test(command)) {
    patch.width = Math.max(20, Number(shape.width ?? 0) - step);
    patch.height = Math.max(8, Number(shape.height ?? 0) - Math.round(step * 0.6));
  }
  if (/투명|연하게/.test(command)) patch.opacity = clamp(Number(shape.opacity ?? 0.5) - 0.15, 0.05, 1);
  if (/불투명|진하게|어둡게/.test(command)) patch.opacity = clamp(Number(shape.opacity ?? 0.5) + 0.15, 0.05, 1);
  if (/밝게/.test(command)) patch.fill = '#ffffff';
  return patch;
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

function SvgShapeLayers({ shapes, selectedId, beginDrag, beginResize }) {
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
          {selectedId === shape.id ? <ShapeSelectionBox shape={shape} beginResize={beginResize} /> : null}
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

function ShapeSelectionBox({ shape, beginResize }) {
  const pad = 10;
  const handles = shape.type === 'line' ? [] : shapeResizeHandles(shape, pad);
  return (
    <g>
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
      {handles.map((handle) => (
        <rect
          key={handle.id}
          x={handle.x - 12}
          y={handle.y - 12}
          width="24"
          height="24"
          rx="7"
          fill="#f8fafc"
          stroke="#f59e0b"
          strokeWidth="4"
          className="cursor-nwse-resize"
          onPointerDown={(event) => beginResize?.(event, shape, handle.id)}
        />
      ))}
    </g>
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

function SvgProductAssets({ products = [], selectedId, beginDrag }) {
  return (
    <g>
      {products.map((product) => (
        <g key={product.id} className="cursor-move" onPointerDown={(event) => beginDrag(event, product)}>
          <rect x={product.x} y={product.y} width={product.width} height={product.height} rx="26" fill="#fffffff2" stroke={selectedId === product.id ? '#6366f1' : '#e2e8f0'} strokeWidth={selectedId === product.id ? 5 : 3} />
          <rect x={product.x + 18} y={product.y + 18} width={product.imageBoxWidth} height={product.height - 36} rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
          {product.imageUrl ? (
            <image href={product.imageUrl} x={product.x + 28} y={product.y + 28} width={product.imageBoxWidth - 20} height={product.height - 56} preserveAspectRatio="xMidYMid meet" />
          ) : (
            <g>
              <rect x={product.x + 54} y={product.y + 54} width={product.imageBoxWidth - 108} height={product.height - 108} rx="18" fill="#e2e8f0" />
              <text x={product.x + product.imageBoxWidth / 2 + 18} y={product.y + product.height / 2 + 8} fontFamily={FONT_FAMILY} fontSize="18" fontWeight="900" fill="#64748b" textAnchor="middle">제품 이미지</text>
            </g>
          )}
          <text x={product.x + product.imageBoxWidth + 42} y={product.y + 52} fontFamily={FONT_FAMILY} fontSize="26" fontWeight="900" fill="#0f172a">
            {wrapSvgLines(product.name, 18, 2).map((line, index) => <tspan key={`${product.id}-name-${index}`} x={product.x + product.imageBoxWidth + 42} dy={index === 0 ? 0 : 32}>{line}</tspan>)}
          </text>
          <text x={product.x + product.imageBoxWidth + 42} y={product.y + 124} fontFamily={FONT_FAMILY} fontSize="18" fontWeight="800" fill="#475569">
            {wrapSvgLines(product.description, 26, 3).map((line, index) => <tspan key={`${product.id}-desc-${index}`} x={product.x + product.imageBoxWidth + 42} dy={index === 0 ? 0 : 25}>{line}</tspan>)}
          </text>
        </g>
      ))}
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
  const emphasisText = cleanEmphasisText(card.emphasis);
  const base = [
    {
      id: 'title',
      text: wrapForEditor(card.title || studio.label || '카드 제목', isCover ? 9 : 10),
      x: isCover ? 78 : 76,
      y: isCover ? 900 : 150,
      fontSize: isCover ? 84 : 62,
      lineHeight: 1.08,
      color: titleColor,
      weight: 900,
      align: 'start',
      ...defaultBoxStyle(false)
    }
  ];
  if (emphasisText) {
    base.push({
      id: 'emphasis',
      text: emphasisText,
      x: isCover ? 84 : 82,
      y: isCover ? 780 : 255,
      fontSize: isCover ? 34 : 30,
      lineHeight: 1.16,
      color: style.accent || '#ef4444',
      weight: 900,
      align: 'start',
      ...defaultBoxStyle(false)
    });
  }
  base.push(
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
  );

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

function initialProductAssets(draftKey, card) {
  const draft = loadProductDraft(draftKey);
  if (Array.isArray(draft)) return draft.map(clampProductAsset).filter((product) => product.name).slice(0, 6);
  return defaultProductAssets(card);
}

function defaultProductAssets(card = {}) {
  const candidates = Array.isArray(card.visualBrief?.productCandidates) ? card.visualBrief.productCandidates : [];
  const shouldShow = candidates.length || /대표\s*제품|제품\s*추천|브랜드|립오일|틴티드|검색\s*키워드|brand_map|product_reveal|search_keywords/i.test([
    card.role,
    card.layout,
    card.title,
    card.body,
    card.visualPrompt,
    card.visualBrief?.scenarioType,
    card.visualBrief?.scenario
  ].filter(Boolean).join(' '));
  if (!shouldShow) return [];
  const source = candidates.length ? candidates : [{ name: card.title || '추천 제품', role: card.emphasis || '대표 제품 예시' }];
  return source.slice(0, 3).map((candidate, index) => defaultProductAsset(candidate, index));
}

function defaultProductAsset(candidate = {}, index = 0) {
  const top = 360 + index * 190;
  return clampProductAsset({
    id: `product-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${candidate.name ?? candidate.label ?? '추천 제품'}`.trim(),
    description: `${candidate.role ?? candidate.reason ?? candidate.imageUsePolicy ?? '왜 추천하는지 짧게 적어주세요.'}`.trim(),
    imageUrl: `${candidate.imageUrl ?? candidate.url ?? ''}`.trim(),
    x: 92,
    y: top,
    width: 896,
    height: 160,
    imageBoxWidth: 170
  });
}

function clampProductAsset(product = {}) {
  const width = clamp(Number(product.width ?? 896), 260, 980);
  const height = clamp(Number(product.height ?? 160), 120, 380);
  return {
    ...product,
    id: `${product.id ?? `product-${Date.now()}`}`,
    name: `${product.name ?? '추천 제품'}`.slice(0, 80),
    description: `${product.description ?? ''}`.slice(0, 180),
    imageUrl: `${product.imageUrl ?? ''}`.trim(),
    width,
    height,
    imageBoxWidth: clamp(Number(product.imageBoxWidth ?? Math.min(190, width * 0.32)), 110, Math.min(300, width - 140)),
    x: clamp(Number(product.x ?? 92), 0, Math.max(0, CANVAS_WIDTH - width)),
    y: clamp(Number(product.y ?? 360), 0, Math.max(0, CANVAS_HEIGHT - height))
  };
}

function nudgeProductAsset(products = [], id, dx, dy) {
  return products.map((product) => product.id === id
    ? clampProductAsset({ ...product, x: Number(product.x ?? 0) + dx, y: Number(product.y ?? 0) + dy })
    : product);
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
  const normalizedDraft = normalizeDraftGenericTextLayers(normalizeDraftCaptionBoxes(normalizeDraftTitleWrap(draft, card, style, studio), card));
  return clampTextLayers(normalizedDraft || defaultTextLayers(card, style, studio));
}

function cleanEmphasisText(value) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!text || isGenericDataLabel(text)) return '';
  return text;
}

function normalizeDraftGenericTextLayers(draft) {
  if (!Array.isArray(draft) || !draft.length) return draft;
  const filtered = draft.filter((layer) => !(layer?.id === 'emphasis' && !cleanEmphasisText(layer.text)));
  return filtered.length ? filtered : null;
}

function normalizeDraftTitleWrap(draft, card, style, studio) {
  if (!Array.isArray(draft) || !draft.length) return null;
  const defaultLayers = defaultTextLayers(card, style, studio);
  const defaultTitle = defaultLayers.find((layer) => layer.id === 'title');
  if (!defaultTitle) return draft;
  const titleText = `${card?.title || studio?.label || '카드 제목'}`.replace(/\s+/g, '');
  return draft.map((layer) => {
    if (layer?.id !== 'title') return layer;
    const draftText = `${layer.text ?? ''}`.replace(/\s+/g, '');
    return draftText && draftText === titleText ? { ...layer, text: defaultTitle.text } : layer;
  });
}

function normalizeDraftCaptionBoxes(draft, card) {
  if (!Array.isArray(draft) || !draft.length) return null;
  const isCover = card?.layout === 'cover_text' || card?.layout === 'cover_photo' || card?.role === 'cover';
  if (!isCover) return draft;
  const bodyText = `${formatCardText(card?.body || '').trim()}`.replace(/\s+/g, '');
  return draft.map((layer) => {
    if (layer?.id !== 'body') return layer;
    const draftText = `${layer.text ?? ''}`.replace(/\s+/g, '');
    const legacyDefaultBox = draftText && draftText === bodyText
      && `${layer.backgroundColor ?? ''}` === '#000000'
      && Number(layer.backgroundOpacity ?? 0) === 0.55;
    return legacyDefaultBox ? { ...layer, backgroundOpacity: 0 } : layer;
  });
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

function resizeShapePatch(drag = {}, point = {}) {
  const minWidth = 24;
  const minHeight = 16;
  const dx = Number(point.x ?? 0) - Number(drag.x ?? 0);
  const dy = Number(point.y ?? 0) - Number(drag.y ?? 0);
  const fromLeft = `${drag.handle}`.includes('w');
  const fromRight = `${drag.handle}`.includes('e');
  const fromTop = `${drag.handle}`.includes('n');
  const fromBottom = `${drag.handle}`.includes('s');
  let x = Number(drag.layerX ?? 0);
  let y = Number(drag.layerY ?? 0);
  let width = Number(drag.width ?? minWidth);
  let height = Number(drag.height ?? minHeight);

  if (fromLeft) {
    const nextWidth = clamp(width - dx, minWidth, x + width);
    x += width - nextWidth;
    width = nextWidth;
  }
  if (fromRight) width = clamp(width + dx, minWidth, CANVAS_WIDTH - x);
  if (fromTop) {
    const nextHeight = clamp(height - dy, minHeight, y + height);
    y += height - nextHeight;
    height = nextHeight;
  }
  if (fromBottom) height = clamp(height + dy, minHeight, CANVAS_HEIGHT - y);

  return { x, y, width, height };
}

function shapeResizeHandles(shape = {}, pad = 0) {
  const left = Number(shape.x ?? 0) - pad;
  const top = Number(shape.y ?? 0) - pad;
  const right = Number(shape.x ?? 0) + Number(shape.width ?? 0) + pad;
  const bottom = Number(shape.y ?? 0) + Number(shape.height ?? 0) + pad;
  return [
    { id: 'nw', x: left, y: top },
    { id: 'ne', x: right, y: top },
    { id: 'sw', x: left, y: bottom },
    { id: 'se', x: right, y: bottom }
  ];
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
  return draft ? normalizeFrameDraft({ ...base, ...draft }, card) : base;
}

function defaultFrameSettings(card = {}) {
  const hasVerifiedData = Boolean(card.visualData);
  const isCover = card.layout === 'cover_text' || card.layout === 'cover_photo' || card.role === 'cover';
  return {
    shadeOpacity: hasVerifiedData ? 0.08 : 0,
    safeAreaEnabled: hasVerifiedData,
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

function normalizeFrameDraft(frame = {}, card = {}) {
  const isCover = card.layout === 'cover_text' || card.layout === 'cover_photo' || card.role === 'cover';
  if (!isCover || card.visualData) return frame;
  const legacyCoverSafeArea = frame.safeAreaEnabled
    && Number(frame.safeAreaX) === 64
    && Number(frame.safeAreaY) === 874
    && Number(frame.safeAreaWidth) === 952
    && Number(frame.safeAreaHeight) === 330
    && Number(frame.safeAreaOpacity) === 0.34;
  const legacyCoverShade = Number(frame.shadeOpacity ?? 0) === 0.14;
  return {
    ...frame,
    safeAreaEnabled: legacyCoverSafeArea ? false : frame.safeAreaEnabled,
    shadeOpacity: legacyCoverShade ? 0 : frame.shadeOpacity
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
  const fontSize = Number(layer.fontSize ?? 36);
  const textWidth = Math.min(
    CANVAS_WIDTH - TEXT_SAFE_MARGIN * 2,
    Math.max(42, ...lines.map((line) => visualTextWidth(line, fontSize)))
  );
  const textHeight = Math.max(
    fontSize,
    (lines.length - 1) * fontSize * Number(layer.lineHeight ?? 1.16) + fontSize * 1.08
  );
  const paddingX = Number(layer.paddingX ?? 26);
  const paddingY = Number(layer.paddingY ?? 16);
  const width = textWidth + paddingX * 2;
  const height = textHeight + paddingY * 2;
  const anchorX = layer.align === 'middle' ? -textWidth / 2 : layer.align === 'end' ? -textWidth : 0;
  return {
    x: anchorX - paddingX,
    y: -fontSize * 0.94 - paddingY,
    width,
    height
  };
}

function clampTextLayerPosition(layer = {}) {
  const box = textBoxMetrics(layer);
  const minX = TEXT_SAFE_MARGIN - box.x;
  const maxX = CANVAS_WIDTH - TEXT_SAFE_MARGIN - box.x - box.width;
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
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if ([...candidate].length <= limit || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.flatMap((line) => chunkLongWord(line, limit)).slice(0, 3).join('\n');
  }
  return chunkLongWord(text, limit).slice(0, 3).join('\n');
}

function chunkLongWord(value, limit) {
  const chars = [...`${value ?? ''}`];
  const lines = [];
  for (let index = 0; index < chars.length; index += limit) lines.push(chars.slice(index, index + limit).join(''));
  return lines;
}

function visualTextWidth(value, fontSize) {
  return [...`${value ?? ''}`].reduce((sum, char) => {
    if (/\s/.test(char)) return sum + fontSize * 0.34;
    if (/[\u3131-\u318E\uAC00-\uD7A3]/.test(char)) return sum + fontSize * 0.92;
    if (/[A-Z0-9]/.test(char)) return sum + fontSize * 0.66;
    return sum + fontSize * 0.56;
  }, 0);
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

async function composeFinalImage(url, layers, dataOverlay, frame, shapes = [], products = []) {
  const canvas = Object.assign(document.createElement('canvas'), { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const baseImage = await loadImage(url);
  drawCover(context, baseImage, CANVAS_WIDTH, CANVAS_HEIGHT);
  await drawProductAssets(context, products);
  const overlayUrl = URL.createObjectURL(new Blob([overlaySvg(layers, dataOverlay, frame, shapes)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const overlayImage = await loadImage(overlayUrl);
    context.drawImage(overlayImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } finally {
    URL.revokeObjectURL(overlayUrl);
  }
  return canvas.toDataURL('image/png');
}

async function drawProductAssets(context, products = []) {
  for (const product of products) {
    const item = clampProductAsset(product);
    context.save();
    drawRoundedRect(context, item.x, item.y, item.width, item.height, 26);
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#e2e8f0';
    context.stroke();

    const imageX = item.x + 18;
    const imageY = item.y + 18;
    const imageW = item.imageBoxWidth;
    const imageH = item.height - 36;
    drawRoundedRect(context, imageX, imageY, imageW, imageH, 20);
    context.fillStyle = '#f8fafc';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#e2e8f0';
    context.stroke();

    if (item.imageUrl) {
      try {
        const image = await loadImage(item.imageUrl);
        drawContain(context, image, imageX + 10, imageY + 10, imageW - 20, imageH - 20);
      } catch {
        drawProductPlaceholder(context, imageX, imageY, imageW, imageH);
      }
    } else {
      drawProductPlaceholder(context, imageX, imageY, imageW, imageH);
    }

    const textX = item.x + item.imageBoxWidth + 42;
    const textW = Math.max(80, item.width - item.imageBoxWidth - 68);
    context.fillStyle = '#0f172a';
    context.font = `900 26px ${FONT_FAMILY}`;
    drawWrappedCanvasText(context, item.name, textX, item.y + 52, textW, 32, 2);
    context.fillStyle = '#475569';
    context.font = `800 18px ${FONT_FAMILY}`;
    drawWrappedCanvasText(context, item.description, textX, item.y + 124, textW, 25, 3);
    context.restore();
  }
}

function drawProductPlaceholder(context, x, y, width, height) {
  drawRoundedRect(context, x + 36, y + 36, Math.max(20, width - 72), Math.max(20, height - 72), 18);
  context.fillStyle = '#e2e8f0';
  context.fill();
  context.fillStyle = '#64748b';
  context.font = `900 18px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('제품 이미지', x + width / 2, y + height / 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawContain(context, image, x, y, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawWrappedCanvasText(context, value, x, y, maxWidth, lineHeight, maxLines) {
  const text = `${value ?? ''}`.trim() || ' ';
  const chars = [...text];
  const lines = [];
  let line = '';
  for (const char of chars) {
    const next = `${line}${char}`;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (chars.join('').length > lines.join('').length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  lines.slice(0, maxLines).forEach((lineText, index) => context.fillText(lineText, x, y + index * lineHeight));
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

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(Number(radius) || 0, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
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

function loadProductDraft(key) {
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

function saveProductDraft(key, products) {
  const storage = localStorageSafe();
  if (!storage || !key) return;
  try {
    storage.setItem(`trlab.cardnews.${key}`, JSON.stringify(products));
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
  resizeShapePatch,
  shapeResizeHandles,
  clampShapeLayer,
  initialShapeLayers,
  clampTextLayerPosition,
  nudgeTextLayer,
  shapeLayersSvg,
  dataOverlaySvg,
  frameOverlaySvg,
  initialTextLayers,
  initialDataOverlay,
  initialFrameSettings,
  normalizeFrameDraft,
  normalizeDraftTitleWrap,
  normalizeDraftCaptionBoxes,
  wrapForEditor,
  visualTextWidth,
  textBoxMetrics
};
