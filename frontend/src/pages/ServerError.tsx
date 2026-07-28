import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function ServerError({ error, resetErrorBoundary }: { error?: Error; resetErrorBoundary?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 relative px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(239,68,68,0.1),transparent_50%)] pointer-events-none z-0" />
      
      <div className="text-center space-y-6 max-w-md z-10">
        <div className="inline-flex p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full animate-pulse">
          <ShieldAlert size={48} />
        </div>
        
        <h1 className="text-8xl font-black tracking-tight text-slate-900 select-none">500</h1>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">System Error</h2>
          <p className="text-sm text-slate-500">
            A fatal exception occurred. The backend connection failed or a runtime crash was encountered.
          </p>
          {error?.message && (
            <pre className="p-3 bg-slate-50 rounded-xl text-[10px] font-mono text-left text-red-400 border border-slate-200 max-h-32 overflow-y-auto mt-2">
              {error.message}
            </pre>
          )}
        </div>

        <button
          onClick={() => resetErrorBoundary ? resetErrorBoundary() : window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold bg-red-500 hover:bg-red-600 text-slate-900 rounded-xl shadow-lg transition-all"
        >
          <RefreshCw size={16} className="animate-spin-slow" />
          Reload Application
        </button>
      </div>
    </div>
  );
}
