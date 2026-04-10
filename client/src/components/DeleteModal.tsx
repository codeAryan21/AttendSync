'use client';

import { useEffect, useRef, useState } from 'react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: string;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setConfirmed(false);
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-300 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">

        {/* ── Header — mirrors edit modal header exactly ── */}
        <div className="bg-gradient-to-r from-red-400 via-rose-600 to-pink-600 px-8 py-6">
          {/* decorative circles — same as edit modals */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute top-6 right-16 w-16 h-16 bg-white opacity-5 rounded-full" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* icon box — same w-14 h-14 bg-white/20 rounded-2xl as edit modal */}
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                <p className="text-red-200 text-sm mt-0.5">This action is permanent and irreversible</p>
              </div>
            </div>
            {!isDeleting && (
              <button
                onClick={onClose}
                className="text-white p-3 hover:bg-red-700 rounded-xl transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-8 space-y-5">

          {/* Item card — same gradient section card pattern as edit modals */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border border-red-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-red-900">Item to be Deleted</h4>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-red-100 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-extrabold text-base">
                  {itemName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{itemType}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{itemName}</p>
              </div>
              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                Will be deleted
              </span>
            </div>
          </div>

          {/* Warning card — same gradient section card pattern */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-orange-900 mb-1">Are you absolutely sure?</h4>
                <p className="text-sm text-orange-700 leading-relaxed">
                  Deleting this {itemType} will permanently remove all associated data.{' '}
                  <span className="font-bold text-orange-900">This cannot be recovered.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Confirm checkbox — styled as a full interactive row */}
          <button
            type="button"
            onClick={() => !isDeleting && setConfirmed(v => !v)}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-left ${
              confirmed
                ? 'bg-red-50 border-red-400 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:border-red-300 hover:bg-red-50/40'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
              confirmed ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white'
            }`}>
              {confirmed && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-semibold transition-colors ${confirmed ? 'text-red-700' : 'text-gray-600'}`}>
              I understand this action <span className="font-bold">cannot be undone</span>
            </span>
          </button>

        </div>

        {/* ── Footer — mirrors edit modal footer exactly ── */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 flex justify-end space-x-4 border-t border-gray-200">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || isDeleting}
            className={`px-8 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 shadow-lg flex items-center space-x-2 ${
              confirmed && !isDeleting
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-700 hover:via-rose-700 hover:to-pink-700 transform hover:scale-105'
                : 'bg-gradient-to-r from-red-300 via-rose-300 to-pink-300 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete {itemType}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
