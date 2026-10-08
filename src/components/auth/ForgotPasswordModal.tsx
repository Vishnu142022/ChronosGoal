import React from 'react';
import { X, KeyRound, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0D0912] border border-[#21182B] shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-[#F5F3F7]">
        <div className="flex items-center justify-between border-b border-[#21182B] pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-[#A855F7]" />
            <h3 className="text-sm font-bold text-white tracking-tight">Password reset unavailable</h3>
          </div>
          <button onClick={onClose} className="text-[#8F879A] hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-purple-950/40 border border-[#A855F7]/40 flex items-start space-x-2 text-xs text-[#DDD6FE]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Password recovery is not enabled because this project has no email delivery service.
            No reset code or token has been created. Contact your administrator for help.
          </p>
        </div>

        <div className="flex justify-end pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

