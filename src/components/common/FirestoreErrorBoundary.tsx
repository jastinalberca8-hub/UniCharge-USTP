import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface FirestoreErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  FirestoreErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): FirestoreErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] border-t-4 border-t-[#DC2626] shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1E293B]">
                  Unable to Load Workspace
                </h2>
                <p className="text-xs text-[#64748B]">
                  A real-time data error interrupted the session.
                </p>
              </div>
            </div>
            <p className="text-xs font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-[#64748B] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-10 rounded-xl bg-[#4E6E81] text-white text-xs font-semibold hover:bg-[#3D5767] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
