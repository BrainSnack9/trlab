'use client';

import { TrLabWorkspaceContextProvider } from './controller/useTrLabWorkspace';
import { GlobalDialogProvider } from './controller/useGlobalDialog';
import { combineProviders } from './utils/providerUtils';

const CombinedContextProvider = combineProviders(
  GlobalDialogProvider,
  TrLabWorkspaceContextProvider
);

export default CombinedContextProvider;
