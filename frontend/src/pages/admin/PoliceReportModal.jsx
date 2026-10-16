import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { 
  X, 
  ShieldCheck, 
  Download, 
  Printer, 
  Clock, 
  Building, 
  Users, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Search, 
  Calendar,
  UserCheck
} from 'lucide-react';

export default function PoliceReportModal({ isOpen, onClose, stays = [], hostels = [], defaultHostel = 'all' }) {
  if (!isOpen) return null;

  // Internal data fetch fallback if not provided via props
  const [internalStays, setInternalStays] = useState([]);
  const [internalHostels, setInternalHostels] = useState([]);
  const [loadingInternal, setLoadingInternal] = useState(false);

  useEffect(() => {
    if (isOpen && (!stays || stays.length === 0)) {
      setLoadingInternal(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      Promise.all([
        axios.get(`${API}/api/stays`),
        axios.get(`${API}/api/hostels`)
      ]).then(([sRes, hRes]) => {
        setInternalStays(sRes.data?.data || []);
        setInternalHostels(hRes.data?.data || []);
      }).catch(err => {
        console.error('Failed to load stays for police report:', err);
      }).finally(() => {
        setLoadingInternal(false);
      });
    }
  }, [isOpen, stays]);

  const effectiveStays = stays && stays.length > 0 ? stays : internalStays;
  const effectiveHostels = hostels && hostels.length > 0 ? hostels : internalHostels;

  // Filter States
  const [datePreset, setDatePreset] = useState('today'); // today, yesterday, last24h, last7days, thisMonth, custom, all
  
  // Custom Date-Time pickers default to today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [customStart, setCustomStart] = useState(`${todayStr}T00:00`);
  const [customEnd, setCustomEnd] = useState(`${todayStr}T23:59`);
  
  const [selectedHostel, setSelectedHostel] = useState(defaultHostel || 'all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, Active, Checked Out
  const [filterBasis, setFilterBasis] = useState('checkIn'); // checkIn, stayActive

  // Custom Selection State (Set of row uniqueIds)
  const [selectedRowKeys, setSelectedRowKeys] = useState(new Set());

  // Manually Added Guests from Other Dates/Stays
  const [manuallyAddedRows, setManuallyAddedRows] = useState([]);

  // Search/Add Panel toggle & search query
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addDateFilter, setAddDateFilter] = useState('yesterday'); // yesterday, past3d, past7d, all

  // Calculate Date Range
  const { start, end, rangeLabel } = useMemo(() => {
    const now = new Date();
    if (datePreset === 'today') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: s, end: e, rangeLabel: `Today (${format(s, 'dd MMM yyyy')})` };
    }
    if (datePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const e = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return { start: s, end: e, rangeLabel: `Yesterday (${format(s, 'dd MMM yyyy')})` };
    }
    if (datePreset === 'last24h') {
      const s = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { start: s, end: now, rangeLabel: `Last 24 Hours (${format(s, 'dd/MM hh:mm a')} - ${format(now, 'dd/MM hh:mm a')})` };
    }
    if (datePreset === 'last7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      return { start: s, end: now, rangeLabel: `Past 7 Days (${format(s, 'dd MMM')} - ${format(now, 'dd MMM yyyy')})` };
    }
    if (datePreset === 'thisMonth') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: s, end: now, rangeLabel: `This Month (${format(s, 'MMMM yyyy')})` };
    }
    if (datePreset === 'custom') {
      const s = customStart ? new Date(customStart) : null;
      const e = customEnd ? new Date(customEnd) : null;
      const sLabel = s && !isNaN(s) ? format(s, 'dd/MM/yyyy hh:mm a') : 'Start';
      const eLabel = e && !isNaN(e) ? format(e, 'dd/MM/yyyy hh:mm a') : 'End';
      return { start: s, end: e, rangeLabel: `${sLabel} to ${eLabel}` };
    }
    return { start: null, end: null, rangeLabel: 'All Records (All Time)' };
  }, [datePreset, customStart, customEnd]);

  // Filter Stays based on main criteria
  const matchingStays = useMemo(() => {
    return effectiveStays.filter(stay => {
      // 1. Property
      if (selectedHostel !== 'all') {
        const stayHostelId = stay.hostel?._id || stay.hostel;
        if (stayHostelId && stayHostelId.toString() !== selectedHostel.toString()) {
          return false;
        }
      }

      // 2. Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'Active' && stay.status === 'Checked Out') return false;
        if (statusFilter === 'Checked Out' && stay.status !== 'Checked Out') return false;
      }

      // 3. Date / Time Filter
      if (start && end) {
        const ciTime = stay.checkInDate ? new Date(stay.checkInDate).getTime() : 0;
        if (filterBasis === 'checkIn') {
          if (ciTime < start.getTime() || ciTime > end.getTime()) return false;
        } else {
          const coTime = stay.actualCheckOutDate
            ? new Date(stay.actualCheckOutDate).getTime()
            : (stay.expectedCheckOutDate ? new Date(stay.expectedCheckOutDate).getTime() : Infinity);
          if (ciTime > end.getTime() || coTime < start.getTime()) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
  }, [effectiveStays, selectedHostel, statusFilter, start, end, filterBasis]);

  // Build Flatted Police Report Rows (Primary + Co-Guests)
  const policeRows = useMemo(() => {
    const rows = [];

    const safeDate = (dStr) => {
      if (!dStr) return 'N/A';
      const d = new Date(dStr);
      return isNaN(d) ? 'N/A' : format(d, 'dd/MM/yyyy hh:mm a');
    };

    matchingStays.forEach(stay => {
      const roomNumber = stay.room?.roomNumber || 'N/A';
      const checkInFormatted = safeDate(stay.checkInDate);
      
      let checkOutFormatted = 'N/A';
      if (stay.status === 'Checked Out' && stay.actualCheckOutDate) {
        checkOutFormatted = safeDate(stay.actualCheckOutDate);
      } else if (stay.expectedCheckOutDate) {
        checkOutFormatted = safeDate(stay.expectedCheckOutDate) + ' (Exp)';
      }
      
      const stayStatus = stay.status === 'Checked Out' ? 'Checked Out' : 'Currently In Hotel';

      // 1. Primary Guest
      if (stay.guest) {
        rows.push({
          uniqueId: `${stay._id}_primary`,
          stayId: stay._id,
          roomNumber,
          guestName: stay.guest.fullName || 'N/A',
          guestType: 'Primary Guest',
          mobileNumber: stay.guest.mobileNumber || 'N/A',
          idProofType: stay.guest.idProofType || 'Aadhaar',
          address: stay.guest.address || 'N/A',
          checkInDate: checkInFormatted,
          checkInRaw: stay.checkInDate,
          checkOutDate: checkOutFormatted,
          stayStatus,
          isManual: false
        });
      }

      // 2. Co-Guests
      if (stay.coGuests && stay.coGuests.length > 0) {
        stay.coGuests.filter(Boolean).forEach((cg, cgIdx) => {
          rows.push({
            uniqueId: `${stay._id}_cg_${cgIdx}`,
            stayId: stay._id,
            roomNumber,
            guestName: cg.fullName || 'N/A',
            guestType: 'Co-Guest',
            mobileNumber: cg.mobileNumber || 'N/A',
            idProofType: cg.idProofType || 'Aadhaar',
            address: cg.address || (stay.guest?.address || 'N/A'),
            checkInDate: checkInFormatted,
            checkInRaw: stay.checkInDate,
            checkOutDate: checkOutFormatted,
            stayStatus,
            isManual: false
          });
        });
      }
    });

    return rows;
  }, [matchingStays]);

  // Combined Rows: Filtered Rows + Manually Added Rows (avoid duplicates)
  const allCurrentRows = useMemo(() => {
    const existingIds = new Set(policeRows.map(r => r.uniqueId));
    const manualFiltered = manuallyAddedRows.filter(r => !existingIds.has(r.uniqueId));
    return [...policeRows, ...manualFiltered];
  }, [policeRows, manuallyAddedRows]);

  // Synchronize Default Selection: when policeRows or manuallyAddedRows change
  useEffect(() => {
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      // Ensure all current policeRows are selected by default if nothing was selected yet
      if (prev.size === 0) {
        policeRows.forEach(r => next.add(r.uniqueId));
      } else {
        // Just make sure newly added manual rows are auto-selected
        manuallyAddedRows.forEach(r => next.add(r.uniqueId));
      }
      return next;
    });
  }, [policeRows, manuallyAddedRows]);

  // Final Report Rows that are SELECTED by the user for export/print
  const finalReportRows = useMemo(() => {
    const selected = allCurrentRows.filter(r => selectedRowKeys.has(r.uniqueId));
    return selected.map((r, idx) => ({
      ...r,
      srNo: idx + 1
    }));
  }, [allCurrentRows, selectedRowKeys]);

  // Selection toggle handlers
  const isAllSelected = allCurrentRows.length > 0 && allCurrentRows.every(r => selectedRowKeys.has(r.uniqueId));
  const isSomeSelected = allCurrentRows.some(r => selectedRowKeys.has(r.uniqueId)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedRowKeys(new Set());
    } else {
      setSelectedRowKeys(new Set(allCurrentRows.map(r => r.uniqueId)));
    }
  };

  const handleToggleRow = (uniqueId) => {
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(uniqueId)) {
        next.delete(uniqueId);
      } else {
        next.add(uniqueId);
      }
      return next;
    });
  };

  // Find other available guests (from yesterday or other dates) to manually add
  const otherAvailableGuests = useMemo(() => {
    const currentIds = new Set(allCurrentRows.map(r => r.uniqueId));
    const list = [];
    const safeDate = (dStr) => {
      if (!dStr) return 'N/A';
      const d = new Date(dStr);
      return isNaN(d) ? 'N/A' : format(d, 'dd/MM/yyyy hh:mm a');
    };

    const now = new Date();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    const past3DaysStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const past7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    effectiveStays.forEach(stay => {
      if (selectedHostel !== 'all') {
        const stayHostelId = stay.hostel?._id || stay.hostel;
        if (stayHostelId && stayHostelId.toString() !== selectedHostel.toString()) {
          return;
        }
      }

      const ciDate = stay.checkInDate ? new Date(stay.checkInDate) : null;
      if (!ciDate || isNaN(ciDate)) return;

      if (addDateFilter === 'yesterday') {
        if (ciDate < yesterdayStart || ciDate > yesterdayEnd) return;
      } else if (addDateFilter === 'past3d') {
        if (ciDate < past3DaysStart) return;
      } else if (addDateFilter === 'past7d') {
        if (ciDate < past7DaysStart) return;
      }

      const roomNumber = stay.room?.roomNumber || 'N/A';
      const checkInFormatted = safeDate(stay.checkInDate);
      let checkOutFormatted = 'N/A';
      if (stay.status === 'Checked Out' && stay.actualCheckOutDate) {
        checkOutFormatted = safeDate(stay.actualCheckOutDate);
      } else if (stay.expectedCheckOutDate) {
        checkOutFormatted = safeDate(stay.expectedCheckOutDate) + ' (Exp)';
      }
      const stayStatus = stay.status === 'Checked Out' ? 'Checked Out' : 'Currently In Hotel';

      // Primary Guest
      const primaryId = `${stay._id}_primary`;
      if (stay.guest && !currentIds.has(primaryId)) {
        list.push({
          uniqueId: primaryId,
          stayId: stay._id,
          roomNumber,
          guestName: stay.guest.fullName || 'N/A',
          guestType: 'Primary Guest',
          mobileNumber: stay.guest.mobileNumber || 'N/A',
          idProofType: stay.guest.idProofType || 'Aadhaar',
          address: stay.guest.address || 'N/A',
          checkInDate: checkInFormatted,
          checkInRaw: stay.checkInDate,
          checkOutDate: checkOutFormatted,
          stayStatus,
          isManual: true,
          addedFromDate: format(ciDate, 'dd MMM')
        });
      }

      // Co-Guests
      if (stay.coGuests && stay.coGuests.length > 0) {
        stay.coGuests.filter(Boolean).forEach((cg, cgIdx) => {
          const cgId = `${stay._id}_cg_${cgIdx}`;
          if (!currentIds.has(cgId)) {
            list.push({
              uniqueId: cgId,
              stayId: stay._id,
              roomNumber,
              guestName: cg.fullName || 'N/A',
              guestType: 'Co-Guest',
              mobileNumber: cg.mobileNumber || 'N/A',
              idProofType: cg.idProofType || 'Aadhaar',
              address: cg.address || (stay.guest?.address || 'N/A'),
              checkInDate: checkInFormatted,
              checkInRaw: stay.checkInDate,
              checkOutDate: checkOutFormatted,
              stayStatus,
              isManual: true,
              addedFromDate: format(ciDate, 'dd MMM')
            });
          }
        });
      }
    });

    // Apply Search Query
    if (addSearchQuery.trim()) {
      const q = addSearchQuery.toLowerCase();
      return list.filter(g => 
        g.guestName.toLowerCase().includes(q) ||
        g.mobileNumber.toLowerCase().includes(q) ||
        g.roomNumber.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 30);
  }, [effectiveStays, allCurrentRows, selectedHostel, addDateFilter, addSearchQuery]);

  const handleAddGuestToReport = (guest) => {
    setManuallyAddedRows(prev => [...prev, guest]);
    setSelectedRowKeys(prev => new Set([...prev, guest.uniqueId]));
  };

  const handleRemoveManualGuest = (uniqueId) => {
    setManuallyAddedRows(prev => prev.filter(r => r.uniqueId !== uniqueId));
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      next.delete(uniqueId);
      return next;
    });
  };

  // Download CSV of SELECTED rows
  const handleDownloadCSV = () => {
    if (finalReportRows.length === 0) {
      alert('Please select at least 1 guest record to download.');
      return;
    }

    const headers = [
      'Sr No',
      'Room No',
      'Guest Name',
      'Guest Type',
      'Mobile Number',
      'ID Proof Type',
      'Permanent Address',
      'Check-In Date & Time',
      'Check-Out Date & Time',
      'Stay Status'
    ];

    const csvData = finalReportRows.map(r => {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
        return `"${str}"`;
      };

      return [
        r.srNo,
        escape(r.roomNumber),
        escape(r.guestName),
        escape(r.guestType),
        escape(r.mobileNumber),
        escape(r.idProofType),
        escape(r.address),
        escape(r.checkInDate),
        escape(r.checkOutDate),
        escape(r.stayStatus)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = `Police_Report_${datePreset}_${finalReportRows.length}_Guests_${format(new Date(), 'dd_MMM_yyyy_HHmm')}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Official Print Format (Sarai Act Register) of SELECTED rows
  const handlePrint = () => {
    if (finalReportRows.length === 0) {
      alert('Please select at least 1 guest record to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to view and print the police report.');
      return;
    }

    const currentHotel = effectiveHostels.find(h => h._id === selectedHostel);
    const hotelHeading = currentHotel ? currentHotel.name : (effectiveHostels.length > 0 ? effectiveHostels[0].name : 'HOTEL / GUEST HOUSE');
    const hotelAddr = currentHotel?.address || '';
    const hotelPhone = currentHotel?.contactNumber || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Police Station Daily Arrival Register</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 12px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
            .header h2 { margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #333; }
            .header p { margin: 2px 0 0; font-size: 10px; color: #555; }
            .meta-bar { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; font-size: 10px; background: #f4f4f4; padding: 5px 8px; border: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #444; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #e9ecef; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
            tr:nth-child(even) { background-color: #fafafa; }
            .text-center { text-align: center; }
            .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 25px; }
            .sig-box { width: 240px; text-align: center; border-top: 1px dashed #000; padding-top: 5px; font-size: 10px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Hotel Guest Arrival Register (Police Verification)</h1>
            <h2>${hotelHeading}</h2>
            ${hotelAddr ? `<p>Address: ${hotelAddr} | Contact: ${hotelPhone}</p>` : ''}
          </div>

          <div class="meta-bar">
            <span>Report Period: ${rangeLabel}</span>
            <span>Guests in Report: <strong>${finalReportRows.length}</strong> (Selected for Police)</span>
            <span>Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;" class="text-center">Sr.</th>
                <th style="width: 45px;" class="text-center">Room</th>
                <th>Guest Full Name</th>
                <th>Type</th>
                <th>Mobile No.</th>
                <th>ID Proof Type</th>
                <th>Permanent Address</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${finalReportRows.map(r => `
                <tr>
                  <td class="text-center">${r.srNo}</td>
                  <td class="text-center"><strong>${r.roomNumber}</strong></td>
                  <td><strong>${r.guestName}</strong></td>
                  <td>${r.guestType}</td>
                  <td>${r.mobileNumber}</td>
                  <td>${r.idProofType}</td>
                  <td>${r.address}</td>
                  <td>${r.checkInDate}</td>
                  <td>${r.checkOutDate}</td>
                  <td>${r.stayStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <br/><br/>
              Hotel Manager / Receptionist Signature & Stamp
            </div>
            <div class="sig-box">
              <br/><br/>
              Local Police Station Receiving Officer Stamp & Sign
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Render via React Portal on document.body
  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gray-950 text-white flex justify-between items-center shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="text-emerald-400" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  Police Station Verification Report
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sarai Act Register
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Official guest arrival ledger for police reporting & verification
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-3.5 custom-scrollbar">
          
          {/* Preset Buttons */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Select Time Range (तारीख / समय सीमा चुनें)
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap no-scrollbar">
              {[
                { id: 'today', label: 'Today (आज)' },
                { id: 'yesterday', label: 'Yesterday (कल)' },
                { id: 'last24h', label: 'Last 24h' },
                { id: 'last7days', label: 'Past 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'custom', label: 'Custom Date & Time' },
                { id: 'all', label: 'All Records' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-black text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Time Inputs */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-150">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                  <Clock size={11} className="text-gray-900" /> Start Date & Time (कब से)
                </label>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                  <Clock size={11} className="text-gray-900" /> End Date & Time (कब तक)
                </label>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-black outline-none"
                />
              </div>
            </div>
          )}

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {hostels.length > 1 && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                  <Building size={10} /> Property
                </label>
                <select
                  value={selectedHostel}
                  onChange={e => setSelectedHostel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-black cursor-pointer"
                >
                  <option value="all">All Properties</option>
                  {effectiveHostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Stay Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-black cursor-pointer"
              >
                <option value="all">All Guests (Sabhi Stays)</option>
                <option value="Active">Currently In Hotel</option>
                <option value="Checked Out">Checked Out Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Filter Basis
              </label>
              <select
                value={filterBasis}
                onChange={e => setFilterBasis(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-black cursor-pointer"
              >
                <option value="checkIn">Check-In Arrival Time</option>
                <option value="stayActive">Any Active Stay in Range</option>
              </select>
            </div>
          </div>

          {/* Selection Toolbar & Action Strip */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-gray-900 flex items-center gap-1.5 text-xs">
                <UserCheck size={15} className="text-emerald-600" />
                Selected for Report: <strong className="text-emerald-700 text-sm">{finalReportRows.length}</strong> of {allCurrentRows.length} Guests
              </span>

              <div className="h-4 w-[1px] bg-gray-300 hidden sm:block mx-1" />

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-700 transition-colors cursor-pointer"
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Toggle Add Other Date Guests Drawer */}
            <button
              type="button"
              onClick={() => setShowAddDrawer(p => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                showAddDrawer
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Plus size={13} />
              <span>{showAddDrawer ? 'Close Guest Picker' : '+ Add Guest From Other Dates'}</span>
            </button>
          </div>

          {/* Drawer: Add Guests from Other Dates / Previous Days */}
          {showAddDrawer && (
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border-2 border-emerald-200/80 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-700" />
                    Add Guest From Yesterday or Other Dates (पिछली तारीख का गेस्ट जोड़ें)
                  </h4>
                  <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                    Search from previous stays to add them into this Police Report.
                  </p>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'yesterday', label: 'Yesterday (कल)' },
                    { id: 'past3d', label: 'Past 3 Days' },
                    { id: 'past7d', label: 'Past 7 Days' },
                    { id: 'all', label: 'All Stays' },
                  ].map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setAddDateFilter(chip.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                        addDateFilter === chip.id
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search guest name, room number, or mobile..."
                  value={addSearchQuery}
                  onChange={e => setAddSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>

              {/* Candidates List */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {otherAvailableGuests.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-500 font-medium">
                    No matching previous guests found. Try searching or change date filter above.
                  </div>
                ) : (
                  otherAvailableGuests.map(g => (
                    <div 
                      key={g.uniqueId}
                      className="p-2 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 flex items-center justify-between gap-2 transition-all shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs font-black text-gray-900 truncate">
                            {g.guestName}
                          </strong>
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[9px] font-bold rounded">
                            Rm {g.roomNumber}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {g.mobileNumber}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">
                            Check-In: {g.checkInDate}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {g.idProofType} • {g.address}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddGuestToReport(g)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <Plus size={11} />
                        <span>Add</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Table Preview Section */}
          {allCurrentRows.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500 text-xs">
              <p className="font-semibold text-gray-700">No guest records found for {rangeLabel}.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Tip: Click <strong>"+ Add Guest From Other Dates"</strong> above to add guests manually, or change the time range.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-[10px] font-bold text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span>Guest List ({allCurrentRows.length} Total)</span>
                  <span className="text-emerald-700 font-black">
                    • {finalReportRows.length} Checked for Police
                  </span>
                </span>
                <span className="text-[9px] text-gray-400">Scroll table sideways 👉</span>
              </div>
              
              <div className="overflow-x-auto max-h-56 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={el => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={handleToggleAll}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Select / Deselect All"
                        />
                      </th>
                      <th className="px-2.5 py-2 w-10 text-center">Sr.</th>
                      <th className="px-2.5 py-2">Room</th>
                      <th className="px-2.5 py-2">Guest Name</th>
                      <th className="px-2.5 py-2">Type</th>
                      <th className="px-2.5 py-2">Mobile</th>
                      <th className="px-2.5 py-2">ID Proof</th>
                      <th className="px-2.5 py-2">Check-In</th>
                      <th className="px-2.5 py-2">Address</th>
                      <th className="px-2.5 py-2">Status</th>
                      <th className="px-2 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {allCurrentRows.map((r, idx) => {
                      const isSelected = selectedRowKeys.has(r.uniqueId);
                      return (
                        <tr 
                          key={r.uniqueId} 
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'opacity-60 bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => handleToggleRow(r.uniqueId)}
                        >
                          <td className="px-3 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(r.uniqueId)}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-2.5 py-1.5 font-bold text-gray-400 text-center">{idx + 1}</td>
                          <td className="px-2.5 py-1.5 font-black text-gray-900">{r.roomNumber}</td>
                          <td className="px-2.5 py-1.5 font-bold text-gray-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{r.guestName}</span>
                              {r.isManual && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  + Added ({r.addedFromDate || 'Other Date'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              r.guestType === 'Primary Guest' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {r.guestType === 'Primary Guest' ? 'Primary' : 'Co-Guest'}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 font-mono text-[10px]">{r.mobileNumber}</td>
                          <td className="px-2.5 py-1.5 font-semibold text-gray-800 text-[11px]">
                            {r.idProofType}
                          </td>
                          <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap text-[11px]">{r.checkInDate}</td>
                          <td className="px-2.5 py-1.5 text-gray-500 max-w-[130px] truncate text-[11px]" title={r.address}>{r.address}</td>
                          <td className="px-2.5 py-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              r.stayStatus === 'Currently In Hotel' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {r.stayStatus === 'Currently In Hotel' ? 'In Hotel' : 'Out'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            {r.isManual ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualGuest(r.uniqueId)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Remove added guest"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-mono">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions - ALWAYS visible at bottom */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-bold">
              Report will include: <strong className="text-emerald-700 font-black">{finalReportRows.length}</strong> selected guest(s)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={finalReportRows.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 disabled:opacity-40 text-gray-900 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>Print / PDF ({finalReportRows.length})</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={finalReportRows.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-black hover:bg-gray-800 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>Download CSV ({finalReportRows.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
