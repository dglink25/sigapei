import React from 'react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-300">
      <div className={`px-5 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-bold ${
        toast.type === 'error'
          ? 'bg-red-600 text-white border-red-500'
          : toast.type === 'warning'
          ? 'bg-sigapei-gold text-sigapei-black border-amber-400'
          : 'bg-sigapei-green text-white border-sigapei-green-dark'
      }`}>
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {toast.type === 'error' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : toast.type === 'warning' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          )}
        </svg>
        <span>{toast.message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}
