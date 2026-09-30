import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, addDays, addHours } from 'date-fns';
import { CheckCircle2, Search, Plus, UserPlus, CreditCard, ChevronRight, Bed, Clock, Users, Percent, ShieldCheck, Calendar } from 'lucide-react';

const CheckIn = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [error, setError] = useState('');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const [loading, setLoading] = useState(false);

  // Step 1: Room & Stay Info
  const [stayInfo, setStayInfo] = useState({
    checkInDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    expectedCheckOutDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    durationOption: 'custom',
    stayDays: 1,
    stayHours: 0,
    discountAmount: 0,
    occupants: 1,
    paymentMethod: 'Cash',
    commissionTo: '',
    commissionAmount: ''
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [initialPayment, setInitialPayment] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [customHoursInput, setCustomHoursInput] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Step 2: Guests Info
  const emptyGuest = { mobileNumber: '', fullName: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false };
  const [guests, setGuests] = useState([{ ...emptyGuest }]);
  const [typingTimeouts, setTypingTimeouts] = useState({});

  const fetchRoomsAndStays = async () => {
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/rooms?status=Active${propQuery}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays?status=Active${propQuery}`)
      ]);
      setRooms(roomsRes.data.data);
      setActiveStays(staysRes.data.data);
    } catch (err) {
      setError('Failed to fetch rooms and stays');
    }
  };

  useEffect(() => {
    fetchRoomsAndStays();
  }, [globalProperty]);

  useEffect(() => {
    const handlePropChange = () => fetchRoomsAndStays();
    window.addEventListener('propertyChanged', handlePropChange);
    return () => window.removeEventListener('propertyChanged', handlePropChange);
  }, [globalProperty]);

  // --- Step 1 Handlers ---
  const handleOccupantsChange = (n) => {
    const newCount = Math.max(1, parseInt(n) || 1);
    setStayInfo({ ...stayInfo, occupants: newCount });
    setSelectedRoom(null);
    setGuests(prev => {
      const newGuests = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) newGuests.push({ ...emptyGuest });
      } else {
        newGuests.length = newCount;
      }
      return newGuests;
    });
  };

  const isRoomAvailable = (roomId) => {
    return !activeStays.some(stay => {
      if (stay.room._id !== roomId) return false;
      const stayCheckOut = new Date(stay.expectedCheckOutDate);
      const newCheckIn = new Date(stayInfo.checkInDate);
      return newCheckIn < stayCheckOut;
    });
  };

  const nights = stayInfo.durationOption === '12h' ? 0 : Math.ceil((new Date(stayInfo.expectedCheckOutDate) - new Date(stayInfo.checkInDate)) / (1000 * 60 * 60 * 24));

    // Filter available rooms
  const filteredRooms = rooms.filter(room => isRoomAvailable(room._id));

  // Billing Math Runtime
  const grossTotal = Number(totalAmount) || 0;
  const total = Math.max(0, grossTotal - Number(stayInfo.discountAmount || 0));

  // --- Step 2 Handlers (Guests) ---
  const handleImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleGuestChange(index, 'idProofImage', res.data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleGuestChange = (index, field, value) => {
    const newGuests = [...guests];
    newGuests[index][field] = value;

    if (field === 'mobileNumber') {
      newGuests[index]._id = null; // reset returning status on change
      
      // Debounce search
      if (typingTimeouts[index]) clearTimeout(typingTimeouts[index]);
      
      if (value.length >= 10) {
        newGuests[index].isSearching = true;
        const timeoutId = setTimeout(async () => {
          try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests?mobile=${value}`);
            if (res.data.data.length > 0) {
              const found = res.data.data[0];
              setGuests(curr => {
                const updated = [...curr];
                updated[index] = { ...updated[index], ...found, isSearching: false };
                return updated;
              });
            } else {
              setGuests(curr => {
                const updated = [...curr];
                updated[index].isSearching = false;
                return updated;
              });
            }
          } catch (e) {
             setGuests(curr => {
                const updated = [...curr];
                updated[index].isSearching = false;
                return updated;
              });
          }
        }, 500);
        setTypingTimeouts({ ...typingTimeouts, [index]: timeoutId });
      }
    }
    setGuests(newGuests);
  };

  // --- Step 3 Handlers (Submit) ---
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Ensure all guests exist or create them
      // Optimized Guest Creation with Promise.all
      const guestPromises = guests.map(guest => {
        const payload = {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage,
            hostel: typeof selectedRoom.hostel === 'object' ? selectedRoom.hostel._id : selectedRoom.hostel
        };
        if (guest._id) {
          return axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${guest._id}`, payload).then(() => guest._id);
        } else {
          return axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/guests', payload).then(res => res.data.data._id);
        }
      });
      
      const guestIds = await Promise.all(guestPromises);

      // 2. Create Stay
      const checkoutDate = stayInfo.expectedCheckOutDate;
      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays', {
        guest: guestIds[0],
        coGuests: guestIds.slice(1),
        room: selectedRoom._id,
        checkInDate: new Date(stayInfo.checkInDate).toISOString(),
        expectedCheckOutDate: new Date(checkoutDate).toISOString(),
        durationOption: stayInfo.durationOption,
        discountAmount: Number(stayInfo.discountAmount) || 0,
        occupants: stayInfo.occupants,
        totalAmount: Number(totalAmount) || 0,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel,
        commissionTo: stayInfo.commissionTo,
        commissionAmount: Number(stayInfo.commissionAmount) || 0
      });

      navigate('/checkouts', { state: { success: 'Check-in completed successfully!' } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error during check-in');
      setLoading(false);
    }
  };

  const canProceed1 = !!selectedRoom && stayInfo.occupants >= 1;
  const canProceed2 = guests.every(g => g.fullName.trim() && g.mobileNumber.length >= 10 && (g.idProofNumber.trim() || g.idProofImage));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Express Check-In</h1>
        <p className="text-gray-500 mt-1 font-medium">Quickly allocate rooms and register guests.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">{error}</div>}

      {/* Modern Progress Steps */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-500 rounded-full z-0" style={{ width: `${(step - 1) * 100}%` }}></div>
        {[1, 2].map(num => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${step >= num ? 'bg-black text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}`}>
              {num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${step >= num ? 'text-black' : 'text-gray-400'}`}>
              {num === 1 ? 'Stay Details' : 'Guest Identity'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ─── STEP 1: Room & Occupants ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-4 sm:p-7 space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Bed size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Stay & Room Details</h2>
                <p className="text-xs text-gray-500">Configure duration, select a room, and collect payment</p>
              </div>
            </div>

            {/* 1. Super Simple Duration & Occupants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Occupants */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-center items-center">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4">How many Guests?</label>
                <div className="flex items-center gap-4 sm:gap-6 bg-white p-2 sm:p-3 rounded-full shadow-sm border border-gray-200">
                  <button type="button" onClick={() => handleOccupantsChange(Math.max(1, stayInfo.occupants - 1))}
                    className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors text-2xl font-black">
                    -
                  </button>
                  <span className="text-4xl font-black text-gray-900 w-12 text-center">{stayInfo.occupants}</span>
                  <button type="button" onClick={() => handleOccupantsChange(stayInfo.occupants + 1)}
                    className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200 transition-colors text-2xl font-black">
                    +
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4 text-center">Stay Duration</label>
                
                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 0, stayHours: 12, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    12 Hours
                  </button>
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 1, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    1 Day
                  </button>
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 2, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 2), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    2 Days
                  </button>
                </div>

                {/* Manual Steppers */}
                <div className="flex justify-center gap-2 sm:gap-4">
                  {/* Days Stepper */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Days</span>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                       <button type="button" onClick={() => {
                         const newD = Math.max(0, (stayInfo.stayDays || 0) - 1);
                         setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                       <span className="px-2 sm:px-4 font-black text-lg w-10 sm:w-12 text-center">{stayInfo.stayDays || 0}</span>
                       <button type="button" onClick={() => {
                         const newD = (stayInfo.stayDays || 0) + 1;
                         setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-gray-300 self-end mb-2">+</span>
                  {/* Hours Stepper */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hours</span>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                       <button type="button" onClick={() => {
                         const newH = Math.max(0, (stayInfo.stayHours || 0) - 1);
                         setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                       <span className="px-2 sm:px-4 font-black text-lg w-10 sm:w-12 text-center">{stayInfo.stayHours || 0}</span>
                       <button type="button" onClick={() => {
                         const newH = (stayInfo.stayHours || 0) + 1;
                         setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                    </div>
                  </div>
                </div>

                {/* Live Checkout Time Display */}
                <div className="mt-4 text-center bg-green-50 py-2 rounded-lg border border-green-200">
                  <p className="text-[10px] uppercase font-bold text-green-700">Guest will checkout at</p>
                  <p className="font-black text-green-900">{format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
            </div>

            {/* 2. Select Room */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Select Room</label>
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input type="text" placeholder="Type Room No. to auto-select" 
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm text-gray-900 transition-colors"
                    value={roomSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoomSearchQuery(val);
                      if (val.trim()) {
                        const exactMatch = filteredRooms.find(r => r.roomNumber.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) setSelectedRoom(exactMatch);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[250px] overflow-y-auto p-1">
                {filteredRooms.filter(r => r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())).length === 0 ? (
                  <div className="col-span-full py-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Bed size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No rooms available</p>
                  </div>
                ) : filteredRooms.map(room => {
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                      className={`relative p-4 rounded-2xl border-2 text-center transition-all ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-lg transform scale-[1.05]' : 'border-gray-200 hover:border-blue-300 bg-white'}`}>
                      <p className={`font-black text-2xl ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                      <p className={`text-[10px] font-bold mt-1 uppercase ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{room.roomType}</p>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full p-1 shadow-md">
                          <CheckCircle2 size={16} className="fill-current" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Billing & Payment & Commission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
              
              {/* Billing */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2"><CreditCard size={16}/> Payment & Billing</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Agreed Total Rent (₹)</label>
                    <input type="number" required placeholder="0" className="w-full px-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-2xl text-blue-900"
                      value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Advance Paid (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                      value={initialPayment} onChange={e => setInitialPayment(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Discount (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                      value={stayInfo.discountAmount} onChange={e => setStayInfo({...stayInfo, discountAmount: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Commission & Summary */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Broker / Commission (Optional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referred By (Name/Auto)</label>
                      <input type="text" placeholder="e.g. Auto Driver" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                        value={stayInfo.commissionTo} onChange={e => setStayInfo({...stayInfo, commissionTo: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Commission Amount (₹)</label>
                      <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                        value={stayInfo.commissionAmount} onChange={e => setStayInfo({...stayInfo, commissionAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                  <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">Balance Due</p>
                     <p className={`font-black text-xl ${total - Number(initialPayment || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{Math.max(0, total - Number(initialPayment || 0))}
                     </p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-bold text-gray-500 uppercase">Final Total</p>
                     <p className="font-black text-2xl text-gray-900">₹{total}</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
              <button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-sm uppercase tracking-wide"
                onClick={() => setStep(2)} disabled={!canProceed1}>
                Next: Guest Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Guests Info ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-4 sm:p-7 space-y-6">
             <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><UserPlus size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Guest Details</h2>
                <p className="text-xs text-gray-500">Provide details for all {stayInfo.occupants} occupants.</p>
              </div>
            </div>

            <div className="space-y-6">
              {guests.map((guest, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 sm:px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">{index + 1}</div>
                      Guest {index === 1 ? '(Primary)' : ''} {index === 0 && <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded uppercase">Primary</span>}
                    </h3>
                    {guest._id && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={14} /> Returning Guest
                      </span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 relative">
                    {guest.isSearching && (
                       <div className="absolute top-2 right-2 text-xs text-blue-500 flex items-center gap-1"><Search size={12} className="animate-spin" /> Searching...</div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                      <input type="tel" required className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm transition-colors ${guest._id ? 'border-green-300 bg-green-50' : 'border-gray-200'}`} placeholder="10-digit mobile" value={guest.mobileNumber} onChange={e => handleGuestChange(index, 'mobileNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm" placeholder="Enter full name" value={guest.fullName} onChange={e => handleGuestChange(index, 'fullName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">ID Proof Type <span className="text-red-500">*</span></label>
                      <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm" value={guest.idProofType} onChange={e => handleGuestChange(index, 'idProofType', e.target.value)}>
                        <option>Aadhaar</option>
                        <option>Passport</option>
                        <option>Driving License</option>
                        <option>Voter ID</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{guest.idProofType} Number (Optional)</label>
                      <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm uppercase" placeholder="ID Number (Optional)" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">ID Image (Optional)</label>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />
                      {guest.idProofImage && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-green-600 font-bold flex items-center">✓ Uploaded</span>
                          <a href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 underline font-semibold">View Image</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100">
              <button className="w-full sm:w-auto text-center text-gray-500 px-5 py-3 font-semibold hover:text-black transition-colors" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md uppercase tracking-wide text-sm"
                onClick={handleSubmit} disabled={!canProceed2 || loading}>
                {loading ? 'Processing...' : 'Complete Check-In'} <CheckCircle2 size={18} />
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
};

export default CheckIn;
