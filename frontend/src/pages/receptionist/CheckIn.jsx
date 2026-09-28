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
    durationOption: '24h',
    discountAmount: 0,
    occupants: 1,
    paymentMethod: 'Cash'
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [initialPayment, setInitialPayment] = useState('');

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

  // Billing Math
  const extraPersons = Math.max(0, stayInfo.occupants - 1);
  const extraPerPerson = selectedRoom ? (stayInfo.durationOption === '12h' ? (selectedRoom.extraPerPerson12h || 0) : (selectedRoom.extraPerPerson24h || 0)) : 0;
  const extraCharge = extraPersons * extraPerPerson;
  const customHours = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null;
  const customRate = customHours ? selectedRoom?.customRates?.find(r => r.hours === customHours)?.price || 0 : 0;
  const basePrice = selectedRoom ? (stayInfo.durationOption === '12h' ? selectedRoom.price12h : (customHours ? customRate : selectedRoom.price24h)) : 0;
  const pricePerUnit = basePrice + (customHours ? 0 : extraCharge);
  const grossTotal = (stayInfo.durationOption === '12h' || customHours) ? pricePerUnit : pricePerUnit * nights;
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
        checkInDate: stayInfo.checkInDate,
        expectedCheckOutDate: checkoutDate,
        durationOption: stayInfo.durationOption,
        discountAmount: Number(stayInfo.discountAmount) || 0,
        occupants: stayInfo.occupants,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel
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
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-500 rounded-full z-0" style={{ width: `${(step - 1) * 50}%` }}></div>
        {[1, 2, 3].map(num => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${step >= num ? 'bg-black text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}`}>
              {num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${step >= num ? 'text-black' : 'text-gray-400'}`}>
              {num === 1 ? 'Room' : num === 2 ? 'Guests' : 'Billing'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ─── STEP 1: Room & Occupants ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-7 space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Bed size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Room Selection</h2>
                <p className="text-xs text-gray-500">Configure stay duration and select a room</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left col: Duration & Occupants */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm") })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Short stay</p>
                    </button>
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm") })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '24h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Calendar size={20} className={stayInfo.durationOption === '24h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">Daily</p>
                      <p className="text-xs text-gray-500 mt-0.5">24h format</p>
                    </button>
                    {selectedRoom?.customRates?.map(rate => (
                      <button key={rate.hours} type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), rate.hours), "yyyy-MM-dd'T'HH:mm") })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === `custom_${rate.hours}` ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                        <Clock size={20} className={stayInfo.durationOption === `custom_${rate.hours}` ? 'text-black' : 'text-gray-400'} />
                        <p className="font-bold text-gray-900 mt-2">{rate.hours} Hour{rate.hours > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Custom rate</p>
                      </button>
                    ))}
                  </div>
                  {(!selectedRoom || !selectedRoom.customRates?.length) && (
                    <p className="text-xs text-gray-400 mt-2">Select a room first to see custom hourly rates (if any).</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-in Time</label>
                    <input type="datetime-local" required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.checkInDate}
                      onChange={e => {
                        const newIn = new Date(e.target.value);
                        let newOut = new Date(stayInfo.expectedCheckOutDate);
                        if (newIn >= newOut) newOut = addDays(newIn, 1);
                        setStayInfo({ ...stayInfo, checkInDate: e.target.value, expectedCheckOutDate: format(newOut, "yyyy-MM-dd'T'HH:mm") });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-out Time</label>
                    <input type="datetime-local" required min={stayInfo.checkInDate}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.expectedCheckOutDate}
                      onChange={e => setStayInfo({ ...stayInfo, expectedCheckOutDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-indigo-600 font-bold mt-1">Calculated Math: {nights} night{nights > 1 ? 's' : ''} (or exact hours for short-stays)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users size={16} /> Total Occupants
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} type="button" onClick={() => handleOccupantsChange(n)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${stayInfo.occupants === n ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        {n}
                      </button>
                    ))}
                    <input type="number" min="1" max="20"
                      className={`w-16 py-3 text-center rounded-xl font-bold text-sm border outline-none transition-all ${stayInfo.occupants > 4 ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      placeholder="5+" value={stayInfo.occupants > 4 ? stayInfo.occupants : ''}
                      onChange={e => handleOccupantsChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right col: Room Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center justify-between">
                  <span>Available Rooms</span>
                  {selectedRoom && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Selected: {selectedRoom.roomNumber}</span>}
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2">
                  {rooms.map(room => {
                    const available = isRoomAvailable(room._id);
                    const isSelected = selectedRoom?._id === room._id;
                    const customHr = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null; const roomPrice = stayInfo.durationOption === '12h' ? room.price12h : (customHr ? (room.customRates?.find(r => r.hours === customHr)?.price || 0) : room.price24h);
                    return (
                      <button key={room._id} type="button" disabled={!available} onClick={() => setSelectedRoom(room)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : available ? 'border-gray-100 hover:border-gray-300 bg-white' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType || 'Standard'}</p>
                            <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>Max {room.capacity} guests</p>
                          </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isSelected ? 'border-white/20' : 'border-gray-100'} text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          ₹{roomPrice || 0}
                          <span className={`font-normal text-xs ml-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>/ {stayInfo.durationOption === '12h' ? '12h' : 'night'}</span>
                          {!customHr && (stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h) > 0 && (
                            <span className={`block mt-1 text-[10px] uppercase ${isSelected ? 'text-gray-300' : 'text-blue-600'}`}>
                              +₹{stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h}/extra person
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
              <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                onClick={() => setStep(2)} disabled={!canProceed1}>
                Next: Guest Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Guests Info ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-7 space-y-6">
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
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
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
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 relative">
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

            <div className="pt-6 flex justify-between border-t border-gray-100">
              <button className="text-gray-500 px-5 py-3 font-semibold hover:text-black transition-colors" onClick={() => setStep(1)}>← Back</button>
              <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                onClick={() => setStep(3)} disabled={!canProceed2}>
                Next: Payment <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Payment ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><CreditCard size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Billing Summary</h2>
                <p className="text-xs text-gray-500">Review and collect payment</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Primary Guest</p>
                  <p className="font-bold text-gray-900 mt-0.5">{guests[0]?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Room</p>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedRoom?.roomNumber} <span className="text-gray-500 font-normal">({stayInfo.occupants} guests)</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Type</p>
                  <p className="font-bold text-gray-900 mt-0.5">{stayInfo.durationOption.startsWith('custom_') ? `${stayInfo.durationOption.split('_')[1]} Hours` : (stayInfo.durationOption === '12h' ? '12 Hours' : `${nights} Night${nights > 1 ? 's' : ''}`)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Exact Timings</p>
                  <p className="font-bold text-gray-900 mt-0.5 text-sm">
                    {format(new Date(stayInfo.checkInDate), 'dd MMM, hh:mm a')} → {format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Base rate ({stayInfo.durationOption === '12h' ? '12h' : '1 night'})</span>
                  <span className="font-bold text-gray-900">₹{basePrice}</span>
                </div>

                {extraCharge > 0 && (
                  <div className="flex justify-between text-sm text-blue-700 bg-blue-50/50 p-2 rounded-lg -mx-2">
                    <span className="font-medium">+{extraPersons} extra person{extraPersons > 1 ? 's' : ''} × ₹{extraPerPerson}</span>
                    <span className="font-bold">+₹{extraCharge}</span>
                  </div>
                )}

                {stayInfo.durationOption === '24h' && nights > 1 && (
                  <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-200/60">
                    <span className="font-medium">Effective nightly rate (₹{pricePerUnit}) × {nights} nights</span>
                    <span className="font-bold text-gray-900">₹{grossTotal}</span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-gray-200 mt-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Percent size={16} className="text-indigo-500" />
                    <span className="font-bold text-sm">Discount (₹)</span>
                  </div>
                  <input type="number" min="0" max={grossTotal}
                    className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-right text-sm"
                    value={stayInfo.discountAmount} onChange={e => setStayInfo({...stayInfo, discountAmount: Math.min(Number(e.target.value), grossTotal)})}
                  />
                </div>

                <div className="flex justify-between items-end pt-2">
                  <span className="font-black text-gray-900 text-lg uppercase tracking-tight">Total</span>
                  <span className="text-3xl font-black text-black">₹{total}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Collect Payment (₹)</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <input type="number" min="0" max={total}
                  className="w-full sm:w-1/2 px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none text-2xl font-black transition-all"
                  placeholder="0" value={initialPayment} onChange={e => setInitialPayment(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setInitialPayment(total)} className="text-sm font-bold px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-colors shadow-sm">Full ₹{total}</button>
                  <button type="button" onClick={() => setInitialPayment('')} className="text-sm font-bold px-4 py-3 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Clear</button>
                </div>
              </div>
              {initialPayment > 0 && initialPayment < total && (
                <p className="text-sm text-orange-700 font-medium bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-100 flex items-center gap-2">
                  <Clock size={16} /> ₹{total - initialPayment} will remain as pending balance.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Payment Method</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(m => (
                  <button key={m} type="button" onClick={() => setStayInfo({...stayInfo, paymentMethod: m})}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all shadow-sm ${stayInfo.paymentMethod === m ? 'bg-black text-white border-black transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-between border-t border-gray-100">
              <button className="text-gray-500 px-5 py-3 font-semibold hover:text-black transition-colors" onClick={() => setStep(2)}>← Back</button>
              <button
                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                onClick={handleSubmit} disabled={loading}>
                {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</> : <><ShieldCheck size={20} /> Complete Check-In</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;
