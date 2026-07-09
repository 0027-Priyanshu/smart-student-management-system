import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0c10] text-gray-200 relative px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(138,92,246,0.15),transparent_50%)] pointer-events-none z-0" />
      
      <div className="text-center space-y-6 max-w-md z-10">
        <div className="inline-flex p-4 bg-[#8a5cf6]/10 text-[#8a5cf6] border border-[#8a5cf6]/20 rounded-full animate-bounce">
          <HelpCircle size={48} />
        </div>
        
        <h1 className="text-8xl font-black tracking-tight text-white font-sans select-none">404</h1>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-100">Page Not Found</h2>
          <p className="text-sm text-gray-400">
            The page you are looking for does not exist or has been relocated to another route.
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold bg-[#8a5cf6] hover:bg-[#7c4df2] text-white rounded-xl shadow-lg transition-all"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
}
