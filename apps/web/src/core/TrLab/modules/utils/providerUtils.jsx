export function combineProviders(...providers) {
  return providers.reduce(
    (CombinedProvider, CurrentProvider) =>
      function CombinedContextProvider({ children }) {
        return (
          <CombinedProvider>
            <CurrentProvider>{children}</CurrentProvider>
          </CombinedProvider>
        );
      },
    function EmptyContextProvider({ children }) {
      return <>{children}</>;
    }
  );
}
