import React, { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
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
  Check,
  Copy,
  FileText,
  RotateCcw,
  Printer,
  Trash2,
  CalendarClock,
  AlertTriangle,
  Percent,
  Car
} from 'lucide-react';

import { format, isPast } from 'date-fns';
import { useToast } from '../../components/ui/Toast';
import { compressImage } from '../../utils/imageCompression';
import { scanAadhaarQrFromImage, validateAadhaarNumber } from '../../utils/aadhaarQrHelper';
import { apiCache } from '../../utils/apiCache';
import GuestRegistrationCardModal from '../../components/reception/GuestRegistrationCardModal';
import BrokersDirectoryModal from '../../components/common/BrokersDirectoryModal';
import { getFullImageUrl } from '../../utils/imageUrl';
import DynamicUpiQr from '../../components/DynamicUpiQr';
import PaymentMethodSelector, { validateSplitPayment, buildSplitPayments } from '../../components/common/PaymentMethodSelector';
import { useLanguage } from '../../context/LanguageContext';

const API =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const SkeletonRoom = () => (
  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 animate-pulse">
    <div className="h-4 w-1/3 bg-gray-200 rounded mb-4" />
    <div className="h-6 w-1/4 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-1/2 bg-gray-200 rounded" />
  </div>
  
);

const toDateTimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CheckIn = () => {
  const { t, isHindi } = useLanguage();
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
  const [scanningQr, setScanningQr] = useState({ index: null, side: null });
  const [aiOcrEnabled, setAiOcrEnabled] = useState(false);
  const guestsRef = useRef([]);
  // Keep ORIGINAL full-resolution ID photos so QR re-scan never works on a compressed copy
  const originalIdFilesRef = useRef({});
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('All');
  const [frequentCoGuests, setFrequentCoGuests] = useState([]);

  // WhatsApp Sync State
  const [waSyncEnabled, setWaSyncEnabled] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waPhone, setWaPhone] = useState('');
  const [waQr, setWaQr] = useState(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waRecentMedia, setWaRecentMedia] = useState([]);
  const [loadingWa, setLoadingWa] = useState(false);
  const [waPickerOpen, setWaPickerOpen] = useState(false);
  const [waPickerTarget, setWaPickerTarget] = useState({ index: 0, side: 'front' });
  const [waSearchTerm, setWaSearchTerm] = useState('');
  const [waPreviewImage, setWaPreviewImage] = useState(null);
  const [syncingWaMedia, setSyncingWaMedia] = useState(false);
  const [waFilterTab, setWaFilterTab] = useState('all');
  const [waPairing, setWaPairing] = useState(false);
  const [waConnectTab, setWaConnectTab] = useState('code'); // 'code' (phone pairing) or 'qr' (QR scan)
  const [waPairingPhone, setWaPairingPhone] = useState('');
  const [waPairingCode, setWaPairingCode] = useState('');
  const [loadingPairingCode, setLoadingPairingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [grcModalOpen, setGrcModalOpen] = useState(false);
  const [createdStayData, setCreatedStayData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);

  // Broker & Referral Directory State
  const [showBrokersModal, setShowBrokersModal] = useState(false);
  const [knownBrokers, setKnownBrokers] = useState([]);
  const [showBrokerSuggestions, setShowBrokerSuggestions] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [prefilledProfile, setPrefilledProfile] = useState(null);

  const { user } = useContext(AuthContext) || {};
  const { globalProperty, isCurrentPropertyExpired, activeHostel } =
    useOutletContext() || { globalProperty: 'all' };

  // Fetch known brokers list for auto-complete scoped strictly to current property
  useEffect(() => {
    const targetHostel = (globalProperty && globalProperty !== 'all')
      ? globalProperty
      : (activeHostel?._id || (typeof user?.assignedHostel === 'object' ? user.assignedHostel?._id : user?.assignedHostel) || '');
    const propQuery = targetHostel ? `?hostel=${targetHostel}` : '';
    axios.get(`${API}/api/stays/brokers/summary${propQuery}`)
      .then(res => {
        if (res.data?.data?.brokers) {
          setKnownBrokers(res.data.data.brokers);
        }
      })
      .catch(() => {});
  }, [globalProperty, activeHostel, user]);

  // =========================================================
  // STAY INFO
  // =========================================================

  const [stayInfo, setStayInfo] = useState(() => {
    const defaultStay = {
      room: '',
      durationDays: 1,
      durationHours: 0,
      isMorningCheckout: false,
      occupants: 1,
      totalAmount: '',
      basePrice: '',
      gstType: 'none',
      gstRate: 12,
      paidAmount: '',
      paymentMethod: 'Cash',
      splitBreakdown: { cash: '', upi: '', card: '' },
      commissionTo: '',
      commissionPhone: '',
      commissionAmount: '',
      isBackdated: false,
      checkInDate: '',
      isAlreadyCheckedOut: false,
      actualCheckOutDate: ''
    };
    const saved = loadState('checkin_stayInfo', defaultStay);
    if (saved) {
      const days = Number(saved.durationDays) || 0;
      const hours = Number(saved.durationHours) || 0;
      const finalDays = (days === 0 && hours === 0) ? 1 : days;
      return { 
        ...saved, 
        durationDays: finalDays,
        durationHours: hours,
        isMorningCheckout: saved.isMorningCheckout || false,
        paidAmount: saved.paidAmount === 0 || saved.paidAmount === '0' ? '' : saved.paidAmount,
        splitBreakdown: saved.splitBreakdown || { cash: '', upi: '', card: '' },
        isBackdated: saved.isBackdated || false,
        checkInDate: saved.checkInDate || '',
        isAlreadyCheckedOut: saved.isAlreadyCheckedOut || false,
        actualCheckOutDate: saved.actualCheckOutDate || ''
      };
    }
    return defaultStay;
  });

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
  // GUEST PREFILL (FROM GUEST PROFILE OR DIRECT LINK)
  // =========================================================

  useEffect(() => {
    let prefill = location.state?.prefillGuest;
    if (!prefill) {
      try {
        const stored = sessionStorage.getItem('checkin_prefill_guest');
        if (stored) prefill = JSON.parse(stored);
      } catch (e) {
        prefill = null;
      }
    }

    if (prefill && prefill.fullName) {
      setPrefilledProfile(prefill);
      setGuests(prev => {
        const primary = {
          fullName: prefill.fullName || '',
          mobileNumber: prefill.mobileNumber || '',
          idProofType: prefill.idProofType || 'Aadhaar',
          idProofNumber: prefill.idProofNumber || '',
          idProofImage: prefill.idProofImage || '',
          idProofImageBack: prefill.idProofImageBack || '',
          gender: prefill.gender || '',
          dateOfBirth: prefill.dateOfBirth || '',
          address: prefill.address || '',
          _id: prefill._id || null,
          isSearching: false
        };
        const updated = [...prev];
        updated[0] = { ...updated[0], ...primary };
        return updated;
      });

      if (Array.isArray(prefill.frequentCompanions) && prefill.frequentCompanions.length > 0) {
        setFrequentCoGuests(prefill.frequentCompanions);
      }
      setStep(1);
    }
  }, [location.state]);

  const handleClearPrefill = () => {
    sessionStorage.removeItem('checkin_prefill_guest');
    setPrefilledProfile(null);
    setFrequentCoGuests([]);
    setGuests([
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
    ]);
    toast({ message: 'Prefilled guest cleared', type: 'info' });
  };

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
    const fetchRooms = async (forceSpinner = false) => {
      const cacheKey = `rooms_${globalProperty}`;
      const cached = apiCache.get(cacheKey);
      if (cached && !forceSpinner) {
        setRooms(cached.filter((room) => room.status === 'Active'));
        setLoadingRooms(false); // Instant render in 0ms!
      } else if (!cached) {
        setLoadingRooms(true);
      }

      try {
        const propQuery =
          globalProperty !== 'all'
            ? `?hostel=${globalProperty}`
            : '';

        const res = await axios.get(
          `${API}/api/rooms${propQuery}`
        );

        const allRooms = res.data.data || [];
        apiCache.set(cacheKey, allRooms);
        setRooms(
          allRooms.filter(
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
    const handleInvalidation = (e) => {
      const prefix = e?.detail?.prefix || '';
      if (!prefix || prefix.includes('rooms')) {
        fetchRooms(false);
      }
    };
    window.addEventListener('hotelDataInvalidated', handleInvalidation);
    return () => window.removeEventListener('hotelDataInvalidated', handleInvalidation);
  }, [globalProperty, toast]);

  // =========================================================
  // SELECTED ROOM
  // =========================================================

  const selectedRoomDetails = rooms.find(
    (room) => room._id === stayInfo.room
  );

  const currentHostel = activeHostel || (typeof selectedRoomDetails?.hostel === 'object' ? selectedRoomDetails.hostel : null);

  const availableFloors = useMemo(() => {
    const floorMap = {};
    const allowOccupied = Boolean(stayInfo.isBackdated && stayInfo.isAlreadyCheckedOut);
    rooms.filter(r => allowOccupied || !r.isOccupied).forEach(r => {
      const fl = (r.floor || '1').toString().trim();
      floorMap[fl] = (floorMap[fl] || 0) + 1;
    });
    return Object.entries(floorMap).map(([floor, count]) => ({ floor, count }));
  }, [rooms, stayInfo.isBackdated, stayInfo.isAlreadyCheckedOut]);

  const filteredRooms = useMemo(() => {
    const allowOccupied = Boolean(stayInfo.isBackdated && stayInfo.isAlreadyCheckedOut);
    return rooms
      .filter((r) => allowOccupied || !r.isOccupied)
      .filter((r) => {
        if (selectedFloorFilter !== 'All') {
          const fl = (r.floor || '1').toString().trim();
          if (fl !== selectedFloorFilter) return false;
        }
        if (roomSearchQuery.trim()) {
          return r.roomNumber.toLowerCase().includes(roomSearchQuery.trim().toLowerCase());
        }
        return true;
      });
  }, [rooms, selectedFloorFilter, roomSearchQuery, stayInfo.isBackdated, stayInfo.isAlreadyCheckedOut]);

  const expectedOutPreviewFormatted = useMemo(() => {
    const baseCheckIn = (stayInfo.isBackdated && stayInfo.checkInDate)
      ? new Date(stayInfo.checkInDate)
      : new Date();
    const expectedOutPreview = new Date(baseCheckIn.getTime());

    if (stayInfo.isMorningCheckout) {
      const days = Math.max(1, Number(stayInfo.durationDays) || 1);
      if (baseCheckIn.getHours() < 6) {
        expectedOutPreview.setHours(10, 0, 0, 0);
      } else {
        expectedOutPreview.setDate(baseCheckIn.getDate() + days);
        expectedOutPreview.setHours(10, 0, 0, 0);
      }
      return format(expectedOutPreview, 'dd MMM, hh:mm a');
    }

    const days = Number(stayInfo.durationDays) || 0;
    const hours = Number(stayInfo.durationHours) || 0;
    const effDays = (days === 0 && hours === 0) ? 1 : days;

    expectedOutPreview.setDate(expectedOutPreview.getDate() + effDays);
    expectedOutPreview.setHours(expectedOutPreview.getHours() + hours);
    return format(expectedOutPreview, 'dd MMM, hh:mm a');
  }, [stayInfo.isMorningCheckout, stayInfo.durationDays, stayInfo.durationHours, stayInfo.isBackdated, stayInfo.checkInDate]);

  // =========================================================
  // IMPORTANT:
  // FIND CURRENT HOSTEL ID
  // =========================================================

  const rawHostel =
    globalProperty !== 'all' && globalProperty
      ? globalProperty
      : selectedRoomDetails?.hostel || user?.assignedHostel || (rooms.length > 0 ? rooms[0]?.hostel : '');

  const hostelId =
    typeof rawHostel === 'object' && rawHostel !== null
      ? (rawHostel._id ? rawHostel._id.toString() : '')
      : (typeof rawHostel === 'string' && rawHostel !== 'all' && rawHostel !== '[object Object]'
          ? rawHostel
          : '');

  // Check WhatsApp status for current hostel
  useEffect(() => {
    if (!hostelId) return;

    let isMounted = true;
    const checkWaStatus = async () => {
      try {
        const res = await axios.get(`${API}/api/whatsapp/status?hostelId=${encodeURIComponent(hostelId)}&_t=${Date.now()}`);
        if (isMounted && res.data?.success) {
          setWaSyncEnabled(!!res.data.data.whatsappSyncEnabled);
          if (res.data.data.aiOcrEnabled !== undefined) {
            setAiOcrEnabled(!!res.data.data.aiOcrEnabled);
          }
          if (res.data.data.hostelName) {
            setPropertyData({
              name: res.data.data.hostelName,
              address: res.data.data.hostelAddress,
              contactNumber: res.data.data.hostelContact,
              email: res.data.data.hostelEmail
            });
          }
          setWaStatus(res.data.data.status);
          setWaPhone(res.data.data.phone || '');
          setWaPairing(!!res.data.data.pairing);
          if (res.data.data.status === 'connected' || res.data.data.pairing) {
            setWaQr(null);
          } else if (res.data.data.qr) {
            setWaQr(res.data.data.qr);
          }
        }
      } catch (_) {}
    };

    checkWaStatus();
    let pollTimer;
    if (waModalOpen || waStatus === 'connecting' || waPairing) {
      pollTimer = setInterval(checkWaStatus, 1200);
    }
    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [hostelId, waModalOpen, waStatus, waPairing]);

  // Sync property feature flags from selected room details
  useEffect(() => {
    if (selectedRoomDetails?.hostel && typeof selectedRoomDetails.hostel === 'object') {
      if (selectedRoomDetails.hostel.aiOcrEnabled !== undefined) {
        setAiOcrEnabled(!!selectedRoomDetails.hostel.aiOcrEnabled);
      }
      if (selectedRoomDetails.hostel.whatsappSyncEnabled !== undefined) {
        setWaSyncEnabled(!!selectedRoomDetails.hostel.whatsappSyncEnabled);
      }
    }
  }, [selectedRoomDetails]);

  // Automatically sync GST mode from Hotel's saved Property Settings by default
  useEffect(() => {
    const currentHostel = activeHostel || (typeof selectedRoomDetails?.hostel === 'object' ? selectedRoomDetails.hostel : null);
    if (currentHostel) {
      setStayInfo(prev => {
        // If receptionist hasn't manually overridden it, apply property's default setting
        if (!prev.gstTypeManuallyChanged) {
          const isGstEnabled = Boolean(currentHostel.gstEnabled);
          const isAutoApply = currentHostel.autoApplyGstOnCheckin !== undefined 
            ? Boolean(currentHostel.autoApplyGstOnCheckin) 
            : false;

          const defaultMode = (isGstEnabled && isAutoApply)
            ? (currentHostel.taxInclusive ? 'inclusive' : 'exclusive')
            : 'none';
          const rate = Number(currentHostel.gstRate) || 12;
          return {
            ...prev,
            gstType: defaultMode,
            gstRate: rate
          };
        }
        return prev;
      });
    }
  }, [activeHostel, selectedRoomDetails]);

  // Poll incoming WhatsApp photos when on Step 2 and WhatsApp is actively connected
  useEffect(() => {
    if (!hostelId || !waSyncEnabled || step !== 2 || waStatus !== 'connected') {
      if (waStatus !== 'connected') {
        setWaRecentMedia([]);
      }
      return;
    }

    let isMounted = true;
    const fetchWaMedia = async () => {
      try {
        const res = await axios.get(`${API}/api/whatsapp/recent-media?hostelId=${encodeURIComponent(hostelId)}&_t=${Date.now()}`);
        if (isMounted && res.data?.success) {
          setWaRecentMedia(res.data.data || []);
        }
      } catch (_) {}
    };

    fetchWaMedia();
    const interval = setInterval(fetchWaMedia, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hostelId, waSyncEnabled, step, waStatus]);

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
        
        let guestData = res.data.data[0];
        
        // Fetch full profile to get past stays & co-guests (and ensure full ID images & details are present)
        try {
          const detailRes = await axios.get(`${API}/api/guests/${baseGuest._id}`);
          if (detailRes.data && detailRes.data.data) {
            const { stays, ...fullGuestInfo } = detailRes.data.data;
            guestData = { ...guestData, ...fullGuestInfo };
            
            if (index === 0) {
              const pastStays = stays || [];
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
            }
          }
        } catch (err) {
          console.error('Failed to fetch full guest details', err);
        }
        
        setGuests((prev) => {
          const updated = [...prev];

          updated[index] = {
            ...updated[index],
            ...guestData,
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

    originalIdFilesRef.current[`${index}-${side}`] = file;

    // Helper: Safely apply extracted Aadhaar QR details into guest profile
    const applyQrData = (qrData) => {
      setGuests(prev => {
        const updated = [...prev];
        const g = { ...updated[index] };
        if (qrData.fullName) g.fullName = qrData.fullName;
        if (qrData.idProofNumber) {
          const isMasked = String(qrData.idProofNumber).includes('X');
          const hasFull12 = /^\d{4}\s?\d{4}\s?\d{4}$/.test(String(g.idProofNumber || '').trim());
          if (!isMasked || !hasFull12) {
            g.idProofNumber = qrData.idProofNumber;
          }
        }
        if (qrData.gender) g.gender = qrData.gender;
        if (qrData.dateOfBirth) g.dateOfBirth = qrData.dateOfBirth;
        if (qrData.address) g.address = qrData.address;
        g.idProofType = 'Aadhaar';
        g.isAadhaarVerified = true;
        g.aadhaarQrType = qrData.qrType || 'UIDAI Secure QR';
        updated[index] = g;
        return updated;
      });
    };

    // =========================================================
    // STEP 1: PARALLEL INSTANT QR SCAN ON UNCOMPRESSED FILE
    // Runs concurrently with compression & cloud upload (0ms UI wait!)
    // Back side holds the official Aadhaar QR; front side is uploaded instantly.
    // =========================================================
    let qrScanPromise = Promise.resolve(null);
    if (side === 'back') {
      setScanningQr({ index, side: 'back' });
      qrScanPromise = scanAadhaarQrFromImage(file, { side: 'back' })
        .catch((err) => {
          console.log('[CheckIn] Local QR scan notice:', err?.message);
          return null;
        });

      qrScanPromise.then((qrRes) => {
        if (qrRes && qrRes.success && qrRes.data) {
          applyQrData(qrRes.data);
          toast({
            message: `🛡️ Verified Aadhaar QR Detected! Auto-filled details for ${qrRes.data.fullName}.`,
            type: 'success'
          });
        }
      }).finally(() => {
        setScanningQr({ index: null, side: null });
      });
    } else {
      // Front side: Do not block receptionist with "Scanning QR..." since Aadhaar QR is on back.
      // Perform a silent background check in case it's a full-sheet e-Aadhaar.
      qrScanPromise = scanAadhaarQrFromImage(file, { side: 'front' })
        .then((qrRes) => {
          if (qrRes && qrRes.success && qrRes.data) {
            applyQrData(qrRes.data);
            toast({
              message: `🛡️ Verified Aadhaar QR Detected! Auto-filled details for ${qrRes.data.fullName}.`,
              type: 'success'
            });
          }
          return qrRes;
        })
        .catch(() => null);
    }

    // =========================================================
    // STEP 2: CLOUD UPLOAD & BACKEND STORAGE
    // =========================================================
    setUploadingImage(true);

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data.url;
      const resolvedUrl = getFullImageUrl(uploadedUrl);

      // Local Data URL for fast instant re-scans without re-downloading
      const localDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(compressedFile);
      });

      setGuests(prev => {
        const updated = [...prev];
        if (side === 'back') {
          updated[index] = { ...updated[index], idProofImageBack: resolvedUrl, localBackDataUrl: localDataUrl };
        } else {
          updated[index] = { ...updated[index], idProofImage: resolvedUrl, localFrontDataUrl: localDataUrl };
        }
        return updated;
      });
      setUploadingImage(false);

      // Check if early QR scan succeeded
      const qrRes = await qrScanPromise;
      const qrProcessed = Boolean(qrRes && qrRes.success && qrRes.data);

      // =========================================================
      // STEP 3: OPTIONAL AI VISION OCR (Only when enabled by Super Admin)
      // =========================================================
      if (!qrProcessed && aiOcrEnabled) {
        setScanningOcr({ index, side });
        try {
          const currentGuest = guestsRef.current[index] || {};
          const ocrRes = await axios.post(`${API}/api/ocr/scan-id`, {
            imageUrl: localDataUrl || uploadedUrl,
            side,
            hostelId,
            idProofType: currentGuest.idProofType || 'Aadhaar'
          });

          if (ocrRes.data && ocrRes.data.success && ocrRes.data.data) {
            const aiData = ocrRes.data.data;
            const filled = [];

            setGuests(prev => {
              const updated = [...prev];
              const g = { ...updated[index] };
              if (aiData.fullName && (side === 'front' || !g.fullName)) {
                g.fullName = aiData.fullName;
                filled.push(aiData.fullName);
              }
              if (aiData.idProofNumber && (side === 'front' || !g.idProofNumber || String(g.idProofNumber).includes('X'))) {
                g.idProofNumber = aiData.idProofNumber;
                filled.push(aiData.idProofNumber);
              }
              if (aiData.gender && (side === 'front' || !g.gender)) {
                const genLower = aiData.gender.toLowerCase();
                if (genLower.includes('fe') || genLower.includes('महिला')) g.gender = 'Female';
                else if (genLower.includes('ma') || genLower.includes('पुरुष')) g.gender = 'Male';
                else g.gender = 'Other';
              }
              if (aiData.dateOfBirth && (side === 'front' || !g.dateOfBirth)) {
                g.dateOfBirth = aiData.dateOfBirth;
              }
              if (aiData.address && (side === 'back' || !g.address)) {
                g.address = aiData.address;
                filled.push('Address');
              }
              updated[index] = g;
              return updated;
            });

            toast({
              message: filled.length > 0
                ? `✨ Auto-Filled: ${filled.join(' | ')}`
                : `✨ ${side === 'front' ? 'Front' : 'Back'} ID scanned successfully!`,
              type: 'success'
            });
          }
        } catch (ocrErr) {
          const isAiDisabled = ocrErr?.response?.data?.code === 'AI_OCR_DISABLED';
          if (!isAiDisabled) {
            console.warn('[CheckIn] AI OCR notice:', ocrErr?.response?.data?.message || ocrErr.message);
          }
        } finally {
          setScanningOcr({ index: null, side: null });
        }
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

  // Re-scan Aadhaar QR code from already uploaded image
  const handleManualScanAadhaarQr = async (guestIdx, imageSrc, sideName = 'front') => {
    if (!imageSrc) return;
    setScanningQr({ index: guestIdx, side: sideName });
    try {
      const curGuest = guestsRef.current[guestIdx] || guests[guestIdx] || {};
      const preferredLocalSrc = sideName === 'front'
        ? (curGuest.localFrontDataUrl || getFullImageUrl(imageSrc))
        : (curGuest.localBackDataUrl || getFullImageUrl(imageSrc));

      const originalFile = originalIdFilesRef.current[`${guestIdx}-${sideName}`];
      let res = await scanAadhaarQrFromImage(originalFile || preferredLocalSrc, { side: sideName });
      let foundOnOtherSide = false;

      // If not found on this side, check if the other side of the ID has an image uploaded!
      if (!res || !res.success) {
        const otherSideName = sideName === 'front' ? 'back' : 'front';
        const otherSideSrc = sideName === 'front'
          ? (curGuest.localBackDataUrl || curGuest.idProofImageBack)
          : (curGuest.localFrontDataUrl || curGuest.idProofImage);
        if (otherSideSrc) {
          const otherKey = `${guestIdx}-${otherSideName}`;
          const otherRes = await scanAadhaarQrFromImage(originalIdFilesRef.current[otherKey] || getFullImageUrl(otherSideSrc), { side: otherSideName });
          if (otherRes && otherRes.success) {
            res = otherRes;
            foundOnOtherSide = true;
          }
        }
      }

      if (res && res.success && res.data) {
        const qrData = res.data;
        setGuests(prev => {
          const updated = [...prev];
          const g = { ...updated[guestIdx] };
          if (qrData.fullName) g.fullName = qrData.fullName;
          if (qrData.idProofNumber) {
            const isMasked = String(qrData.idProofNumber).includes('X');
            const hasFull12 = /^\d{4}\s?\d{4}\s?\d{4}$/.test(String(g.idProofNumber || '').trim());
            if (!isMasked || !hasFull12) {
              g.idProofNumber = qrData.idProofNumber;
            }
          }
          if (qrData.gender) g.gender = qrData.gender;
          if (qrData.dateOfBirth) g.dateOfBirth = qrData.dateOfBirth;
          if (qrData.address) g.address = qrData.address;
          g.idProofType = 'Aadhaar';
          g.isAadhaarVerified = true;
          g.aadhaarQrType = qrData.qrType || 'UIDAI Secure QR';
          updated[guestIdx] = g;
          return updated;
        });
        toast({
          message: foundOnOtherSide
            ? `🛡️ Aadhaar QR found on ${sideName === 'front' ? 'Back' : 'Front'} ID! Auto-filled details for ${qrData.fullName}.`
            : `🛡️ Verified Aadhaar QR Detected! Auto-filled details for ${qrData.fullName}.`,
          type: 'success'
        });
      } else {
        setScanningQr({ index: null, side: null });
        if (aiOcrEnabled) {
          setScanningOcr({ index: guestIdx, side: sideName });
          try {
            const ocrRes = await axios.post(`${API}/api/ocr/scan-id`, {
              imageUrl: preferredLocalSrc,
              side: sideName,
              hostelId,
              idProofType: curGuest.idProofType || 'Aadhaar'
            });

            if (ocrRes.data && ocrRes.data.success && ocrRes.data.data) {
              const aiData = ocrRes.data.data;
              const filledFields = [];
              setGuests(prev => {
                const updated = [...prev];
                const g = { ...updated[guestIdx] };
                if (aiData.fullName) { g.fullName = aiData.fullName; filledFields.push('Name'); }
                if (aiData.idProofNumber) { g.idProofNumber = aiData.idProofNumber; filledFields.push('ID Number'); }
                if (aiData.gender) {
                  const genLower = aiData.gender.toLowerCase();
                  if (genLower.includes('fe') || genLower.includes('महिला')) g.gender = 'Female';
                  else if (genLower.includes('ma') || genLower.includes('पुरुष')) g.gender = 'Male';
                  else g.gender = 'Other';
                  filledFields.push('Gender');
                }
                if (aiData.dateOfBirth) { g.dateOfBirth = aiData.dateOfBirth; filledFields.push('DOB'); }
                if (aiData.address) { g.address = aiData.address; filledFields.push('Address'); }
                g.idProofType = 'Aadhaar';
                updated[guestIdx] = g;
                return updated;
              });

              toast({
                message: filledFields.length > 0
                  ? `✨ Card text scanned! Auto-filled: ${filledFields.join(', ')}`
                  : '✨ ID photo scanned successfully!',
                type: 'success'
              });
              return;
            }
          } catch (ocrErr) {
            console.warn('AI OCR fallback error in manual scan:', ocrErr);
          } finally {
            setScanningOcr({ index: null, side: null });
          }
        }

        toast({
          message: res?.message || 'No readable Aadhaar QR code found in this photo. Please make sure the side with the QR code is clearly visible.',
          type: 'error'
        });
      }
    } catch (err) {
      console.warn('QR scan error:', err);
      toast({ message: 'Error reading ID image.', type: 'error' });
    } finally {
      setScanningQr({ index: null, side: null });
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
      const resolvedUrl = getFullImageUrl(imageUrl);
      setGuests(prev => {
        const updated = [...prev];
        if (side === 'back') {
          updated[index] = { ...updated[index], idProofImageBack: resolvedUrl };
        } else {
          updated[index] = { ...updated[index], idProofImage: resolvedUrl };
        }
        return updated;
      });

      if (mediaId) {
        axios.put(`${API}/api/whatsapp/mark-used/${mediaId}`).catch(() => {});
        setWaRecentMedia(prev => prev.map(m => m._id === mediaId ? { ...m, status: 'used' } : m));
      }

      toast({ message: `Image attached from WhatsApp to ${side === 'front' ? 'Front ID' : 'Back ID'}!`, type: 'success' });

      // 1. Fast Local Aadhaar Secure QR Scanner
      let qrProcessed = false;
      setScanningQr({ index, side });
      try {
        const qrRes = await scanAadhaarQrFromImage(resolvedUrl, { side });
        if (qrRes && qrRes.success && qrRes.data) {
          const qrData = qrRes.data;
          setGuests(prev => {
            const updated = [...prev];
            const g = { ...updated[index] };
            if (qrData.fullName) g.fullName = qrData.fullName;
            if (qrData.idProofNumber) g.idProofNumber = qrData.idProofNumber;
            if (qrData.gender) g.gender = qrData.gender;
            if (qrData.dateOfBirth) g.dateOfBirth = qrData.dateOfBirth;
            if (qrData.address) g.address = qrData.address;
            g.idProofType = 'Aadhaar';
            g.isAadhaarVerified = true;
            g.aadhaarQrType = qrData.qrType || 'UIDAI Secure QR';
            updated[index] = g;
            return updated;
          });

          qrProcessed = true;
          toast({
            message: `🛡️ Verified Aadhaar QR from WhatsApp! Auto-filled details for ${qrData.fullName}.`,
            type: 'success'
          });
        }
      } catch (qrErr) {
        console.log('WhatsApp QR scan note:', qrErr);
      } finally {
        setScanningQr({ index: null, side: null });
      }

      // 2. Run AI OCR scan as fallback (only if enabled for property)
      if (!qrProcessed && aiOcrEnabled) {
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
          console.warn('WhatsApp AI OCR fallback notice:', ocrErr?.message);
        } finally {
          setScanningOcr({ index: null, side: null });
        }
      }
    } catch (err) {
      console.error('Failed to attach WhatsApp image:', err);
    }
  };

  const handleStartWhatsApp = async () => {
    if (loadingWa || !hostelId) return;
    setLoadingWa(true);
    try {
      const res = await axios.post(`${API}/api/whatsapp/connect`, { hostelId });
      if (res.data?.success) {
        setWaStatus(res.data.data.status);
        if (res.data.data.qr) setWaQr(res.data.data.qr);
        setWaPairing(!!res.data.data.pairing);
        if (res.data.data.status === 'connected') {
          setWaPhone(res.data.data.phone || '');
          toast({ message: 'WhatsApp already active!', type: 'success' });
        } else if (res.data.data.qr) {
          toast({ message: 'WhatsApp QR generated! Scan with phone camera.', type: 'info' });
        }
      }
    } catch (err) {
      if (!waPairingCode && waStatus !== 'connected') {
        toast({ message: err.response?.data?.message || 'Failed to start WhatsApp', type: 'error' });
      }
    } finally {
      setLoadingWa(false);
    }
  };

  const handleRequestPairingCode = async (e) => {
    if (e) e.preventDefault();
    if (!hostelId) {
      toast({ message: 'Hostel ID is required', type: 'error' });
      return;
    }
    const cleanPhone = waPairingPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast({ message: 'Please enter a valid 10-digit phone number', type: 'error' });
      return;
    }
    setLoadingPairingCode(true);
    try {
      const res = await axios.post(`${API}/api/whatsapp/pairing-code`, {
        hostelId,
        phoneNumber: cleanPhone
      });
      if (res.data?.success && res.data.data?.pairingCode) {
        setWaPairingCode(res.data.data.pairingCode);
        setWaStatus('connecting');
        toast({ message: 'Pairing code generated! Check your phone notification or enter the code in WhatsApp.', type: 'success' });
      } else if (res.data?.data?.alreadyConnected) {
        setWaStatus('connected');
        setWaPhone(res.data.data.phone || '');
        toast({ message: 'WhatsApp already connected!', type: 'success' });
      } else {
        toast({ message: res.data?.message || 'Could not generate pairing code', type: 'error' });
      }
    } catch (err) {
      console.error('Pairing code request error:', err);
      toast({ message: err.response?.data?.message || 'Failed to request pairing code. Make sure phone number is correct.', type: 'error' });
    } finally {
      setLoadingPairingCode(false);
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
      setWaPairing(false);
      setWaPairingCode('');
      setWaRecentMedia([]);
      setWaPickerOpen(false);
      setWaPreviewImage(null);
      setWaConnectTab('code');
      toast({ message: 'WhatsApp disconnected successfully. Media cleared.', type: 'info' });
    } catch (err) {
      toast({ message: err.response?.data?.message || 'Failed to disconnect WhatsApp', type: 'error' });
    } finally {
      setLoadingWa(false);
    }
  };

  const handleOpenWaPicker = (index, side) => {
    setWaPickerTarget({ index, side });
    setWaPickerOpen(true);
  };

  const handleRefreshWaMedia = async () => {
    if (!hostelId) return;
    setSyncingWaMedia(true);
    try {
      const res = await axios.get(`${API}/api/whatsapp/recent-media?hostelId=${encodeURIComponent(hostelId)}&_t=${Date.now()}`);
      if (res.data?.success) {
        setWaRecentMedia(res.data.data || []);
        toast({ message: `Synced! Found ${res.data.data?.length || 0} incoming WhatsApp photo(s).`, type: 'success' });
      }
    } catch (_) {
      toast({ message: 'Failed to refresh WhatsApp photos', type: 'error' });
    } finally {
      setSyncingWaMedia(false);
    }
  };

  const [cleaningWaMedia, setCleaningWaMedia] = useState(false);

  const handleCleanupUnusedWaMedia = async () => {
    if (!window.confirm('Are you sure you want to delete all unused WhatsApp photos? Any ID photos already saved to checked-in guests will remain completely safe.')) {
      return;
    }
    setCleaningWaMedia(true);
    try {
      const res = await axios.post(`${API}/api/whatsapp/cleanup-unused`, { forceAll: true, hostelId });
      if (res.data?.success) {
        setWaRecentMedia([]);
        toast({
          message: `Cleaned up! Removed ${res.data.data?.deletedDbCount || 0} unused photos.`,
          type: 'success'
        });
        await handleRefreshWaMedia();
      }
    } catch (err) {
      toast({ message: err.response?.data?.message || 'Failed to clean unused photos', type: 'error' });
    } finally {
      setCleaningWaMedia(false);
    }
  };

  // =========================================================
  // HANDLE SUBMIT
  // =========================================================

  const handleSubmit = async () => {
    if (isCurrentPropertyExpired) {
      toast({
        message: 'Subscription plan has expired for this property. Check-in cannot be completed until renewed.',
        type: 'error'
      });
      return;
    }

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

      const sanitizeGuestPayload = (rawGuest) => {
        const {
          isSearching: _ps,
          localFrontDataUrl: _lf,
          localBackDataUrl: _lb,
          ...clean
        } = rawGuest;
        return clean;
      };

      const pGuest = sanitizeGuestPayload({ ...guests[0], hostel: hostelId });

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
          const coGuest = sanitizeGuestPayload({ ...cg, hostel: hostelId });

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

      const checkInDate = (stayInfo.isBackdated && stayInfo.checkInDate)
        ? new Date(stayInfo.checkInDate)
        : new Date();

      const expectedOut = new Date(checkInDate.getTime());

      const days = Number(stayInfo.durationDays) || 0;
      const hours = Number(stayInfo.durationHours) || 0;
      const effDays = (days === 0 && hours === 0) ? 1 : days;

      if (stayInfo.isMorningCheckout) {
        const morningDays = Math.max(1, effDays);
        if (checkInDate.getHours() < 6) {
          expectedOut.setHours(10, 0, 0, 0); // 10:00 AM sharp today
        } else {
          expectedOut.setDate(checkInDate.getDate() + morningDays);
          expectedOut.setHours(10, 0, 0, 0); // 10:00 AM sharp on checkout day
        }
      } else {
        expectedOut.setDate(expectedOut.getDate() + effDays);
        expectedOut.setHours(expectedOut.getHours() + hours);
      }

      // =====================================================
      // 5. CREATE STAY
      // =====================================================

      const isPastCheckout = Boolean(stayInfo.isBackdated && stayInfo.isAlreadyCheckedOut);
      const actualOutIso = isPastCheckout
        ? (stayInfo.actualCheckOutDate ? new Date(stayInfo.actualCheckOutDate).toISOString() : expectedOut.toISOString())
        : undefined;

      const durLabel = stayInfo.isMorningCheckout 
        ? `${Math.max(1, effDays)}d (10 AM)`
        : (effDays > 0 && hours > 0) ? `${effDays}d ${hours}h` : effDays > 0 ? `${effDays}d (24h)` : `${hours}h`;

      // Validate Mixed Payment if selected
      const initialPay = Number(stayInfo.paidAmount) || 0;
      if (stayInfo.paymentMethod === 'Mixed' && initialPay > 0) {
        const valRes = validateSplitPayment(stayInfo.paymentMethod, initialPay, stayInfo.splitBreakdown);
        if (!valRes.isValid) {
          toast({ message: valRes.error, type: 'error' });
          setLoading(false);
          return;
        }
      }

      const stayPayload = {
        guest: pGuestId,

        coGuests: coGuestIds,

        room: stayInfo.room,

        hostel: hostelId,

        durationOption: durLabel,

        occupants:
          stayInfo.occupants,

        totalAmount:
          Number(stayInfo.totalAmount) || 0,

        initialPaymentAmount: initialPay,

        paymentMethod:
          stayInfo.paymentMethod,

        splitPayments: buildSplitPayments(
          stayInfo.paymentMethod,
          initialPay,
          stayInfo.splitBreakdown,
          'Advance Payment'
        ),

        commissionTo:
          stayInfo.commissionTo,

        commissionPhone:
          stayInfo.commissionPhone || '',

        commissionAmount:
          Number(
            stayInfo.commissionAmount
          ) || 0,

        checkInDate: checkInDate.toISOString(),

        expectedCheckOutDate: expectedOut.toISOString(),

        isAlreadyCheckedOut: isPastCheckout,

        actualCheckOutDate: actualOutIso,

        gstApplied: stayInfo.gstType !== 'none',

        gstType: stayInfo.gstType || 'none',

        gstRate: stayInfo.gstType !== 'none' ? (Number(stayInfo.gstRate) || 12) : 0,

        taxAmount: stayInfo.gstType === 'exclusive' 
          ? Math.round((Number(stayInfo.basePrice || stayInfo.totalAmount) * (Number(stayInfo.gstRate) || 12)) / 100)
          : (stayInfo.gstType === 'inclusive' ? Math.round(Number(stayInfo.totalAmount) - (Number(stayInfo.totalAmount) / (1 + (Number(stayInfo.gstRate) || 12) / 100))) : 0)
      };

      console.log(
        'Stay Payload:',
        stayPayload
      );

      const stayRes = await axios.post(
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
      sessionStorage.removeItem(
        'checkin_prefill_guest'
      );
      setPrefilledProfile(null);

      // =====================================================
      // 7. SUCCESS & GUEST REGISTRATION CARD (GRC)
      // =====================================================

      // Invalidate caches across the app so RoomsView, Dashboard, and CheckoutList show new stay immediately
      apiCache.invalidate();

      const createdStay = stayRes.data?.data || stayPayload;
      setCreatedStayData(createdStay);

      toast({
        message: `Check-In successful for Room ${selectedRoomDetails.roomNumber}`,
        type: 'success'
      });

      // Trigger GRC modal for 1-click printing & physical signing!
      setGrcModalOpen(true);
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
    stayInfo.totalAmount !== '';

  const isStep2Valid = guests.every((g, idx) => {
    // Every guest must have a name
    if (!g.fullName || !g.fullName.trim()) return false;
    // Only primary guest MUST have a valid 10-digit mobile
    if (idx === 0 && g.mobileNumber.length !== 10) return false;
    return true;
  });

  const toggleGst = () => {
    const isCurrentlyGst = stayInfo.gstType !== 'none';
    const currentHostel = activeHostel || (typeof selectedRoomDetails?.hostel === 'object' ? selectedRoomDetails.hostel : null);
    const rate = Number(stayInfo.gstRate) || Number(currentHostel?.gstRate) || 12;
    const isInc = currentHostel?.taxInclusive !== undefined ? Boolean(currentHostel.taxInclusive) : true;
    const base = Number(stayInfo.basePrice || stayInfo.totalAmount) || 0;

    if (isCurrentlyGst) {
      // Turn OFF GST (revert to clean flat rate)
      setStayInfo(prev => ({
        ...prev,
        gstTypeManuallyChanged: true,
        gstType: 'none',
        totalAmount: (prev.basePrice || prev.totalAmount).toString()
      }));
    } else {
      // Turn ON GST according to hotel settings
      const newType = isInc ? 'inclusive' : 'exclusive';
      if (newType === 'exclusive') {
        const extraGst = Math.round((base * rate) / 100);
        setStayInfo(prev => ({
          ...prev,
          gstTypeManuallyChanged: true,
          gstType: 'exclusive',
          gstRate: rate,
          basePrice: base ? base.toString() : prev.totalAmount,
          totalAmount: base ? (base + extraGst).toString() : prev.totalAmount
        }));
      } else {
        setStayInfo(prev => ({
          ...prev,
          gstTypeManuallyChanged: true,
          gstType: 'inclusive',
          gstRate: rate,
          totalAmount: (prev.basePrice || prev.totalAmount).toString()
        }));
      }
    }
  };

  const handlePriceInput = (val) => {
    const num = Number(val) || 0;
    const currentHostel = activeHostel || (typeof selectedRoomDetails?.hostel === 'object' ? selectedRoomDetails.hostel : null);
    const rate = Number(stayInfo.gstRate) || Number(currentHostel?.gstRate) || 12;
    if (stayInfo.gstType === 'exclusive') {
      const extraGst = Math.round((num * rate) / 100);
      setStayInfo(p => ({
        ...p,
        basePrice: val,
        totalAmount: val === '' ? '' : (num + extraGst).toString()
      }));
    } else {
      setStayInfo(p => ({
        ...p,
        basePrice: val,
        totalAmount: val
      }));
    }
  };

  const resetForm = () => {
    if (!window.confirm('Clear all current data and start fresh?')) return;
    
    sessionStorage.removeItem('checkin_step');
    sessionStorage.removeItem('checkin_stayInfo');
    sessionStorage.removeItem('checkin_guests');
    sessionStorage.removeItem('checkin_prefill_guest');
    setPrefilledProfile(null);
    
    setStep(1);
    setStayInfo({
      room: '',
      durationDays: 0,
      durationHours: 0,
      occupants: 1,
      totalAmount: '',
      paidAmount: '',
      paymentMethod: 'Cash',
      splitBreakdown: { cash: '', upi: '', card: '' },
      commissionTo: '',
      commissionPhone: '',
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
    <div className="w-full mx-auto pb-44 md:pb-12 animate-in fade-in duration-500 transition-all">

      {/* HEADER */}

      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {isHindi ? 'एक्सप्रेस चेक-इन' : 'Express Check-In'}
          </h1>
          <button 
            onClick={resetForm}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} />
            {isHindi ? 'फॉर्म रीसेट' : 'RESET FORM'}
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
              {isHindi ? '1. कमरा व स्टे चयन' : '1. Stay & Room Details'}
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
              {isHindi ? '2. अतिथि विवरण व पहचान पत्र' : '2. Guest Identity & Verification'}
            </span>
          </div>

        </div>
      </div>

      {/* =====================================================
          STEP 1
      ===================================================== */}

      {step === 1 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">

            {/* LEFT COLUMN: GUESTS, DURATION & ROOM MATRIX (8 Cols on Desktop - Bada & Prominent) */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-4 sm:space-y-5">

              {/* FAST BOOKING PREFILL BANNER */}
              {prefilledProfile && (
                <div className="bg-gray-950 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {prefilledProfile.fullName?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider">Fast Booking: {prefilledProfile.fullName}</span>
                        {prefilledProfile.mobileNumber && (
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-gray-200 font-mono">{prefilledProfile.mobileNumber}</span>
                        )}
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                          Profile Linked
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        Select room & dates below. Guest 1 details and past co-guests will be auto-filled in Step 2!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPrefill}
                    className="text-[11px] font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Clear Prefill
                  </button>
                </div>
              )}

              {/* 1. GUESTS & DURATION */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <Users className="text-gray-400" size={20} />
                    1. Guests & Duration
                  </h2>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {stayInfo.occupants || 1} Guest{Number(stayInfo.occupants) > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* OCCUPANTS */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Total Occupants
                    </label>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 w-full sm:w-fit justify-between sm:justify-start shadow-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setStayInfo((p) => ({
                            ...p,
                            occupants: Math.max(1, (Number(p.occupants) || 1) - 1)
                          }))
                        }
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-black text-xl hover:bg-gray-200 active:scale-95 transition-all text-gray-800"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={stayInfo.occupants}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1);
                          setStayInfo((p) => ({ ...p, occupants: val }));
                        }}
                        onBlur={() => {
                          if (!stayInfo.occupants || stayInfo.occupants < 1) {
                            setStayInfo((p) => ({ ...p, occupants: 1 }));
                          }
                        }}
                        className="text-2xl sm:text-3xl font-black w-16 text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono text-gray-900"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setStayInfo((p) => ({
                            ...p,
                            occupants: (Number(p.occupants) || 1) + 1
                          }))
                        }
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-black text-xl hover:bg-gray-200 active:scale-95 transition-all text-gray-800"
                      >
                        +
                      </button>
                    </div>

                    {/* Instant Quick Numbers */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span className="text-[10px] font-bold text-gray-400 mr-0.5">Quick:</span>
                      {[1, 2, 3, 4, 6, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setStayInfo((p) => ({ ...p, occupants: num }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                            Number(stayInfo.occupants) === num
                              ? 'bg-black text-white shadow-xs scale-105'
                              : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DURATION */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Stay Duration
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStayInfo(p => ({
                              ...p,
                              durationDays: 1,
                              durationHours: 0,
                              isMorningCheckout: true
                            }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all shadow-xs ${
                            stayInfo.isMorningCheckout
                              ? 'bg-amber-400 text-black border border-amber-500 shadow-xs scale-105'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                          }`}
                          title="Standard hotel checkout: Sharp 10:00 AM"
                        >
                          ☀️ 10 AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setStayInfo(p => ({ ...p, durationDays: 1, durationHours: 0, isMorningCheckout: false }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                            !stayInfo.isMorningCheckout && Number(stayInfo.durationDays) === 1 && (Number(stayInfo.durationHours) === 0 || !stayInfo.durationHours)
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                          }`}
                        >
                          🌙 24h
                        </button>
                        <button
                          type="button"
                          onClick={() => setStayInfo(p => ({ ...p, durationDays: 0, durationHours: 3, isMorningCheckout: false }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                            !stayInfo.isMorningCheckout && Number(stayInfo.durationDays) === 0 && Number(stayInfo.durationHours) === 3
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                          }`}
                        >
                          ⚡ 3h
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={stayInfo.durationDays}
                          onChange={(e) =>
                            setStayInfo((p) => ({
                              ...p,
                              durationDays: e.target.value === '' ? '' : Math.max(0, e.target.value)
                            }))
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-9 py-2 font-black text-lg outline-none focus:border-black transition-colors"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none">
                          Days
                        </span>
                      </div>

                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={stayInfo.durationHours}
                          onChange={(e) =>
                            setStayInfo((p) => ({
                              ...p,
                              durationHours: e.target.value === '' ? '' : Math.max(0, e.target.value),
                              isMorningCheckout: false
                            }))
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 font-black text-lg outline-none focus:border-black transition-colors"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none">
                          Hours
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2.5">
                      <p className="text-[11px] text-gray-400 font-bold truncate">
                        {stayInfo.isMorningCheckout ? 'Standard 10:00 AM' : 'Custom Duration'}
                      </p>
                      <p className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
                        Out: {expectedOutPreviewFormatted}
                      </p>
                    </div>
                  </div>

                </div>

                {/* 🕒 CHECK-IN TIMING: INSTANT WALK-IN (DEFAULT) vs BACKDATED REGISTER ENTRY */}
                <div className="pt-3 border-t border-gray-100">
                  {!stayInfo.isBackdated ? (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-950">
                          Check-In: <span className="font-bold text-emerald-800">Right Now ({format(new Date(), 'hh:mm a')})</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setStayInfo(p => ({
                            ...p,
                            isBackdated: true,
                            checkInDate: toDateTimeLocal(now)
                          }));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-black transition-all shadow-xs active:scale-95"
                      >
                        <CalendarClock size={13} className="text-emerald-700" />
                        <span>Change Date & Time / Backdated?</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/80 border-2 border-amber-200 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarClock size={16} className="text-amber-700" />
                          <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-tight">
                            Custom / Backdated Check-In (Pichli Entry)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStayInfo(p => ({
                              ...p,
                              isBackdated: false,
                              checkInDate: '',
                              isAlreadyCheckedOut: false,
                              actualCheckOutDate: ''
                            }));
                          }}
                          className="text-[11px] font-bold text-gray-600 hover:text-black bg-white hover:bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 transition-colors shadow-2xs"
                        >
                          ✕ Reset to Right Now
                        </button>
                      </div>

                      {/* QUICK PRESET CHIPS */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider mr-1">Quick:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          Right Now
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setHours(10, 0, 0, 0);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          Today 10 AM
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() - 2 * 3600000);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          2h Ago
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() - 4 * 3600000);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          4h Ago
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            d.setHours(10, 0, 0, 0);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          Yesterday 10 AM
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            d.setHours(19, 0, 0, 0);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          Yesterday 7 PM
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 2);
                            d.setHours(10, 0, 0, 0);
                            setStayInfo(p => ({ ...p, checkInDate: toDateTimeLocal(d) }));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          2 Days Ago
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">
                            Actual Check-In Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={stayInfo.checkInDate || ''}
                            onChange={(e) => setStayInfo(p => ({ ...p, checkInDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-amber-600 shadow-2xs"
                          />
                        </div>

                        {/* ALREADY CHECKED OUT TOGGLE */}
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 p-2.5 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors shadow-2xs">
                            <input
                              type="checkbox"
                              checked={Boolean(stayInfo.isAlreadyCheckedOut)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setStayInfo(p => ({ 
                                  ...p, 
                                  isAlreadyCheckedOut: checked,
                                  actualCheckOutDate: checked && !p.actualCheckOutDate ? toDateTimeLocal(new Date()) : p.actualCheckOutDate
                                }));
                              }}
                              className="w-4 h-4 text-amber-600 rounded focus:ring-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-black text-gray-900 block leading-tight">
                                Guest already checked out?
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 block">
                                Room will stay vacant today for other guests
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {stayInfo.isAlreadyCheckedOut && (
                        <div className="pt-1 bg-white/70 p-3 rounded-xl border border-amber-200">
                          <label className="block text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">
                            Actual Check-Out Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={stayInfo.actualCheckOutDate || ''}
                            onChange={(e) => setStayInfo(p => ({ ...p, actualCheckOutDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-amber-600 shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SELECT ROOM (LARGER & MORE PROMINENT) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                      <Bed className="text-gray-400" size={22} />
                      2. Select Room
                    </h2>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      {rooms.filter((r) => !r.isOccupied).length} Vacant
                    </span>
                  </div>

                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search room..."
                      className="pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-bold text-sm w-full sm:w-56"
                      value={roomSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoomSearchQuery(val);
                        if (val.trim()) {
                          const exactMatch = rooms.find(
                            (r) => !r.isOccupied && r.roomNumber.toLowerCase() === val.trim().toLowerCase()
                          );
                          if (exactMatch) {
                            setStayInfo((p) => {
                              const updated = { ...p, room: exactMatch._id };
                              if (!Number(updated.durationDays) && !Number(updated.durationHours)) {
                                updated.durationDays = 1;
                              }
                              if ((!p.totalAmount || p.totalAmount === '0' || p.totalAmount === 0) && exactMatch.price24h > 0) {
                                updated.totalAmount = exactMatch.price24h;
                              }
                              return updated;
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* FLOOR FILTER CHIPS (PROMINENT TABS) */}
                {availableFloors.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">Floor:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFloorFilter('All')}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                        selectedFloorFilter === 'All'
                          ? 'bg-black text-white shadow-xs scale-105'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      All ({rooms.filter((r) => !r.isOccupied).length})
                    </button>
                    {availableFloors.map(({ floor, count }) => (
                      <button
                        key={floor}
                        type="button"
                        onClick={() => setSelectedFloorFilter(floor)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                          selectedFloorFilter === floor
                            ? 'bg-black text-white shadow-xs scale-105'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        Floor {floor} ({count})
                      </button>
                    ))}
                  </div>
                )}

                {/* ROOM CARDS GRID (EXPANDED TO MAX-H-460PX WITH BIG KEYCARDS) */}
                {loadingRooms ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <SkeletonRoom />
                    <SkeletonRoom />
                    <SkeletonRoom />
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="text-center py-12 bg-amber-50 text-amber-800 rounded-2xl font-bold text-sm">
                    {rooms.filter((r) => !r.isOccupied).length === 0
                      ? 'No vacant rooms available right now. All rooms are booked.'
                      : 'No rooms match this floor or search.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {filteredRooms.map((room) => {
                      const active = stayInfo.room === room._id;
                      return (
                        <button
                          key={room._id}
                          type="button"
                          onClick={() =>
                            setStayInfo((prev) => {
                              const updated = { ...prev, room: room._id };
                              if (!Number(updated.durationDays) && !Number(updated.durationHours)) {
                                updated.durationDays = 1;
                              }
                              if ((!prev.totalAmount || prev.totalAmount === '0' || prev.totalAmount === 0) && room.price24h > 0) {
                                updated.totalAmount = room.price24h;
                              }
                              return updated;
                            })
                          }
                          className={`relative p-3.5 sm:p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                            active
                              ? 'border-black bg-black text-white shadow-xl scale-[1.03]'
                              : 'border-gray-200 hover:border-black bg-white hover:shadow-md'
                          }`}
                        >
                          {active && (
                            <CheckCircle2
                              className="absolute top-2 right-2 text-white"
                              size={16}
                            />
                          )}
                          <h3 className={`font-black text-xl sm:text-2xl font-mono tracking-tight ${active ? 'text-white' : 'text-gray-900'}`}>
                            {room.roomNumber}
                          </h3>
                          <div className={`text-[10px] sm:text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block truncate max-w-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {room.floor ? `Fl.${room.floor}` : ''} {room.roomType ? `• ${room.roomType.replace('Standard ', '')}` : ''}
                          </div>
                          {room.price24h > 0 && (
                            <div className={`text-xs sm:text-sm font-black font-mono mt-1 ${active ? 'text-amber-300' : 'text-emerald-700'}`}>
                              ₹{room.price24h}
                            </div>
                          )}
                          <div className={`text-[9px] font-bold mt-0.5 ${active ? 'text-gray-400' : 'text-gray-400'} uppercase tracking-wider`}>
                            Cap. {room.capacity}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: STICKY LIVE RESERVATION & BILLING DESK (4 Cols on Desktop) */}
            <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-20 space-y-4">
              <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-black p-4 sm:p-5 rounded-2xl text-white shadow-xl border border-gray-800 space-y-3.5">

                {/* SELECTED ROOM STATUS BANNER */}
                <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-between gap-2">
                  {selectedRoomDetails ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h4 className="font-black text-base text-white tracking-wide">
                          Room {selectedRoomDetails.roomNumber}
                        </h4>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          {selectedRoomDetails.roomType || 'Standard'}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                        {stayInfo.occupants} Occupant{Number(stayInfo.occupants) > 1 ? 's' : ''} • Floor {selectedRoomDetails.floor || '1'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1 text-amber-300">
                      <Bed size={16} className="animate-bounce" />
                      <span className="text-xs font-black">👈 Please select a room</span>
                    </div>
                  )}

                  {selectedRoomDetails && (
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Standard</span>
                      <span className="text-xs font-black text-white font-mono">
                        {selectedRoomDetails.price24h ? `₹${selectedRoomDetails.price24h}` : 'Custom'}
                      </span>
                    </div>
                  )}
                </div>

                {stayInfo.isBackdated && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-amber-200">
                      <CalendarClock size={13} />
                      <span>Register / Backdated Check-In</span>
                    </div>
                    <div className="text-[11px] text-amber-300/90 leading-tight">
                      In: {format(new Date(stayInfo.checkInDate || Date.now()), 'dd MMM, hh:mm a')}
                    </div>
                    {stayInfo.isAlreadyCheckedOut && (
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-black uppercase">
                        ✓ Marked as Already Checked Out
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <h3 className="text-sm font-black text-gray-200 flex items-center gap-1.5">
                    <CreditCard className="text-gray-400" size={16} />
                    Payment & Settlement
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {stayInfo.paymentMethod}
                  </span>
                </div>

                {/* AGREED TOTAL & GST CONTROLS */}
                <div className="pb-3 border-b border-gray-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-400 font-bold text-xs uppercase tracking-wider block">
                        {stayInfo.gstType === 'exclusive' ? 'Base Room Rate' : 'Agreed Total'}
                      </span>
                      {stayInfo.gstType === 'exclusive' && (
                        <span className="text-[10px] text-blue-400 font-medium">+ 12% GST Extra</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 font-black">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={stayInfo.gstType === 'exclusive' ? (stayInfo.basePrice || '') : stayInfo.totalAmount}
                        onChange={(e) => handlePriceInput(e.target.value)}
                        className="w-28 bg-transparent text-right font-black text-xl outline-none border-b border-gray-700 focus:border-white text-white placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Standard rate pill if room has pricing and total is different */}
                  {selectedRoomDetails?.price24h > 0 && Number(stayInfo.totalAmount) !== selectedRoomDetails.price24h && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handlePriceInput(selectedRoomDetails.price24h.toString())}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline"
                      >
                        💡 Set standard tariff: ₹{selectedRoomDetails.price24h}
                      </button>
                    </div>
                  )}

                  {/* GST Billing Mode (Auto-applied from Property Settings) */}
                  {Boolean(currentHostel?.gstEnabled) && (
                    <div className="pt-2 border-t border-gray-800/60">
                      {stayInfo.gstType !== 'none' ? (
                        <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <span className="text-xs font-black text-emerald-300">
                                {stayInfo.gstType === 'inclusive' 
                                  ? `${stayInfo.gstRate || 12}% GST Included (${currentHostel?.autoApplyGstOnCheckin ? 'Default' : 'Applied'})` 
                                  : `+ ${stayInfo.gstRate || 12}% GST Extra (${currentHostel?.autoApplyGstOnCheckin ? 'Default' : 'Applied'})`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={toggleGst}
                              className="text-[11px] font-bold text-gray-400 hover:text-red-400 underline cursor-pointer transition-colors"
                            >
                              Remove GST
                            </button>
                          </div>

                          {Number(stayInfo.totalAmount) > 0 && (
                            <div className="text-[11px] text-emerald-400/90 font-mono flex justify-between pt-1 border-t border-emerald-800/30">
                              {stayInfo.gstType === 'inclusive' ? (
                                <>
                                  <span>Net: ₹{Math.round(Number(stayInfo.totalAmount) / (1 + (stayInfo.gstRate || 12) / 100))} + GST: ₹{Number(stayInfo.totalAmount) - Math.round(Number(stayInfo.totalAmount) / (1 + (stayInfo.gstRate || 12) / 100))}</span>
                                  <span className="font-bold text-white">Total: ₹{stayInfo.totalAmount}</span>
                                </>
                              ) : (
                                <>
                                  <span>Base: ₹{stayInfo.basePrice || 0} + GST: ₹{Number(stayInfo.totalAmount) - Number(stayInfo.basePrice || 0)}</span>
                                  <span className="font-bold text-white">Total: ₹{stayInfo.totalAmount}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-300">Non-GST Bill (Flat Tariff)</span>
                            <p className="text-[10px] text-gray-500">
                              {currentHostel?.autoApplyGstOnCheckin ? 'GST removed for this guest' : 'GST is OFF by default'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={toggleGst}
                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            + Apply Hotel GST ({currentHostel?.gstRate || 12}%)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ADVANCE PAID */}
                <div className="pb-3 border-b border-gray-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                      Advance Paid
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400 font-black">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={stayInfo.paidAmount}
                        onChange={(e) =>
                          setStayInfo((p) => ({
                            ...p,
                            paidAmount: e.target.value
                          }))
                        }
                        className="w-28 bg-transparent text-right font-black text-xl outline-none border-b border-gray-700 focus:border-emerald-400 text-emerald-400 placeholder:text-emerald-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                      />
                    </div>
                  </div>

                  {/* QUICK ADVANCE CHIPS */}
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (stayInfo.totalAmount) {
                          setStayInfo((p) => ({
                            ...p,
                            paidAmount: p.totalAmount
                          }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-black transition-all ${
                        stayInfo.paidAmount &&
                        stayInfo.totalAmount &&
                        Number(stayInfo.paidAmount) === Number(stayInfo.totalAmount) &&
                        Number(stayInfo.totalAmount) > 0
                          ? 'bg-emerald-500 text-black shadow-xs'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      ⚡ Full Paid
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (stayInfo.totalAmount) {
                          setStayInfo((p) => ({
                            ...p,
                            paidAmount: Math.round(Number(p.totalAmount) / 2)
                          }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-black transition-all ${
                        stayInfo.paidAmount &&
                        stayInfo.totalAmount &&
                        Number(stayInfo.paidAmount) === Math.round(Number(stayInfo.totalAmount) / 2) &&
                        Number(stayInfo.paidAmount) > 0
                          ? 'bg-amber-400 text-black shadow-xs'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      50% Half
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setStayInfo((p) => ({
                          ...p,
                          paidAmount: '0'
                        }))
                      }
                      className={`px-2 py-1 rounded text-[11px] font-black transition-all ${
                        stayInfo.paidAmount === '0' || stayInfo.paidAmount === 0
                          ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      ₹0 Unpaid
                    </button>
                  </div>
                </div>

                {/* BALANCE DUE */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                    Balance Due
                  </span>
                  <span
                    className={`font-black text-xl font-mono ${
                      (Number(stayInfo.totalAmount) || 0) - (Number(stayInfo.paidAmount) || 0) > 0
                        ? 'text-orange-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    ₹{Math.max(0, (Number(stayInfo.totalAmount) || 0) - (Number(stayInfo.paidAmount) || 0))}
                    {Number(stayInfo.totalAmount) > 0 && (Number(stayInfo.totalAmount) || 0) - (Number(stayInfo.paidAmount) || 0) === 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 ml-1.5 uppercase tracking-wider">
                        (Cleared)
                      </span>
                    )}
                  </span>
                </div>

                {/* PRIMARY GUEST KHATA / WALLET ALERT */}
                {guests[0]?.ledgerBalance !== undefined && Number(guests[0]?.ledgerBalance) !== 0 && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
                    Number(guests[0].ledgerBalance) > 0
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {Number(guests[0].ledgerBalance) > 0 ? (
                        <span>💼 <strong>Advance Wallet:</strong> ₹{Number(guests[0].ledgerBalance).toLocaleString('en-IN')} available</span>
                      ) : (
                        <span>⚠️ <strong>Previous Khata Due:</strong> ₹{Math.abs(Number(guests[0].ledgerBalance)).toLocaleString('en-IN')} pending</span>
                      )}
                    </div>
                    {Number(guests[0].ledgerBalance) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const total = Number(stayInfo.totalAmount) || 0;
                          const avail = Number(guests[0].ledgerBalance) || 0;
                          const pay = Math.min(total, avail);
                          setStayInfo(p => ({
                            ...p,
                            paidAmount: pay,
                            paymentMethod: 'Wallet'
                          }));
                        }}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-lg text-[10px] transition-transform active:scale-95 cursor-pointer shadow shrink-0 ml-2"
                      >
                        Use Wallet
                      </button>
                    )}
                  </div>
                )}

                {/* PAYMENT METHOD SELECTOR (CASH, UPI, CARD, WALLET, KHATA, MIXED) */}
                <PaymentMethodSelector
                  paymentMethod={stayInfo.paymentMethod || 'Cash'}
                  onChangeMethod={(m) => {
                    setStayInfo((p) => {
                      const shouldAutoFill = (m === 'Khata' && (!p.paidAmount || Number(p.paidAmount) === 0));
                      return {
                        ...p,
                        paymentMethod: m,
                        paidAmount: shouldAutoFill ? p.totalAmount : p.paidAmount
                      };
                    });
                  }}
                  totalAmount={Number(stayInfo.paidAmount) || 0}
                  splitBreakdown={stayInfo.splitBreakdown || { cash: '', upi: '', card: '' }}
                  onChangeSplit={(splits) => setStayInfo((p) => ({ ...p, splitBreakdown: splits }))}
                  allowWallet={Number(guests[0]?.ledgerBalance) > 0}
                  walletBalance={Number(guests[0]?.ledgerBalance) || 0}
                  allowKhata={true}
                  theme="dark"
                  qrDetails={{
                    roomNumber: selectedRoomDetails?.roomNumber,
                    guestName: guests[0]?.fullName,
                    hostel: selectedRoomDetails?.hostel || activeHostel || user?.assignedHostel
                  }}
                />

                {/* BROKER / AUTO DRIVER / COMMISSION (OPTIONAL) */}
                <div className="pt-2 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Car size={11} className="text-amber-400" />
                      <span>Auto / Broker / Referral</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBrokersModal(true)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                      title="Open full Brokers & Auto Drivers Directory"
                    >
                      <span>📂 {isHindi ? 'दलाल सूची देखें' : 'View Directory'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
                    {/* 1. Broker Name with Autocomplete */}
                    <div className="col-span-5 relative">
                      <input
                        type="text"
                        placeholder="Broker / Auto Name"
                        value={stayInfo.commissionTo}
                        onFocus={() => setShowBrokerSuggestions(true)}
                        onChange={(e) => {
                          setStayInfo((p) => ({
                            ...p,
                            commissionTo: e.target.value
                          }));
                          setShowBrokerSuggestions(true);
                        }}
                        className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1.5 font-bold text-xs outline-none focus:border-amber-500 text-white placeholder-gray-500"
                      />

                      {/* Suggestions Dropdown */}
                      {showBrokerSuggestions && knownBrokers.length > 0 && (
                        <div className="absolute left-0 bottom-full mb-1 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 max-h-48 overflow-y-auto">
                          <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-800 flex justify-between items-center">
                            <span>Saved Brokers ({knownBrokers.length})</span>
                            <button type="button" onClick={() => setShowBrokerSuggestions(false)} className="text-gray-500 hover:text-white">✕</button>
                          </div>
                          {knownBrokers
                            .filter(b => !stayInfo.commissionTo || b.name.toLowerCase().includes(stayInfo.commissionTo.toLowerCase()) || (b.phone && b.phone.includes(stayInfo.commissionTo)))
                            .slice(0, 5)
                            .map((b, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setStayInfo(p => ({
                                    ...p,
                                    commissionTo: b.name,
                                    commissionPhone: b.phone || p.commissionPhone
                                  }));
                                  setShowBrokerSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors flex items-center justify-between gap-2 border-b border-gray-800/50 last:border-0"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{b.name}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {b.phone ? `📞 ${b.phone}` : 'No phone'} • {b.totalStays} Stays
                                  </p>
                                </div>
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                  ₹{b.totalCommission}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Broker Mobile Number with Direct Call Link */}
                    <div className="col-span-4 relative">
                      <input
                        type="tel"
                        maxLength={13}
                        placeholder="Mobile No."
                        value={stayInfo.commissionPhone}
                        onChange={(e) =>
                          setStayInfo((p) => ({
                            ...p,
                            commissionPhone: e.target.value
                          }))
                        }
                        className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-2 pr-6 py-1.5 font-bold text-xs outline-none focus:border-amber-500 text-white placeholder-gray-500"
                      />
                      {stayInfo.commissionPhone && (
                        <a
                          href={`tel:${stayInfo.commissionPhone.replace(/\D/g, '')}`}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300"
                          title={`Call ${stayInfo.commissionPhone}`}
                        >
                          <Phone size={12} />
                        </a>
                      )}
                    </div>

                    {/* 3. Commission Amount */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="₹ Comm"
                        value={stayInfo.commissionAmount}
                        onChange={(e) =>
                          setStayInfo((p) => ({
                            ...p,
                            commissionAmount: e.target.value
                          }))
                        }
                        className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-2 py-1.5 font-bold text-xs outline-none focus:border-amber-500 text-white placeholder-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* DESKTOP DIRECT NEXT BUTTON */}
                <div className="hidden lg:block pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.99]"
                  >
                    <span>Continue to Guest Details</span>
                    <ArrowRight size={16} />
                  </button>
                  {!isStep1Valid && (
                    <p className="text-[10px] text-gray-500 text-center mt-1.5 font-bold">
                      {!stayInfo.room ? '👉 Please pick a room' : !stayInfo.totalAmount ? '👉 Please enter agreed price' : ''}
                    </p>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* MOBILE DOCKED BAR */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-xl">
            <div className="flex justify-between items-center px-1 pb-2 text-[11px] font-bold text-gray-700">
              <span>
                Room: <span className="font-black text-black">{selectedRoomDetails?.roomNumber || 'Select Room'}</span>
              </span>
              <span>
                Total: <span className="font-black text-black">₹{stayInfo.totalAmount || 0}</span>
                {stayInfo.paidAmount ? ` (Adv: ₹${stayInfo.paidAmount})` : ''}
              </span>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="w-full py-3.5 bg-black text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 active:scale-[0.99] transition-all shadow-lg"
            >
              <span>Continue to Guest Details</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/70 text-blue-900 p-4 rounded-2xl border border-blue-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <p className="text-xs sm:text-sm font-bold leading-tight text-blue-950">
                Identity details required for{' '}
                <span className="underline decoration-blue-400 font-black">{stayInfo.occupants} occupant(s)</span>. Verify original ID physically before check-in.
              </p>
            </div>

            {waSyncEnabled && (
              <button
                type="button"
                onClick={() => setWaModalOpen(true)}
                className={`self-start sm:self-auto px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 shadow-xs active:scale-95 border ${
                  waStatus === 'connected' || waPhone
                    ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                    : waStatus === 'connecting'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${waStatus === 'connected' || waPhone ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <MessageSquare size={13} className="text-emerald-700" />
                <span>
                  {waStatus === 'connected'
                    ? `WhatsApp Active (${waPhone ? `+${waPhone}` : 'Linked'})`
                    : waPhone
                    ? `WhatsApp Active (+${waPhone})`
                    : waStatus === 'connecting'
                    ? 'Connecting WhatsApp...'
                    : 'Connect WhatsApp'}
                </span>
              </button>
            )}
          </div>

          {/* STEP 2 MAIN CONTENT: SPLIT 2-COLUMN LAYOUT ON DESKTOP IF WA SYNC IS ENABLED */}
          <div className={`grid grid-cols-1 ${waSyncEnabled ? 'lg:grid-cols-12 gap-6 items-start' : 'gap-6'}`}>

            {/* LEFT COLUMN: VERTICAL LIVE WHATSAPP INBOX (STICKY ON DESKTOP) */}
            {waSyncEnabled && (
              <aside className="lg:col-span-4 xl:col-span-4 order-2 lg:order-1">
                <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-6rem)]">
                  {/* TOP HEADER */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
                          <MessageSquare size={18} />
                        </div>
                        {(waStatus === 'connected' || waPhone) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider truncate">
                            WhatsApp Inbox
                          </h4>
                          <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0">
                            {waRecentMedia.length}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 truncate">
                          {waPhone ? `+${waPhone}` : (waStatus === 'connecting' ? 'Connecting...' : 'Not linked')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleRefreshWaMedia}
                        disabled={syncingWaMedia}
                        className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                        title="Sync latest WhatsApp photos"
                      >
                        <RefreshCw size={12} className={syncingWaMedia ? 'animate-spin text-emerald-600' : 'text-gray-500'} />
                        <span>Sync</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCleanupUnusedWaMedia}
                        disabled={cleaningWaMedia}
                        className="px-2 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                        title="Delete unused WhatsApp photos from Cloudflare storage"
                      >
                        <Trash2 size={12} className={cleaningWaMedia ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Clean</span>
                      </button>

                      {waStatus === 'disconnected' && !waPhone && (
                        <button
                          type="button"
                          onClick={() => setWaModalOpen(true)}
                          className="px-2.5 py-1.5 bg-black hover:bg-gray-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95"
                          title="Scan QR to connect WhatsApp"
                        >
                          QR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SEARCH & FILTER TABS */}
                  <div className="space-y-2 mb-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search phone or guest name..."
                        value={waSearchTerm}
                        onChange={(e) => setWaSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-black placeholder-gray-400 transition-colors"
                      />
                    </div>

                    {waRecentMedia.length > 0 && (
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setWaFilterTab('all')}
                          className={`flex-1 py-1 rounded-lg transition-all ${waFilterTab === 'all' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          All ({waRecentMedia.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaFilterTab('new')}
                          className={`flex-1 py-1 rounded-lg transition-all ${waFilterTab === 'new' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          New ({waRecentMedia.filter(m => m.status !== 'used').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaFilterTab('used')}
                          className={`flex-1 py-1 rounded-lg transition-all ${waFilterTab === 'used' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Used ({waRecentMedia.filter(m => m.status === 'used').length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* VERTICAL SCROLLABLE LIST OF CARDS */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[220px]">
                    {waRecentMedia.length === 0 ? (
                      <div className="bg-gray-50/70 rounded-2xl border border-gray-200/80 p-5 text-center space-y-2">
                        <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto">
                          <MessageSquare size={20} />
                        </div>
                        <h5 className="text-xs font-black text-gray-900">No Photos Received Yet</h5>
                        <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                          Guest ya receptionist ko WhatsApp par <strong>+{waPhone || 'hotel number'}</strong> par ID bhejne ko bolein. Wo instantly yahan show hogi.
                        </p>
                        <button
                          type="button"
                          onClick={handleRefreshWaMedia}
                          disabled={syncingWaMedia}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all shadow-xs active:scale-95 mt-1"
                        >
                          <RefreshCw size={11} className={syncingWaMedia ? 'animate-spin' : ''} />
                          Check for Photos
                        </button>
                      </div>
                    ) : waRecentMedia.filter((m) => {
                        if (waFilterTab === 'new' && m.status === 'used') return false;
                        if (waFilterTab === 'used' && m.status !== 'used') return false;
                        if (!waSearchTerm.trim()) return true;
                        const term = waSearchTerm.toLowerCase();
                        return (
                          (m.senderPhone && m.senderPhone.includes(term)) ||
                          (m.senderName && m.senderName.toLowerCase().includes(term))
                        );
                      }).length === 0 ? (
                      <div className="bg-gray-50 rounded-2xl p-4 text-center text-xs font-bold text-gray-500">
                        No photos match this filter
                      </div>
                    ) : (
                      waRecentMedia
                        .filter((m) => {
                          if (waFilterTab === 'new' && m.status === 'used') return false;
                          if (waFilterTab === 'used' && m.status !== 'used') return false;
                          if (!waSearchTerm.trim()) return true;
                          const term = waSearchTerm.toLowerCase();
                          return (
                            (m.senderPhone && m.senderPhone.includes(term)) ||
                            (m.senderName && m.senderName.toLowerCase().includes(term))
                          );
                        })
                        .map((media) => {
                          const mediaUrl = media.imageUrl && media.imageUrl.startsWith('http')
                            ? media.imageUrl
                            : `${API}${media.imageUrl}`;
                          const isUsed = media.status === 'used';
                          const isLid = media.senderPhone && (media.senderPhone.startsWith('155') || media.senderPhone.length > 13);
                          const displaySenderName = media.senderName || (isLid ? 'WhatsApp Contact' : `+${media.senderPhone}`);
                          const displayPhone = isLid ? 'Via WhatsApp' : `+${media.senderPhone}`;

                          return (
                            <div
                              key={media._id}
                              className={`bg-white rounded-2xl border p-3 shadow-xs transition-all hover:shadow-md ${
                                isUsed ? 'border-gray-200 bg-gray-50/40 opacity-85' : 'border-gray-200 hover:border-black'
                              }`}
                            >
                              {/* SENDER INFO */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-gray-900 truncate">
                                    {displaySenderName}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-bold truncate">
                                    {displayPhone}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-1.5">
                                  {isUsed && (
                                    <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                      <CheckCircle2 size={10} className="text-emerald-600" /> Attached
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-gray-400 block">
                                    {new Date(media.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              {/* IMAGE PREVIEW */}
                              <div
                                onClick={() => setWaPreviewImage(mediaUrl)}
                                className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-2.5 cursor-pointer group border border-gray-200/80 flex items-center justify-center"
                                title="Click to zoom preview"
                              >
                                <img
                                  src={mediaUrl}
                                  alt="WhatsApp ID"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider gap-1 backdrop-blur-[2px]">
                                  <Search size={13} /> Zoom Photo
                                </div>
                              </div>

                              {/* 1-CLICK ATTACH & OCR BUTTONS */}
                              <div className="space-y-2 pt-2 border-t border-gray-100">
                                {guests.map((g, gIdx) => (
                                  <div key={gIdx} className="space-y-1">
                                    {guests.length > 1 && (
                                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-500">
                                        <span>Guest {gIdx + 1} {g.fullName ? `(${g.fullName.split(' ')[0]})` : ''}</span>
                                        {gIdx === 0 && <span className="text-emerald-700">Primary</span>}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleApplyWhatsAppPhoto(gIdx, mediaUrl, 'front', media._id)}
                                        disabled={scanningOcr.index === gIdx && scanningOcr.side === 'front'}
                                        className="py-1.5 px-2 bg-gray-900 hover:bg-black text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-wider text-center active:scale-95 shadow-xs disabled:opacity-50 flex items-center justify-center gap-1"
                                      >
                                        {scanningOcr.index === gIdx && scanningOcr.side === 'front' ? (
                                          <>
                                            <RefreshCw size={10} className="animate-spin text-emerald-400" />
                                            <span>Scanning...</span>
                                          </>
                                        ) : (
                                          <>
                                            <FileText size={11} className="text-emerald-400" />
                                            <span>+ Front ID</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyWhatsAppPhoto(gIdx, mediaUrl, 'back', media._id)}
                                        disabled={scanningOcr.index === gIdx && scanningOcr.side === 'back'}
                                        className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-wider text-center active:scale-95 shadow-xs disabled:opacity-50 flex items-center justify-center gap-1"
                                      >
                                        {scanningOcr.index === gIdx && scanningOcr.side === 'back' ? (
                                          <>
                                            <RefreshCw size={10} className="animate-spin" />
                                            <span>Scanning...</span>
                                          </>
                                        ) : (
                                          <>
                                            <RotateCcw size={11} />
                                            <span>+ Back ID</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </aside>
            )}

            {/* RIGHT COLUMN: GUEST FORMS & ACTIONS */}
            <div className={`${waSyncEnabled ? 'lg:col-span-8 xl:col-span-8 order-1 lg:order-2' : ''} space-y-6`}>

          {/* GUESTS */}


          {frequentCoGuests.length > 0 && (
            <div className="bg-gray-50/90 border border-gray-200/90 p-4 sm:p-5 rounded-2xl mb-6 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="text-gray-500" />
                  <span>Past Companions / Co-Guests</span>
                </h4>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                  {frequentCoGuests.length} Found
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 font-medium">
                Previously accompanied this guest. Click any companion below to auto-fill Guest 2 (or next slot) instantly:
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
                {frequentCoGuests.filter(Boolean).map((cg, cgIdx) => (
                  <button
                    key={cg._id || cgIdx}
                    type="button"
                    onClick={() => {
                      const emptyIdx = guests.findIndex((g, i) => i > 0 && !g.fullName);
                      if (emptyIdx !== -1) {
                        setGuests(prev => {
                          const updated = [...prev];
                          updated[emptyIdx] = {
                            ...updated[emptyIdx],
                            fullName: cg.fullName || '',
                            mobileNumber: cg.mobileNumber || '',
                            idProofType: cg.idProofType || 'Aadhaar',
                            idProofNumber: cg.idProofNumber || '',
                            idProofImage: cg.idProofImage || '',
                            idProofImageBack: cg.idProofImageBack || '',
                            gender: cg.gender || '',
                            dateOfBirth: cg.dateOfBirth || '',
                            address: cg.address || '',
                            _id: cg._id || null,
                            isSearching: false
                          };
                          return updated;
                        });
                        toast({ message: `${cg.fullName} added to Guest ${emptyIdx + 1}!`, type: 'success' });
                      } else {
                        setGuests(prev => [
                          ...prev,
                          {
                            fullName: cg.fullName || '',
                            mobileNumber: cg.mobileNumber || '',
                            idProofType: cg.idProofType || 'Aadhaar',
                            idProofNumber: cg.idProofNumber || '',
                            idProofImage: cg.idProofImage || '',
                            idProofImageBack: cg.idProofImageBack || '',
                            gender: cg.gender || '',
                            dateOfBirth: cg.dateOfBirth || '',
                            address: cg.address || '',
                            _id: cg._id || null,
                            isSearching: false
                          }
                        ]);
                        setStayInfo(p => ({ ...p, occupants: (Number(p.occupants) || 1) + 1 }));
                        toast({ message: `${cg.fullName} added as Guest ${guests.length + 1}!`, type: 'success' });
                      }
                    }}
                    className="shrink-0 flex items-center gap-3 bg-white hover:bg-gray-100/80 px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-black transition-all active:scale-95 cursor-pointer text-left group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-black">
                      {cg.fullName?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 group-hover:text-black leading-tight flex items-center gap-1.5">
                        <span>{cg.fullName}</span>
                        {cgIdx === 0 && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded">
                            Recent
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{cg.mobileNumber || 'No phone'}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-white transition-colors ml-1 shrink-0">
                      <Plus size={12} />
                    </div>
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

                  {guest.isAadhaarVerified && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                      <ShieldCheck size={13} className="text-emerald-700" />
                      UIDAI Verified
                    </span>
                  )}

                  {guest._id && (
                    <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Returning
                    </span>
                  )}

                </div>

                {/* FORM */}

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">

                  {guest.isAadhaarVerified && (
                    <div className="col-span-1 md:col-span-2 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                            UIDAI Digitally Verified & Genuine
                          </p>
                          <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            Authentic tamper-proof QR validated • {guest.aadhaarQrType || 'UIDAI Secure QR'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
                        100% Genuine ID
                      </span>
                    </div>
                  )}

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

                  {/* ID & DEMOGRAPHICS: ID TYPE, ID NUMBER (WITH VERHOEFF CHECK), GENDER & DOB */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        ID Type
                      </label>
                      <select
                        value={guest.idProofType}
                        onChange={(e) =>
                          handleGuestChange(
                            index,
                            'idProofType',
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors"
                      >
                        <option>Aadhaar</option>
                        <option>Passport</option>
                        <option>DL</option>
                        <option>Voter ID</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>ID Number</span>
                        {guest.isAadhaarVerified ? (
                          <span className="text-emerald-700 text-[9px] flex items-center gap-0.5 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck size={10} /> QR Verified
                          </span>
                        ) : guest.idProofType === 'Aadhaar' && guest.idProofNumber && (guest.idProofNumber.replace(/\s+/g, '').length === 12) ? (
                          (() => {
                            const validRes = validateAadhaarNumber(guest.idProofNumber);
                            return validRes.valid ? (
                              <span className="text-emerald-700 text-[9px] flex items-center gap-0.5 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <ShieldCheck size={10} /> Valid Checksum
                              </span>
                            ) : (
                              <span className="text-red-500 text-[9px] flex items-center gap-0.5 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title={validRes.error}>
                                <AlertTriangle size={10} /> Fake/Invalid
                              </span>
                            );
                          })()
                        ) : guest.idProofNumber && guest.idProofImage ? (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> Auto
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="text"
                        placeholder={guest.idProofType === 'Aadhaar' ? "12-digit Aadhaar Number" : "ID Number"}
                        value={guest.idProofNumber || ''}
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
                        <span>Gender</span>
                        {guest.isAadhaarVerified ? (
                          <span className="text-emerald-700 text-[9px] flex items-center gap-0.5 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck size={10} /> QR Auto
                          </span>
                        ) : guest.gender && (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> Auto
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
                        <span>DOB / Year</span>
                        {guest.isAadhaarVerified ? (
                          <span className="text-emerald-700 text-[9px] flex items-center gap-0.5 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck size={10} /> QR Auto
                          </span>
                        ) : guest.dateOfBirth && (
                          <span className="text-purple-600 text-[9px] flex items-center gap-0.5 font-bold">
                            <Sparkles size={10} /> Auto
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

                  {/* ID PROOF DOCUMENT UPLOADS */}
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-gray-100">
                    {/* FRONT SIDE */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          ID Front (Opt)
                        </label>
                        {waSyncEnabled && waRecentMedia.length > 0 && !guest.idProofImage && (
                          <button
                            type="button"
                            onClick={() => handleOpenWaPicker(index, 'front')}
                            className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-all"
                            title="Select from WhatsApp Inbox"
                          >
                            <MessageSquare size={10} />
                            <span>WA ({waRecentMedia.length})</span>
                          </button>
                        )}
                      </div>

                      {!guest.idProofImage ? (
                        <>
                          <div 
                            className="grid grid-cols-2 gap-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files[0];
                              if (f) handleImageUpload(index, f, 'front');
                            }}
                          >
                            <label
                              htmlFor={`cam-front-${index}`}
                              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black rounded-2xl cursor-pointer transition-all group text-gray-600 hover:text-black"
                            >
                              <Camera size={18} className="text-gray-500 group-hover:text-black transition-colors" />
                              <span className="text-[11px] font-black uppercase tracking-wider">
                                Camera
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
                              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black rounded-2xl cursor-pointer transition-all group text-gray-600 hover:text-black"
                            >
                              <ImageIcon size={18} className="text-gray-500 group-hover:text-black transition-colors" />
                              <span className="text-[11px] font-black uppercase tracking-wider">
                                Upload
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
                          {scanningQr.index === index && scanningQr.side === 'front' && (
                            <div className="mt-2 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                              <ShieldCheck size={13} className="text-emerald-600 animate-bounce" />
                              Scanning Aadhaar Secure QR Code...
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
                            <img 
                              src={getFullImageUrl(guest.idProofImage)} 
                              alt="ID Front" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={getFullImageUrl(guest.idProofImage)} target="_blank" rel="noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-2.5 py-1.5 rounded-full backdrop-blur-sm hover:bg-black transition-colors">
                                View Full
                              </a>
                              <button
                                type="button"
                                onClick={() => handleManualScanAadhaarQr(index, guest.idProofImage, 'front')}
                                className="text-white text-[10px] font-black uppercase tracking-widest bg-emerald-600/90 hover:bg-emerald-500 px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-colors flex items-center gap-1 shadow-xs"
                                title="Scan Aadhaar QR"
                              >
                                <QrCode size={11} /> Scan QR
                              </button>
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
                          {scanningQr.index === index && scanningQr.side === 'front' && (
                            <div className="mt-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 p-1.5 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                              <ShieldCheck size={12} className="text-emerald-600 animate-bounce" />
                              Scanning Aadhaar QR...
                            </div>
                          )}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          ID Back (Opt)
                        </label>
                        {waSyncEnabled && waRecentMedia.length > 0 && !guest.idProofImageBack && (
                          <button
                            type="button"
                            onClick={() => handleOpenWaPicker(index, 'back')}
                            className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-all"
                            title="Select from WhatsApp Inbox"
                          >
                            <MessageSquare size={10} />
                            <span>WA ({waRecentMedia.length})</span>
                          </button>
                        )}
                      </div>

                      {!guest.idProofImageBack ? (
                        <>
                          <div 
                            className="grid grid-cols-2 gap-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files[0];
                              if (f) handleImageUpload(index, f, 'back');
                            }}
                          >
                            <label
                              htmlFor={`cam-back-${index}`}
                              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black rounded-2xl cursor-pointer transition-all group text-gray-600 hover:text-black"
                            >
                              <Camera size={18} className="text-gray-500 group-hover:text-black transition-colors" />
                              <span className="text-[11px] font-black uppercase tracking-wider">
                                Camera
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
                              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black rounded-2xl cursor-pointer transition-all group text-gray-600 hover:text-black"
                            >
                              <ImageIcon size={18} className="text-gray-500 group-hover:text-black transition-colors" />
                              <span className="text-[11px] font-black uppercase tracking-wider">
                                Upload
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
                          {scanningQr.index === index && scanningQr.side === 'back' && (
                            <div className="mt-2 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                              <ShieldCheck size={13} className="text-emerald-600 animate-bounce" />
                              Scanning Aadhaar Secure QR Code...
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
                            <img 
                              src={getFullImageUrl(guest.idProofImageBack)} 
                              alt="ID Back" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={getFullImageUrl(guest.idProofImageBack)} target="_blank" rel="noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-2.5 py-1.5 rounded-full backdrop-blur-sm hover:bg-black transition-colors">
                                View Full
                              </a>
                              <button
                                type="button"
                                onClick={() => handleManualScanAadhaarQr(index, guest.idProofImageBack, 'back')}
                                className="text-white text-[10px] font-black uppercase tracking-widest bg-emerald-600/90 hover:bg-emerald-500 px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-colors flex items-center gap-1 shadow-xs"
                                title="Scan Aadhaar QR"
                              >
                                <QrCode size={11} /> Scan QR
                              </button>
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
                          {scanningQr.index === index && scanningQr.side === 'back' && (
                            <div className="mt-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 p-1.5 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                              <ShieldCheck size={12} className="text-emerald-600 animate-bounce" />
                              Scanning Aadhaar QR...
                            </div>
                          )}
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
                  <div className="col-span-1 md:col-span-2 pt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        Address <span className="text-gray-400 font-normal">(Optional)</span>
                      </span>
                      {guest.isAadhaarVerified ? (
                        <span className="text-emerald-700 text-[10px] flex items-center gap-1 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <ShieldCheck size={11} /> UIDAI QR Auto-Filled
                        </span>
                      ) : guest.address && (
                        <span className="text-purple-600 text-[10px] flex items-center gap-1 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          <Sparkles size={11} /> AI Auto-Filled
                        </span>
                      )}
                    </label>
                    <textarea
                      placeholder="Permanent address (Street / Flat, Area, City, State, PIN)"
                      value={guest.address || ''}
                      onChange={(e) =>
                        handleGuestChange(index, 'address', e.target.value)
                      }
                      rows="2"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-2xl focus:border-black focus:bg-white focus:ring-0 outline-none font-medium text-xs text-gray-900 transition-colors resize-none placeholder:text-gray-400"
                    ></textarea>
                  </div>

                </div>
              </div>
            )
          )}

          {/* BOTTOM BUTTONS */}

          <div className="fixed md:static bottom-16 md:bottom-0 left-0 right-0 p-3 sm:p-4 md:p-0 bg-white/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-0 border-gray-200 z-30 flex items-center gap-2 sm:gap-3 max-w-4xl mx-auto md:mt-8 shadow-lg md:shadow-none">

            <button
              onClick={() =>
                setStep(1)
              }
              className="px-3.5 sm:px-6 py-3.5 sm:py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 shrink-0 flex items-center justify-center"
              title="Go Back"
            >
              <ArrowLeft
                size={18}
              />

              <span className="hidden sm:inline uppercase tracking-widest text-xs font-black ml-1.5">
                Back
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGrcModalOpen(true)}
              className="px-3 sm:px-5 py-3.5 sm:py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
              title="Preview & Print Guest Registration Card"
            >
              <Printer size={16} className="text-emerald-700" />
              <span className="hidden sm:inline font-black">Print GRC</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={
                isCurrentPropertyExpired ||
                !isStep2Valid ||
                loading ||
                uploadingImage
              }
              className="flex-1 py-3.5 sm:py-4 px-3 bg-black text-white rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98] min-w-0"
              title={isCurrentPropertyExpired ? 'Subscription plan has expired for this property' : ''}
            >
              <span className="truncate">
                {isCurrentPropertyExpired
                  ? '🔒 Plan Expired'
                  : loading
                  ? 'Finalizing...'
                  : 'Complete Check-In'}
              </span>

              <CheckCircle2 size={16} className="shrink-0" />
            </button>

          </div>

            </div>
          </div>

        </div>
      )}

      {/* =====================================================
          WHATSAPP QR CONNECTION MODAL
      ===================================================== */}
      {waModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setWaModalOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full my-0 sm:my-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl border border-gray-100 relative max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setWaModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-5 pr-8">
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
                    Connected Number: <span className="text-emerald-700 font-black">{waPhone ? `+${waPhone}` : 'Connected Device'}</span>
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
                {/* CONNECTION METHOD TABS */}
                <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('code')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      waConnectTab === 'code'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Phone size={14} />
                    <span>Link with Phone (Recommended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWaConnectTab('qr');
                      if (!waQr) handleStartWhatsApp();
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      waConnectTab === 'qr'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>Scan QR Code</span>
                  </button>
                </div>

                {/* TAB 1: PHONE NUMBER 8-DIGIT PAIRING CODE */}
                {waConnectTab === 'code' && (
                  <div>
                    {!waPairingCode ? (
                      <form onSubmit={handleRequestPairingCode} className="space-y-4">
                        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 space-y-2 text-xs font-bold text-gray-700">
                          <p className="font-black text-emerald-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                            <Sparkles size={14} className="text-emerald-600" />
                            100% Reliable & No Camera Scan Needed
                          </p>
                          <p className="text-gray-600 font-medium leading-relaxed">
                            Enter the phone number logged into WhatsApp. You will receive an official <strong>8-digit pairing code</strong> (e.g. <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-black text-emerald-800">ABCD-1234</span>) to enter directly on your phone.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-gray-700 mb-1.5 tracking-wider">
                            Reception WhatsApp Number
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="tel"
                              placeholder="e.g. 9876543210 or 919876543210"
                              value={waPairingPhone}
                              onChange={(e) => setWaPairingPhone(e.target.value)}
                              className="w-full sm:flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={loadingPairingCode || !waPairingPhone.trim()}
                              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                            >
                              {loadingPairingCode ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Phone size={14} />
                              )}
                              <span>Get 8-Digit Code</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">
                            India country code (+91) will be added automatically if 10 digits entered.
                          </p>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4 text-center">
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-2">
                          <p className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                            Your 8-Digit WhatsApp Pairing Code
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono text-3xl font-black text-emerald-700 tracking-widest bg-white px-5 py-2.5 rounded-xl border border-emerald-300 shadow-sm select-all">
                              {waPairingCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(waPairingCode.replace('-', ''));
                                setCodeCopied(true);
                                setTimeout(() => setCodeCopied(false), 2000);
                              }}
                              className="p-3 bg-white text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-300 shadow-sm transition-all"
                              title="Copy code"
                            >
                              {codeCopied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-600 font-bold mt-2">
                            Enter this code on your phone to link immediately!
                          </p>
                        </div>

                        {/* PHONE STEPS */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs font-bold text-gray-700 text-left">
                          <p className="font-black text-gray-900 uppercase text-[11px] tracking-wider mb-1">
                            Steps on Reception Phone:
                          </p>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                            <span>Open <strong>WhatsApp</strong> ➜ tap <strong>3 Dots / Settings</strong> ➜ <strong>Linked Devices</strong></span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                            <span>Tap <strong>Link a Device</strong> ➜ tap <strong>"Link with phone number instead"</strong> (bottom)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                            <span>Enter the 8-digit code <strong className="font-mono text-emerald-800">{waPairingCode}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Waiting for WhatsApp confirmation... Auto-connects!</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setWaPairingCode('')}
                          className="text-xs text-gray-500 hover:text-gray-800 underline font-bold"
                        >
                          Need a new code or change phone number?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: QR CODE SCAN */}
                {waConnectTab === 'qr' && (
                  <div>
                    {/* INSTRUCTIONS */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs font-bold text-gray-700 mb-3">
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
                      {waPairing ? (
                        <div className="h-60 flex flex-col items-center justify-center bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 p-6 space-y-3 text-center animate-in fade-in">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                            <RefreshCw size={26} className="animate-spin" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-900">QR Scanned! Linking Device...</h4>
                            <p className="text-xs font-bold text-emerald-800 mt-1 max-w-xs mx-auto">
                              WhatsApp server authenticating phone keys. Finalizing connection, please wait 2-3 seconds...
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>Auto-connecting... Keep phone unlocked</span>
                          </div>
                        </div>
                      ) : waQr ? (
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
                      ) : (waStatus === 'connecting' || loadingWa) ? (
                        <div className="h-60 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6 space-y-3 text-center animate-in fade-in">
                          <RefreshCw size={32} className="animate-spin text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-black text-gray-900">Generating QR Code...</h4>
                            <p className="text-xs font-bold text-gray-500 mt-1 max-w-xs mx-auto">
                              Connecting to WhatsApp Web to create a fresh QR code. Please wait...
                            </p>
                          </div>
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
                  </div>
                )}

                {/* PRO TIP / ALTERNATIVE */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-purple-900 leading-tight">
                    <strong>2-Second Shortcut:</strong> On WhatsApp Web, right-click photo ➜ <em>"Copy Image"</em> ➜ press <kbd className="bg-purple-200 px-1 py-0.5 rounded text-[10px] font-black">Ctrl + V</kbd> on Check-In screen without linking phone!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================
          WHATSAPP PHOTO PICKER MODAL
      ===================================================== */}
      {waPickerOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setWaPickerOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full my-0 sm:my-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl border border-gray-100 relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setWaPickerOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-4 pr-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  Choose WhatsApp Photo for Guest {waPickerTarget.index + 1}
                </h3>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">
                  Target: {waPickerTarget.side === 'front' ? 'Front ID Proof' : 'Back ID Proof'}
                </p>
              </div>
            </div>

            {/* SEARCH & REFRESH BAR */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sender phone or name..."
                  value={waSearchTerm}
                  onChange={(e) => setWaSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleRefreshWaMedia}
                className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 font-black text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw size={13} />
                <span>Sync</span>
              </button>
              <button
                type="button"
                onClick={handleCleanupUnusedWaMedia}
                disabled={cleaningWaMedia}
                className="px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                title="Delete unused WhatsApp photos from Cloudflare storage"
              >
                <Trash2 size={13} className={cleaningWaMedia ? 'animate-spin' : ''} />
                <span>Clean Junk</span>
              </button>
            </div>

            {/* CARDS LIST / GRID */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {waRecentMedia.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="text-sm font-black text-gray-800">No WhatsApp Photos Found</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto font-medium">
                    Ask the guest to send their photo to WhatsApp. Once sent, click <strong>Sync</strong> above.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshWaMedia}
                    className="px-4 py-2 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-md"
                  >
                    Check for New Photos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {waRecentMedia
                    .filter((m) => {
                      if (!waSearchTerm.trim()) return true;
                      const term = waSearchTerm.toLowerCase();
                      return (
                        (m.senderPhone && m.senderPhone.includes(term)) ||
                        (m.senderName && m.senderName.toLowerCase().includes(term))
                      );
                    })
                    .map((media) => {
                      const mediaUrl = media.imageUrl && media.imageUrl.startsWith('http')
                        ? media.imageUrl
                        : `${API}${media.imageUrl}`;

                      const isLid = media.senderPhone && (media.senderPhone.length > 13 || media.senderPhone.startsWith('155'));
                      const displayName = media.senderName 
                        ? media.senderName 
                        : (isLid ? 'WhatsApp Contact' : `+${media.senderPhone}`);
                      const displaySub = isLid 
                        ? 'Via WhatsApp' 
                        : `+${media.senderPhone}`;

                      return (
                        <div
                          key={media._id}
                          className="bg-gray-50 rounded-2xl p-3 border border-gray-200 hover:border-emerald-500 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div
                              onClick={() => setWaPreviewImage(mediaUrl)}
                              className="relative h-32 rounded-xl overflow-hidden bg-gray-200 mb-2.5 cursor-pointer group"
                            >
                              <img 
                                src={mediaUrl} 
                                alt="WhatsApp ID" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider">
                                Click to Zoom
                              </div>
                            </div>
                            <p className="text-xs font-black text-gray-900 truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold mb-3 truncate">
                              {displaySub} • {new Date(media.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyWhatsAppPhoto(waPickerTarget.index, mediaUrl, waPickerTarget.side, media._id);
                              setWaPickerOpen(false);
                            }}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <Check size={14} />
                            <span>Select for {waPickerTarget.side.toUpperCase()} ID</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================
          PHOTO ZOOM PREVIEW MODAL
      ===================================================== */}
      {waPreviewImage && createPortal(
        <div 
          onClick={() => setWaPreviewImage(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[92vh] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setWaPreviewImage(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 bg-black/60 text-white hover:bg-white hover:text-black p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img src={waPreviewImage} alt="WhatsApp ID Full" className="max-w-full max-h-[85vh] object-contain rounded-xl sm:rounded-2xl mx-auto" />
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================
          GUEST REGISTRATION CARD (GRC) MODAL FOR PRINT & SIGN
      ===================================================== */}
      <GuestRegistrationCardModal
        isOpen={grcModalOpen}
        onClose={() => {
          setGrcModalOpen(false);
          if (createdStayData) {
            navigate('/dashboard');
          }
        }}
        stayData={createdStayData || {
          room: stayInfo.room,
          durationDays: stayInfo.durationDays,
          durationHours: stayInfo.durationHours,
          occupants: stayInfo.occupants,
          totalAmount: stayInfo.totalAmount,
          paidAmount: stayInfo.paidAmount,
          paymentMethod: stayInfo.paymentMethod
        }}
        roomData={selectedRoomDetails}
        guests={guests}
        hotelData={propertyData || selectedRoomDetails?.hostel}
        onProceedToDashboard={createdStayData ? () => navigate('/dashboard') : null}
      />

      {/* BROKERS & AUTO DRIVERS DIRECTORY MODAL */}
      <BrokersDirectoryModal
        isOpen={showBrokersModal}
        onClose={() => setShowBrokersModal(false)}
        defaultHostel={
          (globalProperty && globalProperty !== 'all')
            ? globalProperty
            : (activeHostel?._id || (typeof user?.assignedHostel === 'object' ? user.assignedHostel?._id : user?.assignedHostel) || 'all')
        }
        onSelectBroker={(b) => {
          setStayInfo(p => ({
            ...p,
            commissionTo: b.name,
            commissionPhone: b.phone || p.commissionPhone
          }));
        }}
      />

    </div>
  );
};

export default CheckIn;
