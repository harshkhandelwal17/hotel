import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, RotateCw, RotateCcw, Sparkles, Check, 
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
 * Interactive Visual Document Cropper & CamScanner-Fidelity Enhancer for Indian ID Cards.
 * Features:
 * - REAL VISUAL DRAG CROP: Drag 4 corners, 4 edges, or move the box directly on the photo.
 * - ZERO % SLIDER HASSLE: Intuitive mouse & touch drag handles with rule-of-thirds grid.
 * - PRECISE ROTATION: ⟲ -90° (Left), ⟳ +90° (Right), and 180° Flip with instant realignment.
 * - SMART PRESETS: Aadhaar Card Ratio (1.6:1), Auto Edge Detect, Trim 5%, Full 100%.
 * - HIGH-FIDELITY CAMSCANNER FILTERS: Paper Whitening, Deep Charcoal Text, Xerox B&W.
 */
export default function DocumentCropModal({
  isOpen,
  onClose,
  imageSrc,
  title = 'Clean & Crop ID Card',
  onApply
}) {
  const [rotation, setRotation] = useState(0);
  const [filterMode, setFilterMode] = useState('magic'); // 'magic' | 'xerox' | 'shadow_fix' | 'original'
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalLoaded, setOriginalLoaded] = useState(null);
  const [rotatedCanvas, setRotatedCanvas] = useState(null);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Normalized crop coordinates [0..1]
  const [crop, setCrop] = useState({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });

  // Refs for interactive dragging
  const stageRef = useRef(null);
  const dragInfoRef = useRef(null);

  // 1. Load original image when modal opens
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setRotation(0);
    setFilterMode('magic');
    setIsProcessing(true);

    loadImage(imageSrc).then((img) => {
      setOriginalLoaded(img);

      // Create base canvas
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = img.naturalWidth || img.width;
      baseCanvas.height = img.naturalHeight || img.height;
      const ctx = baseCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Check auto-bounding box
      const box = detectCardBoundingBox(baseCanvas);
      if (box && box.confidence === 'high' && (box.width < baseCanvas.width * 0.96 || box.height < baseCanvas.height * 0.96)) {
        const nx = Math.max(0.01, box.x / baseCanvas.width);
        const ny = Math.max(0.01, box.y / baseCanvas.height);
        const nw = Math.min(0.98, box.width / baseCanvas.width);
        const nh = Math.min(0.98, box.height / baseCanvas.height);
        setCrop({ x: nx, y: ny, w: nw, h: nh });
      } else {
        setCrop({ x: 0.03, y: 0.03, w: 0.94, h: 0.94 });
      }
    }).catch((err) => {
      console.warn('Failed to load image for crop:', err);
    }).finally(() => {
      setIsProcessing(false);
    });
  }, [isOpen, imageSrc]);

  // 2. Re-create rotated base canvas whenever originalLoaded or rotation changes
  useEffect(() => {
    if (!originalLoaded) return;

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = originalLoaded.naturalWidth || originalLoaded.width;
    baseCanvas.height = originalLoaded.naturalHeight || originalLoaded.height;
    const ctx = baseCanvas.getContext('2d');
    ctx.drawImage(originalLoaded, 0, 0);

    const rotated = rotateCanvas(baseCanvas, rotation);
    setRotatedCanvas(rotated);
  }, [originalLoaded, rotation]);

  // 3. Rotation Handlers (Adjust rotation cleanly and keep crop box centered)
  const handleRotateCw = () => {
    setRotation(r => (r + 90) % 360);
    // Swap crop dimensions to fit new orientation
    setCrop(c => {
      const newW = Math.min(0.94, c.h);
      const newH = Math.min(0.94, c.w);
      return {
        x: Math.max(0.02, (1 - newW) / 2),
        y: Math.max(0.02, (1 - newH) / 2),
        w: newW,
        h: newH
      };
    });
  };

  const handleRotateCcw = () => {
    setRotation(r => ((r - 90) % 360 + 360) % 360);
    setCrop(c => {
      const newW = Math.min(0.94, c.h);
      const newH = Math.min(0.94, c.w);
      return {
        x: Math.max(0.02, (1 - newW) / 2),
        y: Math.max(0.02, (1 - newH) / 2),
        w: newW,
        h: newH
      };
    });
  };

  const handleRotate180 = () => {
    setRotation(r => (r + 180) % 360);
  };

  // 4. Presets
  const handlePresetAadhaar = () => {
    if (!rotatedCanvas) return;
    const imgW = rotatedCanvas.width;
    const imgH = rotatedCanvas.height;
    const imgRatio = imgW / imgH;

    // Aadhaar / ID-1 standard ratio: ~1.58 (landscape) or 0.63 (portrait)
    const targetRatio = imgW >= imgH ? 1.58 : 0.63;

    let targetW, targetH;
    if (imgRatio > targetRatio) {
      // Image is wider than Aadhaar -> full height, narrower width
      targetH = 0.92;
      targetW = (targetH * targetRatio) / imgRatio;
    } else {
      // Image is taller than Aadhaar -> full width, shorter height
      targetW = 0.92;
      targetH = targetW / (targetRatio * (1 / imgRatio));
    }

    targetW = Math.min(0.96, Math.max(0.3, targetW));
    targetH = Math.min(0.96, Math.max(0.3, targetH));

    setCrop({
      x: (1 - targetW) / 2,
      y: (1 - targetH) / 2,
      w: targetW,
      h: targetH
    });
  };

  const handlePresetFull = () => {
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
  };

  const handlePresetTrim5 = () => {
    setCrop({ x: 0.05, y: 0.05, w: 0.90, h: 0.90 });
  };

  const handlePresetAutoDetect = () => {
    if (!rotatedCanvas) return;
    setIsProcessing(true);
    setTimeout(() => {
      const box = detectCardBoundingBox(rotatedCanvas);
      if (box && box.confidence === 'high') {
        const nx = Math.max(0.01, box.x / rotatedCanvas.width);
        const ny = Math.max(0.01, box.y / rotatedCanvas.height);
        const nw = Math.min(0.98, box.width / rotatedCanvas.width);
        const nh = Math.min(0.98, box.height / rotatedCanvas.height);
        setCrop({ x: nx, y: ny, w: nw, h: nh });
      } else {
        handlePresetAadhaar();
      }
      setIsProcessing(false);
    }, 40);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setRotation(0);
    setFilterMode('original');
  };

  // 5. Interactive Drag Logic (Mouse & Touch)
  const handlePointerDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();

    const stageEl = stageRef.current;
    if (!stageEl) return;

    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = stageEl.getBoundingClientRect();
    dragInfoRef.current = {
      pointerId: e.pointerId,
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      stageW: rect.width,
      stageH: rect.height
    };
  };

  const handlePointerMove = (e) => {
    const info = dragInfoRef.current;
    if (!info || info.pointerId !== e.pointerId) return;

    e.preventDefault();

    const deltaX = (e.clientX - info.startX) / info.stageW;
    const deltaY = (e.clientY - info.startY) / info.stageH;
    const { startCrop, handleType } = info;

    const MIN_SIZE = 0.08;

    setCrop(() => {
      let nx = startCrop.x;
      let ny = startCrop.y;
      let nw = startCrop.w;
      let nh = startCrop.h;

      if (handleType === 'move') {
        nx = Math.max(0, Math.min(1 - nw, startCrop.x + deltaX));
        ny = Math.max(0, Math.min(1 - nh, startCrop.y + deltaY));
      } else if (handleType === 'se') {
        nw = Math.max(MIN_SIZE, Math.min(1 - startCrop.x, startCrop.w + deltaX));
        nh = Math.max(MIN_SIZE, Math.min(1 - startCrop.y, startCrop.h + deltaY));
      } else if (handleType === 'sw') {
        const potentialX = Math.max(0, Math.min(startCrop.x + startCrop.w - MIN_SIZE, startCrop.x + deltaX));
        nw = startCrop.w - (potentialX - startCrop.x);
        nx = potentialX;
        nh = Math.max(MIN_SIZE, Math.min(1 - startCrop.y, startCrop.h + deltaY));
      } else if (handleType === 'ne') {
        const potentialY = Math.max(0, Math.min(startCrop.y + startCrop.h - MIN_SIZE, startCrop.y + deltaY));
        nh = startCrop.h - (potentialY - startCrop.y);
        ny = potentialY;
        nw = Math.max(MIN_SIZE, Math.min(1 - startCrop.x, startCrop.w + deltaX));
      } else if (handleType === 'nw') {
        const potentialX = Math.max(0, Math.min(startCrop.x + startCrop.w - MIN_SIZE, startCrop.x + deltaX));
        const potentialY = Math.max(0, Math.min(startCrop.y + startCrop.h - MIN_SIZE, startCrop.y + deltaY));
        nw = startCrop.w - (potentialX - startCrop.x);
        nh = startCrop.h - (potentialY - startCrop.y);
        nx = potentialX;
        ny = potentialY;
      } else if (handleType === 'n') {
        const potentialY = Math.max(0, Math.min(startCrop.y + startCrop.h - MIN_SIZE, startCrop.y + deltaY));
        nh = startCrop.h - (potentialY - startCrop.y);
        ny = potentialY;
      } else if (handleType === 's') {
        nh = Math.max(MIN_SIZE, Math.min(1 - startCrop.y, startCrop.h + deltaY));
      } else if (handleType === 'w') {
        const potentialX = Math.max(0, Math.min(startCrop.x + startCrop.w - MIN_SIZE, startCrop.x + deltaX));
        nw = startCrop.w - (potentialX - startCrop.x);
        nx = potentialX;
      } else if (handleType === 'e') {
        nw = Math.max(MIN_SIZE, Math.min(1 - startCrop.x, startCrop.w + deltaX));
      }

      return { x: nx, y: ny, w: nw, h: nh };
    });
  };

  const handlePointerUp = (e) => {
    if (dragInfoRef.current && dragInfoRef.current.pointerId === e.pointerId) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (_) {}
      dragInfoRef.current = null;
    }
  };

  // 6. Save & Apply Clean Document
  const handleSaveAndApply = async () => {
    if (!rotatedCanvas) return;
    setIsProcessing(true);

    try {
      const curW = rotatedCanvas.width;
      const curH = rotatedCanvas.height;

      const cutX = Math.max(0, Math.round(crop.x * curW));
      const cutY = Math.max(0, Math.round(crop.y * curH));
      const cutW = Math.min(curW - cutX, Math.round(crop.w * curW));
      const cutH = Math.min(curH - cutY, Math.round(crop.h * curH));

      let finalCanvas = cropCanvas(rotatedCanvas, {
        x: cutX,
        y: cutY,
        width: Math.max(20, cutW),
        height: Math.max(20, cutH)
      });

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

  if (!isOpen) return null;

  const rotatedDataUrl = rotatedCanvas ? rotatedCanvas.toDataURL('image/jpeg', 0.88) : null;

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
              <Crop size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">{title}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck size={10} /> 100% Genuine ID
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Corners drag karke crop karo, 1-click rotate & CamScanner paper whitening
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

        {/* INTERACTIVE VISUAL CROP STAGE */}
        <div className="w-full bg-black/80 rounded-2xl border border-gray-800 p-2 sm:p-3 flex items-center justify-center min-h-[270px] max-h-[420px] overflow-hidden relative select-none">
          {rotatedDataUrl ? (
            <div 
              ref={stageRef}
              className="relative inline-block max-h-[380px] max-w-full overflow-hidden select-none cursor-crosshair touch-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* The Rotated Base Image */}
              <img 
                src={isHoldingOriginal ? imageSrc : rotatedDataUrl} 
                alt="Original ID" 
                draggable={false}
                className="max-h-[380px] w-auto max-w-full object-contain rounded-sm pointer-events-none select-none block"
              />

              {/* DARK BACKDROP MASK (OUTSIDE CROP BOX) */}
              {!isHoldingOriginal && (
                <>
                  {/* Top Mask */}
                  <div 
                    className="absolute bg-black/65 pointer-events-none transition-all duration-75"
                    style={{ top: 0, left: 0, right: 0, height: `${crop.y * 100}%` }}
                  />
                  {/* Bottom Mask */}
                  <div 
                    className="absolute bg-black/65 pointer-events-none transition-all duration-75"
                    style={{ top: `${(crop.y + crop.h) * 100}%`, left: 0, right: 0, bottom: 0 }}
                  />
                  {/* Left Mask */}
                  <div 
                    className="absolute bg-black/65 pointer-events-none transition-all duration-75"
                    style={{ top: `${crop.y * 100}%`, left: 0, width: `${crop.x * 100}%`, height: `${crop.h * 100}%` }}
                  />
                  {/* Right Mask */}
                  <div 
                    className="absolute bg-black/65 pointer-events-none transition-all duration-75"
                    style={{ top: `${crop.y * 100}%`, left: `${(crop.x + crop.w) * 100}%`, right: 0, height: `${crop.h * 100}%` }}
                  />

                  {/* VISUAL CROP RECTANGLE */}
                  <div 
                    className="absolute border-2 border-emerald-400 shadow-2xl cursor-move touch-none"
                    style={{
                      top: `${crop.y * 100}%`,
                      left: `${crop.x * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                  >
                    {/* Rule of Thirds Grid (Subtle) */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white/50" />
                      <div className="border-r border-b border-white/50" />
                      <div className="border-b border-white/50" />
                      <div className="border-r border-b border-white/50" />
                      <div className="border-r border-b border-white/50" />
                      <div className="border-b border-white/50" />
                      <div className="border-r border-white/50" />
                      <div className="border-r border-white/50" />
                      <div />
                    </div>

                    {/* CORNER BRACKETS (CAMSCANNER STYLE) */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-white pointer-events-none" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-white pointer-events-none" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-white pointer-events-none" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-white pointer-events-none" />

                    {/* 4 CORNER TOUCH / DRAG HANDLES */}
                    <div 
                      className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    >
                      <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-md" />
                    </div>

                    <div 
                      className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    >
                      <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-md" />
                    </div>

                    <div 
                      className="absolute -bottom-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    >
                      <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-md" />
                    </div>

                    <div 
                      className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'se')}
                    >
                      <div className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-md" />
                    </div>

                    {/* 4 EDGE DRAG HANDLES */}
                    <div 
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-5 flex items-center justify-center cursor-ns-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'n')}
                    >
                      <div className="w-6 h-1 bg-white rounded-full shadow" />
                    </div>

                    <div 
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-5 flex items-center justify-center cursor-ns-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 's')}
                    >
                      <div className="w-6 h-1 bg-white rounded-full shadow" />
                    </div>

                    <div 
                      className="absolute -left-2 top-1/2 -translate-y-1/2 h-10 w-5 flex items-center justify-center cursor-ew-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'w')}
                    >
                      <div className="h-6 w-1 bg-white rounded-full shadow" />
                    </div>

                    <div 
                      className="absolute -right-2 top-1/2 -translate-y-1/2 h-10 w-5 flex items-center justify-center cursor-ew-resize touch-none z-10"
                      onPointerDown={(e) => handlePointerDown(e, 'e')}
                    >
                      <div className="h-6 w-1 bg-white rounded-full shadow" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              <ImageIcon size={32} />
              <span className="text-xs mt-1">Loading photo...</span>
            </div>
          )}

          {/* Hold to Compare Original */}
          <button
            type="button"
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-gray-300 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-gray-700 backdrop-blur-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 z-20"
            title="Press and hold to see unedited original photo"
          >
            <Eye size={12} />
            <span>{isHoldingOriginal ? 'Original' : 'Hold to Compare'}</span>
          </button>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center gap-2 text-white text-xs font-black z-30">
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* FAST ACTION BAR */}
        <div className="space-y-2 pt-1">
          {/* ROTATE & PRESET BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Quick Rotate Buttons */}
            <div className="flex items-center gap-1 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-500 px-1">Rotate:</span>
              <button
                type="button"
                onClick={handleRotateCcw}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Rotate 90° Left (Counter-Clockwise)"
              >
                <RotateCcw size={13} /> ⟲ -90°
              </button>
              <button
                type="button"
                onClick={handleRotateCw}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Rotate 90° Right (Clockwise)"
              >
                <RotateCw size={13} /> ⟳ +90°
              </button>
              <button
                type="button"
                onClick={handleRotate180}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Flip 180 degrees"
              >
                180°
              </button>
            </div>

            {/* Smart Frame Presets */}
            <div className="flex items-center gap-1 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={handlePresetAadhaar}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                title="Auto-Fit standard Indian Aadhaar / ID Card ratio (1.58:1)"
              >
                🪪 Aadhaar (1.6:1)
              </button>
              <button
                type="button"
                onClick={handlePresetAutoDetect}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Auto-Detect Card Edge Boundary"
              >
                <Sparkles size={12} className="text-emerald-400" /> Auto Edge
              </button>
              <button
                type="button"
                onClick={handlePresetTrim5}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer active:scale-95"
                title="Trim 5% margin around the edges"
              >
                ✂️ Trim 5%
              </button>
              <button
                type="button"
                onClick={handlePresetFull}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 cursor-pointer active:scale-95"
                title="Full 100% original frame"
              >
                🖼️ Full
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1.5 text-gray-400 hover:text-white text-xs font-bold rounded-lg cursor-pointer"
                title="Reset edits"
              >
                <RefreshCcw size={12} />
              </button>
            </div>
          </div>

          {/* CAMSCANNER FILTER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-950/40 p-1.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-1">CamScanner Filter:</span>
            <div className="flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('magic')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'magic' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="CamScanner Magic: Pure white paper, deep dark text, natural skin"
              >
                ✨ CamScanner Magic
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('xerox')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'xerox' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Clean B&W Xerox: High-contrast monochrome for laser printer"
              >
                📄 Clean B&W Xerox
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('shadow_fix')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'shadow_fix' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Shadow Fix: Warmer natural tone without paper whitening"
              >
                💡 Shadow Fix
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('original')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'original' ? 'bg-emerald-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white bg-gray-800/60'
                }`}
                title="Original unaltered colors"
              >
                Original
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
            💡 Green box ke corners ko ungli ya mouse se drag karke adjust karein.
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
