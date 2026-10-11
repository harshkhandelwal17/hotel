import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { X, ShieldCheck, Download, Printer, Calendar, Clock, Building, Users, CheckCircle2 } from 'lucide-react';

export default function PoliceReportModal({ isOpen, onClose, stays = [], hostels = [], defaultHostel = 'all' }) {
  if (!isOpen) return null;

  // Filter States
  const [datePreset, setDatePreset] = useState('today'); // today, yesterday, last24h, last7days, thisMonth, custom, all
  
  // Custom Date-Time pickers default to today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [customStart, setCustomStart] = useState(`${todayStr}T00:00`);
  const [customEnd, setCustomEnd] = useState(`${todayStr}T23:59`);
  
  const [selectedHostel, setSelectedHostel] = useState(defaultHostel || 'all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, Active, Checked Out
  const [filterBasis, setFilterBasis] = useState('checkIn'); // checkIn, stayActive

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

  // Filter Stays
  const matchingStays = useMemo(() => {
    return stays.filter(stay => {
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
  }, [stays, selectedHostel, statusFilter, start, end, filterBasis]);

  // Build Flatted Police Report Rows (Primary + Co-Guests)
  const policeRows = useMemo(() => {
    const rows = [];
    let serial = 1;

    const safeDate = (dStr) => {
      if (!dStr) return 'N/A';
      const d = new Date(dStr);
      return isNaN(d) ? 'N/A' : format(d, 'dd/MM/yyyy hh:mm a');
    };

    matchingStays.forEach(stay => {
      const hotelName = stay.hostel?.name || 'Hotel';
      const hotelPhone = stay.hostel?.contactNumber || 'N/A';
      const roomNumber = stay.room?.roomNumber || 'N/A';
      const checkInFormatted = safeDate(stay.checkInDate);
      
      let checkOutFormatted = 'N/A';
      if (stay.status === 'Checked Out' && stay.actualCheckOutDate) {
        checkOutFormatted = safeDate(stay.actualCheckOutDate);
      } else if (stay.expectedCheckOutDate) {
        checkOutFormatted = safeDate(stay.expectedCheckOutDate) + ' (Exp)';
      }
      
      const stayStatus = stay.status === 'Checked Out' ? 'Checked Out' : 'Currently In Hotel';
      const occupantsCount = stay.occupants || (1 + (stay.coGuests?.length || 0));

      // 1. Primary Guest
      if (stay.guest) {
        rows.push({
          srNo: serial++,
          stayId: stay._id,
          hotelName,
          hotelPhone,
          roomNumber,
          guestName: stay.guest.fullName || 'N/A',
          guestType: 'Primary Guest',
          mobileNumber: stay.guest.mobileNumber || 'N/A',
          gender: stay.guest.gender || 'N/A',
          idProofType: stay.guest.idProofType || 'Aadhaar',
          idProofNumber: stay.guest.idProofNumber || 'N/A',
          address: stay.guest.address || 'N/A',
          checkInDate: checkInFormatted,
          checkOutDate: checkOutFormatted,
          stayStatus,
          occupants: occupantsCount,
          remarks: stay.notes || ''
        });
      }

      // 2. Co-Guests
      if (stay.coGuests && stay.coGuests.length > 0) {
        stay.coGuests.filter(Boolean).forEach(cg => {
          rows.push({
            srNo: serial++,
            stayId: stay._id,
            hotelName,
            hotelPhone,
            roomNumber,
            guestName: cg.fullName || 'N/A',
            guestType: 'Co-Guest',
            mobileNumber: cg.mobileNumber || 'N/A',
            gender: cg.gender || 'N/A',
            idProofType: cg.idProofType || 'Aadhaar',
            idProofNumber: cg.idProofNumber || 'N/A',
            address: cg.address || (stay.guest?.address || 'N/A'),
            checkInDate: checkInFormatted,
            checkOutDate: checkOutFormatted,
            stayStatus,
            occupants: occupantsCount,
            remarks: `Co-Guest with ${stay.guest?.fullName || 'Primary'}`
          });
        });
      }
    });

    return rows;
  }, [matchingStays]);

  // Download CSV
  const handleDownloadCSV = () => {
    if (policeRows.length === 0) {
      alert('No guest records found for the selected date range.');
      return;
    }

    const headers = [
      'Sr No',
      'Hotel Name',
      'Hotel Contact',
      'Room No',
      'Guest Name',
      'Guest Type',
      'Mobile Number',
      'Gender',
      'ID Proof Type',
      'ID Proof Number',
      'Permanent Address',
      'Check-In Date & Time',
      'Check-Out Date & Time',
      'Stay Status',
      'Total Occupants',
      'Remarks'
    ];

    const csvData = policeRows.map(r => {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
        return `"${str}"`;
      };

      return [
        r.srNo,
        escape(r.hotelName),
        escape(r.hotelPhone),
        escape(r.roomNumber),
        escape(r.guestName),
        escape(r.guestType),
        escape(r.mobileNumber),
        escape(r.gender),
        escape(r.idProofType),
        escape(r.idProofNumber),
        escape(r.address),
        escape(r.checkInDate),
        escape(r.checkOutDate),
        escape(r.stayStatus),
        r.occupants,
        escape(r.remarks)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = `Police_Report_${datePreset}_${format(new Date(), 'dd_MMM_yyyy_HHmm')}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Official Print Format (Sarai Act Register)
  const handlePrint = () => {
    if (policeRows.length === 0) {
      alert('No guest records found to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to view and print the police report.');
      return;
    }

    const currentHotel = hostels.find(h => h._id === selectedHostel);
    const hotelHeading = currentHotel ? currentHotel.name : (hostels.length > 0 ? hostels[0].name : 'HOTEL / GUEST HOUSE');
    const hotelAddr = currentHotel?.address || '';
    const hotelPhone = currentHotel?.contactNumber || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Police Station Daily Arrival Register</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
            .header h2 { margin: 4px 0 0; font-size: 13px; font-weight: 700; color: #333; }
            .header p { margin: 3px 0 0; font-size: 11px; color: #555; }
            .meta-bar { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600; font-size: 11px; background: #f4f4f4; padding: 6px 10px; border: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #444; padding: 5px 6px; text-align: left; vertical-align: top; }
            th { background-color: #e9ecef; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
            tr:nth-child(even) { background-color: #fafafa; }
            .text-center { text-align: center; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 30px; }
            .sig-box { width: 260px; text-align: center; border-top: 1px dashed #000; padding-top: 6px; font-size: 11px; font-weight: 700; }
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
            <span>Total Guests: ${policeRows.length} | Total Stays: ${matchingStays.length}</span>
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
                <th>ID Type</th>
                <th>ID Proof No.</th>
                <th>Permanent Address</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${policeRows.map(r => `
                <tr>
                  <td class="text-center">${r.srNo}</td>
                  <td class="text-center"><strong>${r.roomNumber}</strong></td>
                  <td><strong>${r.guestName}</strong></td>
                  <td>${r.guestType}</td>
                  <td>${r.mobileNumber}</td>
                  <td>${r.idProofType}</td>
                  <td>${r.idProofNumber}</td>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Official Government Format
              </span>
              <span className="text-xs text-indigo-200 font-semibold">• Police Station Record</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="text-emerald-400" size={26} />
              Police Station Guest Report
            </h2>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Filter and download guest check-in arrival register for police station submission.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-6 bg-gray-50/70 border-b border-gray-200 space-y-4 shrink-0 overflow-y-auto max-h-[36vh]">
          
          {/* Quick Date Presets */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2">
              Select Time Range (तारीख / समय चुनें)
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'today', label: 'Today (आज)' },
                { id: 'yesterday', label: 'Yesterday (कल)' },
                { id: 'last24h', label: 'Last 24 Hours' },
                { id: 'last7days', label: 'Past 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'custom', label: 'Custom Date & Time' },
                { id: 'all', label: 'All Records' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    datePreset === preset.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-[1.02]'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Time Inputs */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-1">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-600" /> Start Date & Time (कब से)
                </label>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-600" /> End Date & Time (कब तक)
                </label>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* Secondary Filters (Property, Status, Basis) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Property Selector */}
            {hostels.length > 1 && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                  <Building size={12} /> Hotel Property
                </label>
                <select
                  value={selectedHostel}
                  onChange={e => setSelectedHostel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="all">All Properties</option>
                  {hostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Guest Status */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                Stay Status (अवस्था)
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="all">All Guests (Sabhi Stays)</option>
                <option value="Active">Currently In Hotel (Checked-In)</option>
                <option value="Checked Out">Checked Out Only</option>
              </select>
            </div>

            {/* Filter Basis */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                Filter Basis
              </label>
              <select
                value={filterBasis}
                onChange={e => setFilterBasis(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="checkIn">Check-In Arrival Time (Standard)</option>
                <option value="stayActive">Any Active Stay in Range</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview Summary Bar */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              Found: <strong className="font-black text-indigo-700 text-sm">{policeRows.length}</strong> Guests
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 font-semibold">
              Across <strong className="text-gray-900">{matchingStays.length}</strong> Room Bookings
            </span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
            Period: {rangeLabel}
          </span>
        </div>

        {/* Data Table Preview */}
        <div className="flex-1 overflow-auto p-4 min-h-[160px]">
          {policeRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <ShieldCheck size={40} className="stroke-[1.5] text-gray-300 mb-2" />
              <p className="font-bold text-gray-600 text-sm">No guest arrivals found for this time range.</p>
              <p className="text-xs text-gray-400 mt-1">Try selecting a different date range or preset above.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5">Sr.</th>
                    <th className="px-3 py-2.5">Room</th>
                    <th className="px-3 py-2.5">Guest Name</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Mobile</th>
                    <th className="px-3 py-2.5">ID Proof</th>
                    <th className="px-3 py-2.5">Check-In</th>
                    <th className="px-3 py-2.5">Address</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {policeRows.slice(0, 15).map(r => (
                    <tr key={`${r.stayId}-${r.srNo}`} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 py-2 font-bold text-gray-400">{r.srNo}</td>
                      <td className="px-3 py-2 font-black text-gray-900">{r.roomNumber}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{r.guestName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          r.guestType === 'Primary Guest' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.guestType === 'Primary Guest' ? 'Primary' : 'Co-Guest'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">{r.mobileNumber}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-gray-900">{r.idProofType}:</span>{' '}
                        <span className="font-mono text-[11px] text-gray-600">{r.idProofNumber}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.checkInDate}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate" title={r.address}>{r.address}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.stayStatus === 'Currently In Hotel' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.stayStatus === 'Currently In Hotel' ? 'In Hotel' : 'Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {policeRows.length > 15 && (
                <div className="p-2 bg-gray-50 text-center text-[11px] font-bold text-gray-500 border-t border-gray-200">
                  + {policeRows.length - 15} more guest rows will be included in the downloaded report
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-500 font-medium">
            Standard Form B / Sarai Act format accepted by local police stations.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={policeRows.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={policeRows.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Download size={16} />
              Download CSV (Excel)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
