import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  Printer,
  X,
  ShieldCheck,
  Loader2,
  MessageSquare,
  Layers,
  FileText
} from 'lucide-react';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useLanguage } from '../../context/LanguageContext';

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
  const [previewTab, setPreviewTab] = useState('both'); // 'both' | 'front' | 'back'
  const { isHindi } = useLanguage();

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
        handlePrint(previewTab === 'both' ? 'both' : previewTab);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, previewTab]);

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
  const guestCount = displayGuests.length;

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
  const hotelName = hotelData?.name || roomData?.hostel?.name || stayData?.hostel?.name || 'HOTEL & RESIDENCY';
  const hotelAddress = hotelData?.address || roomData?.hostel?.address || stayData?.hostel?.address || 'Main Road, City Center';
  const hotelContact = hotelData?.contactNumber || roomData?.hostel?.contactNumber || stayData?.hostel?.contactNumber || '+91 98765 43210';
  const hotelEmail = hotelData?.email || roomData?.hostel?.email || stayData?.hostel?.email || '';

  const getWhatsAppWelcomeUrl = () => {
    const rawPhone = primaryGuest.mobileNumber ? primaryGuest.mobileNumber.replace(/\D/g, '') : '';
    if (!rawPhone) return null;
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const gName = primaryGuest.fullName || 'Guest';
    const roomNo = roomData?.roomNumber || stayData?.room?.roomNumber || 'Assigned';
    const contactLine = (hotelContact && hotelContact !== 'N/A') ? `\n📞 *Front Desk:* ${hotelContact}` : '';

    const msg = [
      `🏨 *Welcome to ${hotelName}!*`,
      `──────────────────────`,
      `Namaste *${gName}* ji,`,
      `We are pleased to host you. Here are your reservation details:`,
      `🚪 *Room:* ${roomNo}`,
      `📅 *Check-In:* ${formattedCheckIn}`,
      `📅 *Expected Check-Out:* ${formattedCheckOut}`,
      contactLine,
      `──────────────────────`,
      `Please contact reception for room service or any assistance. Wish you a wonderful stay! ✨`
    ].filter(Boolean).join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Collect ID Cards for Page 1 overview
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

  // Dynamic layout & responsive sizing based on guest count for Page 1
  const idCols = idCards.length <= 2 ? 2 : (idCards.length <= 4 ? 4 : (idCards.length <= 6 ? 3 : 4));
  const idImgHeightPx = guestCount === 1 ? 280 : (guestCount === 2 ? 135 : (guestCount === 3 ? 85 : 70));
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

  // Dynamic layout sizing for Page 2 (Dedicated Back Side ID Sheet)
  const page2Padding = guestCount === 1 ? '14px 16px' : (guestCount === 2 ? '11px 15px' : '9px 13px');
  const page2ImgHeight = guestCount === 1 ? 230 : (guestCount === 2 ? 140 : (guestCount === 3 ? 92 : 72));
  const page2GuestBlockPadding = guestCount === 1 ? '12px 14px' : (guestCount === 2 ? '8px 12px' : '6px 10px');

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
  // DEDICATED ISOLATED PRINT ENGINE (Front, Back, or Both / Duplex)
  // =========================================================
  const handlePrint = async (mode = 'both') => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const frontSheet = document.getElementById('grc-front-sheet');
      const backSheet = document.getElementById('grc-back-sheet');

      if (!frontSheet && !backSheet) {
        window.print();
        setIsPrinting(false);
        return;
      }

      // Container for print document
      const printContainer = document.createElement('div');

      if (mode === 'both') {
        if (frontSheet) {
          const clonedFront = frontSheet.cloneNode(true);
          clonedFront.style.display = 'flex';
          printContainer.appendChild(clonedFront);
        }
        if (frontSheet && backSheet) {
          const pageBreak = document.createElement('div');
          pageBreak.className = 'grc-page-break';
          printContainer.appendChild(pageBreak);
        }
        if (backSheet) {
          const clonedBack = backSheet.cloneNode(true);
          clonedBack.style.display = 'flex';
          printContainer.appendChild(clonedBack);
        }
      } else if (mode === 'front') {
        if (frontSheet) {
          const clonedFront = frontSheet.cloneNode(true);
          clonedFront.style.display = 'flex';
          printContainer.appendChild(clonedFront);
        }
      } else if (mode === 'back') {
        if (backSheet) {
          const clonedBack = backSheet.cloneNode(true);
          clonedBack.style.display = 'flex';
          printContainer.appendChild(clonedBack);
        }
      }

      // Collect all images from the source DOM elements to convert to Base64
      const allOrigImgs = [
        ...(frontSheet ? Array.from(frontSheet.querySelectorAll('img')) : []),
        ...(backSheet ? Array.from(backSheet.querySelectorAll('img')) : [])
      ];
      const allClonedImgs = Array.from(printContainer.querySelectorAll('img'));

      await Promise.all(
        allClonedImgs.map(async (clonedImg) => {
          const currentUrl = clonedImg.currentSrc || clonedImg.src;
          if (!currentUrl) return;

          try {
            const matchingOrig = allOrigImgs.find(o => (o.currentSrc || o.src) === currentUrl);
            const dataUrl = await getRenderedImageDataUrl(matchingOrig, currentUrl);
            if (dataUrl) {
              clonedImg.src = dataUrl;
              clonedImg.style.display = 'block';
            }
          } catch (imgErr) {
            console.warn('Image conversion fallback:', imgErr);
          }
        })
      );

      // Remove any elements with no-print
      printContainer.querySelectorAll('.no-print').forEach(el => el.remove());

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
            <title>Guest Registration Card - ${grNumber} (${mode.toUpperCase()})</title>
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
              }
              body {
                padding: 0 !important;
                display: block !important;
              }
              .grc-page {
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
                break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              .grc-page-break {
                page-break-before: always !important;
                break-before: page !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                visibility: hidden !important;
              }
              .grc-page * {
                visibility: visible !important;
              }
              .grc-header-row {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                border-bottom: 2.5px solid #0f172a !important;
                padding-bottom: 8px !important;
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
              .grc-metric-row-5 {
                display: grid !important;
                grid-template-columns: repeat(5, 1fr) !important;
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
                padding: 6px 4px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
              }
              .grc-metric-label {
                display: block !important;
                font-size: 8.5px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                color: #475569 !important;
                letter-spacing: 0.05em !important;
                margin-bottom: 2px !important;
              }
              .grc-metric-val {
                display: block !important;
                font-size: 11.5px !important;
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
                padding: 5px 12px !important;
                font-size: 10px !important;
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
                font-size: 8.5px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                color: #64748b !important;
                letter-spacing: 0.03em !important;
                margin-bottom: 2px !important;
              }
              .grc-field-val {
                display: block !important;
                font-size: 11.5px !important;
                font-weight: 800 !important;
                color: #0f172a !important;
              }
              .grc-address-row {
                margin-top: ${addressRowMargin} !important;
                padding-top: ${addressRowPadding} !important;
                border-top: 1px solid #e2e8f0 !important;
                font-size: 10.5px !important;
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
                padding: 6px !important;
                background: #f8fafc !important;
              }
              .grc-page2-guest-block {
                padding: ${page2GuestBlockPadding} !important;
                border-bottom: 2px solid #0f172a !important;
                background: #ffffff !important;
              }
              .grc-page2-guest-block:last-child {
                border-bottom: none !important;
              }
              .grc-page2-id-wrap {
                height: ${page2ImgHeight}px !important;
                width: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #f8fafc !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                overflow: hidden !important;
              }
              .grc-page2-id-img {
                max-height: ${page2ImgHeight - 4}px !important;
                max-width: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
              }
              .grc-page2-placeholder {
                height: ${page2ImgHeight - 4}px !important;
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                border: 1.5px dashed #cbd5e1 !important;
                border-radius: 6px !important;
                color: #64748b !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                background: #f8fafc !important;
                padding: 6px !important;
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
                line-height: 1.4 !important;
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
            ${printContainer.innerHTML}
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
          padding-bottom: 8px;
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
        .grc-metric-row-5 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
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
          padding: 6px 4px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .grc-metric-label {
          display: block;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .grc-metric-val {
          display: block;
          font-size: 11.5px;
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
          padding: 5px 12px;
          font-size: 10px;
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
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.03em;
          margin-bottom: 2px;
        }
        .grc-field-val {
          display: block;
          font-size: 11.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .grc-address-row {
          margin-top: ${addressRowMargin};
          padding-top: ${addressRowPadding};
          border-top: 1px solid #e2e8f0;
          font-size: 10.5px;
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
          padding: 6px;
          background: #f8fafc;
        }
        .grc-page2-guest-block {
          padding: ${page2GuestBlockPadding};
          border-bottom: 2px solid #0f172a;
          background: #ffffff;
        }
        .grc-page2-guest-block:last-child {
          border-bottom: none;
        }
        .grc-page2-id-wrap {
          height: ${page2ImgHeight}px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
        }
        .grc-page2-id-img {
          max-height: ${page2ImgHeight - 4}px;
          max-width: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
        }
        .grc-page2-placeholder {
          height: ${page2ImgHeight - 4}px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed #cbd5e1;
          border-radius: 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          background: #f8fafc;
          padding: 6px;
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
          line-height: 1.4;
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
        <div className="no-print px-4 sm:px-6 py-3 bg-gray-950 text-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-gray-800 shrink-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-base font-black tracking-tight text-white truncate">
                  {isHindi ? 'अतिथि पंजीकरण पत्र' : 'Guest Registration Card'}
                </h3>
                <span className="bg-emerald-500 text-black text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  {grNumber}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium truncate hidden md:block">
                {isHindi
                  ? `सत्यापन एवं हस्ताक्षर हेतु A4 प्रिंट · ${guestCount} पंजीकृत अतिथि`
                  : `A4 Print for physical verification & guest signature · ${guestCount} Registered Guest(s)`}
              </p>
            </div>
          </div>

          {/* VIEW TAB SWITCHER (Both | Front | Back) */}
          <div className="bg-gray-900 border border-gray-800 p-0.5 rounded-xl flex items-center gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPreviewTab('both')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'both'
                  ? 'bg-emerald-500 text-gray-950 font-black shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Layers size={13} />
              <span>{isHindi ? 'दोनों पृष्ठ' : 'Both Pages'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('front')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'front'
                  ? 'bg-emerald-500 text-gray-950 font-black shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <FileText size={13} />
              <span>{isHindi ? 'केवल फ्रंट' : 'Front Page'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('back')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'back'
                  ? 'bg-emerald-500 text-gray-950 font-black shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <ShieldCheck size={13} />
              <span>{isHindi ? 'बैक साइड (पहचान पत्र)' : 'Back Side (IDs)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {displayGuests.some(g => g.isAadhaarVerified) && (
              <div 
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800"
                title="Guest identity digitally verified via UIDAI cryptographically signed QR code"
              >
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>UIDAI QR Verified</span>
              </div>
            )}

            {/* QUICK PRINT BUTTON MATCHING CURRENT VIEW */}
            <button
              onClick={() => handlePrint(previewTab === 'both' ? 'both' : previewTab)}
              disabled={isPrinting}
              type="button"
              className="px-3.5 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isHindi ? 'तैयार...' : 'Preparing...'}</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>
                    {previewTab === 'both'
                      ? (isHindi ? 'दोनों पृष्ठ' : 'Print Both')
                      : previewTab === 'back'
                      ? (isHindi ? 'बैक साइड' : 'Print Back')
                      : (isHindi ? 'केवल फ्रंट' : 'Print Front')}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
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
          className="flex-1 overflow-y-auto p-3 sm:p-6 pb-6 bg-gray-100 flex flex-col items-center custom-scrollbar"
        >
          
          {/* ====================================================================
              PAGE 1: OFFICIAL FRONT GRC SHEET (REGISTRATION FORM)
          ==================================================================== */}
          <div
            id="grc-front-sheet"
            ref={printAreaRef}
            style={{
              display: (previewTab === 'both' || previewTab === 'front') ? 'flex' : 'none',
              padding: sheetPadding
            }}
            className="grc-sheet grc-page w-full max-w-[780px] bg-white border-2 border-gray-900 rounded-xl shadow-sm text-left leading-normal flex-col justify-between"
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
                  {isHindi ? 'अतिथि पंजीकरण पत्र' : 'Guest Registration Card'}
                </span>
                <span style={{ display: 'block', fontSize: '14px', fontFamily: 'monospace', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
                  {grNumber}
                </span>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                  {isHindi ? 'पृष्ठ १ · ' : 'Page 1 · '} {formattedGeneratedAt}
                </span>
              </div>
            </div>

            {/* 2. STAY & ROOM METRIC STRIP (FIXED 6 COLUMNS) */}
            <div className="grc-metric-row">
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'कमरा नं.' : 'Room No.'}</span>
                <span className="grc-metric-val" style={{ fontSize: '16px', color: '#0f172a' }}>{roomData?.roomNumber || '—'}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'कमरा प्रकार' : 'Room Type'}</span>
                <span className="grc-metric-val" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {roomData?.roomType || 'Standard'}
                </span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'चेक-इन' : 'Check-In'}</span>
                <span className="grc-metric-val">{formattedCheckIn}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'चेक-आउट' : 'Check-Out'}</span>
                <span className="grc-metric-val">{formattedCheckOut}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'अवधि' : 'Duration'}</span>
                <span className="grc-metric-val">{stayData?.durationDays || 1}D {stayData?.durationHours || 0}H</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'अतिथि' : 'Occupants'}</span>
                <span className="grc-metric-val">{displayGuests.length || stayData?.occupants || 1} {isHindi ? 'अतिथि' : 'Guest(s)'}</span>
              </div>
            </div>

            {/* 3. REGISTERED GUESTS INFORMATION (ALL GUESTS) */}
            <div className="grc-box">
              <div className="grc-box-header">
                <span>
                  {isHindi
                    ? `पंजीकृत अतिथियों का विवरण (${displayGuests.length} अतिथि)`
                    : `Registered Guests Information (${displayGuests.length} ${displayGuests.length > 1 ? 'Guests' : 'Guest'})`}
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#cbd5e1' }}>
                  {isHindi ? 'सरकारी पहचान पत्र सत्यापन' : 'Govt ID Verified for Police & Hotel Compliance'}
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
                            {isHindi ? 'अतिथि' : 'Guest'} #{idx + 1}
                          </span>
                          <strong style={{ fontSize: guestNameFontSize, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#0f172a' }}>{guest.fullName || '—'}</strong>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginLeft: '6px' }}>
                            {isLead
                              ? (isHindi ? '(मुख्य अतिथि)' : '(Primary / Lead Guest)')
                              : (isHindi ? '(सह-अतिथि)' : '(Accompanying Guest)')}
                          </span>
                        </span>
                        <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                          {guest.idProofType || 'Aadhaar'}: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{guest.idProofNumber || 'Verified'}</strong>
                        </span>
                      </div>

                      <div className="grc-guest-grid">
                        <div>
                          <span className="grc-field-lbl">{isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}</span>
                          <span className="grc-field-val">
                            {guest.mobileNumber ? `+91 ${guest.mobileNumber}` : (isLead ? '—' : (isHindi ? 'मुख्य अतिथि समान' : 'Same as Primary'))}
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">{isHindi ? 'लिंग / जन्मतिथि / आयु' : 'Gender / DOB / Age'}</span>
                          <span className="grc-field-val">
                            {guest.gender || '—'}
                            {guest.dateOfBirth ? ` · ${guest.dateOfBirth}` : ''}
                            {guestAge ? ` (${guestAge})` : ''}
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">{isHindi ? 'पहचान पत्र प्रकार एवं संख्या' : 'ID Document & Number'}</span>
                          <span className="grc-field-val">
                            {guest.idProofType || 'Aadhaar'} : <strong style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>{guest.idProofNumber || '—'}</strong>
                          </span>
                        </div>

                        <div>
                          <span className="grc-field-lbl">{isHindi ? 'राष्ट्रीयता / उद्देश्य' : 'Nationality / Purpose'}</span>
                          <span className="grc-field-val">Indian · General / Stay</span>
                        </div>
                      </div>

                      <div className="grc-address-row">
                        <span className="grc-field-lbl" style={{ display: 'inline', marginRight: '6px' }}>
                          {isHindi ? 'स्थायी निवास का पता:' : 'Permanent Residential Address:'}
                        </span>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {guest.address || (isLead ? '—' : (primaryGuest.address || (isHindi ? 'रिसेप्शन पर सत्यापित' : 'Physical Address Verified at Desk')))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. ATTACHED ID PROOF PHOTOS (SUMMARY THUMBNAILS ON FRONT PAGE) */}
            <div className="grc-box">
              <div className="grc-box-header">
                <span>
                  {isHindi
                    ? `संलग्न पहचान पत्र (${idCards.filter(c => c.url).length} अपलोड)`
                    : `Attached Identity Proof Documents (${idCards.filter(c => c.url).length} Uploaded)`}
                </span>
                <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '0.02em' }}>
                  {isHindi ? '🪪 मूल प्रतियां बैक साइड (पृष्ठ २) पर उपलब्ध' : '🪪 High-Res Photocopies Printed on Back Side (Page 2)'}
                </span>
              </div>

              {/* THUMBNAIL IDS */}
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
                        <ShieldCheck size={20} className="text-gray-400 mb-1" />
                        <span>[ {card.side} ID Verified ]</span>
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
                  {isHindi ? 'घोषणा एवं अतिथि अभिस्वीकृति:' : 'Declaration & Guest Acknowledgement:'}
                </strong>
                {isHindi
                  ? 'मैं/हम सत्यनिष्ठा से घोषणा करते हैं कि ऊपर दिए गए सभी व्यक्तिगत विवरण, मोबाइल नंबर एवं पहचान पत्र पूर्णतः सत्य एवं सटीक हैं। मैं/हम होटल के नियमों, चेक-आउट समय एवं स्थानीय पुलिस/सरकारी दिशानिर्देशों का पूर्ण पालन करने हेतु सहमत हैं। सूचना प्रौद्योगिकी अधिनियम 2000 के तहत इलेक्ट्रॉनिक सत्यापन एवं रिसेप्शन रिकॉर्ड कानूनी रूप से बाध्यकारी हैं।'
                  : 'I/We hereby solemnly declare that all personal particulars, mobile numbers, and identity documents furnished above are true and accurate. I/We agree to strictly comply with the hotel house rules, room policies, check-out timings, and local government/police regulations. As per the IT Act 2000, electronic identity verification and digital records maintained by the front desk are legally binding.'}
              </div>

              {/* DUAL SIGNATURE BOXES */}
              <div className="grc-signatures">
                {/* GUEST SIGNATURE */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>{isHindi ? 'अतिथि हस्ताक्षर' : 'Guest Signature'}</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>({isHindi ? 'हस्ताक्षर करें' : 'Sign in Box'})</span>
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
                        {displayGuests.length > 1
                          ? (isHindi ? `सभी पंजीकृत अतिथि (${displayGuests.length})` : `All Registered Guests (${displayGuests.length})`)
                          : (isHindi ? 'मुख्य अतिथि हस्ताक्षर' : 'Primary Guest Signature')}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{isHindi ? 'दिनांक:' : 'Date:'} ____________</span>
                  </div>
                </div>

                {/* FRONT DESK / DUTY MANAGER */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>{isHindi ? 'होटल रिसेप्शन / ड्यूटी मैनेजर' : 'Front Desk / Duty Manager'}</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>({isHindi ? 'सील एवं मोहर' : 'Seal & Stamp'})</span>
                  </div>
                  
                  {/* Stamping zone */}
                  <div style={{ height: sigHeight, borderBottom: '2px dashed #94a3b8', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', paddingLeft: '4px' }}>[ {isHindi ? 'आधिकारिक होटल सील / हस्ताक्षर' : 'Official Hotel Seal / Signature'} ]</span>
                  </div>

                  <div style={{ marginTop: guestCount >= 2 ? '5px' : '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                        {isHindi ? 'रिसेप्शन डेस्क' : 'Reception Desk'}
                      </span>
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#047857' }}>
                        {isHindi ? 'सत्यापित एवं चेक-इन पूर्ण' : 'Verified & Checked In'}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{isHindi ? 'समय:' : 'Time:'} ____________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD SYSTEM FOOTNOTE */}
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {isHindi
                ? 'आधिकारिक अतिथि पंजीकरण पत्र (पृष्ठ १) · NXHotel PMS द्वारा जनरेट'
                : 'Official Guest Registration Card (Page 1) · Generated digitally via NXHotel PMS'}
            </div>

          </div>

          {/* VISUAL DIVIDER BETWEEN PAGE 1 AND PAGE 2 IN PREVIEW */}
          {previewTab === 'both' && (
            <div className="no-print my-6 flex items-center justify-center gap-3 w-full max-w-[780px]">
              <div className="h-0.5 bg-slate-300 flex-1 border-t border-dashed border-slate-400" />
              <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-md">
                <Layers size={13} className="text-emerald-400" />
                <span>{isHindi ? 'पृष्ठ २ : पहचान पत्र दस्तावेज़ (बैक साइड प्रिंट)' : 'Page 2 : Identity Proofs (Back Side Print)'}</span>
              </span>
              <div className="h-0.5 bg-slate-300 flex-1 border-t border-dashed border-slate-400" />
            </div>
          )}

          {/* ====================================================================
              PAGE 2: DEDICATED BACK SIDE A4 ID PROOF SHEET (CLEAR, HIGH-RES)
          ==================================================================== */}
          <div
            id="grc-back-sheet"
            style={{
              display: (previewTab === 'both' || previewTab === 'back') ? 'flex' : 'none',
              padding: page2Padding
            }}
            className="grc-sheet grc-page w-full max-w-[780px] bg-white border-2 border-gray-900 rounded-xl shadow-sm text-left leading-normal flex-col justify-between"
          >
            {/* Page 2 Header */}
            <div className="grc-header-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#0f172a', margin: 0, lineHeight: 1.15 }}>
                  {hotelName}
                </h1>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#334155', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  {hotelAddress}
                </p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', margin: '2px 0 0 0' }}>
                  <strong>Contact:</strong> {hotelContact} {hotelEmail ? ` | Email: ${hotelEmail}` : ''}
                </p>
              </div>

              {/* Back Side Badge */}
              <div style={{ flexShrink: 0, textAlign: 'right', border: '2px solid #0f172a', borderRadius: '8px', padding: '6px 12px', background: '#f8fafc' }}>
                <span style={{ display: 'block', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
                  {isHindi ? 'पहचान पत्र प्रति (बैक साइड)' : 'Identity Proofs (Back Side)'}
                </span>
                <span style={{ display: 'block', fontSize: '13px', fontFamily: 'monospace', fontWeight: 900, color: '#047857', marginTop: '1px' }}>
                  {grNumber}
                </span>
                <span style={{ display: 'block', fontSize: '8.5px', fontWeight: 700, color: '#64748b', marginTop: '1px' }}>
                  {isHindi ? 'पृष्ठ २ · मुद्रित: ' : 'Page 2 · Printed: '} {formattedGeneratedAt}
                </span>
              </div>
            </div>

            {/* Page 2 Metric Strip (5 cols) */}
            <div className="grc-metric-row-5">
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'कमरा नं.' : 'Room No.'}</span>
                <span className="grc-metric-val" style={{ fontSize: '15px' }}>{roomData?.roomNumber || '—'}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'अतिथि संख्या' : 'Total Guests'}</span>
                <span className="grc-metric-val">{displayGuests.length} {isHindi ? 'अतिथि' : 'Guest(s)'}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'चेक-इन' : 'Check-In'}</span>
                <span className="grc-metric-val">{formattedCheckIn}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'चेक-आउट' : 'Check-Out'}</span>
                <span className="grc-metric-val">{formattedCheckOut}</span>
              </div>
              <div className="grc-metric-cell">
                <span className="grc-metric-label">{isHindi ? 'सत्यापन स्थिति' : 'Desk Status'}</span>
                <span className="grc-metric-val" style={{ color: '#047857' }}>{isHindi ? 'मूल दस्तावेज सत्यापित' : 'Original ID Verified'}</span>
              </div>
            </div>

            {/* Page 2 ID Documents Box */}
            <div className="grc-box">
              <div className="grc-box-header">
                <span>
                  {isHindi ? 'अतिथि पहचान पत्र दस्तावेज़ (मूल प्रति अभिलेख)' : 'Guest Identity Proof Documents (Photocopy & Verification Record)'}
                </span>
                <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#cbd5e1' }}>
                  {isHindi ? 'सराय अधिनियम एवं स्थानीय पुलिस अनुपालन' : 'Sarais Act & Police Compliance Copy'}
                </span>
              </div>

              <div>
                {displayGuests.map((guest, gIdx) => {
                  const isLead = gIdx === 0;
                  const frontUrl = guest.idProofImage ? getFullImageUrl(guest.idProofImage) : null;
                  const backUrl = guest.idProofImageBack ? getFullImageUrl(guest.idProofImageBack) : null;

                  return (
                    <div key={gIdx} className="grc-page2-guest-block">
                      {/* Guest Identifier Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: isLead ? '#0f172a' : '#475569', color: '#fff', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                            {isHindi ? 'अतिथि' : 'Guest'} #{gIdx + 1}
                          </span>
                          <span style={{ fontSize: guestCount >= 3 ? '12px' : '13.5px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                            {guest.fullName || '—'}
                          </span>
                          <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700 }}>
                            {isLead ? (isHindi ? '(मुख्य अतिथि)' : '(Primary Guest)') : (isHindi ? '(सह-अतिथि)' : '(Accompanying)')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', fontWeight: 800 }}>
                          <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', color: '#0f172a' }}>
                            {guest.idProofType || 'Aadhaar'}: <strong style={{ fontFamily: 'monospace' }}>{guest.idProofNumber || 'Verified'}</strong>
                          </span>
                          {guest.mobileNumber && (
                            <span style={{ color: '#475569' }}>
                              📞 +91 {guest.mobileNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Row if available */}
                      <div style={{ fontSize: '9.5px', color: '#334155', fontWeight: 700, marginBottom: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '3px' }}>
                        <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '8.5px', marginRight: '4px' }}>
                          {isHindi ? 'स्थायी पता:' : 'Address:'}
                        </span>
                        {guest.address || (isLead ? '—' : (primaryGuest.address || (isHindi ? 'रिसेप्शन पर सत्यापित' : 'Address Verified at Reception')))}
                      </div>

                      {/* Dual ID Cards: Front & Back */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {/* Front Side */}
                        <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '4px', background: '#ffffff', textAlign: 'center' }}>
                          <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '3px', letterSpacing: '0.03em' }}>
                            {guest.fullName || 'Guest'} — {isHindi ? 'सामने का भाग (Front ID)' : 'Front Side ID'}
                          </div>
                          <div className="grc-page2-id-wrap">
                            {frontUrl ? (
                              <img
                                src={frontUrl}
                                alt={`${guest.fullName} Front ID`}
                                className="grc-page2-id-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`grc-page2-placeholder ${frontUrl ? 'grc-hidden' : 'grc-flex'}`}>
                              <ShieldCheck size={20} className="text-gray-400 mb-1" />
                              <span>[ {isHindi ? 'सामने का पहचान पत्र रिसेप्शन पर भौतिक रूप से सत्यापित' : 'Front ID Physically Verified at Reception'} ]</span>
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '4px', background: '#ffffff', textAlign: 'center' }}>
                          <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '3px', letterSpacing: '0.03em' }}>
                            {guest.fullName || 'Guest'} — {isHindi ? 'पीछे का भाग (Back ID)' : 'Back Side ID'}
                          </div>
                          <div className="grc-page2-id-wrap">
                            {backUrl ? (
                              <img
                                src={backUrl}
                                alt={`${guest.fullName} Back ID`}
                                className="grc-page2-id-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`grc-page2-placeholder ${backUrl ? 'grc-hidden' : 'grc-flex'}`}>
                              <ShieldCheck size={20} className="text-gray-400 mb-1" />
                              <span>[ {isHindi ? 'पीछे का पहचान पत्र रिसेप्शन पर भौतिक रूप से सत्यापित' : 'Back ID Physically Verified at Reception'} ]</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Page 2 Sarais Act & Police Verification Certificate */}
            <div className="grc-decl-box">
              <div className="grc-decl-text">
                <strong style={{ display: 'block', textTransform: 'uppercase', color: '#0f172a', fontSize: guestCount >= 3 ? '8.5px' : '9.5px', marginBottom: '2px', letterSpacing: '0.04em' }}>
                  {isHindi ? 'वैधानिक पुलिस एवं सराय अधिनियम सत्यापन प्रमाणपत्र:' : 'Statutory Police & Sarais Act Verification Certificate:'}
                </strong>
                {isHindi
                  ? 'प्रमाणित किया जाता है कि सराय अधिनियम, 1867 एवं स्थानीय पुलिस सुरक्षा दिशानिर्देशों के तहत चेक-इन के समय ऊपर उल्लिखित सभी अतिथियों के मूल सरकारी पहचान पत्र (आधार / पासपोर्ट / वोटर आई.डी.) भौतिक रूप से प्रस्तुत, सत्यापित एवं होटल रिकॉर्ड से मिलान किए गए हैं। सभी मूल दस्तावेज़ डिजिटल रूप से सुरक्षित रखे गए हैं।'
                  : 'I hereby solemnly certify that in strict compliance with the Sarais Act, 1867 and local police guidelines, original government photo identity documents of all registered occupants listed above were physically presented, inspected, and cross-verified against hotel reservation records at the time of check-in.'}
              </div>

              {/* Dual Signature / Stamping Box */}
              <div className="grc-signatures">
                {/* Front Desk Executive */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>{isHindi ? 'रिसेप्शन एग्जीक्यूटिव' : 'Front Desk Executive'}</span>
                    <span style={{ fontSize: '8.5px', color: '#94a3b8', fontFamily: 'monospace' }}>({isHindi ? 'हस्ताक्षर' : 'Signature'})</span>
                  </div>
                  
                  <div style={{ height: sigHeight, borderBottom: '2px dashed #94a3b8', display: 'flex', alignItems: 'flex-end', paddingBottom: '3px' }}>
                    <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: '#cbd5e1', paddingLeft: '4px' }}>x__________________________________</span>
                  </div>

                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                        {isHindi ? 'सत्यापनकर्ता स्टाफ' : 'Front Desk Staff'}
                      </span>
                      <span style={{ display: 'block', fontSize: '8.5px', fontWeight: 700, color: '#64748b' }}>
                        {isHindi ? 'पहचान सत्यापित एवं रिकॉर्ड सुरक्षित' : 'Identity Verified & Filed'}
                      </span>
                    </div>
                    <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{isHindi ? 'दिनांक:' : 'Date:'} ____________</span>
                  </div>
                </div>

                {/* Duty Manager / Seal */}
                <div className="grc-sig-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                    <span>{isHindi ? 'ड्यूटी मैनेजर / अधिकृत सील' : 'Duty Manager / Authorized Seal'}</span>
                    <span style={{ fontSize: '8.5px', color: '#94a3b8', fontFamily: 'monospace' }}>({isHindi ? 'सील एवं मोहर' : 'Official Stamp'})</span>
                  </div>
                  
                  <div style={{ height: sigHeight, borderBottom: '2px dashed #94a3b8', display: 'flex', alignItems: 'flex-end', paddingBottom: '3px' }}>
                    <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: '#cbd5e1', paddingLeft: '4px' }}>[ {isHindi ? 'होटल आधिकारिक सील / मोहर' : 'Official Hotel Seal / Stamp'} ]</span>
                  </div>

                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                        {isHindi ? 'होटल प्रबंधन' : 'Hotel Management'}
                      </span>
                      <span style={{ display: 'block', fontSize: '8.5px', fontWeight: 800, color: '#047857' }}>
                        {isHindi ? 'सत्यापन स्वीकृत' : 'Approved & Sealed'}
                      </span>
                    </div>
                    <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{isHindi ? 'समय:' : 'Time:'} ____________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2 Footnote */}
            <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: '8.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {isHindi
                ? 'आधिकारिक पहचान पत्र सत्यापन पत्रक · बैक साइड (पृष्ठ २) · NXHotel PMS कानूनी अनुपालन प्रति'
                : 'Official Guest Identity Verification Sheet · Back Side (Page 2) · NXHotel PMS Legal Compliance Copy'}
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR (PINNED, ALWAYS VISIBLE) */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200/90 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              {isHindi ? 'बंद करें' : 'Close'}
            </button>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              {isHindi
                ? 'सुझाव: डुप्लेक्स प्रिंट हेतु दोनों पृष्ठ चुनें या अलग से बैक साइड प्रिंट करें।'
                : 'Tip: Use "Both Pages" for duplex printers, or "Back Side" to print onto reverse side.'}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            {getWhatsAppWelcomeUrl() && (
              <a
                href={getWhatsAppWelcomeUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center"
                title="Send check-in confirmation and front desk contact on guest's WhatsApp"
              >
                <MessageSquare size={14} />
                <span>{isHindi ? 'व्हाट्सएप स्वागत' : 'WhatsApp'}</span>
              </a>
            )}

            {onProceedToDashboard && (
              <button
                onClick={onProceedToDashboard}
                type="button"
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-2xs"
              >
                {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
              </button>
            )}

            {/* SEPARATE FRONT ONLY PRINT BUTTON */}
            <button
              onClick={() => handlePrint('front')}
              disabled={isPrinting}
              type="button"
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-300 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Print only Page 1 (Front GRC Form)"
            >
              <FileText size={14} />
              <span>{isHindi ? 'केवल फ्रंट' : 'Front Only'}</span>
            </button>

            {/* SEPARATE BACK ONLY PRINT BUTTON (FOR PHYSICAL BACK-OF-PAGE PRINTING) */}
            <button
              onClick={() => handlePrint('back')}
              disabled={isPrinting}
              type="button"
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-sky-300 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Print all Aadhaar / ID cards on the back side of the already-printed GRC paper"
            >
              <ShieldCheck size={14} className="text-sky-600" />
              <span>{isHindi ? '🪪 बैक साइड प्रिंट' : '🪪 Back Side (IDs)'}</span>
            </button>

            {/* MASTER BOTH PAGES (DUPLEX) PRINT BUTTON */}
            <button
              onClick={() => handlePrint('both')}
              disabled={isPrinting}
              type="button"
              className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Print Page 1 + Page 2 (Auto 2-sided duplex or 2-page print)"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{isHindi ? 'प्रिंट तैयारी...' : 'Preparing...'}</span>
                </>
              ) : (
                <>
                  <Printer size={15} className="text-emerald-400" />
                  <span>{isHindi ? '📑 दोनों पृष्ठ प्रिंट' : 'Print Both (Duplex)'}</span>
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
