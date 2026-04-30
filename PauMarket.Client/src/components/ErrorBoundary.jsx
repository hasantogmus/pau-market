import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full rounded-[2rem] border border-blue-100 bg-white/90 p-8 text-center shadow-2xl shadow-blue-100/70 backdrop-blur">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/60">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-blue-600">PAÜ Market</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Beklenmeyen bir hata oluştu
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              Sayfayı yenileyerek tekrar deneyebilirsin. Sorun devam ederse birkaç dakika sonra yeniden giriş yapman yeterli olabilir.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-7 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0"
            >
              Sayfayı yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
