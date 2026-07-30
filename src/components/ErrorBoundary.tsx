import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fff8f8] text-[#26181c] font-sans flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-[28px] border border-[#f0d8e2] shadow-xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#fde7f3] text-[#e6007e] flex items-center justify-center text-3xl font-extrabold shadow-inner">
              ✨
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#26181c] tracking-tight">
              Nexora App Notice
            </h1>

            <p className="text-xs sm:text-sm text-[#594047] leading-relaxed">
              An unexpected display issue occurred ({this.state.error?.message || 'Render notice'}). Don't worry, your data is safe.
            </p>

            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-xl bg-[#e6007e] text-white font-extrabold text-sm hover:bg-[#c4006b] transition-all cursor-pointer shadow-md active:scale-95"
              >
                Reload Nexora App
              </button>

              <button
                onClick={this.handleClearStorage}
                className="w-full py-3 rounded-xl bg-[#fff0f5] text-[#8e004b] border border-[#fcd5e8] font-bold text-xs hover:bg-[#fde7f3] transition-all cursor-pointer active:scale-95"
              >
                Reset Cache & Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
