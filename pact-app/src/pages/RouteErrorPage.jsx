import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

function errorSummary(error) {
  if (isRouteErrorResponse(error)) {
    return {
      code: error.status ? String(error.status) : 'ROUTE_ERROR',
      message: error.status === 404
        ? 'The requested PACT route could not be found.'
        : 'PACT could not complete this navigation.',
    };
  }
  return {
    code: 'APPLICATION_ERROR',
    message: 'PACT encountered an unexpected application error.',
  };
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const summary = errorSummary(error);

  return (
    <main className="route-error-page">
      <div className="route-error-grid" aria-hidden="true" />
      <section className="route-error-panel" role="alert" aria-labelledby="route-error-title">
        <div className="route-error-kicker">PACT // RECOVERY MODE</div>
        <div className="route-error-code">{summary.code}</div>
        <h1 id="route-error-title">The operation was interrupted</h1>
        <p>{summary.message} Your release and course data were not changed by this screen.</p>
        {import.meta.env.DEV && error instanceof Error && (
          <details className="route-error-details">
            <summary>Developer details</summary>
            <pre>{error.message}</pre>
          </details>
        )}
        <div className="route-error-actions">
          <button type="button" className="route-error-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
          <a className="route-error-secondary" href="/">Return to Operations</a>
        </div>
        <p className="route-error-help">If Retry fails repeatedly, refresh after the latest deployment or contact the PACT administrator.</p>
      </section>
    </main>
  );
}

export { errorSummary };
