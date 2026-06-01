'use client';

import TemplateHeader from './Components/Desktop/Templates/TemplateHeader';
import ContextProvider from './modules/ContextProvider';

export default function TrLabApp() {
  return (
    <ContextProvider>
      <TemplateHeader />
    </ContextProvider>
  );
}
