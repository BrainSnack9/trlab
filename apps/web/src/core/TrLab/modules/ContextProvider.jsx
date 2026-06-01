'use client';

import { TrLabWorkspaceContextProvider } from './controller/useTrLabWorkspace';
import { combineProviders } from './utils/providerUtils';

const CombinedContextProvider = combineProviders(
  TrLabWorkspaceContextProvider
);

export default CombinedContextProvider;
