import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { User, Phone, CheckCircle, Clock, Printer } from 'lucide-react';
import ExtendStayModal from './ExtendStayModal';
import ShiftRoomModal from './ShiftRoomModal';

const GuestProfile = () => {
  const { id } = useParams();
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedStay, setSelectedStay] = useState(null);

  useEffect(() => {
    fetchGuest();
  }, [id]);

  async function fetchGuest() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${id}`);
      setGuest(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!guest) return <div>Guest not found</div>;

  const printInvoice = (stay) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Invoice - ${guest.fullName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; margin: 0; letter-spacing: -0.5px; }
            .subtitle { color: #666; margin-top: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .col { flex: 1; }
            .col-right { text-align: right; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
            .val { font-size: 16px; font-weight: 500; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; color: #888; text-transform: uppercase; }
            td { padding: 15px 12px; border-bottom: 1px solid #eee; }
            .total-row td { font-weight: bold; font-size: 18px; border-bottom: none; }
            .paid-row td { color: #059669; }
            .due-row td { color: #DC2626; font-weight: bold; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${stay.hostel?.name || 'NXHotel'}</h1>
            <div class="subtitle">Tax Invoice / Receipt</div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">${stay.hostel?.address || ''}</div>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="label">Billed To</div>
              <div class="val">${guest.fullName}</div>
              <div class="val" style="font-size:14px; color:#666;">+91 ${guest.mobileNumber}</div>
            </div>
            <div class="col col-right">
              <div class="label">Invoice Date</div>
              <div class="val">${format(new Date(), 'dd MMM yyyy')}</div>
              <div class="label" style="margin-top: 15px;">Room No</div>
              <div class="val">${stay.room?.roomNumber || 'N/A'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Room Accommodation<br><span style="font-size:12px;color:#666;">Total Occupants: ${stay.occupants}</span></td>
                <td>${format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a')}</td>
                <td>${format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}</td>
                <td style="text-align:right">Rs ${stay.totalAmount}</td>
              </tr>
              <tr class="paid-row">
                <td colspan="3" style="text-align:right">Amount Paid</td>
                <td style="text-align:right">- Rs ${stay.paidAmount}</td>
              </tr>
              <tr class="due-row">
                <td colspan="3" style="text-align:right">Balance Due</td>
                <td style="text-align:right">Rs ${stay.totalAmount - stay.paidAmount}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 60px; font-size: 12px; color: #888; text-align: center;">
            <p>Thank you for your stay with NXHotel.</p>
            <p>This is a computer generated invoice and does not require a signature.</p>
          </div>
          
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };


  const activeStay = guest.stays?.find(s => ['Active', 'Upcoming', 'Checkout Due', 'Overdue'].includes(s.status));
  const historyStays = guest.stays?.filter(s => s._id !== activeStay?._id);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      
      {/* ─── Profile Header ─── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-gray-900 to-black rounded-2xl flex items-center justify-center text-white shadow-lg">
            <User size={36} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{guest.fullName}</h1>
            <div className="flex flex-wrap items-center text-gray-500 mt-2 gap-3">
              <span className="flex items-center text-sm font-bold bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                <Phone size={16} className="mr-2 text-gray-400" />
                {guest.mobileNumber}
              </span>
              {guest.idProofNumber && (
                <span className="flex items-center text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
                  {guest.idProofType}: {guest.idProofNumber}
                </span>
              )}
            </div>
            
            {guest.idProofImage && (
              <div className="mt-4 inline-block">
                <a href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} target="_blank" rel="noreferrer" 
                   className="text-xs text-indigo-700 font-black uppercase tracking-widest hover:text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 transition-colors flex items-center gap-2">
                  <span className="text-lg">🔍</span> View ID Document
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0">
          {activeStay ? (
            <span className="px-4 py-2 inline-flex text-xs uppercase tracking-widest font-black rounded-xl bg-green-500 text-white shadow-md items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> Active Guest
            </span>
          ) : (
            <span className="px-4 py-2 inline-flex text-xs uppercase tracking-widest font-black rounded-xl bg-gray-100 text-gray-500 border border-gray-200">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* ─── Active Stay ─── */}
      {activeStay && (
        <div className="bg-white rounded-3xl shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 sm:px-8 py-5 border-b border-blue-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-black text-blue-900 flex items-center uppercase tracking-tight">
              <CheckCircle size={24} className="mr-3 text-blue-600" /> Current Stay
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }}
                className="w-full sm:w-auto bg-white text-blue-700 font-black uppercase tracking-widest text-xs border-2 border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
              >
                Extend Stay
              </button>
              <button 
                onClick={() => printInvoice(activeStay)}
                className="w-full sm:w-auto bg-blue-600 text-white font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Bill
              </button>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room</p>
              <div className="flex items-center gap-2">
                <p className="font-black text-gray-900 text-xl">{activeStay.room?.roomNumber}</p>
                {activeStay.guest?._id !== guest._id && (
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-purple-200">Co-Guest</span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests` : `1 Guest`}</p>
              {activeStay.guest?._id !== guest._id && (
                 <p className="text-[10px] font-bold text-purple-600 mt-1 bg-purple-50 px-2 py-1 rounded-md">Primary: {activeStay.guest?.fullName}</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.checkInDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.checkInDate), 'hh:mm a')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expected Checkout</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.expectedCheckOutDate), 'hh:mm a')}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>Balance Due</p>
              <p className={`font-black text-2xl ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-red-600' : 'text-green-700'}`}>
                ₹{activeStay.totalAmount - activeStay.paidAmount}
              </p>
              <p className="text-xs font-bold text-gray-500 mt-1">Total: ₹{activeStay.totalAmount}</p>
            </div>
            
            {activeStay.coGuests && activeStay.coGuests.length > 0 && (
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Co-Guests</p>
                <div className="flex flex-wrap gap-3">
                  {activeStay.coGuests.map(cg => (
                    <span key={cg._id} className="bg-white border-2 border-gray-100 px-4 py-2 rounded-xl text-sm text-gray-800 font-bold flex items-center gap-2 shadow-sm">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"><User size={12} className="text-gray-500"/></div>
                      {cg.fullName} <span className="text-gray-400 font-medium">({cg.mobileNumber})</span>
                      {cg.idProofImage && (
                        <a href={(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImage}`)} target="_blank" rel="noreferrer" 
                           className="text-[10px] uppercase tracking-wider font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 ml-2 border border-blue-100 transition-colors">
                          View ID
                        </a>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Stay History ─── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 flex items-center uppercase tracking-tight">
            <Clock size={24} className="mr-3 text-gray-400" /> Stay History
          </h2>
        </div>
        
        {(!historyStays || historyStays.length === 0) ? (
          <div className="p-12 text-center text-gray-500 font-medium">No past stays found for this guest.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left whitespace-nowrap">
              <thead className="bg-white border-b-2 border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Checkout</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {historyStays.map((stay) => (
                  <tr key={stay._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 text-base">{stay.room?.roomNumber || 'N/A'}</p>
                        {stay.guest?._id !== guest._id && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded border border-purple-200 font-black uppercase tracking-widest">Co-Guest</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.occupants} Guests</p>
                      {stay.guest?._id !== guest._id && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: {stay.guest?.fullName}</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 text-sm">{format(new Date(stay.checkInDate), 'dd MMM yyyy')}</p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5">{format(new Date(stay.checkInDate), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 text-sm">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'dd MMM yyyy') : format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'hh:mm a') : format(new Date(stay.expectedCheckOutDate), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-gray-900 text-base">₹{stay.totalAmount}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-black uppercase tracking-widest rounded-lg border ${
                        stay.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                        stay.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {stay.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => printInvoice(stay)}
                        className="text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl transition-colors border border-gray-200"
                        title="Print Invoice"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Extend Stay Modal */}
      {extendModalOpen && selectedStay && (
        <ExtendStayModal 
          stay={selectedStay} 
          onClose={() => { setExtendModalOpen(false); setSelectedStay(null); }}
          onSuccess={() => { setExtendModalOpen(false); setSelectedStay(null); fetchGuestData(); }}
        />
      )}
    </div>
  );
};

export default GuestProfile;
