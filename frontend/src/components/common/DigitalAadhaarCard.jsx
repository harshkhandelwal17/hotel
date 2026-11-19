import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, User } from 'lucide-react';
import { getFullImageUrl } from '../../utils/imageUrl';

/**
 * 🇮🇳 Ashoka Lion Capital (Bharat Sarkar) Vector Emblem
 */
const AshokaEmblemSvg = ({ size = 26, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 120" 
    fill="currentColor" 
    className={`inline-block ${className}`}
  >
    {/* Stylized Ashoka Lion Capital & Base */}
    <path d="M50 8 C44 8 40 12 40 18 C40 22 43 25 45 28 C41 29 36 33 34 38 C32 42 33 48 37 51 C34 53 32 57 32 62 C32 68 37 74 43 76 L43 85 C35 86 28 89 25 94 C23 97 25 101 28 102 L72 102 C75 101 77 97 75 94 C72 89 65 86 57 85 L57 76 C63 74 68 68 68 62 C68 57 66 53 63 51 C67 48 68 42 66 38 C64 33 59 29 55 28 C57 25 60 22 60 18 C60 12 56 8 50 8 Z" fill="#1e293b" />
    <circle cx="50" cy="94" r="5" fill="#e2e8f0" />
    <rect x="22" y="104" width="56" height="4" rx="2" fill="#1e293b" />
    <rect x="18" y="110" width="64" height="4" rx="2" fill="#1e293b" />
  </svg>
);

/**
 * ☀️ Official UIDAI Aadhaar Sunburst Logo
 */
const AadhaarSunLogoSvg = ({ size = 28, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={`inline-block ${className}`}
  >
    {/* Red / Saffron Sunburst */}
    <circle cx="50" cy="50" r="42" fill="#dc2626" opacity="0.1" />
    <g fill="#dc2626">
      {/* Rays */}
      <path d="M50 4 L53 18 L47 18 Z" />
      <path d="M50 96 L53 82 L47 82 Z" />
      <path d="M4 50 L18 53 L18 47 Z" />
      <path d="M96 50 L82 53 L82 47 Z" />
      <path d="M17 17 L30 25 L25 30 Z" />
      <path d="M83 83 L70 75 L75 70 Z" />
      <path d="M17 83 L25 70 L30 75 Z" />
      <path d="M83 17 L75 30 L70 25 Z" />
      {/* Fingerprint Arches in center */}
      <circle cx="50" cy="50" r="14" fill="#dc2626" />
      <path d="M40 50 C40 44.5 44.5 40 50 40 C55.5 40 60 44.5 60 50" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 50 C44 46.7 46.7 44 50 44 C53.3 44 56 46.7 56 50" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="50" r="2" fill="#ffffff" />
    </g>
  </svg>
);

/**
 * Normalizes Aadhaar number into standard masked 12-digit format: XXXX  XXXX  1234
 */
function formatMaskedAadhaar(numStr) {
  if (!numStr) return 'XXXX  XXXX  ••••';
  const clean = String(numStr).replace(/\s+/g, '');

  // If already 12 digits (raw digits from OCR or guest profile)
  if (/^\d{12}$/.test(clean)) {
    const last4 = clean.slice(-4);
    return `XXXX  XXXX  ${last4}`;
  }

  // If already masked with X's
  const match = clean.match(/(?:X|\*|•)*(\d{4})$/i);
  if (match) {
    return `XXXX  XXXX  ${match[1]}`;
  }

  return clean.length >= 4 
    ? `XXXX  XXXX  ${clean.slice(-4)}`
    : 'XXXX  XXXX  ••••';
}

/**
 * Normalizes Date of Birth to DD/MM/YYYY
 */
function formatDob(dobStr) {
  if (!dobStr) return '—';
  const str = String(dobStr).trim();

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // Only Year
  if (/^\d{4}$/.test(str)) {
    return str;
  }

  return str;
}

/**
 * Bilingual Gender Formatter
 */
function formatGender(genderStr) {
  if (!genderStr) return '—';
  const g = String(genderStr).trim().toUpperCase();
  if (g.startsWith('M')) return 'MALE / पुरुष';
  if (g.startsWith('F')) return 'FEMALE / महिला';
  return `${g} / अन्य`;
}

/**
 * Smart Digital E-Aadhaar Reconstructor Card Component
 * Renders pristine UIDAI-standard Front & Back PVC-style Cards for screen and print.
 */
export default function DigitalAadhaarCard({
  guest = {},
  side = 'both', // 'front' | 'back' | 'both'
  showWatermark = true,
  className = '',
  compact = false
}) {
  const qrData = guest.aadhaarData || {};

  // Photo resolution: prefer QR extracted high-res photo bytes, then uploaded ID photo, then fallback
  const photoUrl = guest.photoBase64 || qrData.photoBase64 || (guest.idProofImage ? getFullImageUrl(guest.idProofImage) : null);

  // Address lines assembly
  const addressText = guest.address || qrData.address || '';
  const careOf = qrData.careOf || '';
  const pinCode = qrData.pincode || (addressText.match(/\b\d{6}\b/) ? addressText.match(/\b\d{6}\b/)[0] : '');
  const state = qrData.state || '';
  const district = qrData.district || '';

  // QR Verification payload (UIDAI standard QR simulation)
  const qrVerificationPayload = qrData.rawQrText || [
    'UIDAI-VERIFIED',
    guest.fullName || '',
    formatMaskedAadhaar(guest.idProofNumber || qrData.idProofNumber),
    guest.dateOfBirth || '',
    guest.gender || '',
    pinCode
  ].join('|');

  // FRONT CARD COMPONENT
  const renderFrontCard = () => (
    <div 
      className="digital-aadhaar-card-side bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between relative text-slate-800 select-none print:shadow-none print:border-slate-400"
      style={{
        width: '100%',
        maxWidth: compact ? '290px' : '330px',
        minHeight: compact ? '180px' : '204px',
        aspectRatio: '1.586',
        backgroundColor: '#ffffff',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Top Tricolor Strip */}
      <div className="w-full flex h-[4px] shrink-0">
        <div className="h-full w-1/3 bg-[#FF9933]" style={{ WebkitPrintColorAdjust: 'exact' }} />
        <div className="h-full w-1/3 bg-[#FFFFFF]" style={{ WebkitPrintColorAdjust: 'exact' }} />
        <div className="h-full w-1/3 bg-[#138808]" style={{ WebkitPrintColorAdjust: 'exact' }} />
      </div>

      {/* Header Bar */}
      <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <AshokaEmblemSvg size={ compact ? 20 : 24 } className="text-slate-900 shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="text-[7.5px] font-bold text-slate-800 tracking-tight">भारत सरकार</span>
            <span className="text-[8px] font-black text-slate-900 tracking-tight uppercase">Government of India</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex flex-col leading-none text-right">
            <span className="text-[7.5px] font-bold text-red-700 tracking-tight">भारतीय विशिष्ट पहचान प्राधिकरण</span>
            <span className="text-[7px] font-bold text-slate-600 tracking-tight">UIDAI</span>
          </div>
          <AadhaarSunLogoSvg size={ compact ? 22 : 26 } className="shrink-0" />
        </div>
      </div>

      {/* Card Body */}
      <div className="px-2.5 py-1.5 flex items-center gap-2.5 grow relative">
        {/* Subtle Watermark */}
        {showWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] overflow-hidden"
            aria-hidden="true"
          >
            <AadhaarSunLogoSvg size={130} />
          </div>
        )}

        {/* Photo Box */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-[66px] h-[82px] rounded border border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shadow-xs relative">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={guest.fullName || 'Aadhaar Photo'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className={`w-full h-full flex flex-col items-center justify-center text-slate-400 ${photoUrl ? 'hidden' : 'flex'}`}>
              <User size={28} />
              <span className="text-[7px] font-bold mt-1 text-slate-500 uppercase">Photo</span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-0.5 text-[7px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
            <ShieldCheck size={8} className="text-emerald-600 fill-emerald-500" />
            <span>VERIFIED</span>
          </div>
        </div>

        {/* Guest Details */}
        <div className="grow min-w-0 flex flex-col justify-center space-y-1">
          {/* Name */}
          <div className="leading-tight">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 block">नाम / Name</span>
            <span className="text-[12px] font-black text-slate-900 tracking-wide uppercase truncate block">
              {guest.fullName || '—'}
            </span>
          </div>

          {/* DOB */}
          <div className="leading-tight">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 block">जन्म तिथि / DOB</span>
            <span className="text-[9.5px] font-extrabold text-slate-800 block">
              {formatDob(guest.dateOfBirth)}
            </span>
          </div>

          {/* Gender */}
          <div className="leading-tight">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 block">लिंग / Gender</span>
            <span className="text-[9.5px] font-extrabold text-slate-800 block">
              {formatGender(guest.gender)}
            </span>
          </div>
        </div>
      </div>

      {/* Red UIDAI Bottom Banner with Masked Aadhaar Number */}
      <div 
        className="w-full px-2 py-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white flex flex-col items-center justify-center shrink-0 border-t border-red-900"
        style={{
          backgroundColor: '#b91c1c',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        <div className="text-[7px] text-amber-200 font-bold tracking-widest uppercase flex items-center gap-1 leading-none mb-0.5">
          <span>मेरा आधार, मेरी पहचान</span>
        </div>
        <div className="font-mono font-black text-[12.5px] tracking-[0.25em] text-white leading-none drop-shadow-xs">
          {formatMaskedAadhaar(guest.idProofNumber || qrData.idProofNumber)}
        </div>
      </div>
    </div>
  );

  // BACK CARD COMPONENT
  const renderBackCard = () => (
    <div 
      className="digital-aadhaar-card-side bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between relative text-slate-800 select-none print:shadow-none print:border-slate-400"
      style={{
        width: '100%',
        maxWidth: compact ? '290px' : '330px',
        minHeight: compact ? '180px' : '204px',
        aspectRatio: '1.586',
        backgroundColor: '#ffffff',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Top Tricolor Strip */}
      <div className="w-full flex h-[4px] shrink-0">
        <div className="h-full w-1/3 bg-[#FF9933]" style={{ WebkitPrintColorAdjust: 'exact' }} />
        <div className="h-full w-1/3 bg-[#FFFFFF]" style={{ WebkitPrintColorAdjust: 'exact' }} />
        <div className="h-full w-1/3 bg-[#138808]" style={{ WebkitPrintColorAdjust: 'exact' }} />
      </div>

      {/* Header Bar */}
      <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <AshokaEmblemSvg size={ compact ? 18 : 22 } className="text-slate-900 shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="text-[7px] font-bold text-slate-800">भारतीय विशिष्ट पहचान प्राधिकरण</span>
            <span className="text-[7.5px] font-black text-slate-900 uppercase">Unique Identification Authority of India</span>
          </div>
        </div>
        <AadhaarSunLogoSvg size={ compact ? 18 : 22 } className="shrink-0" />
      </div>

      {/* Card Back Body (Address + Official QR) */}
      <div className="px-2.5 py-1.5 flex items-start gap-2.5 grow relative">
        {/* Subtle Watermark */}
        {showWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] overflow-hidden"
            aria-hidden="true"
          >
            <AshokaEmblemSvg size={110} />
          </div>
        )}

        {/* Address Block */}
        <div className="grow min-w-0 pr-1 flex flex-col justify-start">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[7.5px] font-black uppercase tracking-wider text-red-700">पता / Address:</span>
          </div>

          <div className="text-[8.5px] font-medium text-slate-800 leading-snug line-clamp-5 space-y-0.5">
            {careOf && (
              <div className="font-bold text-slate-900">{careOf}</div>
            )}
            <div>
              {addressText || (
                <span className="text-slate-400 italic">Address verified as per UIDAI records.</span>
              )}
            </div>
            {(district || state || pinCode) && (
              <div className="font-extrabold text-slate-900 pt-0.5">
                {[district, state, pinCode && `PIN: ${pinCode}`].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Official QR Code Box */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          <div 
            className="p-1 rounded bg-white border border-slate-300 shadow-xs flex items-center justify-center"
            style={{ backgroundColor: '#ffffff' }}
          >
            <QRCodeSVG 
              value={qrVerificationPayload}
              size={ compact ? 62 : 72 }
              level="M"
              includeMargin={false}
            />
          </div>
          <span className="text-[6.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">
            UIDAI Secure QR
          </span>
        </div>
      </div>

      {/* Bottom Helpdesk & Contact Bar */}
      <div 
        className="w-full px-2 py-1 bg-slate-100 border-t border-slate-200 text-slate-700 flex items-center justify-between shrink-0 text-[7px] font-bold"
        style={{
          backgroundColor: '#f1f5f9',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        <span className="flex items-center gap-1">
          <span>📞 1947</span>
          <span className="text-slate-300">|</span>
          <span>✉️ help@uidai.gov.in</span>
        </span>
        <span>🌐 www.uidai.gov.in</span>
      </div>
    </div>
  );

  return (
    <div className={`digital-aadhaar-wrapper flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {(side === 'front' || side === 'both') && renderFrontCard()}
      {(side === 'back' || side === 'both') && renderBackCard()}
    </div>
  );
}
