import { describe, expect, it } from 'vitest';
import { __cardTextOverlayEditorTestUtils } from './CardTextOverlayEditor.jsx';

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, `${value}`); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); }
  };
}

const style = {
  ink: '#0f172a',
  sub: '#2563eb',
  accent: '#ef4444'
};

describe('CardTextOverlayEditor data overlays', () => {
  it('uses a clean caption-only text layer set for verified data cards', () => {
    const layers = __cardTextOverlayEditorTestUtils.defaultTextLayers({
      role: 'data_scene',
      layout: 'data_chart',
      title: '오메가3 섭취 방법',
      body: '음식으로 섭취할 수도 있어요.\n보충제는 함량 확인이 먼저예요.',
      emphasis: '핵심 포인트',
      visualData: { type: 'bar_chart', title: '식단으로 채우는 오메가3', items: [{ label: '연어', value: 1, display: '1g' }], sources: [{ label: 'NIH ODS' }] }
    }, style, { channelName: '@trlab.insight' });

    expect(layers.map((layer) => layer.id)).toEqual(['body', 'channel']);
    expect(layers[0].text).toContain('음식으로 섭취');
    expect(layers[0].backgroundColor).toBe('#000000');
    expect(layers[0].backgroundOpacity).toBeGreaterThan(0.6);
    expect(layers.map((layer) => layer.text).join('\n')).not.toContain('핵심 포인트');
  });

  it('drops stale title/emphasis drafts for verified data cards', () => {
    const key = 'overlay:test-stale:3';
    globalThis.localStorage?.setItem(`trlab.cardnews.${key}`, JSON.stringify([
      { id: 'title', text: '오메가3 섭취 방법', x: 76, y: 150, fontSize: 62 },
      { id: 'emphasis', text: '핵심 포인트', x: 82, y: 255, fontSize: 30 }
    ]));

    const layers = __cardTextOverlayEditorTestUtils.initialTextLayers(key, {
      role: 'data_scene',
      layout: 'data_chart',
      body: '음식으로 섭취할 수도 있어요.',
      visualData: { type: 'bar_chart', title: '식단으로 채우는 오메가3', items: [{ label: '연어', value: 1, display: '1g' }], sources: [{ label: 'NIH ODS' }] }
    }, style, { channelName: '@trlab.insight' });

    expect(layers.map((layer) => layer.id)).toEqual(['body', 'channel']);
    expect(layers.map((layer) => layer.text).join('\n')).not.toContain('오메가3 섭취 방법');
    globalThis.localStorage?.removeItem(`trlab.cardnews.${key}`);
  });

  it('loads persisted data SVG edits over the verified source overlay', () => {
    const key = 'data:test-edit:3';
    globalThis.localStorage?.setItem(`trlab.cardnews.${key}`, JSON.stringify({
      kind: 'bar_chart',
      title: '수정한 그래프 제목',
      x: 96,
      items: [{ label: '수정 항목', value: 2.5, display: '2.5g' }]
    }));

    const overlay = __cardTextOverlayEditorTestUtils.initialDataOverlay(key, {
      visualData: {
        type: 'bar_chart',
        title: '식단으로 채우는 오메가3',
        items: [{ label: '연어', value: 1, display: '1g' }],
        sources: [{ label: 'NIH ODS' }]
      }
    }, style);

    expect(overlay.title).toBe('수정한 그래프 제목');
    expect(overlay.x).toBe(96);
    expect(overlay.items[0]).toEqual(expect.objectContaining({ label: '수정 항목', value: 2.5, display: '2.5g' }));
    globalThis.localStorage?.removeItem(`trlab.cardnews.${key}`);
  });

  it('duplicates, reorders, and removes text layers predictably', () => {
    const layers = [
      { id: 'title', text: '제목', x: 80, y: 100 },
      { id: 'body', text: '본문', x: 90, y: 200 },
      { id: 'channel', text: '@trlab', x: 540, y: 1292 }
    ];

    const duplicated = __cardTextOverlayEditorTestUtils.duplicateTextLayer(layers, 'body', 'test');
    expect(duplicated.map((layer) => layer.id)).toEqual(['title', 'body', 'body-copy-test', 'channel']);
    expect(duplicated[2]).toEqual(expect.objectContaining({ text: '본문', x: 122, y: 242 }));

    const moved = __cardTextOverlayEditorTestUtils.moveTextLayer(duplicated, 'body-copy-test', -1);
    expect(moved.map((layer) => layer.id)).toEqual(['title', 'body-copy-test', 'body', 'channel']);

    const removed = __cardTextOverlayEditorTestUtils.removeTextLayer(moved, 'title');
    expect(removed.map((layer) => layer.id)).toEqual(['body-copy-test', 'body', 'channel']);
  });

  it('adds and removes editable bar-chart items within the supported limit', () => {
    const overlay = __cardTextOverlayEditorTestUtils.defaultDataOverlay({
      visualData: {
        type: 'bar_chart',
        title: '그래프',
        items: [{ label: 'A', value: 1, display: '1' }]
      }
    }, style);

    const added = __cardTextOverlayEditorTestUtils.addDataOverlayItem(overlay);
    expect(added.items).toHaveLength(2);
    expect(added.items[1]).toEqual(expect.objectContaining({ label: '항목 2', value: 1, display: '1' }));

    const removed = __cardTextOverlayEditorTestUtils.removeDataOverlayItem(added, 0);
    expect(removed.items).toHaveLength(1);
    expect(removed.items[0].label).toBe('항목 2');
  });

  it('adds and removes editable table rows within the supported limit', () => {
    const overlay = __cardTextOverlayEditorTestUtils.defaultDataOverlay({
      visualData: {
        type: 'evidence_table',
        title: '표',
        columns: ['기준', '근거', '해석'],
        rows: [['A', 'B', 'C']]
      }
    }, style);

    const added = __cardTextOverlayEditorTestUtils.addDataOverlayRow(overlay);
    expect(added.rows).toHaveLength(2);
    expect(added.rows[1]).toEqual(['항목 2', '내용', '내용']);

    const removed = __cardTextOverlayEditorTestUtils.removeDataOverlayRow(added, 0);
    expect(removed.rows).toEqual([['항목 2', '내용', '내용']]);
  });

  it('renders verified bar-chart visualData as SVG overlay text and bars', () => {
    const overlay = __cardTextOverlayEditorTestUtils.defaultDataOverlay({
      visualData: {
        type: 'bar_chart',
        title: '식단으로 채우는 오메가3',
        subtitle: '1회 제공량 기준 g',
        items: [
          { label: '아마씨유 1T', value: 7.26, display: 'ALA 7.26g', segments: [{ label: 'ALA', value: 7.26, display: '7.26g' }] },
          { label: '연어 3oz', value: 1.83, display: 'DHA 1.24+EPA 0.59g', segments: [{ label: 'DHA', value: 1.24, display: '1.24g' }, { label: 'EPA', value: 0.59, display: '0.59g' }] },
          { label: '피쉬오일', value: 0.3, display: 'EPA 0.18+DHA 0.12g', segments: [{ label: 'EPA', value: 0.18, display: '0.18g' }, { label: 'DHA', value: 0.12, display: '0.12g' }] }
        ],
        referenceLines: [
          { label: '성인 남성 ALA AI', value: 1.6, display: '1.6g/일' }
        ],
        callouts: ['EPA·DHA는 공식 권장량이 없어 식품/제품 함량을 따로 봐야 해요.'],
        sources: [{ label: 'NIH ODS Omega-3 Health Professional Fact Sheet' }]
      }
    }, style);
    const svg = __cardTextOverlayEditorTestUtils.dataOverlaySvg(overlay);

    expect(svg).toContain('식단으로 채우는 오메가3');
    expect(svg).toContain('아마씨유');
    expect(svg).toContain('ALA');
    expect(svg).toContain('연어 3oz');
    expect(svg).toContain('DHA');
    expect(svg).toContain('EPA');
    expect(svg).toContain('성인 남성 ALA AI 1.6g/일');
    expect(svg).toContain('피쉬오일');
    expect(svg).toContain('출처: NIH ODS');
    expect(svg).toContain('<rect');
    expect(svg).toContain('stroke-dasharray="8 8"');
  });

  it('renders verified evidence-table visualData as SVG overlay rows', () => {
    const overlay = __cardTextOverlayEditorTestUtils.defaultDataOverlay({
      visualData: {
        type: 'evidence_table',
        title: '보충제별 효능 근거',
        subtitle: '효능보다 성분 형태와 상황 먼저 보기',
        columns: ['형태', '근거/효능', '카드 해석'],
        rows: [
          ['알갈오일', 'DHA 100~300mg, 일부 EPA 포함', '비건/해산물 회피 시 대안'],
          ['처방 오메가3', '고중성지방 이득 가능성', '치료 목적은 의료진 영역']
        ],
        sources: [{ label: 'NCCIH Omega-3 Supplements' }]
      }
    }, style);
    const svg = __cardTextOverlayEditorTestUtils.dataOverlaySvg(overlay);

    expect(svg).toContain('보충제별 효능 근거');
    expect(svg).toContain('알갈오일');
    expect(svg).toContain('DHA 100~300');
    expect(svg).toContain('mg');
    expect(svg).toContain('처방 오메가3');
    expect(svg).toContain('고중성지방');
    expect(svg).toContain('출처: NCCIH');
  });

  it('uses adjustable table spacing to prevent row text overlap', () => {
    const overlay = {
      ...__cardTextOverlayEditorTestUtils.defaultDataOverlay({
        visualData: {
          type: 'evidence_table',
          title: '표',
          columns: ['기준', '근거', '해석'],
          rows: [
            ['첫줄', '두 줄 이상으로 보이는 긴 근거 문장', '첫 번째 해석 문장'],
            ['둘째줄', '두 번째 근거 문장', '두 번째 해석 문장']
          ]
        }
      }, style),
      rowHeight: 124,
      headerGap: 96,
      cellFontSize: 15,
      cellLineGap: 28
    };
    const svg = __cardTextOverlayEditorTestUtils.dataOverlaySvg(overlay);

    expect(overlay.rowHeight).toBeGreaterThan(100);
    expect(svg).toContain('height="110"');
    expect(svg).toContain('dy="28"');
    expect(svg).toContain('font-size="15"');
  });

  it('clamps dragged data overlays inside the canvas safe bounds', () => {
    const overlay = { width: 936, height: 560 };
    expect(__cardTextOverlayEditorTestUtils.clampDataOverlayPosition(overlay, -100, -100)).toEqual({ x: 12, y: 120 });
    expect(__cardTextOverlayEditorTestUtils.clampDataOverlayPosition(overlay, 9999, 9999)).toEqual({ x: 132, y: 670 });
  });

  it('loads persisted background/frame SVG settings', () => {
    const key = 'frame:test-edit:2';
    globalThis.localStorage?.setItem(`trlab.cardnews.${key}`, JSON.stringify({
      shadeOpacity: 0.31,
      safeAreaEnabled: true,
      safeAreaY: 920,
      frameEnabled: true,
      frameStrokeColor: '#facc15',
      frameStrokeWidth: 12
    }));

    const frame = __cardTextOverlayEditorTestUtils.initialFrameSettings(key, {
      visualData: { type: 'bar_chart' }
    });

    expect(frame.shadeOpacity).toBe(0.31);
    expect(frame.safeAreaY).toBe(920);
    expect(frame.frameEnabled).toBe(true);
    expect(frame.frameStrokeColor).toBe('#facc15');
    expect(frame.frameStrokeWidth).toBe(12);
    globalThis.localStorage?.removeItem(`trlab.cardnews.${key}`);
  });

  it('does not add the old cover caption safe-area box by default', () => {
    const coverFrame = __cardTextOverlayEditorTestUtils.defaultFrameSettings({
      role: 'cover',
      layout: 'cover_text'
    });
    const dataFrame = __cardTextOverlayEditorTestUtils.defaultFrameSettings({
      role: 'data_scene',
      visualData: { type: 'bar_chart' }
    });

    expect(coverFrame.shadeOpacity).toBe(0);
    expect(coverFrame.safeAreaEnabled).toBe(false);
    expect(dataFrame.safeAreaEnabled).toBe(true);
  });

  it('turns off stale default cover safe-area frame drafts', () => {
    const frame = __cardTextOverlayEditorTestUtils.normalizeFrameDraft({
      shadeOpacity: 0.14,
      safeAreaEnabled: true,
      safeAreaX: 64,
      safeAreaY: 874,
      safeAreaWidth: 952,
      safeAreaHeight: 330,
      safeAreaColor: '#000000',
      safeAreaOpacity: 0.34,
      safeAreaRadius: 24
    }, {
      role: 'cover',
      layout: 'cover_text'
    });

    expect(frame.shadeOpacity).toBe(0);
    expect(frame.safeAreaEnabled).toBe(false);
  });

  it('loads persisted freeform shape SVG layers', () => {
    const key = 'shape:test-edit:2';
    globalThis.localStorage?.setItem(`trlab.cardnews.${key}`, JSON.stringify([
      { id: 'shape-rect-test', type: 'rect', x: 100, y: 200, width: 300, height: 80, fill: '#facc15', opacity: 0.35 }
    ]));

    const shapes = __cardTextOverlayEditorTestUtils.initialShapeLayers(key);
    expect(shapes).toEqual([
      expect.objectContaining({ id: 'shape-rect-test', type: 'rect', x: 100, y: 200, width: 300, height: 80 })
    ]);
    globalThis.localStorage?.removeItem(`trlab.cardnews.${key}`);
  });

  it('renders freeform shape layers as SVG primitives', () => {
    const rect = __cardTextOverlayEditorTestUtils.defaultShapeLayer('rect', style, 'rect');
    const circle = __cardTextOverlayEditorTestUtils.defaultShapeLayer('circle', style, 'circle');
    const line = __cardTextOverlayEditorTestUtils.defaultShapeLayer('line', style, 'line');
    const svg = __cardTextOverlayEditorTestUtils.shapeLayersSvg([rect, circle, line]);

    expect(svg).toContain('<rect');
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('<line');
    expect(svg).toContain('opacity=');
    expect(svg).toContain('stroke-width=');
  });

  it('duplicates and nudges freeform shape layers inside the canvas', () => {
    const shape = {
      ...__cardTextOverlayEditorTestUtils.defaultShapeLayer('rect', style, 'base'),
      x: 900,
      y: 1280,
      width: 260,
      height: 140
    };

    const duplicated = __cardTextOverlayEditorTestUtils.duplicateShapeLayer([shape], shape.id, 'test');
    expect(duplicated.map((item) => item.id)).toEqual([shape.id, `${shape.id}-copy-test`]);
    expect(duplicated[1].x + duplicated[1].width).toBeLessThanOrEqual(1080);
    expect(duplicated[1].y + duplicated[1].height).toBeLessThanOrEqual(1350);

    const nudged = __cardTextOverlayEditorTestUtils.nudgeShapeLayer(duplicated, duplicated[1].id, 999, 999);
    expect(nudged[1].x + nudged[1].width).toBeLessThanOrEqual(1080);
    expect(nudged[1].y + nudged[1].height).toBeLessThanOrEqual(1350);
  });

  it('resizes freeform shape layers from canvas handles', () => {
    const drag = {
      type: 'shape-resize',
      handle: 'nw',
      x: 100,
      y: 100,
      layerX: 120,
      layerY: 160,
      width: 300,
      height: 180
    };

    const patch = __cardTextOverlayEditorTestUtils.resizeShapePatch(drag, { x: 80, y: 130 });
    const handles = __cardTextOverlayEditorTestUtils.shapeResizeHandles({ x: 120, y: 160, width: 300, height: 180 }, 10);

    expect(patch).toEqual(expect.objectContaining({ x: 100, y: 190, width: 320, height: 150 }));
    expect(handles.map((handle) => handle.id)).toEqual(['nw', 'ne', 'sw', 'se']);
  });

  it('keeps resized shape layers within canvas bounds', () => {
    const patch = __cardTextOverlayEditorTestUtils.resizeShapePatch({
      handle: 'se',
      x: 100,
      y: 100,
      layerX: 900,
      layerY: 1260,
      width: 120,
      height: 80
    }, { x: 500, y: 500 });

    expect(patch.x + patch.width).toBeLessThanOrEqual(1080);
    expect(patch.y + patch.height).toBeLessThanOrEqual(1350);
  });

  it('keeps oversized text boxes within the card canvas when nudged', () => {
    const layer = {
      id: 'long-copy',
      text: '문구 레이어가 너무 길어도 편집 화면 밖으로 밀려나지 않아야 합니다',
      x: 1050,
      y: 1320,
      fontSize: 54,
      lineHeight: 1.2,
      color: '#ffffff',
      weight: 900,
      align: 'start',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      paddingX: 40,
      paddingY: 24,
      radius: 18
    };

    const clamped = __cardTextOverlayEditorTestUtils.clampTextLayerPosition(layer);
    expect(clamped.x).toBeLessThan(layer.x);
    expect(clamped.y).toBeLessThan(layer.y);

    const nudged = __cardTextOverlayEditorTestUtils.nudgeTextLayer([clamped], clamped.id, 999, 999);
    expect(nudged[0].x).toBe(clamped.x);
    expect(nudged[0].y).toBe(clamped.y);
  });

  it('wraps Korean card titles without splitting the last word awkwardly', () => {
    const wrapped = __cardTextOverlayEditorTestUtils.wrapForEditor('스킨부스터 선택 시 체크리스트', 10);

    expect(wrapped).toBe('스킨부스터 선택 시\n체크리스트');
    expect(wrapped).not.toContain('체\n크리스트');
  });

  it('repairs stale saved title drafts that split Korean words', () => {
    const layers = __cardTextOverlayEditorTestUtils.normalizeDraftTitleWrap([
      { id: 'title', text: '스킨부스터 선택 시 체\n크리스트', x: 76, y: 150 },
      { id: 'body', text: '본문' }
    ], {
      title: '스킨부스터 선택 시 체크리스트',
      body: '본문'
    }, style, { channelName: '@trlab.insight' });

    expect(layers[0].text).toBe('스킨부스터 선택 시\n체크리스트');
  });

  it('does not add automatic caption boxes to cover body text', () => {
    const layers = __cardTextOverlayEditorTestUtils.defaultTextLayers({
      role: 'cover',
      layout: 'cover_text',
      title: '내 피부에 맞는 스킨부스터는?',
      body: '피부에 활력을 주는 스킨부스터의 다양한 종류와 원리를 알아보아요.'
    }, style, { channelName: '@trlab.insight' });
    const body = layers.find((layer) => layer.id === 'body');

    expect(body.backgroundOpacity).toBe(0);
  });

  it('does not create generic emphasis placeholder layers', () => {
    const layers = __cardTextOverlayEditorTestUtils.defaultTextLayers({
      role: 'cover',
      layout: 'cover_text',
      title: '내 피부에 맞는 스킨부스터는?',
      body: '피부에 활력을 주는 스킨부스터의 다양한 종류와 원리를 알아보아요.',
      emphasis: '핵심 포인트'
    }, style, { channelName: '@trlab.insight' });

    expect(layers.map((layer) => layer.id)).not.toContain('emphasis');
    expect(layers.map((layer) => layer.text).join('\n')).not.toContain('핵심 포인트');
  });

  it('turns off stale default cover body caption box drafts', () => {
    const layers = __cardTextOverlayEditorTestUtils.normalizeDraftCaptionBoxes([
      {
        id: 'body',
        text: '피부에 활력을 주는 스킨부스터의 다양한 종류와 원리를 알아보아요.',
        backgroundColor: '#000000',
        backgroundOpacity: 0.55
      }
    ], {
      role: 'cover',
      layout: 'cover_text',
      body: '피부에 활력을 주는 스킨부스터의 다양한 종류와 원리를 알아보아요.'
    });

    expect(layers[0].backgroundOpacity).toBe(0);
  });

  it('uses a conservative Korean text width for right edge clamping', () => {
    const layer = {
      id: 'title',
      text: '스킨부스터 선택 시\n체크리스트',
      x: 1040,
      y: 150,
      fontSize: 62,
      lineHeight: 1.08,
      color: '#201817',
      weight: 900,
      align: 'start',
      backgroundColor: '#000000',
      backgroundOpacity: 0,
      paddingX: 26,
      paddingY: 16,
      radius: 16
    };

    const box = __cardTextOverlayEditorTestUtils.textBoxMetrics(layer);
    const clamped = __cardTextOverlayEditorTestUtils.clampTextLayerPosition(layer);

    expect(__cardTextOverlayEditorTestUtils.visualTextWidth('스킨부스터 선택 시', 62)).toBeGreaterThan(470);
    expect(clamped.x + box.x + box.width).toBeLessThanOrEqual(1080 - 36);
  });

  it('renders background safe area and frame as SVG', () => {
    const frame = {
      ...__cardTextOverlayEditorTestUtils.defaultFrameSettings({ visualData: { type: 'bar_chart' } }),
      shadeOpacity: 0.2,
      safeAreaEnabled: true,
      safeAreaColor: '#000000',
      safeAreaOpacity: 0.4,
      frameEnabled: true,
      frameStrokeColor: '#ffffff',
      frameStrokeWidth: 8
    };
    const svg = __cardTextOverlayEditorTestUtils.frameOverlaySvg(frame);

    expect(svg).toContain('opacity="0.2"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('opacity="0.4"');
    expect(svg).toContain('stroke="#ffffff"');
    expect(svg).toContain('stroke-width="8"');
  });
});
