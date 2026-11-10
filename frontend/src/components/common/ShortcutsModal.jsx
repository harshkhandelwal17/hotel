import React from 'react';
import { createPortal } from 'react-dom';
import { X, Command, Sparkles, Keyboard } from 'lucide-react';

const SHORTCUT_GROUPS = [
  {
    category: 'Essential Commands',
    items: [
      { key: '⌘ + K', altKey: 'Ctrl + K', desc: 'Open Command Palette & Global Search' },
      { key: '?', desc: 'Show this Keyboard Shortcuts Cheatsheet' },
      { key: 'Esc', desc: 'Close open modal or menu' },
    ]
  },
  {
    category: 'Instant 1-Key Navigation',
    items: [
      { key: 'N', desc: 'Instant New Guest Check-In' },
      { key: 'O', desc: 'Checkouts & Vacate List' },
      { key: 'R', desc: 'Rooms Live Grid & Status' },
      { key: 'D', desc: 'Receptionist Dashboard' },
      { key: 'P', desc: 'Payments & Drawer Collections' },
      { key: 'F', desc: 'Financial Reports & Daily Expenses' },
      { key: 'L', desc: 'Laundry & Vendor Ledger' },
      { key: 'G', desc: 'Guest Directory & Khata' },
    ]
  }
];

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0;

  return createPortal(
    <div 
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">
                Speed up counter operations without touching the mouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                {group.category}
              </p>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span className="font-semibold text-gray-700">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-lg font-mono text-[11px] font-black text-gray-900 shadow-2xs">
                        {isMac ? item.key : (item.altKey || item.key)}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-3 flex items-start gap-2.5 text-[11px] text-emerald-900 font-bold">
            <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Tip:</strong> Press <kbd className="bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">Esc</kbd> anytime to dismiss popups or return to your workflow.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all active:scale-95"
          >
            Got It (Esc)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
