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
            <h1 class="title">${stay.hostel?.name || 'HotelPro'}</h1>
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
                <td>${format(new Date(stay.checkInDate), 'dd MMM yyyy')}</td>
                <td>${format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</td>
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
            <p>Thank you for your stay with HotelPro.</p>
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
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{guest.fullName}</h1>
            <div className="flex items-center text-gray-500 mt-1">
              <Phone size={16} className="mr-1" />
              {guest.mobileNumber}
            </div>
            {guest.idProofNumber && (
              <div className="mt-3 flex items-center gap-3">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md border border-gray-200">
                  {guest.idProofType}: {guest.idProofNumber}
                </span>
                {guest.idProofImage && (
                  <a href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                    🔍 View ID Image
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          {activeStay ? (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              ● Active Guest
            </span>
          ) : (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Active Stay */}
      {activeStay && (
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
            <h2 className="text-lg font-medium text-blue-900 flex items-center">
              <CheckCircle size={20} className="mr-2" /> Current Stay
            </h2>
            <div className="space-x-3">
              <button 
                onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }}
                className="bg-white text-blue-600 border border-blue-300 px-4 py-1.5 rounded text-sm hover:bg-blue-50 transition-colors"
              >
                Extend Stay
              </button>
              <button 
                onClick={() => printInvoice(activeStay)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors flex items-center inline-flex"
              >
                <Printer size={16} className="mr-1" /> Print Bill
              </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Room</p>
              <p className="font-medium text-gray-900">{activeStay.room?.roomNumber} / {activeStay.occupants > 1 ? `${activeStay.occupants} guests` : `1 guest`}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-in</p>
              <p className="font-medium text-gray-900">{format(new Date(activeStay.checkInDate), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Checkout</p>
              <p className="font-medium text-gray-900">{format(new Date(activeStay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className={`font-medium ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{activeStay.totalAmount - activeStay.paidAmount}
              </p>
            </div>
            {activeStay.coGuests && activeStay.coGuests.length > 0 && (
              <div className="col-span-2 md:col-span-4 mt-2">
                <p className="text-sm text-gray-500 mb-1">Co-Guests:</p>
                <div className="flex flex-wrap gap-2">
                  {activeStay.coGuests.map(cg => (
                    <span key={cg._id} className="bg-white border border-blue-200 px-3 py-1 rounded-full text-xs text-blue-700 font-medium flex items-center gap-1">
                      {cg.fullName} ({cg.mobileNumber})
                      {cg.idProofImage && (
                        <a href={(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImage}`)} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-800 hover:bg-blue-200 ml-1">
                          ID
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

      {/* Stay History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock size={20} className="mr-2" /> Stay History
          </h2>
        </div>
        <div className="overflow-x-auto">
          {historyStays && historyStays.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accompanied By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyStays.map(stay => (
                  <tr key={stay._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(stay.checkInDate), 'dd MMM yyyy')} - {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{stay.hostel?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stay.room?.roomNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {stay.coGuests && stay.coGuests.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {stay.coGuests.map((g, i) => (
                            <span key={g._id || i} className="inline-flex items-center">
                              {g.fullName}
                              {g.idProofImage && (
                                <a href={(g.idProofImage?.startsWith('http') ? g.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${g.idProofImage}`)} target="_blank" rel="noreferrer" className="ml-1 text-[10px] font-bold text-blue-600 hover:underline">
                                  [ID]
                                </a>
                              )}
                              {i < stay.coGuests.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{stay.totalAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {stay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No historical stays found.</div>
          )}
        </div>
      </div>
      
      {extendModalOpen && selectedStay && (
        <ExtendStayModal 
          stay={selectedStay} 
          onClose={() => setExtendModalOpen(false)}
          onSuccess={() => {
            setExtendModalOpen(false);
            fetchGuest();
          }}
        />
      )}
      {shiftModalOpen && selectedStay && (
        <ShiftRoomModal 
          stay={selectedStay} 
          onClose={() => setShiftModalOpen(false)}
          onSuccess={() => {
            setShiftModalOpen(false);
            fetchGuest();
          }}
        />
      )}
    </div>
  );
};

export default GuestProfile;
