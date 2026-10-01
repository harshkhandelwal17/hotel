import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Search, Plus, UserPlus, CreditCard, ChevronRight, Bed, Clock, Users, ShieldCheck, Camera, Image as ImageIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { compressImage } from '../../utils/imageCompression';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const SkeletonRoom = () => (
  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 animate-pulse">
    <div className="h-4 w-1/3 bg-gray-200 rounded mb-4" />
    <div className="h-6 w-1/4 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-1/2 bg-gray-200 rounded" />
  </div>
);

const CheckIn = () => {
  const loadState = (key, defaultVal) => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch { return defaultVal; }
  };

  const [step, setStep] = useState(() => loadState('checkin_step', 1));
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  const [stayInfo, setStayInfo] = useState(() => loadState('checkin_stayInfo', {
    room: '', durationUnit: 'Days', durationValue: 1, occupants: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''
  }));

  const [guests, setGuests] = useState(() => loadState('checkin_guests', [{
    fullName: '', mobileNumber: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false
  }]));

  // Persist state on change to recover from iOS Camera Memory Kills
  useEffect(() => { sessionStorage.setItem('checkin_step', JSON.stringify(step)); }, [step]);
  useEffect(() => { sessionStorage.setItem('checkin_stayInfo', JSON.stringify(stayInfo)); }, [stayInfo]);
  useEffect(() => { sessionStorage.setItem('checkin_guests', JSON.stringify(guests)); }, [guests]);


  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
        const res = await axios.get(`${API}/api/rooms${propQuery}`);
        setRooms(res.data.data.filter(r => r.status === 'Active'));
      } catch (err) {
        toast({ message: 'Failed to load rooms', type: 'error' });
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [globalProperty, toast]);

  const selectedRoomDetails = rooms.find(r => r._id === stayInfo.room);

  // Auto-calculate rent (rough estimate since it's fully custom)
  useEffect(() => {
    if (selectedRoomDetails) {
      let basePrice = 0;
      if (stayInfo.durationUnit === 'Days') {
        basePrice = (selectedRoomDetails.price24h || 0) * stayInfo.durationValue;
      } else {
        basePrice = Math.round(((selectedRoomDetails.price24h || 0) / 24) * stayInfo.durationValue);
      }
      setStayInfo(prev => ({ ...prev, totalAmount: basePrice }));
    }
  }, [stayInfo.room, stayInfo.durationUnit, stayInfo.durationValue, selectedRoomDetails]);

  // Handle Dynamic Occupants
  useEffect(() => {
    const occ = Number(stayInfo.occupants);
    if (occ > guests.length) {
      const extra = Array.from({ length: occ - guests.length }, () => ({
        fullName: '', mobileNumber: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false
      }));
      setGuests(prev => [...prev, ...extra]);
    } else if (occ < guests.length && occ >= 1) {
      setGuests(prev => prev.slice(0, occ));
    }
  }, [stayInfo.occupants]);

  // Guest Search (Debounced)
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
  };

  const searchGuest = async (index, mobile) => {
    if (mobile.length !== 10) return;
    setGuests(prev => {
      const updated = [...prev];
      updated[index].isSearching = true;
      return updated;
    });
    try {
      const res = await axios.get(`${API}/api/guests/search?mobile=${mobile}`);
      if (res.data.data) {
        setGuests(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...res.data.data, isSearching: false };
          return updated;
        });
        toast({ message: 'Returning guest details auto-filled!', type: 'success' });
      } else {
        setGuests(prev => {
          const updated = [...prev];
          updated[index].isSearching = false;
          return updated;
        });
      }
    } catch {
      setGuests(prev => {
        const updated = [...prev];
        updated[index].isSearching = false;
        return updated;
      });
    }
  };

  const debouncedSearch = useCallback(debounce(searchGuest, 500), []);

  const handleGuestChange = (index, field, value) => {
    const updated = [...guests];
    updated[index][field] = value;
    if (field === 'mobileNumber') {
      updated[index]._id = null;
      if (value.length === 10) debouncedSearch(index, value);
    }
    setGuests(updated);
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressedFile);
      const res = await axios.post(`${API}/api/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      handleGuestChange(index, 'idProofImage', res.data.url);
      toast({ message: 'Image uploaded successfully!', type: 'success' });
    } catch (err) {
      toast({ message: 'Failed to upload image. Network or memory issue.', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const pGuest = guests[0];
      let pGuestId = pGuest._id;

      if (!pGuestId) {
        const pRes = await axios.post(`${API}/api/guests`, pGuest);
        pGuestId = pRes.data.data._id;
      } else {
        await axios.put(`${API}/api/guests/${pGuestId}`, pGuest);
      }

      const coGuestIds = [];
      for (let i = 1; i < guests.length; i++) {
        const cg = guests[i];
        if (cg.fullName && cg.mobileNumber) {
          let cgId = cg._id;
          if (!cgId) {
            const cgRes = await axios.post(`${API}/api/guests`, cg);
            cgId = cgRes.data.data._id;
          } else {
            await axios.put(`${API}/api/guests/${cgId}`, cg);
          }
          coGuestIds.push(cgId);
        }
      }

      const checkInDate = new Date();
      const expectedOut = new Date();
      if (stayInfo.durationUnit === 'Days') {
        expectedOut.setDate(expectedOut.getDate() + Number(stayInfo.durationValue));
      } else {
        expectedOut.setHours(expectedOut.getHours() + Number(stayInfo.durationValue));
      }

      await axios.post(`${API}/api/stays/checkin`, {
        guest: pGuestId,
        coGuests: coGuestIds,
        room: stayInfo.room,
        hostel: globalProperty !== 'all' ? globalProperty : selectedRoomDetails.hostel,
        durationOption: `${stayInfo.durationValue} ${stayInfo.durationUnit}`,
        occupants: stayInfo.occupants,
        totalAmount: stayInfo.totalAmount,
        paidAmount: stayInfo.paidAmount,
        paymentMethod: stayInfo.paymentMethod,
        commissionTo: stayInfo.commissionTo,
        commissionAmount: Number(stayInfo.commissionAmount) || 0,
        checkInDate,
        expectedCheckOutDate: expectedOut
      });

      sessionStorage.removeItem('checkin_step');
      sessionStorage.removeItem('checkin_stayInfo');
      sessionStorage.removeItem('checkin_guests');
      toast({ message: `Check-In successful for Room ${selectedRoomDetails.roomNumber}`, type: 'success' });
      navigate('/dashboard');
    } catch (err) {
      toast({ message: err.response?.data?.message || 'Check-in failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = stayInfo.room && stayInfo.durationValue >= 1 && stayInfo.occupants >= 1 && selectedRoomDetails?.capacity >= stayInfo.occupants;
  const isStep2Valid = guests.every(g => g.fullName.trim() && g.mobileNumber.length >= 10);

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-8 animate-in fade-in duration-500">
      
      {/* Header & Stepper */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Express Check-In</h1>
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-all ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 1 ? 'text-black' : 'text-gray-400'}`}>1. Stay Details</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-all ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>2. Guest Identity</span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          
          {/* Room Selection */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6">
              <Bed className="text-gray-400" /> Select Available Room
            </h2>
            {loadingRooms ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"><SkeletonRoom /><SkeletonRoom /><SkeletonRoom /></div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10 bg-red-50 text-red-600 rounded-2xl font-bold">No rooms available currently.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {rooms.map(room => {
                  const active = stayInfo.room === room._id;
                  const isFull = stayInfo.occupants > room.capacity;
                  return (
                    <button key={room._id} onClick={() => !isFull && setStayInfo({...stayInfo, room: room._id})} disabled={isFull}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                        active ? 'border-black bg-black text-white shadow-xl scale-[1.02]' :
                        isFull ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                        'border-gray-200 hover:border-gray-400 bg-white hover:shadow-md'
                      }`}>
                      {active && <CheckCircle2 className="absolute top-3 right-3 text-white" size={18} />}
                      <h3 className={`font-black text-2xl ${active ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</h3>
                      <p className={`text-xs font-bold mt-1 ${active ? 'text-gray-300' : 'text-gray-500'}`}>Cap. {room.capacity} {isFull && <span className="text-red-500 block">Too small</span>}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stay Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Clock className="text-gray-400" /> Stay Configuration
              </h2>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Total Occupants</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setStayInfo(p => ({...p, occupants: Math.max(1, p.occupants - 1)}))} className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center font-black text-xl hover:bg-gray-50 active:scale-95">-</button>
                  <div className="text-3xl font-black w-12 text-center">{stayInfo.occupants}</div>
                  <button onClick={() => setStayInfo(p => ({...p, occupants: p.occupants + 1}))} className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center font-black text-xl hover:bg-gray-50 active:scale-95">+</button>
                </div>
                {selectedRoomDetails?.capacity < stayInfo.occupants && <p className="text-xs text-red-500 font-bold mt-2">Warning: Room capacity is {selectedRoomDetails.capacity}.</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration of Stay (Fully Custom)</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="1" placeholder="e.g. 2" value={stayInfo.durationValue} onChange={e => setStayInfo(p => ({...p, durationValue: Math.max(1, e.target.value)}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-black text-2xl outline-none focus:border-black transition-colors" />
                  </div>
                  <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl p-1.5 flex">
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Hours'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Hours' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Hours</button>
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Days'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Days' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Days</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-300 flex items-center gap-2 mb-6">
                  <CreditCard className="text-gray-500" /> Payment & Settlement
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                    <span className="text-gray-400 font-bold">Agreed Total</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-black">₹</span>
                      <input type="number" value={stayInfo.totalAmount} onChange={e => setStayInfo(p => ({...p, totalAmount: e.target.value}))} className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                    <span className="text-gray-400 font-bold">Advance Paid</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-black">₹</span>
                      <input type="number" value={stayInfo.paidAmount} onChange={e => setStayInfo(p => ({...p, paidAmount: e.target.value}))} className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600 text-green-400" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400 font-bold">Balance Due</span>
                    <span className={`font-black text-2xl ${stayInfo.totalAmount - stayInfo.paidAmount > 0 ? 'text-orange-400' : 'text-gray-300'}`}>₹{Math.max(0, stayInfo.totalAmount - stayInfo.paidAmount)}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-800">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Broker / Commission (Optional)</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input type="text" placeholder="Broker Name" value={stayInfo.commissionTo} onChange={e => setStayInfo(p => ({...p, commissionTo: e.target.value}))} className="w-full sm:flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                  <input type="number" placeholder="₹ Amount" value={stayInfo.commissionAmount} onChange={e => setStayInfo(p => ({...p, commissionAmount: e.target.value}))} className="w-full sm:w-32 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                </div>
              </div>

              <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl mt-4">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button key={m} onClick={() => setStayInfo(p => ({...p, paymentMethod: m}))} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${stayInfo.paymentMethod === m ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8">
            <button onClick={() => setStep(2)} disabled={!isStep1Valid} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]">
              Continue to Guest Details <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          
          <div className="flex items-center gap-3 bg-blue-50 text-blue-800 p-4 rounded-2xl border border-blue-100 mb-6">
            <ShieldCheck size={24} className="text-blue-600 flex-shrink-0" />
            <p className="text-sm font-bold leading-tight">Identity details required for {stayInfo.occupants} occupant(s). Verify original ID physically before check-in.</p>
          </div>

          {guests.map((guest, index) => (
            <div key={index} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden focus-within:border-gray-300 transition-colors">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-black text-gray-900 flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">{index + 1}</div>
                  Guest {index === 0 ? <span className="bg-black text-white text-[9px] px-2 py-1 rounded uppercase tracking-widest ml-2">Primary</span> : ''}
                </h3>
                {guest._id && <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={12} /> Returning</span>}
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {guest.isSearching && <div className="absolute top-6 right-6 text-xs font-bold text-blue-500 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"><Search size={14} className="animate-spin" /> Searching history...</div>}
                
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Mobile Number <span className="text-red-500">*</span></label>
                  <input type="tel" required placeholder="10-digit mobile" value={guest.mobileNumber} onChange={e => handleGuestChange(index, 'mobileNumber', e.target.value)} className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-0 outline-none font-black text-lg transition-colors ${guest._id ? 'border-green-300 bg-green-50 text-green-900' : 'border-gray-100 focus:border-black text-gray-900'}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="Guest full name" value={guest.fullName} onChange={e => handleGuestChange(index, 'fullName', e.target.value)} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-black text-lg text-gray-900 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID Type</label>
                    <select value={guest.idProofType} onChange={e => handleGuestChange(index, 'idProofType', e.target.value)} className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors">
                      <option>Aadhaar</option><option>Passport</option><option>DL</option><option>Voter ID</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID Number (Opt)</label>
                    <input type="text" placeholder="XXXX-XXXX" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 uppercase transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID Document (Opt)</label>
                  <div className="flex gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">
                      <Camera size={20} className="group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Camera</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImageUpload(index, e.target.files[0])} />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">
                      <ImageIcon size={20} className="group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Gallery</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(index, e.target.files[0])} />
                    </label>
                  </div>
                  {uploadingImage && <div className="mt-3 text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded-xl flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/> Uploading...</div>}
                  {!uploadingImage && guest.idProofImage && <a href={guest.idProofImage} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 p-2 rounded-xl border border-green-200 hover:bg-green-100">✓ View Uploaded Doc</a>}
                </div>
              </div>
            </div>
          ))}

          <div className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 sm:mt-8">
            <button onClick={() => setStep(1)} className="w-16 sm:w-auto flex items-center justify-center sm:px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95">
              <ArrowLeft size={18} className="sm:hidden" />
              <span className="hidden sm:block uppercase tracking-widest text-sm">Back</span>
            </button>
            <button onClick={handleSubmit} disabled={!isStep2Valid || loading || uploadingImage} className="flex-1 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]">
              {loading ? 'Finalizing...' : 'Complete Check-In'} <CheckCircle2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIn;
