import React, { useEffect, useState } from 'react';
import { Page, Btn, LoadingState } from './ui';
import * as store from './db';

class DatabaseBoundary extends React.Component<React.PropsWithChildren, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  render() {
    return this.state.error ? (
      <Page title="Unable to load tournaments" subtitle={this.state.error}>
        <Btn title="Retry" onPress={() => this.setState({ error: null })} />
      </Page>
    ) : (
      this.props.children
    );
  }
}
export default function DatabaseGate({ children }: React.PropsWithChildren) {
  return (
    <DatabaseBoundary>
      <DatabaseReady>{children}</DatabaseReady>
    </DatabaseBoundary>
  );
}
function DatabaseReady({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialize = () => {
    try {
      store.init();
      setError(null);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(initialize, []);
  if (!ready)
    return (
      <Page
        title={error ? 'Unable to open database' : 'Loading CueBracket'}
        subtitle={error ?? 'Opening your offline tournaments...'}
      >
        {error ? (
          <Btn title="Retry" onPress={initialize} />
        ) : (
          <LoadingState label="Opening your offline tournaments…" />
        )}
      </Page>
    );
  return <>{children}</>;
}
