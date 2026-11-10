import React from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageSettingsModal = ({ isOpen, onClose }) => {
  const { language, setLanguage, t, isHindi } = useLanguage();

  if (!isOpen) return null;

  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-950 tracking-tight">
                {t('langModal.title', 'Language Settings / भाषा सेटिंग्स')}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {t('langModal.subtitle', 'Select your preferred application display language')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Language Options */}
        <div className="p-6 space-y-3">
          {/* English Option */}
          <div 
            onClick={() => handleSelectLanguage('en')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              language === 'en'
                ? 'border-black bg-gray-50/80 shadow-xs'
                : 'border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/40'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-black text-sm text-gray-900 shrink-0">
                EN
              </div>
              <div>
                <p className="text-sm font-black text-gray-950 flex items-center gap-2">
                  <span>English</span>
                  <span className="text-[10px] text-gray-400 font-normal">(Default)</span>
                </p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Standard hotel management system interface in English
                </p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
              language === 'en' ? 'bg-black text-white border-black' : 'border-gray-300 bg-white'
            }`}>
              {language === 'en' && <Check size={13} className="stroke-[3]" />}
            </div>
          </div>

          {/* Hindi Option */}
          <div 
            onClick={() => handleSelectLanguage('hi')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              language === 'hi'
                ? 'border-black bg-emerald-50/40 shadow-xs'
                : 'border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/40'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-300 flex items-center justify-center font-black text-sm text-emerald-800 shrink-0">
                हि
              </div>
              <div>
                <p className="text-sm font-black text-gray-950 flex items-center gap-2">
                  <span>हिंदी (Hindi)</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                    लोकप्रिय
                  </span>
                </p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  संपूर्ण होटल मैनेजमेंट सिस्टम सरल व स्पष्ट हिंदी भाषा में
                </p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
              language === 'hi' ? 'bg-black text-white border-black' : 'border-gray-300 bg-white'
            }`}>
              {language === 'hi' && <Check size={13} className="stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-semibold">
            {isHindi ? 'तुरंत लागू होगा (Instant apply)' : 'Applied instantly across all pages'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LanguageSettingsModal;
