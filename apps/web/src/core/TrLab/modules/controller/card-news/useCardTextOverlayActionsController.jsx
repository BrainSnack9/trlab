import { useState } from 'react';
import { generateContentProductAsset } from '@/core/TrLab/modules/clients/api';

export function useCardTextOverlayActionsController() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [productAssetBusyId, setProductAssetBusyId] = useState('');
  const [productAssetError, setProductAssetError] = useState('');

  async function fetchProductAsset({ id, mode, productAssets, patchProductAsset, card, studio }) {
    const product = productAssets.find((item) => item.id === id);
    if (!product) return;
    setProductAssetBusyId(id);
    setProductAssetError('');
    try {
      const data = await generateContentProductAsset({
        mode,
        query: product.searchQuery || product.name,
        product,
        card,
        studio
      });
      const asset = data.asset ?? {};
      patchProductAsset(id, {
        imageUrl: asset.url || product.imageUrl,
        searchQuery: asset.query || product.searchQuery || product.name,
        sourceProvider: asset.provider || '',
        sourceLabel: asset.sourceImage?.photographer || asset.model || asset.provider || '',
        sourceUrl: asset.sourceImage?.url || '',
        assetPrompt: asset.prompt || ''
      });
    } catch (err) {
      setProductAssetError(err instanceof Error ? err.message : '제품 이미지 처리 실패');
    } finally {
      setProductAssetBusyId('');
    }
  }

  async function confirmComposite({
    imageUrl,
    layers,
    dataOverlay,
    frame,
    shapes,
    productAssets,
    composeFinalImage,
    setFinalUrl,
    setEditorOpen,
    setEditingId
  }) {
    setBusy(true);
    setError('');
    try {
      const url = await composeFinalImage(imageUrl, layers, dataOverlay, frame, shapes, productAssets);
      setFinalUrl(url);
      setEditorOpen(false);
      setEditingId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 합성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function saveFinal({
    imageUrl,
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
  }) {
    setBusy(true);
    setError('');
    try {
      const url = finalUrl || await composeFinalImage(imageUrl, layers, dataOverlay, frame, shapes, productAssets);
      downloadUrl(url, filenameFromUrl(imageUrl, 'png'));
      if (!finalUrl) setFinalUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    productAssetBusyId,
    productAssetError,
    fetchProductAsset,
    confirmComposite,
    saveFinal
  };
}
