import React, { useState, useRef, useEffect } from 'react';
import { 
  X, RotateCw, RotateCcw, Sparkles, Check, Sliders, 
  Maximize2, Crop, RefreshCcw, Eye, ShieldCheck, Image as ImageIcon 
} from 'lucide-react';
import { 
  loadImage, 
  applyMagicDocumentFilter, 
  rotateCanvas,
  detectCardBoundingBox,
  cropCanvas,
  canvasToFile
} from '../../utils/documentEnhancer';

/**
 * ✂️ DocumentCropModal
 * 
 * High-precision Document Crop & CamScanner-Fidelity Enhancer for Indian ID Cards.
 * Features:
 * - 1-Click Rotation (⟲ -90°, ⟳ +90°, 180°)
 * - Smart Presets: Auto Edge Detect, Aadhaar Ratio (1.6:1), Trim 5%, Trim 10%, Full 100%
 * - CamScanner Paper Whitening, Xerox B&W, Shadow/Yellow light fix
 * - Hold-to-Compare original button
 * - Fine-tune margin sliders
 */
export default function DocumentCropModal({
  isOpen,
  onClose,
  imageSrc,
  title = 'Clean & Enhance ID Card',
  onApply
}) {
  const [rotation, setRotation] = useState(0);
  const [filterMode, setFilterMode] = useState('magic'); // 'magic' | 'xerox' | 'shadow_fix' | 'original'
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState(imageSrc);
  const [originalLoaded, setOriginalLoaded] = useState(null);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Crop percentage coordinates [0..35]
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
      if (box && box.confidence === 'high' && (box.width < initialCanvas.width * 0.96 || box.height < initialCanvas.height * 0.96)) {
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
        const origW = originalLoaded.naturalWidth || originalLoaded.width;
        const origH = originalLoaded.naturalHeight || originalLoaded.height;

        // 1. Draw base image
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = origW;
        baseCanvas.height = origH;
        const bCtx = baseCanvas.getContext('2d');
        bCtx.drawImage(originalLoaded, 0, 0);

        // 2. Rotate
        let workingCanvas = rotateCanvas(baseCanvas, rotation);

        // 3. Crop
        const curW = workingCanvas.width;
        const curH = workingCanvas.height;
        const cutX = Math.round((cropBox.left / 100) * curW);
        const cutY = Math.round((cropBox.top / 100) * curH);
        const cutW = Math.max(40, Math.round(curW - cutX - ((cropBox.right / 100) * curW)));
        const cutH = Math.max(40, Math.round(curH - cutY - ((cropBox.bottom / 100) * curH)));

        workingCanvas = cropCanvas(workingCanvas, { x: cutX, y: cutY, width: cutW, height: cutH });

        // 4. Filter
        if (filterMode !== 'original') {
          workingCanvas = applyMagicDocumentFilter(workingCanvas, filterMode);
        }

        if (!isCancelled) {
          setPreviewDataUrl(workingCanvas.toDataURL('image/jpeg', 0.88));
        }
      } catch (err) {
        console.warn('Preview render error:', err);
      }
    };

    renderPreview();
    return () => { isCancelled = true; };
  }, [originalLoaded, rotation, filterMode, cropBox]);

  if (!isOpen) return null;

  // Rotation Handlers
  const handleRotateCw = () => setRotation(r => (r + 90) % 360);
  const handleRotateCcw = () => setRotation(r => ((r - 90) % 360 + 360) % 360);
  const handleRotate180 = () => setRotation(r => (r + 180) % 360);

  // Preset Handlers
  const handlePresetFull = () => {
    setCropBox({ top: 0, left: 0, right: 0, bottom: 0 });
  };

  const handlePresetTrim5 = () => {
    setCropBox({ top: 5, left: 5, right: 5, bottom: 5 });
  };

  const handlePresetTrim10 = () => {
    setCropBox({ top: 10, left: 10, right: 10, bottom: 10 });
  };

  const handlePresetAadhaarRatio = () => {
    if (!originalLoaded) return;
    const is90or270 = Math.abs(rotation % 180) === 90;
    const w = is90or270 ? originalLoaded.height : originalLoaded.width;
    const h = is90or270 ? originalLoaded.width : originalLoaded.height;

    // Standard Aadhaar ratio is ~1.58 (landscape) or 0.63 (portrait)
    const targetRatio = w >= h ? 1.58 : 0.63;
    const currentRatio = w / h;

    if (currentRatio > targetRatio) {
      // Current image is too wide -> trim left/right
      const idealW = h * targetRatio;
      const cutTotalPercent = ((w - idealW) / w) * 100;
      const sideCut = Math.min(25, Math.max(0, Math.round(cutTotalPercent / 2)));
      setCropBox({ top: 2, bottom: 2, left: sideCut, right: sideCut });
    } else {
      // Current image is too tall -> trim top/bottom
      const idealH = w / targetRatio;
      const cutTotalPercent = ((h - idealH) / h) * 100;
      const sideCut = Math.min(25, Math.max(0, Math.round(cutTotalPercent / 2)));
      setCropBox({ top: sideCut, bottom: sideCut, left: 2, right: 2 });
    }
  };

  const handleAutoMagicDetect = () => {
    if (!originalLoaded) return;
    setIsProcessing(true);
    setTimeout(() => {
      const origW = originalLoaded.naturalWidth || originalLoaded.width;
      const origH = originalLoaded.naturalHeight || originalLoaded.height;
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = origW;
      baseCanvas.height = origH;
      const ctx = baseCanvas.getContext('2d');
      ctx.drawImage(originalLoaded, 0, 0);

      const rotCanvas = rotateCanvas(baseCanvas, rotation);
      const box = detectCardBoundingBox(rotCanvas);

      if (box && box.confidence === 'high') {
        const pTop = Math.round((box.y / rotCanvas.height) * 100);
        const pLeft = Math.round((box.x / rotCanvas.width) * 100);
        const pRight = Math.round(((rotCanvas.width - (box.x + box.width)) / rotCanvas.width) * 100);
        const pBottom = Math.round(((rotCanvas.height - (box.y + box.height)) / rotCanvas.height) * 100);
        setCropBox({ top: pTop, left: pLeft, right: pRight, bottom: pBottom });
      } else {
        // Safe default 4% trim if contour ambiguous
        setCropBox({ top: 4, left: 4, right: 4, bottom: 4 });
      }
      setFilterMode('magic');
      setIsProcessing(false);
    }, 40);
  };

  const handleReset = () => {
    setCropBox({ top: 0, left: 0, right: 0, bottom: 0 });
    setRotation(0);
    setFilterMode('original');
  };

  const handleSaveAndApply = async () => {
    if (!originalLoaded) return;
    setIsProcessing(true);

    try {
      const origW = originalLoaded.naturalWidth || originalLoaded.width;
      const origH = originalLoaded.naturalHeight || originalLoaded.height;

      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = origW;
      baseCanvas.height = origH;
      const bCtx = baseCanvas.getContext('2d');
      bCtx.drawImage(originalLoaded, 0, 0);

      let finalCanvas = rotateCanvas(baseCanvas, rotation);

      const curW = finalCanvas.width;
      const curH = finalCanvas.height;
      const cutX = Math.round((cropBox.left / 100) * curW);
      const cutY = Math.round((cropBox.top / 100) * curH);
      const cutW = Math.max(40, Math.round(curW - cutX - ((cropBox.right / 100) * curW)));
      const cutH = Math.max(40, Math.round(curH - cutY - ((cropBox.bottom / 100) * curH)));

      finalCanvas = cropCanvas(finalCanvas, { x: cutX, y: cutY, width: cutW, height: cutH });

      if (filterMode !== 'original') {
        finalCanvas = applyMagicDocumentFilter(finalCanvas, filterMode);
      }

      const result = await canvasToFile(finalCanvas, 'cleaned_id_proof.jpg', 0.92);
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
      className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 text-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-gray-800 flex flex-col space-y-3 animate-in zoom-in-95 duration-200 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">{title}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck size={10} /> 100% Genuine ID
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Trim table/bed background, fix rotation & CamScanner paper whitening
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
        <div className="w-full bg-black/70 rounded-2xl border border-gray-800 p-2 sm:p-3 flex items-center justify-center min-h-[250px] max-h-[380px] overflow-hidden relative select-none">
          {previewDataUrl ? (
            <img 
              src={isHoldingOriginal ? imageSrc : previewDataUrl} 
              alt="Enhanced ID Preview" 
              className="max-h-[350px] w-auto max-w-full object-contain rounded-xl shadow-lg border border-gray-700/60"
            />
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              <ImageIcon size={32} />
              <span className="text-xs mt-1">Loading photo...</span>
            </div>
          )}

          {/* Hold to Compare Overlay Button */}
          <button
            type="button"
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-gray-300 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-gray-700 backdrop-blur-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Press and hold to see the original unedited photo"
          >
            <Eye size={12} />
            <span>{isHoldingOriginal ? 'Showing Original' : 'Hold to Compare'}</span>
          </button>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center gap-2 text-white text-xs font-black">
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Enhancing Document...</span>
            </div>
          )}
        </div>

        {/* CONTROLS SECTION */}
        <div className="space-y-2.5 pt-1">
          {/* ROTATION & AUTO-DETECT ROW */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Quick Rotate Buttons */}
            <div className="flex items-center gap-1 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-500 px-1">Rotate:</span>
              <button
                type="button"
                onClick={handleRotateCcw}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Rotate 90 degrees counter-clockwise (Left)"
              >
                <RotateCcw size={12} /> ⟲ -90°
              </button>
              <button
                type="button"
                onClick={handleRotateCw}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Rotate 90 degrees clockwise (Right)"
              >
                <RotateCw size={12} /> ⟳ +90°
              </button>
              <button
                type="button"
                onClick={handleRotate180}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Flip 180 degrees"
              >
                180°
              </button>
            </div>

            {/* Smart Presets */}
            <div className="flex items-center gap-1 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={handleAutoMagicDetect}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                title="Smart Auto-Detect Card Boundary"
              >
                <Sparkles size={12} />
                <span>Auto Edge</span>
              </button>
              <button
                type="button"
                onClick={handlePresetAadhaarRatio}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer active:scale-95"
                title="Fit to standard Indian Aadhaar / ID Card ratio (1.58:1)"
              >
                🪪 Aadhaar (1.6:1)
              </button>
              <button
                type="button"
                onClick={handlePresetTrim5}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer active:scale-95"
                title="Trim 5% margin around the edges"
              >
                ✂️ Trim 5%
              </button>
              <button
                type="button"
                onClick={handlePresetFull}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer active:scale-95"
                title="Full 100% original frame"
              >
                🖼️ Full
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-gray-400 hover:text-white text-xs font-bold rounded-lg cursor-pointer"
                title="Reset all edits"
              >
                <RefreshCcw size={12} />
              </button>
            </div>
          </div>

          {/* FILTER MODES ROW */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-950/40 p-1.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-1">CamScanner Filter:</span>
            <div className="flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('magic')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'magic' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="CamScanner Magic: Pure white paper, deep text, vibrant natural photo"
              >
                ✨ CamScanner Magic
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('xerox')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'xerox' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Clean B&W Photocopy: High contrast monochrome for registration card printouts"
              >
                📄 Clean B&W Xerox
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('shadow_fix')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'shadow_fix' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Shadow & Yellow Cast Fix: Natural lighting without paper whitening"
              >
                💡 Shadow Fix
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('original')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'original' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Original unaltered colors"
              >
                Original
              </button>
            </div>
          </div>

          {/* CROP ADJUSTMENT SLIDERS */}
          <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-gray-300">
                <Crop size={12} />
                <span>Fine-Tune Margins (Cut Table/Bedsheet Edge)</span>
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                T: {cropBox.top}% • B: {cropBox.bottom}% • L: {cropBox.left}% • R: {cropBox.right}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                  <span>Top:</span>
                  <span className="text-emerald-400">{cropBox.top}%</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={cropBox.top} 
                  onChange={(e) => setCropBox(b => ({ ...b, top: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                  <span>Bottom:</span>
                  <span className="text-emerald-400">{cropBox.bottom}%</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={cropBox.bottom} 
                  onChange={(e) => setCropBox(b => ({ ...b, bottom: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                  <span>Left:</span>
                  <span className="text-emerald-400">{cropBox.left}%</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={cropBox.left} 
                  onChange={(e) => setCropBox(b => ({ ...b, left: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                  <span>Right:</span>
                  <span className="text-emerald-400">{cropBox.right}%</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={cropBox.right} 
                  onChange={(e) => setCropBox(b => ({ ...b, right: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
            🔒 Original submitted physical ID enhanced for crisp registration printouts.
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
