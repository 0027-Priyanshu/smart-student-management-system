import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 relative px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(138,92,246,0.15),transparent_50%)] pointer-events-none z-0" />
      
      <div className="text-center space-y-6 max-w-md z-10">
        <div className="inline-flex p-4 bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 rounded-full animate-bounce">
          <HelpCircle size={48} />
        </div>
        
        <h1 className="text-8xl font-black tracking-tight text-slate-900 font-sans select-none">404</h1>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Page Not Found</h2>
          <p className="text-sm text-slate-500">
            The page you are looking for does not exist or has been relocated to another route.
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold bg-[#f97316] hover:bg-[#7c4df2] text-slate-900 rounded-xl shadow-lg transition-all"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
}
