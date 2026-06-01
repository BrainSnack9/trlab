'use client';

import { CollectionView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Collection/CollectionView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Collection() {
  const workspace = useTrLabWorkspace();

  return <CollectionView {...workspace} />;
}
