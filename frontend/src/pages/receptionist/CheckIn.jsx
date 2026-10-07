import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  Search,
  UserPlus,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Bed,
  Users,
  ShieldCheck,
  Camera,
  Plus,
  RefreshCw,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { compressImage } from '../../utils/imageCompression';

const API =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

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
    } catch {
      return defaultVal;
    }
  };

  const [step, setStep] = useState(() =>
    loadState('checkin_step', 1)
  );

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const guestsRef = useRef([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [frequentCoGuests, setFrequentCoGuests] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();

  const { globalProperty } =
    useOutletContext() || { globalProperty: 'all' };

  // =========================================================
  // STAY INFO
  // =========================================================

  const [stayInfo, setStayInfo] = useState(() =>
    loadState('checkin_stayInfo', {
      room: '',
      durationDays: 1,
      durationHours: 0,
      occupants: 1,
      totalAmount: '',
      paidAmount: 0,
      paymentMethod: 'Cash',
      commissionTo: '',
      commissionAmount: ''
    })
  );

  // =========================================================
  // GUESTS
  // =========================================================

  const [guests, setGuests] = useState(() =>
    loadState('checkin_guests', [
      {
        fullName: '',
        mobileNumber: '',
        idProofType: 'Aadhaar',
        idProofNumber: '',
        idProofImage: '',
        idProofImageBack: '',
        _id: null,
        isSearching: false
      }
    ])
  );

  // =========================================================
  // SESSION STORAGE
  // =========================================================


  useEffect(() => {
    sessionStorage.setItem('checkin_step', JSON.stringify(step));
    // Always scroll to top when step changes (mobile fix)
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);


  useEffect(() => {
    sessionStorage.setItem(
      'checkin_stayInfo',
      JSON.stringify(stayInfo)
    );
  }, [stayInfo]);

  useEffect(() => {
    sessionStorage.setItem(
      'checkin_guests',
      JSON.stringify(guests)
    );
  }, [guests]);

  // =========================================================
  // FETCH ROOMS
  // =========================================================

  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);

      try {
        const propQuery =
          globalProperty !== 'all'
            ? `?hostel=${globalProperty}`
            : '';

        const res = await axios.get(
          `${API}/api/rooms${propQuery}`
        );

        setRooms(
          res.data.data.filter(
            (room) => room.status === 'Active'
          )
        );
      } catch (err) {
        console.error('Failed to load rooms:', err);

        toast({
          message: 'Failed to load rooms',
          type: 'error'
        });
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [globalProperty, toast]);

  // =========================================================
  // SELECTED ROOM
  // =========================================================

  const selectedRoomDetails = rooms.find(
    (room) => room._id === stayInfo.room
  );

  // =========================================================
  // IMPORTANT:
  // FIND CURRENT HOSTEL ID
  // =========================================================

  const hostelId =
    globalProperty !== 'all'
      ? globalProperty
      : selectedRoomDetails?.hostel;

  // =========================================================
  // DYNAMIC OCCUPANTS
  // =========================================================

  useEffect(() => {
    const occ = Number(stayInfo.occupants);

    if (occ > guests.length) {
      const extra = Array.from(
        { length: occ - guests.length },
        () => ({
          fullName: '',
          mobileNumber: '',
          idProofType: 'Aadhaar',
          idProofNumber: '',
          idProofImage: '',
          _id: null,
          isSearching: false
        })
      );

      setGuests((prev) => [...prev, ...extra]);
    } else if (
      occ < guests.length &&
      occ >= 1
    ) {
      setGuests((prev) =>
        prev.slice(0, occ)
      );
    }
  }, [stayInfo.occupants]);

  // =========================================================
  // DEBOUNCE
  // =========================================================

  const debounce = (func, wait) => {
    let timeout;

    return (...args) => {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  };

  // =========================================================
  // SEARCH RETURNING GUEST
  // =========================================================

  const searchGuest = async (index, mobile) => {
    if (mobile.length !== 10) return;

    setGuests((prev) => {
      const updated = [...prev];

      updated[index].isSearching = true;

      return updated;
    });

    try {
      const res = await axios.get(
        `${API}/api/guests?mobile=${mobile}`
      );

      if (
        res.data &&
        res.data.data &&
        res.data.data.length > 0
      ) {
        const baseGuest = res.data.data[0];
        
        // Fetch full profile to get past stays & co-guests
        if (index === 0) {
          try {
            const detailRes = await axios.get(`${API}/api/guests/${baseGuest._id}`);
            const pastStays = detailRes.data.data.stays || [];
            
            const coGuestsMap = new Map();
            pastStays.forEach(stay => {
              if (stay.guest && stay.guest._id !== baseGuest._id) coGuestsMap.set(stay.guest._id, stay.guest);
              if (stay.coGuests) {
                stay.coGuests.forEach(cg => {
                  if (cg && cg._id !== baseGuest._id) coGuestsMap.set(cg._id, cg);
                });
              }
            });
            setFrequentCoGuests(Array.from(coGuestsMap.values()));
          } catch (err) {
            console.error('Failed to fetch past co-guests', err);
          }
        }
        
        // Ensure the fetched guest is used instead of blindly spreading res.data.data[0] again
        // Actually, the original code spreads res.data.data[0] which is equivalent to baseGuest
        setGuests((prev) => {
          const updated = [...prev];

          updated[index] = {
            ...updated[index],
            ...res.data.data[0],
            isSearching: false
          };

          return updated;
        });

        toast({
          message:
            'Returning guest details auto-filled!',
          type: 'success'
        });
      } else {
        setGuests((prev) => {
          const updated = [...prev];

          updated[index].isSearching = false;

          return updated;
        });
      }
    } catch (err) {
      console.error(
        'Guest search failed:',
        err
      );

      setGuests((prev) => {
        const updated = [...prev];

        updated[index].isSearching = false;

        return updated;
      });
    }
  };

  const debouncedSearch = useCallback(
    debounce(searchGuest, 500),
    []
  );

  // =========================================================
  // GUEST CHANGE
  // =========================================================

  const handleGuestChange = (index, field, value) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'mobileNumber') {
        updated[index]._id = null;
      }
      return updated;
    });

    if (field === 'mobileNumber' && value.length === 10) {
      debouncedSearch(index, value);
    }
  };

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  guestsRef.current = guests;

  const handleImageUpload = async (
    index,
    file,
    side = 'front'
  ) => {
    if (!file) return;

    setUploadingImage(true);

    try {
      const compressedFile =
        await compressImage(file);

      const formData = new FormData();

      formData.append(
        'image',
        compressedFile
      );

      const res = await axios.post(
        `${API}/api/upload`,
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

      setGuests(prev => {
        const updated = [...prev];
        if (side === 'back') {
          updated[index] = { ...updated[index], idProofImageBack: res.data.url };
        } else {
          updated[index] = { ...updated[index], idProofImage: res.data.url };
        }
        return updated;
      });

      toast({
        message:
          'Image uploaded successfully!',
        type: 'success'
      });

    } catch (err) {
      console.error(
        'Image upload failed:',
        err
      );

      toast({
        message:
          'Failed to upload image. Network or memory issue.',
        type: 'error'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // =========================================================
  // HANDLE SUBMIT
  // =========================================================

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // =====================================================
      // 1. VALIDATE HOSTEL
      // =====================================================

      if (!hostelId) {
        toast({
          message:
            'Hostel could not be identified. Please select a hostel and room.',
          type: 'error'
        });

        setLoading(false);
        return;
      }

      console.log(
        'Selected Hostel ID:',
        hostelId
      );

      console.log(
        'Selected Room:',
        selectedRoomDetails
      );

      // =====================================================
      // 2. PRIMARY GUEST
      // =====================================================

      const pGuestRaw = { ...guests[0], hostel: hostelId };
      // Strip internal-only fields
      const { isSearching: _ps, ...pGuest } = pGuestRaw;

      let pGuestId = pGuest._id || null;

      if (!pGuestId) {
        // Search by mobile first — if already exists, update instead of create
        try {
          const searchRes = await axios.get(`${API}/api/guests?mobile=${pGuest.mobileNumber}`);
          if (searchRes.data.data && searchRes.data.data.length > 0) {
            pGuestId = searchRes.data.data[0]._id;
          }
        } catch (_) {}
      }

      if (!pGuestId) {
        // CREATE PRIMARY GUEST (truly new)
        const pRes = await axios.post(`${API}/api/guests`, pGuest);
        pGuestId = pRes.data.data._id;
      } else {
        // UPDATE PRIMARY GUEST
        await axios.put(`${API}/api/guests/${pGuestId}`, pGuest);
      }

      // =====================================================
      // 3. CO-GUESTS
      // =====================================================

      const coGuestIds = [];

      for (let i = 1; i < guests.length; i++) {
        const cg = guests[i];

        // Only process co-guest that has a name
        if (cg.fullName && cg.fullName.trim() !== '') {
          const { isSearching: _cs, ...coGuest } = { ...cg, hostel: hostelId };

          let cgId = coGuest._id || null;

          // If no _id but has mobile — search DB first to avoid duplicate error
          if (!cgId && coGuest.mobileNumber && coGuest.mobileNumber.trim() !== '') {
            try {
              const cgSearch = await axios.get(`${API}/api/guests?mobile=${coGuest.mobileNumber}`);
              if (cgSearch.data.data && cgSearch.data.data.length > 0) {
                cgId = cgSearch.data.data[0]._id;
              }
            } catch (_) {}
          }

          if (!cgId) {
            // CREATE CO-GUEST (brand new, no mobile or not found)
            const cgRes = await axios.post(`${API}/api/guests`, coGuest);
            cgId = cgRes.data.data._id;
          } else {
            // UPDATE CO-GUEST
            await axios.put(`${API}/api/guests/${cgId}`, coGuest);
          }

          coGuestIds.push(cgId);
        }
      }

      // =====================================================
      // 4. CHECK-IN / CHECK-OUT DATE
      // =====================================================

      const checkInDate = new Date();

      const expectedOut =
        new Date();

      expectedOut.setDate(
        expectedOut.getDate() +
          (Number(
            stayInfo.durationDays
          ) || 0)
      );

      expectedOut.setHours(
        expectedOut.getHours() +
          (Number(
            stayInfo.durationHours
          ) || 0)
      );

      // =====================================================
      // 5. CREATE STAY
      // =====================================================

      const stayPayload = {
        guest: pGuestId,

        coGuests: coGuestIds,

        room: stayInfo.room,

        hostel: hostelId,

        durationOption: `${
          stayInfo.durationDays || 0
        }d ${
          stayInfo.durationHours || 0
        }h`,

        occupants:
          stayInfo.occupants,

        totalAmount:
          stayInfo.totalAmount,

        initialPaymentAmount: stayInfo.paidAmount,

        paymentMethod:
          stayInfo.paymentMethod,

        commissionTo:
          stayInfo.commissionTo,

        commissionAmount:
          Number(
            stayInfo.commissionAmount
          ) || 0,

        checkInDate,

        expectedCheckOutDate:
          expectedOut
      };

      console.log(
        'Stay Payload:',
        stayPayload
      );

      await axios.post(
        `${API}/api/stays`,
        stayPayload
      );

      // =====================================================
      // 6. CLEAR SESSION
      // =====================================================

      sessionStorage.removeItem(
        'checkin_step'
      );

      sessionStorage.removeItem(
        'checkin_stayInfo'
      );

      sessionStorage.removeItem(
        'checkin_guests'
      );

      // =====================================================
      // 7. SUCCESS
      // =====================================================

      toast({
        message: `Check-In successful for Room ${selectedRoomDetails.roomNumber}`,
        type: 'success'
      });

      navigate('/dashboard');
    } catch (err) {
      console.error(
        'Check-in failed:',
        err
      );

      console.error(
        'Backend response:',
        err.response?.data
      );

      toast({
        message:
          err.response?.data?.message ||
          'Check-in failed.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const isStep1Valid =
    stayInfo.room &&
    (
      Number(stayInfo.durationDays) > 0 ||
      Number(stayInfo.durationHours) > 0
    ) &&
    stayInfo.occupants >= 1 &&
    selectedRoomDetails?.capacity >=
      stayInfo.occupants &&
    stayInfo.totalAmount !== '';

  const isStep2Valid = guests.every((g, idx) => {
    // Every guest must have a name
    if (!g.fullName || !g.fullName.trim()) return false;
    // Only primary guest MUST have a valid 10-digit mobile
    if (idx === 0 && g.mobileNumber.length !== 10) return false;
    return true;
  });

  const resetForm = () => {
    if (!window.confirm('Clear all current data and start fresh?')) return;
    
    sessionStorage.removeItem('checkin_step');
    sessionStorage.removeItem('checkin_stayInfo');
    sessionStorage.removeItem('checkin_guests');
    
    setStep(1);
    setStayInfo({
      room: '',
      durationDays: 1,
      durationHours: 0,
      occupants: 1,
      totalAmount: '',
      paidAmount: 0,
      paymentMethod: 'Cash',
      commissionTo: '',
      commissionAmount: ''
    });
    setGuests([{
      fullName: '',
      mobileNumber: '',
      idProofType: 'Aadhaar',
      idProofNumber: '',
      idProofImage: '',
      idProofImageBack: '',
      _id: null,
      isSearching: false
    }]);
    setFrequentCoGuests([]);
    setRoomSearchQuery('');
    toast({ message: 'Form cleared successfully', type: 'info' });
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-8 animate-in fade-in duration-500">

      {/* HEADER */}

      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Express Check-In
          </h1>
          <button 
            onClick={resetForm}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} />
            RESET FORM
          </button>
        </div>

        <div className="flex items-center gap-3 mt-6">

          <div className="flex-1 flex flex-col gap-2">
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 1
                  ? 'bg-black'
                  : 'bg-gray-200'
              }`}
            />

            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                step >= 1
                  ? 'text-black'
                  : 'text-gray-400'
              }`}
            >
              1. Stay Details
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 2
                  ? 'bg-black'
                  : 'bg-gray-200'
              }`}
            />

            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                step >= 2
                  ? 'text-black'
                  : 'text-gray-400'
              }`}
            >
              2. Guest Identity
            </span>
          </div>

        </div>
      </div>

      {/* =====================================================
          STEP 1
      ===================================================== */}

      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

          {/* GUESTS & DURATION */}

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">

            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users className="text-gray-400" />
              1. Guests & Duration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* OCCUPANTS */}

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">

                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Total Occupants
                </label>

                <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-gray-200 w-fit">

                  <button
                    onClick={() =>
                      setStayInfo((p) => ({
                        ...p,
                        occupants:
                          Math.max(
                            1,
                            p.occupants - 1
                          )
                      }))
                    }
                    className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center font-black text-xl hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>

                  <div className="text-2xl font-black w-12 text-center">
                    {stayInfo.occupants}
                  </div>

                  <button
                    onClick={() =>
                      setStayInfo((p) => ({
                        ...p,
                        occupants:
                          p.occupants + 1
                      }))
                    }
                    className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center font-black text-xl hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>

                </div>
              </div>

              {/* DURATION */}

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">

                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Duration of Stay
                </label>

                <div className="flex gap-3">

                  <div className="flex-1 relative">

                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={
                        stayInfo.durationDays
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          durationDays:
                            e.target.value === ''
                              ? ''
                              : Math.max(
                                  0,
                                  e.target.value
                                )
                        }))
                      }
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-12 py-3 font-black text-xl outline-none focus:border-black transition-colors"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Days
                    </span>

                  </div>

                  <div className="flex-1 relative">

                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={
                        stayInfo.durationHours
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          durationHours:
                            e.target.value === ''
                              ? ''
                              : Math.max(
                                  0,
                                  e.target.value
                                )
                        }))
                      }
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-14 py-3 font-black text-xl outline-none focus:border-black transition-colors"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Hours
                    </span>

                  </div>

                </div>

                <p className="text-[10px] text-gray-400 font-bold mt-2 text-right">
                  Combine both (e.g. 1 Day 2 Hours)
                </p>

              </div>

            </div>
          </div>

          {/* ROOM SELECTION */}

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Bed className="text-gray-400" />
                2. Select Room
              </h2>

              <div className="relative">

                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  placeholder="Search room..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-bold text-sm w-full sm:w-64"
                  value={
                    roomSearchQuery
                  }
                  onChange={(e) => {
                    const val =
                      e.target.value;

                    setRoomSearchQuery(
                      val
                    );

                    if (val.trim()) {
                      const exactMatch =
                        rooms.find(
                          (r) =>
                            r.roomNumber
                              .toLowerCase() ===
                            val
                              .trim()
                              .toLowerCase()
                        );

                      if (
                        exactMatch &&
                        stayInfo.occupants <=
                          exactMatch.capacity
                      ) {
                        setStayInfo(
                          (p) => ({
                            ...p,
                            room:
                              exactMatch._id
                          })
                        );
                      }
                    }
                  }}
                />

              </div>

            </div>

            {loadingRooms ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <SkeletonRoom />
                <SkeletonRoom />
                <SkeletonRoom />
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10 bg-red-50 text-red-600 rounded-2xl font-bold">
                No rooms available currently.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">

                {rooms
                  .filter((r) =>
                    r.roomNumber
                      .toLowerCase()
                      .includes(
                        roomSearchQuery.toLowerCase()
                      )
                  )
                  .map((room) => {
                    const active = stayInfo.room === room._id;
                    const isFull = stayInfo.occupants > room.capacity;
                    const isOccupied = !!room.isOccupied;
                    const isDisabled = isFull || isOccupied;



                    return (
                      <button
                        key={room._id}
                        onClick={() =>
                          !isDisabled &&
                          setStayInfo((prev) => ({
                            ...prev,
                            room: room._id
                          }))
                        }
                        disabled={isDisabled}
                        className={`relative p-4 rounded-2xl border-2 text-center transition-all ${
                          active
                            ? 'border-black bg-black text-white shadow-xl scale-[1.02]'
                            : isOccupied
                            ? 'border-red-100 bg-red-50 opacity-60 cursor-not-allowed'
                            : isFull
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-400 bg-white hover:shadow-md'
                        }`}
                      >

                        {active && (
                          <CheckCircle2
                            className="absolute top-2 right-2 text-white"
                            size={16}
                          />
                        )}

                        <h3
                          className={`font-black text-xl ${
                            active ? 'text-white' : isOccupied ? 'text-red-700' : 'text-gray-900'
                          }`}
                        >
                          {room.roomNumber}
                        </h3>

                        <p
                          className={`text-[10px] font-bold mt-1 ${
                            active ? 'text-gray-300' : isOccupied ? 'text-red-400' : 'text-gray-500'
                          } uppercase tracking-widest`}
                        >
                          Cap. {room.capacity}
                        </p>

                        {isOccupied && (
                          <span className="text-[9px] text-red-600 font-black block mt-1 uppercase">
                            Booked
                          </span>
                        )}

                        {!isOccupied && isFull && (
                          <span className="text-[9px] text-red-500 font-black block mt-1 uppercase">
                            Too small
                          </span>
                        )}

                      </button>
                    );
                  })}

              </div>
            )}

            {selectedRoomDetails?.capacity <
              stayInfo.occupants &&
              stayInfo.room && (
                <p className="text-xs text-red-500 font-bold mt-4 text-center">
                  Warning: Selected room capacity is{' '}
                  {selectedRoomDetails.capacity}.
                </p>
              )}

          </div>

          {/* PAYMENT */}

          <div className="bg-gray-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6">

            <h2 className="text-lg font-black text-gray-300 flex items-center gap-2 mb-6">
              <CreditCard className="text-gray-500" />
              3. Payment & Settlement
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              <div className="space-y-4">

                <div className="flex justify-between items-center pb-4 border-b border-gray-800">

                  <span className="text-gray-400 font-bold">
                    Agreed Total
                  </span>

                  <div className="flex items-center gap-2">

                    <span className="text-gray-500 font-black">
                      ₹
                    </span>

                    <input
                      type="number"
                      value={
                        stayInfo.totalAmount
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          totalAmount:
                            e.target.value
                        }))
                      }
                      className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600"
                    />

                  </div>

                </div>

                <div className="flex justify-between items-center pb-4 border-b border-gray-800">

                  <span className="text-gray-400 font-bold">
                    Advance Paid
                  </span>

                  <div className="flex items-center gap-2">

                    <span className="text-green-500 font-black">
                      ₹
                    </span>

                    <input
                      type="number"
                      value={
                        stayInfo.paidAmount
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          paidAmount:
                            e.target.value
                        }))
                      }
                      className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600 text-green-400"
                    />

                  </div>

                </div>

                <div className="flex justify-between items-center pt-2">

                  <span className="text-gray-400 font-bold">
                    Balance Due
                  </span>

                  <span
                    className={`font-black text-2xl ${
                      stayInfo.totalAmount -
                        stayInfo.paidAmount >
                      0
                        ? 'text-orange-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ₹
                    {Math.max(
                      0,
                      stayInfo.totalAmount -
                        stayInfo.paidAmount
                    )}
                  </span>

                </div>

              </div>

              <div className="space-y-6">

                <div>

                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                    Broker / Commission (Optional)
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">

                    <input
                      type="text"
                      placeholder="Broker Name"
                      value={
                        stayInfo.commissionTo
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          commissionTo:
                            e.target.value
                        }))
                      }
                      className="w-full sm:flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600"
                    />

                    <input
                      type="number"
                      placeholder="₹ Amount"
                      value={
                        stayInfo.commissionAmount
                      }
                      onChange={(e) =>
                        setStayInfo((p) => ({
                          ...p,
                          commissionAmount:
                            e.target.value
                        }))
                      }
                      className="w-full sm:w-32 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600"
                    />

                  </div>

                </div>

                <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl">

                  {[
                    'Cash',
                    'UPI',
                    'Card'
                  ].map((method) => (
                    <button
                      key={method}
                      onClick={() =>
                        setStayInfo((p) => ({
                          ...p,
                          paymentMethod:
                            method
                        }))
                      }
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                        stayInfo.paymentMethod ===
                        method
                          ? 'bg-white text-black shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}

                </div>

              </div>

            </div>

          </div>

          {/* NEXT BUTTON */}

          <div className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8">

            <button
              onClick={() =>
                setStep(2)
              }
              disabled={!isStep1Valid}
              className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]"
            >
              Continue to Guest Details
              <ArrowRight size={18} />
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          STEP 2
      ===================================================== */}

      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

          {/* INFO */}

          <div className="flex items-center gap-3 bg-blue-50 text-blue-800 p-4 rounded-2xl border border-blue-100 mb-6">

            <ShieldCheck
              size={24}
              className="text-blue-600 flex-shrink-0"
            />

            <p className="text-sm font-bold leading-tight">
              Identity details required for{' '}
              {stayInfo.occupants}{' '}
              occupant(s). Verify original ID physically before check-in.
            </p>

          </div>

          {/* GUESTS */}


          {frequentCoGuests.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl mb-6">
              <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Users size={14} /> Quick Add Past Co-Guests
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                 {frequentCoGuests.filter(Boolean).map(cg => (
                  <button key={cg._id} type="button" onClick={() => {
                    const emptyIdx = guests.findIndex((g, i) => i > 0 && !g.fullName);
                    if (emptyIdx !== -1) {
                      setGuests(prev => {
                        const updated = [...prev];
                        updated[emptyIdx] = { ...updated[emptyIdx], ...cg, isSearching: false };
                        return updated;
                      });
                      toast({ message: `${cg.fullName} added!`, type: 'success' });
                    } else if (guests.length < (selectedRoomDetails?.capacity || 99)) {
                      setGuests(prev => [...prev, { ...cg, isSearching: false }]);
                      setStayInfo(p => ({ ...p, occupants: p.occupants + 1 }));
                      toast({ message: `${cg.fullName} added!`, type: 'success' });
                    } else {
                      toast({ message: 'Room capacity reached!', type: 'error' });
                    }
                  }} className="shrink-0 flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {cg.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">{cg.fullName}</p>
                      {cg.mobileNumber && <p className="text-[10px] font-bold text-gray-500">{cg.mobileNumber}</p>}
                    </div>
                    <Plus size={16} className="text-blue-500 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {guests.map(
            (guest, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden focus-within:border-gray-300 transition-colors"
              >

                {/* HEADER */}

                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">

                  <h3 className="font-black text-gray-900 flex items-center gap-3 text-lg">

                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">
                      {index + 1}
                    </div>

                    Guest{' '}

                    {index === 0 && (
                      <span className="bg-black text-white text-[9px] px-2 py-1 rounded uppercase tracking-widest ml-2">
                        Primary
                      </span>
                    )}

                  </h3>

                  {guest._id && (
                    <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">

                      <CheckCircle2 size={12} />

                      Returning

                    </span>
                  )}

                </div>

                {/* FORM */}

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">

                  {guest.isSearching && (
                    <div className="absolute top-6 right-6 text-xs font-bold text-blue-500 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full">

                      <Search
                        size={14}
                        className="animate-spin"
                      />

                      Searching history...

                    </div>
                  )}

                  {/* MOBILE */}

                  <div>

                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      Mobile Number{' '}
                      {index === 0 && (
                        <span className="text-red-500">*</span>
                      )}
                      {index > 0 && (
                        <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                      )}
                    </label>

                    <input
                      type="tel"
                      required={index === 0}
                      placeholder={index === 0 ? "10-digit mobile" : "Mobile (optional)"}
                      value={guest.mobileNumber}
                      onChange={(e) =>
                        handleGuestChange(
                          index,
                          'mobileNumber',
                          e.target.value
                        )
                      }
                      className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-0 outline-none font-black text-lg transition-colors ${
                        guest._id
                          ? 'border-green-300 bg-green-50 text-green-900'
                          : 'border-gray-100 focus:border-black text-gray-900'
                      }`}
                    />

                  </div>

                  {/* NAME */}

                  <div>

                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      Full Name{' '}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      required
                      placeholder="Guest full name"
                      value={
                        guest.fullName
                      }
                      onChange={(e) =>
                        handleGuestChange(
                          index,
                          'fullName',
                          e.target.value
                        )
                      }
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-black text-lg text-gray-900 transition-colors"
                    />

                  </div>

                  {/* ID */}

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Type
                      </label>

                      <select
                        value={
                          guest.idProofType
                        }
                        onChange={(e) =>
                          handleGuestChange(
                            index,
                            'idProofType',
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors"
                      >
                        <option>
                          Aadhaar
                        </option>

                        <option>
                          Passport
                        </option>

                        <option>
                          DL
                        </option>

                        <option>
                          Voter ID
                        </option>

                        <option>
                          Other
                        </option>
                      </select>

                    </div>

                    <div>

                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Number (Opt)
                      </label>

                      <input
                        type="text"
                        placeholder="XXXX-XXXX"
                        value={
                          guest.idProofNumber ||
                          ''
                        }
                        onChange={(e) =>
                          handleGuestChange(
                            index,
                            'idProofNumber',
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 uppercase transition-colors"
                      />

                    </div>

                  </div>

                  {/* IMAGE */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* FRONT SIDE */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Front (Opt)
                      </label>

                      <div className="flex gap-3">
                        <label
                          htmlFor={`cam-front-${index}`}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                        >
                          <Camera size={20} className="group-hover:text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Cam
                          </span>
                          <input
                            id={`cam-front-${index}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) =>
                              handleImageUpload(index, e.target.files[0], 'front')
                            }
                          />
                        </label>

                        <label
                          htmlFor={`gal-front-${index}`}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                        >
                          <ImageIcon size={20} className="group-hover:text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Gal
                          </span>
                          <input
                            id={`gal-front-${index}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) =>
                              handleImageUpload(index, e.target.files[0], 'front')
                            }
                          />
                        </label>
                      </div>

                      {uploadingImage && !guest.idProofImage && (
                        <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 p-2 rounded-xl flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </div>
                      )}

                      {!uploadingImage && guest.idProofImage && (
                        <a
                          href={guest.idProofImage}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-center text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 p-2 rounded-xl border border-green-200 hover:bg-green-100"
                        >
                          ✓ View Front
                        </a>
                      )}
                    </div>

                    {/* BACK SIDE */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Back (Opt)
                      </label>

                      <div className="flex gap-3">
                        <label
                          htmlFor={`cam-back-${index}`}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                        >
                          <Camera size={20} className="group-hover:text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Cam
                          </span>
                          <input
                            id={`cam-back-${index}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) =>
                              handleImageUpload(index, e.target.files[0], 'back')
                            }
                          />
                        </label>

                        <label
                          htmlFor={`gal-back-${index}`}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                        >
                          <ImageIcon size={20} className="group-hover:text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Gal
                          </span>
                          <input
                            id={`gal-back-${index}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) =>
                              handleImageUpload(index, e.target.files[0], 'back')
                            }
                          />
                        </label>
                      </div>

                      {uploadingImage && !guest.idProofImageBack && (
                        <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 p-2 rounded-xl flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </div>
                      )}

                      {!uploadingImage && guest.idProofImageBack && (
                        <a
                          href={guest.idProofImageBack}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-center text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 p-2 rounded-xl border border-green-200 hover:bg-green-100"
                        >
                          ✓ View Back
                        </a>
                      )}
                    </div>
                  </div>


                </div>
              </div>
            )
          )}

          {/* BOTTOM BUTTONS */}

          <div className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 sm:mt-8">

            <button
              onClick={() =>
                setStep(1)
              }
              className="w-16 sm:w-auto flex items-center justify-center sm:px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
            >
              <ArrowLeft
                size={18}
                className="sm:hidden"
              />

              <span className="hidden sm:block uppercase tracking-widest text-sm">
                Back
              </span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={
                !isStep2Valid ||
                loading ||
                uploadingImage
              }
              className="flex-1 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]"
            >
              {loading
                ? 'Finalizing...'
                : 'Complete Check-In'}

              <CheckCircle2 size={18} />
            </button>

          </div>

        </div>
      )}

    </div>
  );
};

export default CheckIn;
