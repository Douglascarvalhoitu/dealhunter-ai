import React from "react";

const LOGO_URL = "https://customer-assets-0z36b82j.emergentagent.net/job_smart-deal-hub-1/artifacts/tkme36ut_ChatGPT%20Image%2017%20de%20ago.%20de%202026%2C%2018_42_36.png";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[DealHunterAI] Uncaught render error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  goHome = () => { window.location.href = "/"; };

  reload = () => { window.location.reload(); };

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || "Something went wrong.";
    return (
      <div data-testid="error-boundary" className="min-h-screen bg-[var(--dh-off)] grid place-items-center px-6">
        <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center">
          <img src={LOGO_URL} alt="Deal Hunter AI" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-[var(--dh-navy)]">We hit a small bump</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Something didn't load correctly. You can try again — your data is safe.
          </p>
          <details className="text-left text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mt-4">
            <summary className="cursor-pointer select-none">Technical details</summary>
            <div className="mt-2 break-words font-mono" data-testid="error-boundary-message">{msg}</div>
          </details>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button data-testid="error-retry" onClick={this.reload}
                    className="h-11 px-5 rounded-xl dh-btn-blue font-semibold">Retry</button>
            <button data-testid="error-home" onClick={this.goHome}
                    className="h-11 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-[var(--dh-navy)]">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
