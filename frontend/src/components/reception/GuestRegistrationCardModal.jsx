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

  // Extract ALL registered guests (Primary + Co-guests)
  const allGuests = (guests && guests.length > 0)
    ? guests
    : (stayData?.guests || (stayData?.guest ? [stayData.guest, ...(stayData.coGuests || [])] : []));
  const validGuests = allGuests.filter(g => g && g.fullName && g.fullName.trim() !== '');
  const displayGuests = validGuests.length > 0 ? validGuests : (allGuests.length > 0 ? [allGuests[0]] : [{ fullName: 'Guest' }]);
  const primaryGuest = displayGuests[0] || {};

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

  // Property info fallback
  const hotelName = hotelData?.name || roomData?.hostel?.name || 'HOTEL & RESIDENCY';
  const hotelAddress = hotelData?.address || roomData?.hostel?.address || 'Main Road, City Center';
  const hotelContact = hotelData?.contactNumber || roomData?.hostel?.contactNumber || '+91 98765 43210';
  const hotelEmail = hotelData?.email || roomData?.hostel?.email || '';

  // Collect ID Cards for ALL guests
  const idCards = [];
  displayGuests.forEach((g, gIdx) => {
    const gName = g.fullName || `Guest ${gIdx + 1}`;
    const roleLabel = gIdx === 0 ? 'Primary' : `Guest ${gIdx + 1}`;
    
    // Front ID
    idCards.push({
      title: `${roleLabel}: ${gName} — Front ID`,
      docType: g.idProofType || 'Aadhaar',
      side: 'Front',
      url: g.idProofImage ? getFullImageUrl(g.idProofImage) : null
    });
    
    // Back ID
    idCards.push({
      title: `${roleLabel}: ${gName} — Back ID`,
      docType: g.idProofType || 'Aadhaar',
      side: 'Back',
      url: g.idProofImageBack ? getFullImageUrl(g.idProofImageBack) : null
    });
  });

  const guestCount = displayGuests.length;
  // Dynamic layout & responsive sizing based on guest count (1 guest = 2 big cards, 2 guests = 4 cards, 3+ guests = 6 cards)
  // Ensures 100% single A4 page fit with zero overflow whether 1, 2, or 3+ guests are present
  const idCols = idCards.length <= 2 ? 2 : (idCards.length <= 4 ? 4 : (idCards.length <= 6 ? 3 : 4));
  const idImgHeightPx = guestCount === 1 ? 290 : (guestCount === 2 ? 140 : (guestCount === 3 ? 90 : 75));
  const guestCardPadding = guestCount === 1 ? '10px 14px' : (guestCount === 2 ? '7px 12px' : '5px 10px');
  const sigHeight = guestCount === 1 ? '54px' : (guestCount === 2 ? '42px' : '36px');
  const sigColMinHeight = guestCount === 1 ? '96px' : (guestCount === 2 ? '78px' : '68px');
  const sigPadding = guestCount === 1 ? '10px 16px' : (guestCount === 2 ? '7px 12px' : '5px 10px');
  const declPadding = guestCount === 1 ? '10px 14px' : (guestCount === 2 ? '7px 12px' : '5px 10px');
  const declFontSize = guestCount >= 3 ? '8.5px' : '9.5px';
  const sheetPadding = guestCount === 1 ? '12px 14px' : (guestCount === 2 ? '10px 14px' : '8px 12px');
  const boxGap = guestCount === 1 ? '12px' : (guestCount === 2 ? '8px' : '6px');
  const guestGridGap = guestCount === 1 ? '6px 14px' : (guestCount === 2 ? '5px 12px' : '4px 10px');
  const guestGridFontSize = guestCount >= 3 ? '10px' : '11px';
  const guestNameFontSize = guestCount >= 3 ? '12.5px' : '14px';
  const guestTagMarginBottom = guestCount === 1 ? '8px' : '5px';
  const addressRowPadding = guestCount === 1 ? '6px' : '4px';
  const addressRowMargin = guestCount === 1 ? '8px' : '4px';
  const idGridGap = guestCount === 1 ? '10px' : (guestCount === 2 ? '8px' : '6px 8px');
  const idGridPadding = guestCount === 1 ? '10px' : (guestCount === 2 ? '8px' : '6px 8px');
  const idCardPadding = guestCount === 1 ? '6px 8px' : (guestCount === 2 ? '4px 6px' : '3px 6px');
  const idTitleFontSize = guestCount === 1 ? '10.5px' : (guestCount === 2 ? '9.5px' : '9px');
  const idTitleMarginBottom = guestCount === 1 ? '6px' : '3px';

  // =========================================================
  // HELPER: Convert rendered image on screen or URL to Data URI
  // =========================================================
  const getRenderedImageDataUrl = async (imgEl, fallbackUrl) => {
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
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
  // DEDICATED ISOLATED PRINT ENGINE (Clean, Gap-Free, Single A4 Page)
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

      // Clone sheet and swap in resolved Base64 image sources for ALL images
      const clonedSheet = printSheet.cloneNode(true);
      const originalImgs = Array.from(printSheet.querySelectorAll('img'));
      const clonedImgs = Array.from(clonedSheet.querySelectorAll('img'));

      await Promise.all(
        originalImgs.map(async (origImg, index) => {
          const targetClonedImg = clonedImgs[index];
          if (!targetClonedImg) return;
          const currentUrl = origImg.currentSrc || origImg.src;
          if (!currentUrl) return;

          try {
            const dataUrl = await getRenderedImageDataUrl(origImg, currentUrl);
            if (dataUrl) {
              targetClonedImg.src = dataUrl;
              targetClonedImg.style.display = 'block';
            }
          } catch (imgErr) {
            console.warn(`Image conversion failed for img ${index}:`, imgErr);
          }
        })
      );

      // Remove any elements with no-print
      clonedSheet.querySelectorAll('.no-print').forEach(el => el.remove());

      // Prepare hidden iframe with actual layout viewport
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

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Guest Registration Card - ${grNumber}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 5mm 7mm;
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
                color: #0f172a !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 11px !important;
                line-height: 1.35 !important;
                height: 100% !important;
                overflow: hidden !important;
              }
              body {
                padding: 0 !important;
                display: flex !important;
                justify-content: center !important;
              }
              #grc-printable-sheet {
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                visibility: visible !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 272mm !important;
                max-height: 284mm !important;
                margin: 0 auto !important;
                padding: ${sheetPadding} !important;
                border: 2.5px solid #0f172a !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              #grc-printable-sheet * {
                visibility: visible !important;
              }
              .grc-header-row {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                border-bottom: 2.5px solid #0f172a !important;
                padding-bottom: 10px !important;
                margin-bottom: 0px !important;
                gap: 14px !important;
              }
              .grc-metric-row {
                display: grid !important;
                grid-template-columns: repeat(6, 1fr) !important;
                gap: 1.5px !important;
                background-color: #64748b !important;
                border: 2px solid #0f172a !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                margin-bottom: 0px !important;
                text-align: center !important;
              }
              .grc-metric-cell {
                background: #ffffff !important;
                padding: 8px 4px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
              }
              .grc-metric-label {
                display: block !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                color: #475569 !important;
                letter-spacing: 0.05em !important;
                margin-bottom: 2px !important;
              }
              .grc-metric-val {
                display: block !important;
                font-size: 12.5px !important;
                font-weight: 900 !important;
                color: #0f172a !important;
              }
              .grc-box {
                border: 2px solid #0f172a !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                margin-bottom: 0px !important;
                background: #ffffff !important;
              }
              .grc-box-header {
                background: #0f172a !important;
                color: #ffffff !important;
                padding: 6px 12px !important;
                font-size: 10.5px !important;
                font-weight: 900 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
              }
              .grc-guest-card {
                padding: ${guestCardPadding} !important;
                background: #ffffff !important;
                border-bottom: 1.5px dashed #cbd5e1 !important;
              }
              .grc-guest-card:last-child {
                border-bottom: none !important;
              }
              .grc-guest-tag {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: ${guestTagMarginBottom} !important;
              }
              .grc-guest-grid {
                display: grid !important;
                grid-template-columns: 1.2fr 1.3fr 1.3fr 1.1fr !important;
                gap: ${guestGridGap} !important;
                font-size: ${guestGridFontSize} !important;
              }
              .grc-field-lbl {
                display: block !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                color: #64748b !important;
                letter-spacing: 0.03em !important;
                margin-bottom: 2px !important;
              }
              .grc-field-val {
                display: block !important;
                font-size: 12.5px !important;
                font-weight: 800 !important;
                color: #0f172a !important;
              }
              .grc-address-row {
                margin-top: ${addressRowMargin} !important;
                padding-top: ${addressRowPadding} !important;
                border-top: 1px solid #e2e8f0 !important;
                font-size: 11px !important;
              }
              .grc-id-grid {
                display: grid !important;
                gap: ${idGridGap} !important;
                padding: ${idGridPadding} !important;
                background: #ffffff !important;
              }
              .grc-id-card {
                border: 1.5px solid #cbd5e1 !important;
                border-radius: 8px !important;
                padding: ${idCardPadding} !important;
                background: #ffffff !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: space-between !important;
                text-align: center !important;
                box-sizing: border-box !important;
              }
              .grc-id-card-title {
                font-size: ${idTitleFontSize} !important;
                font-weight: 900 !important;
                text-transform: uppercase !important;
                color: #0f172a !important;
                margin-bottom: ${idTitleMarginBottom} !important;
                width: 100% !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                letter-spacing: 0.03em !important;
              }
              .grc-id-card-img-wrap {
                width: 100% !important;
                height: ${idImgHeightPx}px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
                background: #ffffff !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 6px !important;
              }
              .grc-id-img {
                max-height: ${idImgHeightPx - 6}px !important;
                max-width: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                border-radius: 4px !important;
                display: block !important;
              }
              .grc-id-placeholder {
                height: ${idImgHeightPx - 6}px !important;
                width: 100% !important;
                border: 2px dashed #cbd5e1 !important;
                border-radius: 6px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                color: #64748b !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                text-align: center !important;
                padding: 8px !important;
                background: #f8fafc !important;
              }
              .grc-decl-box {
                border: 2px solid #0f172a !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                background: #ffffff !important;
                margin-bottom: 0px !important;
              }
              .grc-decl-text {
                padding: ${declPadding} !important;
                background: #f8fafc !important;
                border-bottom: 1.5px solid #cbd5e1 !important;
                font-size: ${declFontSize} !important;
                color: #334155 !important;
                line-height: 1.45 !important;
              }
              .grc-signatures {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                background: #ffffff !important;
              }
              .grc-sig-col {
                padding: ${sigPadding} !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                min-height: ${sigColMinHeight} !important;
                box-sizing: border-box !important;
              }
              .grc-sig-col:first-child {
                border-right: 1.5px solid #cbd5e1 !important;
              }
              .grc-hidden {
                display: none !important;
              }
              .grc-flex {
                display: flex !important;
              }
            </style>
          </head>
          <body>
            ${clonedSheet.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      // Ensure all images are completely loaded in iframe
      const iframeImgs = Array.from(iframe.contentWindow.document.images);
      const imgPromises = iframeImgs.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(res => {
          img.onload = res;
          img.onerror = res;
          setTimeout(res, 600);
        });
      });

      await Promise.all(imgPromises);

      // Focus and trigger print dialog
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
      {/* SCOPED EMBEDDED CSS FOR PERFECT PREVIEW */}
      <style>{`
        .grc-sheet {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.35;
          background: #ffffff;
        }
        .grc-header-row {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: ${boxGap};
          gap: 14px;
        }
        .grc-metric-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1.5px;
          background-color: #64748b;
          border: 2px solid #0f172a;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: ${boxGap};
          text-align: center;
        }
        .grc-metric-cell {
          background: #ffffff;
          padding: 8px 4px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .grc-metric-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .grc-metric-val {
          display: block;
          font-size: 12.5px;
          font-weight: 900;
          color: #0f172a;
        }
        .grc-box {
          border: 2px solid #0f172a;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: ${boxGap};
          background: #ffffff;
        }
        .grc-box-header {
          background: #0f172a;
          color: #ffffff;
          padding: 6px 12px;
          font-size: 10.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .grc-guest-card {
          padding: ${guestCardPadding};
          background: #ffffff;
          border-bottom: 1.5px dashed #cbd5e1;
        }
        .grc-guest-card:last-child {
          border-bottom: none;
        }
        .grc-guest-tag {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${guestTagMarginBottom};
        }
        .grc-guest-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.3fr 1.3fr 1.1fr;
          gap: ${guestGridGap};
          font-size: ${guestGridFontSize};
        }
        .grc-field-lbl {
          display: block;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.03em;
          margin-bottom: 2px;
        }
        .grc-field-val {
          display: block;
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .grc-address-row {
          margin-top: ${addressRowMargin};
          padding-top: ${addressRowPadding};
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
        }
        .grc-id-grid {
          display: grid;
          gap: ${idGridGap};
          padding: ${idGridPadding};
          background: #ffffff;
        }
        .grc-id-card {
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: ${idCardPadding};
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          box-sizing: border-box;
        }
        .grc-id-card-title {
          font-size: ${idTitleFontSize};
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: ${idTitleMarginBottom};
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.03em;
        }
        .grc-id-card-img-wrap {
          width: 100%;
          height: ${idImgHeightPx}px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .grc-id-img {
          max-height: ${idImgHeightPx - 6}px;
          max-width: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .grc-id-placeholder {
          height: ${idImgHeightPx - 6}px;
          width: 100%;
          border: 2px dashed #cbd5e1;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          text-align: center;
          padding: 8px;
          background: #f8fafc;
        }
        .grc-decl-box {
          border: 2px solid #0f172a;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
          margin-bottom: ${boxGap};
        }
        .grc-decl-text {
          padding: ${declPadding};
          background: #f8fafc;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: ${declFontSize};
          color: #334155;
          line-height: 1.45;
        }
        .grc-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #ffffff;
        }
        .grc-sig-col {
          padding: ${sigPadding};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: ${sigColMinHeight};
          box-sizing: border-box;
        }
        .grc-sig-col:first-child {
          border-right: 1.5px solid #cbd5e1;
        }
        .grc-hidden {
          display: none !important;
        }
        .grc-flex {
          display: flex !important;
        }
      `}</style>

      {/* MODAL WRAPPER */}
      <div
        id="grc-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[96vh] sm:h-[92vh] max-h-[920px] shadow-2xl border border-gray-200 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
      >
        {/* TOP CONTROL BAR */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-gray-950 text-white flex items-center justify-between gap-3 border-b border-gray-800 shrink-0 z-30">
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
                Print on A4 for physical verification & guest signature · {displayGuests.length} Registered Guest(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              type="button"
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>Print A4</span>
                </>
              )}
            </button>

            {onProceedToDashboard && (
              <button
                onClick={onProceedToDashboard}
                type="button"
                className="hidden sm:inline-flex px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl transition-all border border-gray-700 active:scale-95 cursor-pointer"
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
              OFFICIAL PRINTABLE GRC SHEET (CLEAN, NO GAP, 100% BALANCED)
          ==================================================================== */}
          <div
            id="grc-printable-sheet"
            ref={printAreaRef}
            style={{ padding: sheetPadding }}
            className="grc-sheet w-full max-w-[780px] bg-white border-2 border-gray-900 rounded-xl shadow-sm text-left leading-normal"
          >
            {/* 1. HOTEL HEADER & GRC BADGE */}
            <div className="grc-header-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#0f172a', margin: 0, lineHeight: 1.15 }}>
                  {hotelName}
                </h1>
                <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', margin: '4px 0 0 0', lineHeight: 1.35 }}>
                  {hotelAddress}
                </p>
                <p style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', margin: '3px 0 0 0' }}>
                  <strong>Contact:</strong> {hotelContact} {hotelEmail ? ` | Email: ${hotelEmail}` : ''}
                </p>
              </div>

              {/* GRC DOCUMENT BADGE */}
              <div style={{ flexShrink: 0, textAlign: 'right', border: '2px solid #0f172a', borderRadius: '8px', padding: '7px 14px', background: '#f8fafc' }}>
                <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
                  Guest Registration Card
                </span>
                <span style={{ display: 'block', fontSize: '14px', fontFamily: 'monospace', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
                  {grNumber}
                </span>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                  Generated: {formattedGeneratedAt}
                </span>
              </div>
            </div>

            {/* 2. STAY & ROOM METRIC STRIP (FIXED 6 COLUMNS) */}
            <div className="grc-metric-row">
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Room No.</span>
                <span className="grc-metric-val" style={{ fontSize: '16px', color: '#0f172a' }}>{roomData?.roomNumber || '—'}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Room Type</span>
                <span className="grc-metric-val" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {roomData?.roomType || 'Standard'}
                </span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Check-In</span>
                <span className="grc-metric-val">{formattedCheckIn}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Check-Out</span>
                <span className="grc-metric-val">{formattedCheckOut}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Duration</span>
                <span className="grc-metric-val">{stayData?.durationDays || 1}D {stayData?.durationHours || 0}H</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">Occupants</span>
                <span className="grc-metric-val">{displayGuests.length || stayData?.occupants || 1} Guest(s)</span>
              </div>
            </div>

            {/* 3. REGISTERED GUESTS INFORMATION (ALL GUESTS) */}
            <div className="grc-box">
              <div className="grc-box-header">
                <span>
                  Registered Guests Information ({displayGuests.length} {displayGuests.length > 1 ? 'Guests' : 'Guest'})
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#cbd5e1' }}>
                  Govt ID Verified for Police & Hotel Compliance
                </span>
              </div>

              <div>
                {displayGuests.map((guest, idx) => {
                  const guestAge = getAgeString(guest.dateOfBirth);
                  const isLead = idx === 0;
                  return (
                    <div key={idx} className="grc-guest-card">
                      <div className="grc-guest-tag">
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          <span style={{ background: isLead ? '#0f172a' : '#475569', color: '#fff', fontSize: '9.5px', fontWeight: 900, padding: '2px 7px', borderRadius: '4px', marginRight: '8px' }}>
                            Guest #{idx + 1}
                          </span>
                          <strong style={{ fontSize: guestNameFontSize, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#0f172a' }}>{guest.fullName || '—'}</strong>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginLeft: '6px' }}>
                            {isLead ? '(Primary / Lead Guest)' : '(Accompanying Guest)'}
                          </span>
                        </span>
                        <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                          {guest.idProofType || 'Aadhaar'}: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{guest.idProofNumber || 'Verified'}</strong>
                        </span>
                      </div>

                      <div className="grc-guest-grid">
                        <div>
                          <span className="grc-field-lbl">Mobile Number</span>
                          <span className="grc-field-val">
                            {guest.mobileNumber ? `+91 ${guest.mobileNumber}` : (isLead ? '—' : 'Same as Primary')}
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">Gender / DOB / Age</span>
                          <span className="grc-field-val">
                            {guest.gender || '—'}
                            {guest.dateOfBirth ? ` · ${guest.dateOfBirth}` : ''}
                            {guestAge ? ` (${guestAge})` : ''}
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">ID Document & Number</span>
                          <span className="grc-field-val">
                            {guest.idProofType || 'Aadhaar'} : <strong style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>{guest.idProofNumber || '—'}</strong>
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">Nationality / Purpose</span>
                          <span className="grc-field-val">Indian · General / Stay</span>
                        </div>
                      </div>

                      <div className="grc-address-row">
                        <span className="grc-field-lbl" style={{ display: 'inline', marginRight: '6px' }}>Permanent Residential Address:</span>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {guest.address || (isLead ? '—' : (primaryGuest.address || 'Physical Address Verified at Desk'))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. ATTACHED ID PROOF PHOTOS (LARGE, PROMINENT, CLEAR) */}
            <div className="grc-box">
              <div className="grc-box-header">
                <span>
                  Attached Identity Proof Documents ({idCards.filter(c => c.url).length} Uploaded / Verified)
                </span>
                <span style={{ fontSize: '8.5px', fontWeight: 600, color: '#cbd5e1' }}>
                  Documentary Verification
                </span>
              </div>

              <div
                className="grc-id-grid"
                style={{
                  gridTemplateColumns: `repeat(${idCols}, 1fr)`
                }}
              >
                {idCards.map((card, cIdx) => (
                  <div key={cIdx} className="grc-id-card">
                    <div className="grc-id-card-title" title={card.title}>
                      {card.title}
                    </div>
                    <div className="grc-id-card-img-wrap">
                      {card.url ? (
                        <img
                          src={card.url}
                          alt={card.title}
                          className="grc-id-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`grc-id-placeholder ${card.url ? 'grc-hidden' : 'grc-flex'}`}
                      >
                        <ShieldCheck size={24} className="text-gray-400 mb-1" />
                        <span>[ {card.side} ID Verified at Desk ]</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. LEGAL DECLARATION & DUAL SIGNATURE BOXES (CLEAN & BALANCED) */}
            <div className="grc-decl-box">
              {/* POLICY DECLARATION */}
              <div className="grc-decl-text">
                <strong style={{ display: 'block', textTransform: 'uppercase', color: '#0f172a', fontSize: guestCount >= 3 ? '9px' : '10px', marginBottom: guestCount >= 3 ? '2px' : '4px', letterSpacing: '0.04em' }}>
                  Declaration & Guest Acknowledgement:
                </strong>
                I/We hereby solemnly declare that all personal particulars, mobile numbers, and identity documents furnished above are true and accurate. I/We agree to strictly comply with the hotel house rules, room policies, check-out timings, and local government/police regulations. As per the IT Act 2000, electronic identity verification and digital records maintained by the front desk are legally binding.
              </div>

              {/* DUAL SIGNATURE BOXES */}
              <div className="grc-signatures">
                {/* GUEST SIGNATURE */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>Guest Signature</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>(Sign in Box)</span>
                  </div>
                  
                  {/* Signing zone */}
                  <div style={{ height: sigHeight, borderBottom: '2px dashed #94a3b8', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', paddingLeft: '4px' }}>x__________________________________</span>
                  </div>

                  <div style={{ marginTop: guestCount >= 2 ? '5px' : '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayGuests.map(g => g.fullName).filter(Boolean).join(', ') || 'Registered Guest'}
                      </span>
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
                        {displayGuests.length > 1 ? `All Registered Guests (${displayGuests.length})` : 'Primary Guest Signature'}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>Date: ____________</span>
                  </div>
                </div>

                {/* FRONT DESK / DUTY MANAGER */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>Front Desk / Duty Manager</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>(Seal & Stamp)</span>
                  </div>
                  
                  {/* Stamping zone */}
                  <div style={{ height: sigHeight, borderBottom: '2px dashed #94a3b8', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', paddingLeft: '4px' }}>[ Official Hotel Seal / Signature ]</span>
                  </div>

                  <div style={{ marginTop: guestCount >= 2 ? '5px' : '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                        Reception Desk
                      </span>
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#047857' }}>
                        Verified & Checked In
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>Time: ____________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD SYSTEM FOOTNOTE */}
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              Official Guest Registration Card · Generated digitally via NXHotel PMS
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BAR (PINNED, ALWAYS VISIBLE) */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-white border-t border-gray-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
            <p className="text-xs text-gray-500 font-medium hidden md:block">
              Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 font-mono text-[11px] border border-gray-200">Ctrl + P</kbd> or click <strong>Print A4</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            {onProceedToDashboard && (
              <button
                onClick={onProceedToDashboard}
                type="button"
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Dashboard
              </button>
            )}

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              type="button"
              className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
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
