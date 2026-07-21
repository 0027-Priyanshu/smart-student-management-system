import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';
import { useToastStore, type ToastMessage } from '../../stores/toastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const iconMap = {
    success: <CheckCircle className="text-[#10b981] shrink-0" size={18} />,
    error: <ShieldAlert className="text-[#ef4444] shrink-0" size={18} />,
    warning: <AlertTriangle className="text-[#f59e0b] shrink-0" size={18} />,
    info: <Info className="text-[#06b6d4] shrink-0" size={18} />,
  };

  const bgBorderMap = {
    success: 'bg-white/90 border-[#10b981]/20 text-gray-200',
    error: 'bg-white/90 border-[#ef4444]/20 text-gray-200',
    warning: 'bg-white/90 border-[#f59e0b]/20 text-gray-200',
    info: 'bg-white/90 border-[#06b6d4]/20 text-gray-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-lg ${bgBorderMap[toast.type]}`}
    >
      {iconMap[toast.type]}
      <div className="flex-1 text-xs font-medium leading-relaxed">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
