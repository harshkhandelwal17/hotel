import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Printer, X, ShieldCheck, Loader2 } from 'lucide-react';
import { getFullImageUrl } from '../../utils/imageUrl';

export default function GuestRegistrationCardModal({
  isOpen,
  onClose,
  stayData,
  roomData,
  guests = [],
  hotelData = {},
  onProceedToDashboard
}) {
  const printAreaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Auto-scroll to top when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Lock body scroll when modal is open so background page doesn't shift
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Keyboard shortcut Ctrl+P / Cmd+P triggers clean isolated print; Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target.id === 'grc-modal-overlay') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const primaryGuest = guests[0] || {};
  const coGuests = guests.slice(1).filter(g => g.fullName && g.fullName.trim() !== '');

  // Format Dates
  const now = new Date();
  const formattedGeneratedAt = format(now, 'dd MMM yyyy, hh:mm a');

  const checkInDateObj = stayData?.checkInDate ? new Date(stayData.checkInDate) : now;
  const formattedCheckIn = format(checkInDateObj, 'dd MMM yyyy, hh:mm a');

  let checkOutDateObj;
  if (stayData?.expectedCheckOutDate) {
    checkOutDateObj = new Date(stayData.expectedCheckOutDate);
  } else {
    checkOutDateObj = new Date(checkInDateObj);
    checkOutDateObj.setDate(checkOutDateObj.getDate() + (Number(stayData?.durationDays) || 1));
    checkOutDateObj.setHours(checkOutDateObj.getHours() + (Number(stayData?.durationHours) || 0));
  }
  const formattedCheckOut = format(checkOutDateObj, 'dd MMM yyyy, hh:mm a');

  // Format Stay ID / GR Number
  const grNumber = stayData?._id 
    ? `GR-${stayData._id.slice(-6).toUpperCase()}` 
    : `GR-${now.getTime().toString().slice(-6)}`;

  // Age calculation helper
  const getAgeString = (dobStr) => {
    if (!dobStr) return '';
    const yearMatch = dobStr.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const birthYear = parseInt(yearMatch[1], 10);
      const curYear = now.getFullYear();
      const age = curYear - birthYear;
      if (age > 0 && age < 120) return `${age} Yrs`;
    }
    return '';
  };

  const primaryAge = getAgeString(primaryGuest.dateOfBirth);

  // Financials
  const totalAmount = Number(stayData?.totalAmount || 0);
  const paidAmount = Number(stayData?.paidAmount || stayData?.initialPaymentAmount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  // Property info fallback
  const hotelName = hotelData?.name || roomData?.hostel?.name || 'HOTEL & RESIDENCY';
  const hotelAddress = hotelData?.address || roomData?.hostel?.address || 'Main Road, City Center';
  const hotelContact = hotelData?.contactNumber || roomData?.hostel?.contactNumber || '+91 98765 43210';
  const hotelEmail = hotelData?.email || roomData?.hostel?.email || '';

  const frontImgUrl = getFullImageUrl(primaryGuest.idProofImage);
  const backImgUrl = getFullImageUrl(primaryGuest.idProofImageBack);

  // =========================================================
  // HELPER: Convert rendered image on screen or URL to Data URI
  // =========================================================
  const getRenderedImageDataUrl = async (imgSelector, fallbackUrl) => {
    const el = document.querySelector(imgSelector);
    if (el && el.complete && el.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = el.naturalWidth;
        canvas.height = el.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (dataUrl && dataUrl.length > 100) return dataUrl;
      } catch (_) {
        // Tainted canvas fallback
      }
    }
    if (!fallbackUrl) return '';
    if (fallbackUrl.startsWith('data:')) return fallbackUrl;
    try {
      const res = await fetch(fallbackUrl);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(fallbackUrl);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return fallbackUrl;
    }
  };

  // =========================================================
  // DEDICATED ISOLATED PRINT ENGINE (Single-Page, Pure White, Guaranteed Images)
  // =========================================================
  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const printSheet = document.getElementById('grc-printable-sheet');
      if (!printSheet) {
        window.print();
        setIsPrinting(false);
        return;
      }

      // 1. Convert Front and Back ID images to Base64 data URIs
      let frontDataUrl = frontImgUrl;
      let backDataUrl = backImgUrl;
      try {
        if (frontImgUrl) {
          frontDataUrl = await getRenderedImageDataUrl('#grc-printable-sheet img[alt*="Front"]', frontImgUrl);
        }
        if (backImgUrl) {
          backDataUrl = await getRenderedImageDataUrl('#grc-printable-sheet img[alt*="Back"]', backImgUrl);
        }
      } catch (convErr) {
        console.warn('Base64 conversion failed:', convErr);
      }

      // 2. Clone sheet and swap in resolved Base64 image sources
      const clonedSheet = printSheet.cloneNode(true);
      
      const frontImg = clonedSheet.querySelector('img[alt*="Front"]');
      if (frontImg && frontDataUrl) {
        frontImg.src = frontDataUrl;
        frontImg.style.display = 'block';
      }
      const backImg = clonedSheet.querySelector('img[alt*="Back"]');
      if (backImg && backDataUrl) {
        backImg.src = backDataUrl;
        backImg.style.display = 'block';
      }

      // Remove any elements with no-print
      clonedSheet.querySelectorAll('.no-print').forEach(el => el.remove());

      // 3. Prepare hidden iframe with actual layout viewport so Chrome actively renders and decodes images
      let iframe = document.getElementById('grc-isolated-print-iframe');
      if (iframe) {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }
      iframe = document.createElement('iframe');
      iframe.id = 'grc-isolated-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01';
      iframe.style.zIndex = '-9999';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      // 4. Collect parent document stylesheets EXCLUDING any local @media print overrides
      const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .filter(el => !el.innerText?.includes('@media print') && !el.innerText?.includes('grc-modal-overlay'))
        .map(el => el.outerHTML)
        .join('\n');

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Guest Registration Card - ${grNumber}</title>
            ${styleSheets}
            <style>
              @page {
                size: A4 portrait;
                margin: 5mm 8mm;
              }
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #111827 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 11px;
                line-height: 1.25;
              }
              body {
                padding: 4px !important;
                display: flex !important;
                justify-content: center !important;
              }
              #grc-printable-sheet {
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 8px 10px !important;
                border: 1.5px solid #111827 !important;
                border-radius: 6px !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
              }
              #grc-printable-sheet * {
                visibility: visible !important;
              }
              img {
                max-height: 105px !important;
                max-width: 100% !important;
                object-fit: contain !important;
                display: block !important;
              }
            </style>
          </head>
          <body>
            ${clonedSheet.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      // 5. Ensure all images are completely loaded in the iframe before triggering print
      const iframeImgs = Array.from(iframe.contentWindow.document.images);
      const imgPromises = iframeImgs.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(res => {
          img.onload = res;
          img.onerror = res;
          setTimeout(res, 800);
        });
      });

      await Promise.all(imgPromises);

      // 6. Focus and trigger print dialog
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          window.print();
        } finally {
          setIsPrinting(false);
        }
      }, 100);
    } catch (err) {
      console.error('Print failed:', err);
      window.print();
      setIsPrinting(false);
    }
  };

  const modalContent = (
    <div
      id="grc-modal-overlay"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
    >
      {/* MODAL WRAPPER */}
      <div
        id="grc-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[94vh] sm:h-[90vh] max-h-[880px] shadow-2xl border border-gray-200 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
      >
        {/* TOP CONTROL BAR (PINNED, NEVER CUT OFF, VISIBLE AT ALL TIMES) */}
        <div className="no-print px-4 sm:px-6 py-3 bg-gray-950 text-white flex items-center justify-between gap-3 border-b border-gray-800 shrink-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-base font-black tracking-tight text-white truncate">
                  Guest Registration Card
                </h3>
                <span className="bg-emerald-500 text-black text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  {grNumber}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium truncate hidden sm:block">
                Print on A4 for physical verification & guest signature
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              type="button"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>Print A4</span>
                </>
              )}
            </button>

            {onProceedToDashboard && (
              <button
                onClick={onProceedToDashboard}
                type="button"
                className="hidden sm:inline-flex px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl transition-all border border-gray-700 active:scale-95 cursor-pointer"
              >
                Dashboard
              </button>
            )}

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE PREVIEW CONTAINER */}
        <div 
          id="grc-scroll-container"
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-6 pb-6 bg-gray-100 flex justify-center custom-scrollbar"
        >
          
          {/* ====================================================================
              OFFICIAL PRINTABLE GRC SHEET (100% SINGLE A4 FIT)
          ==================================================================== */}
          <div
            id="grc-printable-sheet"
            ref={printAreaRef}
            className="bg-white w-full max-w-[780px] text-gray-900 border border-gray-300 sm:border-2 sm:border-gray-900 rounded-xl p-3.5 sm:p-5 shadow-sm text-left text-xs leading-tight font-sans"
          >
            {/* 1. HOTEL HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3 mb-3 border-b-2 border-gray-900 gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900 leading-tight">
                  {hotelName}
                </h1>
                <p className="text-[11px] font-bold text-gray-700 mt-0.5 leading-snug">
                  {hotelAddress}
                </p>
                <p className="text-[10px] font-semibold text-gray-600 mt-0.5">
                  <strong>Contact:</strong> {hotelContact} {hotelEmail ? ` | Email: ${hotelEmail}` : ''}
                </p>
              </div>

              {/* GRC DOCUMENT BADGE */}
              <div className="self-start sm:self-auto text-left sm:text-right shrink-0 border border-gray-900 sm:border-2 rounded-lg p-2 bg-gray-50/80">
                <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-900">
                  Guest Registration Card
                </span>
                <span className="block text-xs font-mono font-black text-emerald-800 mt-0.5">
                  {grNumber}
                </span>
                <span className="block text-[9px] font-bold text-gray-500 mt-0.5">
                  Date: {formattedGeneratedAt}
                </span>
              </div>
            </div>

            {/* 2. STAY & ROOM METRIC STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px bg-gray-300 border border-gray-900 sm:border-2 rounded-lg overflow-hidden mb-3 text-center">
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Room No.</span>
                <span className="block text-xs sm:text-sm font-black text-gray-900">{roomData?.roomNumber || '—'}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Room Type</span>
                <span className="block text-[11px] sm:text-xs font-black text-gray-900 truncate">{roomData?.roomType || 'Standard'}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Check-In</span>
                <span className="block text-[10px] font-bold text-gray-900 leading-tight">{formattedCheckIn}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Check-Out</span>
                <span className="block text-[10px] font-bold text-gray-900 leading-tight">{formattedCheckOut}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Duration</span>
                <span className="block text-[11px] sm:text-xs font-black text-gray-900">{stayData?.durationDays || 1}D {stayData?.durationHours || 0}H</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-500 tracking-wider">Occupants</span>
                <span className="block text-[11px] sm:text-xs font-black text-gray-900">{stayData?.occupants || guests.length || 1} Guest(s)</span>
              </div>
            </div>

            {/* 3. PRIMARY GUEST DETAILS MATRIX */}
            <div className="border border-gray-900 sm:border-2 rounded-lg overflow-hidden mb-3">
              <div className="bg-gray-900 text-white px-3 py-1 font-black text-[10px] uppercase tracking-wider flex items-center justify-between">
                <span>Primary Guest Information</span>
                <span className="text-[9px] font-normal text-gray-300">Govt ID Verified</span>
              </div>

              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-white text-[11px]">
                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Full Name</span>
                  <span className="text-xs sm:text-sm font-black text-gray-900">{primaryGuest.fullName || '—'}</span>
                </div>

                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Mobile Number</span>
                  <span className="text-xs font-black text-gray-900">{primaryGuest.mobileNumber ? `+91 ${primaryGuest.mobileNumber}` : '—'}</span>
                </div>

                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Gender / DOB / Age</span>
                  <span className="text-xs font-bold text-gray-900">
                    {primaryGuest.gender || '—'} 
                    {primaryGuest.dateOfBirth ? ` · ${primaryGuest.dateOfBirth}` : ''}
                    {primaryAge ? ` (${primaryAge})` : ''}
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">ID Proof Document</span>
                  <span className="text-xs font-bold text-gray-900">
                    {primaryGuest.idProofType || 'Aadhaar'} : <strong className="font-mono">{primaryGuest.idProofNumber || '—'}</strong>
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Nationality</span>
                  <span className="text-xs font-bold text-gray-900">Indian</span>
                </div>

                <div>
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Purpose of Stay</span>
                  <span className="text-xs font-bold text-gray-900">General / Travel</span>
                </div>

                <div className="col-span-full pt-1 border-t border-gray-200">
                  <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Permanent Residential Address</span>
                  <span className="text-xs font-bold text-gray-900 leading-snug">
                    {primaryGuest.address || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. CO-GUESTS (IF ANY) */}
            {coGuests.length > 0 && (
              <div className="border border-gray-900 sm:border-2 rounded-lg overflow-hidden mb-3">
                <div className="bg-gray-100 text-gray-900 px-3 py-1 font-black text-[10px] uppercase tracking-wider border-b border-gray-900">
                  Accompanying Guests ({coGuests.length})
                </div>
                <div className="divide-y divide-gray-200">
                  {coGuests.map((cg, cIdx) => (
                    <div key={cIdx} className="p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-white">
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">Guest #{cIdx + 2} Name</span>
                        <strong className="text-gray-900 font-black">{cg.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">Mobile</span>
                        <span className="font-bold text-gray-800">{cg.mobileNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">ID Proof</span>
                        <span className="font-bold text-gray-800">{cg.idProofType} : {cg.idProofNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">Gender / DOB</span>
                        <span className="font-bold text-gray-800">{cg.gender || '—'} {cg.dateOfBirth ? `· ${cg.dateOfBirth}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. ATTACHED ID PROOF PHOTOS (FRONT & BACK) */}
            <div className="border border-gray-900 sm:border-2 rounded-lg overflow-hidden mb-3">
              <div className="bg-gray-900 text-white px-3 py-1 font-black text-[10px] uppercase tracking-wider flex items-center justify-between">
                <span>Attached Identity Proof Photos</span>
                <span className="text-[9px] font-normal text-gray-300">Documentary Verification</span>
              </div>

              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-gray-50/60">
                {/* FRONT ID */}
                <div className="border border-gray-200 rounded-lg p-2 bg-white flex flex-col items-center justify-between text-center min-h-[130px]">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1.5 block truncate w-full">
                    {primaryGuest.fullName || 'Guest'} — Front ID
                  </span>
                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden max-h-28">
                    {frontImgUrl ? (
                      <img
                        src={frontImgUrl}
                        alt="Front ID"
                        className="max-h-28 max-w-full object-contain rounded border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`${frontImgUrl ? 'hidden' : 'flex'} h-24 w-full border-2 border-dashed border-gray-200 rounded items-center justify-center text-gray-400 text-[10px] font-bold p-2 text-center`}>
                      Front ID Not Attached
                    </div>
                  </div>
                </div>

                {/* BACK ID */}
                <div className="border border-gray-200 rounded-lg p-2 bg-white flex flex-col items-center justify-between text-center min-h-[130px]">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1.5 block truncate w-full">
                    {primaryGuest.fullName || 'Guest'} — Back ID
                  </span>
                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden max-h-28">
                    {backImgUrl ? (
                      <img
                        src={backImgUrl}
                        alt="Back ID"
                        className="max-h-28 max-w-full object-contain rounded border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`${backImgUrl ? 'hidden' : 'flex'} h-24 w-full border-2 border-dashed border-gray-200 rounded items-center justify-center text-gray-400 text-[10px] font-bold p-2 text-center`}>
                      Back ID (Not Attached / Physical ID Verified)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. PAYMENT SNAPSHOT */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-300 border border-gray-900 sm:border-2 rounded-lg overflow-hidden mb-3 text-center">
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-wider">Total Tariff</span>
                <span className="block text-xs sm:text-sm font-black text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-wider">Paid / Advance</span>
                <span className="block text-xs font-black text-emerald-800">₹{paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-wider">Payment Mode</span>
                <span className="block text-xs font-black text-gray-900">{stayData?.paymentMethod || 'Cash'}</span>
              </div>
              <div className="p-2 bg-white flex flex-col justify-center">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-wider">Balance Due</span>
                <span className={`block text-xs sm:text-sm font-black ${balanceDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 7 & 8. DECLARATION & SIGNATURES COMBINED OFFICIAL BLOCK */}
            <div className="border border-gray-900 sm:border-2 rounded-lg overflow-hidden bg-white mt-3">
              {/* POLICY DECLARATION */}
              <div className="p-2.5 bg-gray-50/90 border-b border-gray-300 text-[9px] text-gray-700 leading-snug">
                <strong className="block uppercase font-black text-gray-900 text-[9px] mb-0.5 tracking-wider">
                  Declaration & Hotel Policy Acknowledgement:
                </strong>
                I/We hereby declare that all personal details and identity proofs furnished above are true and accurate. I/We agree to strictly comply with the hotel house rules, room policies, check-out timings, and local government/police regulations. Any damage caused to property or missing amenities shall be charged in full. As per the IT Act 2000, electronic identity verification and digital records maintained by the front desk are legally binding.
              </div>

              {/* DUAL SIGNATURE BOXES */}
              <div className="grid grid-cols-2 divide-x divide-gray-300 bg-white">
                {/* GUEST SIGNATURE */}
                <div className="p-3 flex flex-col justify-between min-h-[92px] text-left">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-600 mb-2">
                    <span>Guest Signature</span>
                    <span className="text-[8px] font-mono text-gray-400 font-normal">(Sign in Box)</span>
                  </div>
                  
                  {/* Signing zone */}
                  <div className="h-12 border-b-2 border-dashed border-gray-400 flex items-end pb-1">
                    <span className="text-[9px] font-mono text-gray-300 pl-1">x______________________</span>
                  </div>

                  <div className="mt-2 pt-1 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-black uppercase text-gray-900 truncate">
                        {primaryGuest.fullName || 'Primary Guest'}
                      </span>
                      <span className="block text-[8px] font-bold text-gray-500">
                        Primary Guest Sign
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-400">Date: ____________</span>
                  </div>
                </div>

                {/* FRONT DESK / DUTY MANAGER */}
                <div className="p-3 flex flex-col justify-between min-h-[92px] text-left">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-600 mb-2">
                    <span>Front Desk / Duty Manager</span>
                    <span className="text-[8px] font-mono text-gray-400 font-normal">(Seal & Signature)</span>
                  </div>
                  
                  {/* Stamping zone */}
                  <div className="h-12 border-b-2 border-dashed border-gray-400 flex items-end pb-1">
                    <span className="text-[9px] font-mono text-gray-300 pl-1">[ Official Seal / Stamp ]</span>
                  </div>

                  <div className="mt-2 pt-1 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-black uppercase text-gray-900">
                        Reception Desk
                      </span>
                      <span className="block text-[8px] font-bold text-emerald-800">
                        Verified & Checked In
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-400">Time: ____________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD SYSTEM FOOTNOTE */}
            <div className="mt-2.5 pt-1.5 border-t border-gray-200 text-center text-[8px] text-gray-400 uppercase tracking-widest font-mono">
              Official Guest Registration Card · Generated digitally via NXHotel PMS
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BAR (PINNED, SHRINK-0, ALWAYS VISIBLE) */}
        <div className="no-print px-4 sm:px-6 py-3 bg-white border-t border-gray-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
            <p className="text-xs text-gray-500 font-medium hidden md:block">
              Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 font-mono text-[11px] border border-gray-200">Ctrl + P</kbd> or click <strong>Print A4</strong> to print.
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            {onProceedToDashboard && (
              <button
                onClick={onProceedToDashboard}
                type="button"
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Dashboard
              </button>
            )}

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              type="button"
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Preparing Print...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>Print A4 Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
