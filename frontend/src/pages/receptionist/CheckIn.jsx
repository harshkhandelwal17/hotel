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
  Image as ImageIcon,
  X,
  Clipboard,
  MessageSquare,
  QrCode,
  Phone,
  Check
} from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { compressImage } from '../../utils/imageCompression';
import { extractAddressFromBackId } from '../../utils/idOcr';

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
  const [scanningOcr, setScanningOcr] = useState({ index: null, side: null });
  const guestsRef = useRef([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [frequentCoGuests, setFrequentCoGuests] = useState([]);

  // WhatsApp Sync State
  const [waSyncEnabled, setWaSyncEnabled] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waPhone, setWaPhone] = useState('');
  const [waQr, setWaQr] = useState(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waRecentMedia, setWaRecentMedia] = useState([]);
  const [loadingWa, setLoadingWa] = useState(false);

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
        gender: '',
        dateOfBirth: '',
        address: '',
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

  // Check WhatsApp status for current hostel
  useEffect(() => {
    if (!hostelId) return;

    let isMounted = true;
    const checkWaStatus = async () => {
      try {
        const res = await axios.get(`${API}/api/whatsapp/status?hostelId=${hostelId}`);
        if (isMounted && res.data?.success) {
          setWaSyncEnabled(!!res.data.data.whatsappSyncEnabled);
          setWaStatus(res.data.data.status);
          setWaPhone(res.data.data.phone || '');
          if (res.data.data.qr) setWaQr(res.data.data.qr);
        }
      } catch (_) {}
    };

    checkWaStatus();
    let pollTimer;
    if (waModalOpen || waStatus === 'connecting') {
      pollTimer = setInterval(checkWaStatus, 3000);
    }
    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [hostelId, waModalOpen, waStatus]);

  // Poll incoming WhatsApp photos when on Step 2
  useEffect(() => {
    if (!hostelId || !waSyncEnabled || step !== 2) return;

    let isMounted = true;
    const fetchWaMedia = async () => {
      try {
        const res = await axios.get(`${API}/api/whatsapp/recent-media?hostelId=${hostelId}`);
        if (isMounted && res.data?.success) {
          setWaRecentMedia(res.data.data || []);
        }
      } catch (_) {}
    };

    fetchWaMedia();
    const interval = setInterval(fetchWaMedia, 7000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hostelId, waSyncEnabled, step]);

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
          idProofImageBack: '',
          gender: '',
          dateOfBirth: '',
          address: '',
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

      const uploadedUrl = res.data.url;

      setGuests(prev => {
        const updated = [...prev];
        if (side === 'back') {
          updated[index] = { ...updated[index], idProofImageBack: uploadedUrl };
        } else {
          updated[index] = { ...updated[index], idProofImage: uploadedUrl };
        }
        return updated;
      });

      toast({
        message: 'Image uploaded successfully!',
        type: 'success'
      });

      // =========================================================
      // AI VISION OCR SCANNING (Gemini 1.5 Flash Vision)
      // =========================================================
      setScanningOcr({ index, side });
      try {
        const currentGuest = guestsRef.current[index] || {};
        const ocrRes = await axios.post(`${API}/api/ocr/scan-id`, {
          imageUrl: uploadedUrl,
          side,
          hostelId,
          idProofType: currentGuest.idProofType || 'Aadhaar'
        });

        if (ocrRes.data && ocrRes.data.success && ocrRes.data.data) {
          const aiData = ocrRes.data.data;

          if (side === 'front') {
            setGuests(prev => {
              const updated = [...prev];
              const g = { ...updated[index] };
              if (aiData.fullName) g.fullName = aiData.fullName;
              if (aiData.idProofNumber) g.idProofNumber = aiData.idProofNumber;
              if (aiData.gender) {
                const genLower = aiData.gender.toLowerCase();
                if (genLower.includes('fe') || genLower.includes('महिला')) g.gender = 'Female';
                else if (genLower.includes('ma') || genLower.includes('पुरुष')) g.gender = 'Male';
                else g.gender = 'Other';
              }
              if (aiData.dateOfBirth) g.dateOfBirth = aiData.dateOfBirth;
              updated[index] = g;
              return updated;
            });

            const found = [];
            if (aiData.fullName) found.push(aiData.fullName);
            if (aiData.idProofNumber) found.push(aiData.idProofNumber);

            toast({
              message: found.length > 0 
                ? `✨ AI Auto-Filled: ${found.join(' | ')}`
                : '✨ Front ID scanned successfully!',
              type: 'success'
            });
          } else if (side === 'back') {
            if (aiData.address) {
              setGuests(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], address: aiData.address };
                return updated;
              });

              toast({
                message: '✨ AI Auto-Filled Address from Back ID!',
                type: 'success'
              });
            }
          }
        }
      } catch (ocrErr) {
        const isAiDisabled = ocrErr?.response?.data?.code === 'AI_OCR_DISABLED';
        if (isAiDisabled) {
          console.log('AI OCR is not enabled for this property by Super Admin.');
        } else {
          console.warn('AI OCR scan notice:', ocrErr?.response?.data?.message || ocrErr.message);
        }

        // Graceful Fallback for Back ID if AI is disabled or encounters issue
        if (side === 'back') {
          extractAddressFromBackId(uploadedUrl).then((address) => {
            if (address) {
              setGuests(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], address: address };
                return updated;
              });
              toast({
                message: 'Address extracted from ID. Please verify.',
                type: 'success'
              });
            }
          });
        }
      } finally {
        setScanningOcr({ index: null, side: null });
      }

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
  // CLIPBOARD PASTE HANDLER
  // =========================================================

  const handlePasteImage = async (index, side = 'front') => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        toast({ message: 'Clipboard access not supported. Use Ctrl+V or upload.', type: 'error' });
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob = null;
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            imageBlob = await item.getType(type);
            break;
          }
        }
        if (imageBlob) break;
      }

      if (!imageBlob) {
        toast({ message: 'No image in clipboard! Copy image on WhatsApp first.', type: 'error' });
        return;
      }

      const file = new File([imageBlob], `pasted-${Date.now()}.jpg`, { type: imageBlob.type || 'image/jpeg' });
      await handleImageUpload(index, file, side);
    } catch (err) {
      console.error('Clipboard paste failed:', err);
      toast({ message: 'Could not access clipboard. Please allow clipboard permissions.', type: 'error' });
    }
  };

  // Global Ctrl+V listener on Step 2 to paste image into ID
  useEffect(() => {
    if (step !== 2) return;

    const handleWindowPaste = async (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const primary = guestsRef.current[0] || {};
            let targetSide = 'front';
            if (primary.idProofImage && !primary.idProofImageBack) {
              targetSide = 'back';
            }
            toast({ message: `Pasting image from clipboard into ${targetSide.toUpperCase()} ID...`, type: 'info' });
            await handleImageUpload(0, file, targetSide);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [step]);

  // =========================================================
  // WHATSAPP PHOTO ATTACHMENT & CONNECTION
  // =========================================================

  const handleApplyWhatsAppPhoto = async (index, imageUrl, side, mediaId) => {
    try {
      setGuests(prev => {
        const updated = [...prev];
        if (side === 'back') {
          updated[index] = { ...updated[index], idProofImageBack: imageUrl };
        } else {
          updated[index] = { ...updated[index], idProofImage: imageUrl };
        }
        return updated;
      });

      if (mediaId) {
        axios.put(`${API}/api/whatsapp/mark-used/${mediaId}`).catch(() => {});
        setWaRecentMedia(prev => prev.map(m => m._id === mediaId ? { ...m, status: 'used' } : m));
      }

      toast({ message: `Image attached from WhatsApp to ${side === 'front' ? 'Front ID' : 'Back ID'}!`, type: 'success' });

      // Run AI OCR scan
      setScanningOcr({ index, side });
      try {
        const currentGuest = guestsRef.current[index] || {};
        const ocrRes = await axios.post(`${API}/api/ocr/scan-id`, {
          imageUrl,
          side,
          hostelId,
          idProofType: currentGuest.idProofType || 'Aadhaar'
        });

        if (ocrRes.data && ocrRes.data.success && ocrRes.data.data) {
          const aiData = ocrRes.data.data;
          if (side === 'front') {
            setGuests(prev => {
              const updated = [...prev];
              const g = { ...updated[index] };
              if (aiData.fullName) g.fullName = aiData.fullName;
              if (aiData.idProofNumber) g.idProofNumber = aiData.idProofNumber;
              if (aiData.gender) {
                const genLower = aiData.gender.toLowerCase();
                if (genLower.includes('fe') || genLower.includes('महिला')) g.gender = 'Female';
                else if (genLower.includes('ma') || genLower.includes('पुरुष')) g.gender = 'Male';
                else g.gender = 'Other';
              }
              if (aiData.dateOfBirth) g.dateOfBirth = aiData.dateOfBirth;
              updated[index] = g;
              return updated;
            });
            toast({ message: '✨ AI Auto-Filled Details from WhatsApp Image!', type: 'success' });
          } else if (side === 'back') {
            if (aiData.address) {
              setGuests(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], address: aiData.address };
                return updated;
              });
              toast({ message: '✨ AI Auto-Filled Address from WhatsApp Image!', type: 'success' });
            }
          }
        }
      } catch (ocrErr) {
        if (side === 'back') {
          extractAddressFromBackId(imageUrl).then((address) => {
            if (address) {
              setGuests(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], address };
                return updated;
              });
            }
          });
        }
      } finally {
        setScanningOcr({ index: null, side: null });
      }
    } catch (err) {
      console.error('Failed to attach WhatsApp image:', err);
    }
  };

  const handleStartWhatsApp = async () => {
    setLoadingWa(true);
    try {
      const res = await axios.post(`${API}/api/whatsapp/connect`, { hostelId });
      if (res.data?.success) {
        setWaStatus(res.data.data.status);
        if (res.data.data.qr) setWaQr(res.data.data.qr);
        toast({ message: 'WhatsApp QR generated! Scan with your phone.', type: 'info' });
      }
    } catch (err) {
      toast({ message: err.response?.data?.message || 'Failed to start WhatsApp', type: 'error' });
    } finally {
      setLoadingWa(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;
    setLoadingWa(true);
    try {
      await axios.post(`${API}/api/whatsapp/disconnect`, { hostelId });
      setWaStatus('disconnected');
      setWaPhone('');
      setWaQr(null);
      toast({ message: 'WhatsApp disconnected', type: 'info' });
    } catch (err) {
      toast({ message: 'Failed to disconnect WhatsApp', type: 'error' });
    } finally {
      setLoadingWa(false);
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
      gender: '',
      dateOfBirth: '',
      address: '',
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

                <div className="flex justify-between items-center mt-3">
                  <p className="text-[10px] text-gray-400 font-bold">
                    Combine both (e.g. 1 Day 2 Hours)
                  </p>
                  <p className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    Out: {
                      (() => {
                        const expectedOutPreview = new Date();
                        expectedOutPreview.setDate(expectedOutPreview.getDate() + (Number(stayInfo.durationDays) || 0));
                        expectedOutPreview.setHours(expectedOutPreview.getHours() + (Number(stayInfo.durationHours) || 0));
                        return expectedOutPreview.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                      })()
                    }
                  </p>
                </div>

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
                      className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-all ${
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

          {/* INFO & WHATSAPP SYNC BAR */}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50 text-blue-800 p-4 rounded-2xl border border-blue-100 mb-6">

            <div className="flex items-center gap-3">
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

            {waSyncEnabled && (
              <button
                type="button"
                onClick={() => setWaModalOpen(true)}
                className={`self-start sm:self-auto px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm shrink-0 active:scale-95 ${
                  waStatus === 'connected'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                }`}
              >
                <MessageSquare size={14} />
                <span>
                  {waStatus === 'connected' ? `WhatsApp Active (${waPhone || 'Linked'})` : 'Connect WhatsApp'}
                </span>
              </button>
            )}

          </div>

          {/* RECENT WHATSAPP PHOTOS PANEL */}
          {waSyncEnabled && waRecentMedia.length > 0 && (
            <div className="bg-emerald-50/80 border-2 border-emerald-200 p-4 sm:p-5 rounded-3xl mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-600" />
                  Live WhatsApp Incoming IDs ({waRecentMedia.length})
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  Instant Auto-Fill
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {waRecentMedia.map((media) => (
                  <div key={media._id} className="shrink-0 w-44 bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="relative h-28 rounded-xl overflow-hidden bg-gray-100 mb-2 border border-gray-200">
                        <img src={media.imageUrl} alt="WhatsApp ID" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-900 truncate">
                        {media.senderName ? `${media.senderName}` : `+${media.senderPhone}`}
                      </p>
                      <p className="text-[9px] text-gray-400 font-semibold mb-2">
                        +{media.senderPhone} • {new Date(media.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppPhoto(0, media.imageUrl, 'front', media._id)}
                        className="py-1.5 px-2 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-all uppercase tracking-wider text-center active:scale-95 shadow-sm"
                      >
                        Front ID
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppPhoto(0, media.imageUrl, 'back', media._id)}
                        className="py-1.5 px-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition-all uppercase tracking-wider text-center active:scale-95 shadow-sm"
                      >
                        Back ID
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>
                        Full Name{' '}
                        <span className="text-red-500">*</span>
                      </span>
                      {guest.fullName && guest.idProofImage && (
                        <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                          <Sparkles size={10} /> AI Auto
                        </span>
                      )}
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

                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>ID Number (Opt)</span>
                        {guest.idProofNumber && guest.idProofImage && (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> AI Auto
                          </span>
                        )}
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

                  {/* GENDER & DOB */}

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Gender (Opt)</span>
                        {guest.gender && (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> AI Auto
                          </span>
                        )}
                      </label>

                      <select
                        value={guest.gender || ''}
                        onChange={(e) =>
                          handleGuestChange(
                            index,
                            'gender',
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>

                    </div>

                    <div>

                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>DOB / Year (Opt)</span>
                        {guest.dateOfBirth && (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> AI Auto
                          </span>
                        )}
                      </label>

                      <input
                        type="text"
                        placeholder="DD/MM/YYYY or YYYY"
                        value={guest.dateOfBirth || ''}
                        onChange={(e) =>
                          handleGuestChange(
                            index,
                            'dateOfBirth',
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors"
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

                      {!guest.idProofImage ? (
                        <>
                          <div 
                            className="flex gap-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files[0];
                              if (f) handleImageUpload(index, f, 'front');
                            }}
                          >
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

                            <button
                              type="button"
                              onClick={() => handlePasteImage(index, 'front')}
                              title="Paste image copied from WhatsApp (Ctrl+V)"
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                            >
                              <Clipboard size={20} className="group-hover:text-white" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Paste
                              </span>
                            </button>
                          </div>

                          {uploadingImage && !guest.idProofImage && (
                            <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 p-2 rounded-xl flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </div>
                          )}
                          {scanningOcr.index === index && scanningOcr.side === 'front' && (
                            <div className="mt-2 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                              <Sparkles size={12} className="animate-spin text-purple-600" />
                              AI Vision scanning details...
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <div className="relative mt-2 rounded-xl overflow-hidden border-2 border-green-500 shadow-sm group h-[88px]">
                            <img src={guest.idProofImage} alt="ID Front" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={guest.idProofImage} target="_blank" rel="noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black transition-colors">
                                View Full
                              </a>
                            </div>
                            <button 
                              onClick={() => {
                                const newGuests = [...guests];
                                newGuests[index].idProofImage = '';
                                setGuests(newGuests);
                              }} 
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {scanningOcr.index === index && scanningOcr.side === 'front' && (
                            <div className="mt-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 p-1.5 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                              <Sparkles size={12} className="animate-spin text-purple-600" />
                              AI Vision scanning...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BACK SIDE */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Back (Opt)
                      </label>

                      {!guest.idProofImageBack ? (
                        <>
                          <div 
                            className="flex gap-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files[0];
                              if (f) handleImageUpload(index, f, 'back');
                            }}
                          >
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

                            <button
                              type="button"
                              onClick={() => handlePasteImage(index, 'back')}
                              title="Paste image copied from WhatsApp (Ctrl+V)"
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500"
                            >
                              <Clipboard size={20} className="group-hover:text-white" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Paste
                              </span>
                            </button>
                          </div>

                          {uploadingImage && !guest.idProofImageBack && (
                            <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 p-2 rounded-xl flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </div>
                          )}
                          {scanningOcr.index === index && scanningOcr.side === 'back' && (
                            <div className="mt-2 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                              <Sparkles size={12} className="animate-spin text-purple-600" />
                              AI Vision extracting address...
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <div className="relative mt-2 rounded-xl overflow-hidden border-2 border-green-500 shadow-sm group h-[88px]">
                            <img src={guest.idProofImageBack} alt="ID Back" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={guest.idProofImageBack} target="_blank" rel="noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black transition-colors">
                                View Full
                              </a>
                            </div>
                            <button 
                              onClick={() => {
                                const newGuests = [...guests];
                                newGuests[index].idProofImageBack = '';
                                setGuests(newGuests);
                              }} 
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {scanningOcr.index === index && scanningOcr.side === 'back' && (
                            <div className="mt-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 p-1.5 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                              <Sparkles size={12} className="animate-spin text-purple-600" />
                              AI Vision extracting address...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>Address (Opt)</span>
                      {guest.address && guest.idProofImageBack && (
                        <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                          <Sparkles size={10} /> AI Auto-Filled
                        </span>
                      )}
                    </label>
                    <textarea
                      placeholder="Enter guest address"
                      value={guest.address || ''}
                      onChange={(e) =>
                        handleGuestChange(index, 'address', e.target.value)
                      }
                      rows="2"
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-black text-sm text-gray-900 transition-colors resize-none"
                    ></textarea>
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

      {/* =====================================================
          WHATSAPP QR CONNECTION MODAL
      ===================================================== */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setWaModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  WhatsApp Live Sync
                </h3>
                <p className="text-xs text-gray-500 font-bold">
                  {waStatus === 'connected' ? 'Active & Receiving Photos' : 'Instant Photo Sync from Guest WhatsApp'}
                </p>
              </div>
            </div>

            {/* STATUS BODY */}
            {waStatus === 'connected' ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <Check size={36} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">WhatsApp Is Linked!</h4>
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    Connected Number: <span className="text-emerald-700 font-black">+{waPhone || 'Active Device'}</span>
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left">
                  <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                    🎉 <strong className="font-black">How it works:</strong> Whenever a guest sends their Aadhaar or ID photo to this WhatsApp number, it will automatically show up on your Check-In screen under <em>"Live WhatsApp Incoming IDs"</em>. Click 1 button to fill!
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setWaModalOpen(false)}
                    className="flex-1 py-3.5 bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
                  >
                    Done
                  </button>
                  <button
                    onClick={handleDisconnectWhatsApp}
                    disabled={loadingWa}
                    className="px-4 py-3.5 bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all border border-red-200 active:scale-95 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* INSTRUCTIONS */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs font-bold text-gray-700">
                  <p className="font-black text-gray-900 uppercase text-[11px] tracking-wider mb-1">
                    3 Easy Steps to Link:
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                    <span>Open <strong>WhatsApp</strong> on reception phone</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                    <span>Tap <strong>Settings / 3 Dots</strong> ➜ <strong>Linked Devices</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <span>Tap <strong>Link a Device</strong> & point phone camera at this QR code</span>
                  </div>
                </div>

                {/* QR CODE DISPLAY */}
                <div className="text-center py-2">
                  {waQr ? (
                    <div className="space-y-3">
                      <div className="inline-block p-3 bg-white border-2 border-emerald-500 rounded-2xl shadow-xl">
                        <img
                          src={waQr}
                          alt="WhatsApp QR Code"
                          className="w-56 h-56 mx-auto object-contain"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 font-bold flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Waiting for phone scan... Auto-connects instantly!
                      </p>
                      <button
                        onClick={handleStartWhatsApp}
                        disabled={loadingWa}
                        className="text-xs font-black text-emerald-700 hover:text-emerald-900 underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <RefreshCw size={12} className={loadingWa ? 'animate-spin' : ''} />
                        Refresh QR Code
                      </button>
                    </div>
                  ) : loadingWa ? (
                    <div className="h-56 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-3">
                      <RefreshCw size={32} className="animate-spin text-emerald-600" />
                      <p className="text-xs font-black text-gray-700">Starting WhatsApp Connection...</p>
                      <p className="text-[10px] text-gray-400 font-bold">Generating unique multi-device QR code</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <button
                        onClick={handleStartWhatsApp}
                        className="py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mx-auto active:scale-95"
                      >
                        <QrCode size={18} />
                        Generate WhatsApp QR
                      </button>
                    </div>
                  )}
                </div>

                {/* PRO TIP / ALTERNATIVE */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-purple-900 leading-tight">
                    <strong>2-Second Shortcut:</strong> On WhatsApp Web, right-click photo ➜ <em>"Copy Image"</em> ➜ press <kbd className="bg-purple-200 px-1 py-0.5 rounded text-[10px] font-black">Ctrl + V</kbd> or click <strong>[ 📋 Paste ]</strong> on Check-In screen without linking phone!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CheckIn;
