import React, { useState, useRef, useEffect } from 'react';
import { 
  X, RotateCw, Sparkles, Check, Sliders, 
  Maximize2, Crop, RefreshCcw, FileText, Image as ImageIcon 
} from 'lucide-react';
import { 
  loadImage, 
  applyMagicDocumentFilter, 
  autoRotateLandscape,
  detectCardBoundingBox,
  cropCanvas,
  canvasToFile
} from '../../utils/documentEnhancer';

/**
 * ✂️ DocumentCropModal
 * Super-fast, intuitive 1-click Document Cropper & Magic Enhancer for Receptionists.
 */
export default function DocumentCropModal({
  isOpen,
  onClose,
  imageSrc,
  title = 'Clean & Enhance ID Card',
  onApply
}) {
  const [rotation, setRotation] = useState(0);
  const [filterMode, setFilterMode] = useState('magic'); // 'magic' | 'xerox' | 'original'
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState(imageSrc);
  const [originalLoaded, setOriginalLoaded] = useState(null);

  // Crop percentage coordinates [0..100]
  const [cropBox, setCropBox] = useState({ top: 0, left: 0, right: 0, bottom: 0 });

  // Load base image on open
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setRotation(0);
    setFilterMode('magic');
    setIsProcessing(true);

    loadImage(imageSrc).then((img) => {
      setOriginalLoaded(img);
      // Auto-detect initial card bounding box
      const initialCanvas = document.createElement('canvas');
      initialCanvas.width = img.naturalWidth || img.width;
      initialCanvas.height = img.naturalHeight || img.height;
      const ctx = initialCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const box = detectCardBoundingBox(initialCanvas);
      if (box && box.width < initialCanvas.width * 0.98) {
        const pTop = Math.round((box.y / initialCanvas.height) * 100);
        const pLeft = Math.round((box.x / initialCanvas.width) * 100);
        const pRight = Math.round(((initialCanvas.width - (box.x + box.width)) / initialCanvas.width) * 100);
        const pBottom = Math.round(((initialCanvas.height - (box.y + box.height)) / initialCanvas.height) * 100);
        setCropBox({ top: pTop, left: pLeft, right: pRight, bottom: pBottom });
      } else {
        setCropBox({ top: 0, left: 0, right: 0, bottom: 0 });
      }
    }).catch((err) => {
      console.warn('Failed to load image for crop:', err);
    }).finally(() => {
      setIsProcessing(false);
    });
  }, [isOpen, imageSrc]);

  // Re-generate preview when rotation, filterMode, or cropBox changes
  useEffect(() => {
    if (!originalLoaded) return;
    let isCancelled = false;

    const renderPreview = async () => {
      try {
        const rad = (rotation % 360) * (Math.PI / 180);
        const is90or270 = Math.abs(rotation % 180) === 90;

        const origW = originalLoaded.naturalWidth || originalLoaded.width;
        const origH = originalLoaded.naturalHeight || originalLoaded.height;

        const rotW = is90or270 ? origH : origW;
        const rotH = is90or270 ? origW : origH;

        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = rotW;
        rotCanvas.height = rotH;
        const rCtx = rotCanvas.getContext('2d');

        rCtx.translate(rotW / 2, rotH / 2);
        rCtx.rotate(rad);
        rCtx.drawImage(originalLoaded, -origW / 2, -origH / 2);

        // Apply Crop
        const cutX = Math.round((cropBox.left / 100) * rotW);
        const cutY = Math.round((cropBox.top / 100) * rotH);
        const cutW = Math.max(50, Math.round(rotW - cutX - ((cropBox.right / 100) * rotW)));
        const cutH = Math.max(50, Math.round(rotH - cutY - ((cropBox.bottom / 100) * rotH)));

        let finalCanvas = cropCanvas(rotCanvas, { x: cutX, y: cutY, width: cutW, height: cutH });

        // Apply Filter
        if (filterMode !== 'original') {
          finalCanvas = applyMagicDocumentFilter(finalCanvas, filterMode);
        }

        if (!isCancelled) {
          setPreviewDataUrl(finalCanvas.toDataURL('image/jpeg', 0.88));
        }
      } catch (err) {
        console.warn('Preview render error:', err);
      }
    };

    renderPreview();
    return () => { isCancelled = true; };
  }, [originalLoaded, rotation, filterMode, cropBox]);

  if (!isOpen) return null;

  const handleRotate90 = () => {
    setRotation(r => (r + 90) % 360);
  };

  const handleResetCrop = () => {
    setCropBox({ top: 0, left: 0, right: 0, bottom: 0 });
    setRotation(0);
    setFilterMode('original');
  };

  const handleAutoMagicCrop = () => {
    if (!originalLoaded) return;
    setIsProcessing(true);
    setTimeout(() => {
      setRotation(0);
      setFilterMode('magic');
      const initialCanvas = document.createElement('canvas');
      initialCanvas.width = originalLoaded.naturalWidth || originalLoaded.width;
      initialCanvas.height = originalLoaded.naturalHeight || originalLoaded.height;
      const ctx = initialCanvas.getContext('2d');
      ctx.drawImage(originalLoaded, 0, 0);

      const box = detectCardBoundingBox(initialCanvas);
      const pTop = Math.round((box.y / initialCanvas.height) * 100);
      const pLeft = Math.round((box.x / initialCanvas.width) * 100);
      const pRight = Math.round(((initialCanvas.width - (box.x + box.width)) / initialCanvas.width) * 100);
      const pBottom = Math.round(((initialCanvas.height - (box.y + box.height)) / initialCanvas.height) * 100);
      setCropBox({ top: pTop, left: pLeft, right: pRight, bottom: pBottom });
      setIsProcessing(false);
    }, 50);
  };

  const handleSaveAndApply = async () => {
    if (!originalLoaded) return;
    setIsProcessing(true);

    try {
      const rad = (rotation % 360) * (Math.PI / 180);
      const is90or270 = Math.abs(rotation % 180) === 90;

      const origW = originalLoaded.naturalWidth || originalLoaded.width;
      const origH = originalLoaded.naturalHeight || originalLoaded.height;

      const rotW = is90or270 ? origH : origW;
      const rotH = is90or270 ? origW : origH;

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rCtx = rotCanvas.getContext('2d');

      rCtx.translate(rotW / 2, rotH / 2);
      rCtx.rotate(rad);
      rCtx.drawImage(originalLoaded, -origW / 2, -origH / 2);

      const cutX = Math.round((cropBox.left / 100) * rotW);
      const cutY = Math.round((cropBox.top / 100) * rotH);
      const cutW = Math.max(50, Math.round(rotW - cutX - ((cropBox.right / 100) * rotW)));
      const cutH = Math.max(50, Math.round(rotH - cutY - ((cropBox.bottom / 100) * rotH)));

      let finalCanvas = cropCanvas(rotCanvas, { x: cutX, y: cutY, width: cutW, height: cutH });

      if (filterMode !== 'original') {
        finalCanvas = applyMagicDocumentFilter(finalCanvas, filterMode);
      }

      const result = await canvasToFile(finalCanvas, 'cleaned_id_proof.jpg', 0.90);
      onApply(result.file, result.dataUrl);
      onClose();
    } catch (err) {
      alert('Error applying enhanced image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[10000] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 text-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-gray-800 flex flex-col space-y-3 animate-in zoom-in-95 duration-200 max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">{title}</h3>
              <p className="text-[11px] text-gray-400 font-medium">
                Auto-crop background table/bed, straighten angle & clean shadows
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* IMAGE PREVIEW STAGE */}
        <div className="w-full bg-black/60 rounded-2xl border border-gray-800 p-2 sm:p-4 flex items-center justify-center min-h-[260px] max-h-[420px] overflow-hidden relative">
          {previewDataUrl ? (
            <img 
              src={previewDataUrl} 
              alt="Enhanced ID Preview" 
              className="max-h-[380px] w-auto max-w-full object-contain rounded-xl shadow-lg border border-gray-700/60"
            />
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              <ImageIcon size={32} />
              <span className="text-xs mt-1">Loading photo...</span>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center gap-2 text-white text-xs font-black">
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Enhancing Document...</span>
            </div>
          )}
        </div>

        {/* FAST ACTION CONTROLS */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Rotate & Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate90}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Rotate 90 degrees"
              >
                <RotateCw size={13} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleAutoMagicCrop}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                title="Re-run auto edge crop & color pop"
              >
                <Sparkles size={13} />
                <span>Auto-Magic</span>
              </button>

              <button
                type="button"
                onClick={handleResetCrop}
                className="px-2 py-1.5 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Reset to original uploaded photo"
              >
                <RefreshCcw size={12} className="inline mr-1" />
                <span>Reset</span>
              </button>
            </div>

            {/* Filter Mode Selector */}
            <div className="flex items-center bg-gray-800/80 p-0.5 rounded-xl border border-gray-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('magic')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'magic' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                ✨ Magic Color
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('xerox')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'xerox' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                📄 Clean Xerox
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('original')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'original' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                Original
              </button>
            </div>
          </div>

          {/* CROP ADJUSTMENT SLIDERS (OPTIONAL FINE-TUNING) */}
          <details className="group text-xs text-gray-400">
            <summary className="cursor-pointer select-none py-1 hover:text-white flex items-center justify-between font-bold text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Crop size={12} />
                <span>Fine-Tune Margins (Top / Bottom / Left / Right)</span>
              </span>
              <span className="group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 bg-gray-950/60 p-2.5 rounded-xl border border-gray-800 mt-1">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Top Margin: {cropBox.top}%</label>
                <input 
                  type="range" min="0" max="30" value={cropBox.top} 
                  onChange={(e) => setCropBox(b => ({ ...b, top: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Bottom: {cropBox.bottom}%</label>
                <input 
                  type="range" min="0" max="30" value={cropBox.bottom} 
                  onChange={(e) => setCropBox(b => ({ ...b, bottom: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Left Margin: {cropBox.left}%</label>
                <input 
                  type="range" min="0" max="30" value={cropBox.left} 
                  onChange={(e) => setCropBox(b => ({ ...b, left: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Right Margin: {cropBox.right}%</label>
                <input 
                  type="range" min="0" max="30" value={cropBox.right} 
                  onChange={(e) => setCropBox(b => ({ ...b, right: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </details>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
            🔒 Genuine physical card scan — 100% legal & police compliant.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isProcessing}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check size={14} />
              <span>Apply Clean ID</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
