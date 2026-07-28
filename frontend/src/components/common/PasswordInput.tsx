import { type InputHTMLAttributes, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: boolean;
}

export default function PasswordInput({
  label,
  icon = true,
  className = '',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
        )}
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={`w-full ${
            icon ? 'pl-11' : 'pl-4'
          } pr-11 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md focus:outline-none"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
