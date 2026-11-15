import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  X, 
  Check, 
  Copy, 
  Crown, 
  Building, 
  Users, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  LogIn, 
  MessageSquare, 
  Clock, 
  Receipt,
  Phone,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'resort', label: 'Resort', icon: '🏖️' },
  { value: 'homestay', label: 'Homestay', icon: '🏡' },
  { value: 'guesthouse', label: 'Guest House', icon: '🏢' },
  { value: 'hostel', label: 'Hostel', icon: '🛏️' },
  { value: 'villa', label: 'Villa / Cottage', icon: '⛺' }
];

const OnboardingWizardModal = ({
  isOpen,
  onClose,
  initialData = {},
  ownersList = [],
  salesAgentsList = [],
  currentUserRole = 'sales',
  onSuccess,
  onImpersonate
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isExistingOwnerMode, setIsExistingOwnerMode] = useState(false);
  const [createStaffNow, setCreateStaffNow] = useState(false); // Staff is strictly optional!

  // Form Data
  const [wizardData, setWizardData] = useState({
    // Lead context
    leadId: null,

    // Step 1: Owner
    ownerId: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerPassword: 'password123',

    // Step 2: Hotel Identity & Operations
    hostelId: '',
    hotelName: '',
    propertyType: 'hotel',
    logo: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    contactNumber: '',
    maxRooms: 20,
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    upiId: '',
    upiPayeeName: '',
    gstEnabled: false,
    gstin: '',
    assignedSalesAgent: '',

    // Step 3: Plan & Custom Pricing & Optional Staff
    plan: 'demo',
    planDays: 7,
    basePrice: 0,
    discountAmount: 0,
    extraCharges: 0,
    planPrice: 0,
    planNotes: '7-Day Free Live Trial',
    billingCycle: 'trial',

    staffId: '',
    staffName: 'Front Desk Officer',
    staffPhone: '',
    staffEmail: '',
    staffPassword: 'password123'
  });

  const [createdSummary, setCreatedSummary] = useState(null);

  // Initialize from initialData (e.g. Lead prefill)
  useEffect(() => {
    if (initialData) {
      const cleanHotel = (initialData.hotelName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanContact = (initialData.ownerName || initialData.contactPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const phone = initialData.phone || initialData.ownerPhone || '';

      setWizardData(prev => ({
        ...prev,
        leadId: initialData.leadId || initialData._id || null,
        ownerId: initialData.ownerId || '',
        ownerName: initialData.ownerName || initialData.contactPerson || '',
        ownerPhone: phone,
        ownerEmail: initialData.ownerEmail || initialData.email || (cleanContact ? `${cleanContact}@hotelmail.com` : ''),
        hotelName: initialData.hotelName || '',
        city: initialData.city || '',
        address: initialData.address || initialData.city || '',
        contactNumber: phone,
        maxRooms: initialData.roomCount || initialData.maxRooms || 20,
        staffPhone: phone,
        staffEmail: cleanHotel ? `desk@${cleanHotel}.com` : '',
        assignedSalesAgent: initialData.assignedSalesAgent || ''
      }));

      if (initialData.ownerId) {
        setIsExistingOwnerMode(true);
      }
    }
  }, [initialData]);

  // Handle Logo Upload & Compression
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressed);

      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data?.url) {
        setWizardData(prev => ({ ...prev, logo: res.data.url }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload hotel photo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // 🎟️ Plan Selection & Dynamic Pricing Helpers
  const handleSelectPlan = (planType) => {
    let base = 0;
    let days = 7;
    let cycle = 'trial';
    let notes = '';

    if (planType === 'demo') {
      base = 0;
      days = 7;
      cycle = 'trial';
      notes = '7-Day Free Live Trial';
    } else if (planType === 'monthly') {
      base = 1000;
      days = 30;
      cycle = 'monthly';
      notes = 'Monthly Plan (₹1,000/mo)';
    } else if (planType === 'yearly' || planType === 'annual') {
      base = 9600; // ₹800/mo * 12
      days = 365;
      cycle = 'yearly';
      notes = 'Annual Plan (₹800/mo · Billed ₹9,600/yr)';
    }

    const discount = Number(wizardData.discountAmount) || 0;
    const extra = Number(wizardData.extraCharges) || 0;
    const finalPrice = Math.max(0, base - discount + extra);

    setWizardData(prev => ({
      ...prev,
      plan: planType,
      planDays: days,
      basePrice: base,
      planPrice: planType === 'demo' ? 0 : finalPrice,
      billingCycle: cycle,
      planNotes: notes
    }));
  };

  const handlePriceAdjustment = (field, value) => {
    const numVal = Number(value) || 0;
    setWizardData(prev => {
      const updated = { ...prev, [field]: numVal };
      if (prev.plan === 'demo') return updated;
      const base = Number(updated.basePrice) || (prev.plan === 'yearly' ? 9600 : 1000);
      const discount = field === 'discountAmount' ? numVal : (Number(updated.discountAmount) || 0);
      const extra = field === 'extraCharges' ? numVal : (Number(updated.extraCharges) || 0);
      const calculated = Math.max(0, base - discount + extra);
      return {
        ...updated,
        planPrice: calculated
      };
    });
  };

  // 1️⃣ SUBMIT STEP 1: Owner Details
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (isExistingOwnerMode) {
      if (!wizardData.ownerId) return alert('Please select an existing owner from the list');
      setStep(2);
      return;
    }

    if (!wizardData.ownerName.trim() || !wizardData.ownerEmail.trim()) {
      return alert('Owner Name and Email are required');
    }

    try {
      setSubmitting(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/api/sales/owners`,
        {
          name: wizardData.ownerName.trim(),
          email: wizardData.ownerEmail.trim(),
          phone: wizardData.ownerPhone.trim(),
          password: wizardData.ownerPassword || 'password123'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newOwner = res.data.data;
      setWizardData(prev => ({
        ...prev,
        ownerId: newOwner._id,
        contactNumber: prev.contactNumber || newOwner.phone || ''
      }));
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create hotel owner account');
    } finally {
      setSubmitting(false);
    }
  };

  // 2️⃣ SUBMIT STEP 2: Hotel Profile & Branding
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!wizardData.hotelName.trim()) return alert('Hotel name is required');
    if (!wizardData.ownerId) return alert('Owner missing, please go back to Step 1');

    // Auto-advance to Step 3 (Plan & Staff)
    const cleanHotel = wizardData.hotelName.toLowerCase().replace(/[^a-z0-9]/g, '');
    setWizardData(prev => ({
      ...prev,
      staffEmail: prev.staffEmail || `desk@${cleanHotel || 'hotel'}.com`,
      contactNumber: prev.contactNumber || prev.ownerPhone || ''
    }));
    setStep(3);
  };

  // 3️⃣ SUBMIT STEP 3: Complete Provisioning & Plan Assignment
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (!wizardData.hotelName.trim() || !wizardData.ownerId) {
      return alert('Hotel Name or Owner ID missing');
    }

    try {
      setSubmitting(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const token = localStorage.getItem('token');
      const isDemo = wizardData.plan === 'demo';
      const isYearly = wizardData.plan === 'yearly' || wizardData.plan === 'annual';
      const durationDays = isDemo ? 7 : (isYearly ? 365 : 30);
      const planPrice = isDemo ? 0 : Number(wizardData.planPrice || 0);
      const startDate = new Date();
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Create Hotel Property
      const propPayload = {
        name: wizardData.hotelName.trim(),
        propertyType: wizardData.propertyType || 'hotel',
        logo: wizardData.logo || undefined,
        address: wizardData.address || 'N/A',
        city: wizardData.city || undefined,
        state: wizardData.state || undefined,
        pincode: wizardData.pincode || undefined,
        contactNumber: wizardData.contactNumber || wizardData.ownerPhone || 'N/A',
        email: wizardData.ownerEmail,
        owner: wizardData.ownerId,
        plan: wizardData.plan,
        planStatus: isDemo ? 'trial' : 'active',
        planStartDate: startDate.toISOString().split('T')[0],
        planEndDate: endDate.toISOString().split('T')[0],
        planPrice,
        discountAmount: Number(wizardData.discountAmount) || 0,
        extraCharges: Number(wizardData.extraCharges) || 0,
        planNotes: wizardData.planNotes || (isDemo ? '7-Day Free Live Trial' : (isYearly ? 'Annual Plan (₹800/mo)' : 'Monthly Plan (₹1,000/mo)')),
        billingCycle: isDemo ? 'trial' : (isYearly ? 'yearly' : 'monthly'),
        maxRooms: Number(wizardData.maxRooms) || 20,
        upiId: wizardData.upiId ? wizardData.upiId.trim() : undefined,
        upiPayeeName: wizardData.upiPayeeName ? wizardData.upiPayeeName.trim() : undefined,
        gstEnabled: wizardData.gstEnabled,
        gstin: wizardData.gstin ? wizardData.gstin.trim().toUpperCase() : undefined,
        checkInTime: wizardData.checkInTime || '12:00 PM',
        checkOutTime: wizardData.checkOutTime || '11:00 AM',
        leadId: wizardData.leadId || undefined
      };

      const hotelRes = await axios.post(`${API}/api/sales/properties`, propPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const createdHotel = hotelRes.data.data;
      let createdStaff = null;

      // Optional: Create Receptionist Staff if checked
      if (createStaffNow && wizardData.staffName.trim()) {
        try {
          const staffRes = await axios.post(
            `${API}/api/sales/staff`,
            {
              name: wizardData.staffName.trim(),
              email: wizardData.staffEmail.trim() || `reception@${createdHotel._id}.com`,
              phone: wizardData.staffPhone || wizardData.contactNumber || '',
              password: wizardData.staffPassword || 'password123',
              assignedHostel: createdHotel._id
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          createdStaff = staffRes.data.data;
        } catch (staffErr) {
          console.warn('Staff creation warning:', staffErr);
        }
      }

      // Success Summary
      setCreatedSummary({
        hostelId: createdHotel._id,
        hotelName: createdHotel.name,
        propertyType: createdHotel.propertyType,
        logo: createdHotel.logo,
        city: createdHotel.city,
        ownerId: wizardData.ownerId,
        ownerName: wizardData.ownerName,
        ownerEmail: wizardData.ownerEmail,
        ownerPhone: wizardData.ownerPhone,
        ownerPassword: wizardData.ownerPassword || 'password123',
        staffId: createdStaff?._id || null,
        staffName: createdStaff?.name || null,
        staffEmail: createdStaff?.email || null,
        staffPhone: createdStaff?.phone || null,
        staffPassword: wizardData.staffPassword || 'password123',
        plan: wizardData.plan,
        planPrice,
        discountAmount: Number(wizardData.discountAmount) || 0,
        extraCharges: Number(wizardData.extraCharges) || 0,
        planNotes: wizardData.planNotes || '',
        planDays: durationDays,
        expiryDate: endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      });

      if (onSuccess) {
        await onSuccess();
      }
      setStep(4); // Launchpad
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete client onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl sm:max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[94dvh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Progress Steps */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  Fast Client Onboarding · {step === 4 ? 'Complete' : `Step ${step} of 3`}
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  ⚡ 7-Day Free Demo Default
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <span>
                  {step === 1 && 'Step 1: Hotel Owner (Admin)'}
                  {step === 2 && 'Step 2: Hotel Profile & Branding'}
                  {step === 3 && 'Step 3: Plan & Quick Demo'}
                  {step === 4 && '🎉 Hotel Provisioned & Ready!'}
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 1 && 'Create the primary client account or attach to an existing owner.'}
                {step === 2 && 'Hotel identity, branding, logo, city & direct UPI billing.'}
                {step === 3 && 'Instant 7-Day Demo. Staff is optional and can be added anytime.'}
                {step === 4 && 'Hotel is live! Launch instant demo walk-through or share credentials.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Pills */}
          <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-slate-800">
            {[
              { num: 1, label: '1. Owner Account' },
              { num: 2, label: '2. Hotel Profile' },
              { num: 3, label: '3. Plan & Demo' }
            ].map(s => {
              const isDone = step > s.num || step === 4;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  className={`text-[10px] font-bold py-1 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isCurrent
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'bg-slate-800/80 text-slate-500'
                  }`}
                >
                  {isDone ? <Check size={11} className="stroke-[3]" /> : null}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* ============================================================== */}
          {/* STEP 1: HOTEL OWNER */}
          {/* ============================================================== */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsExistingOwnerMode(false)}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    !isExistingOwnerMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  + Create New Owner
                </button>
                <button
                  type="button"
                  onClick={() => setIsExistingOwnerMode(true)}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    isExistingOwnerMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  👑 Choose Existing Owner ({ownersList.length})
                </button>
              </div>

              {isExistingOwnerMode ? (
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Select Existing Hotel Owner *
                  </label>
                  <select
                    required
                    value={wizardData.ownerId}
                    onChange={e => {
                      const o = ownersList.find(item => item._id === e.target.value);
                      setWizardData(prev => ({
                        ...prev,
                        ownerId: e.target.value,
                        ownerName: o?.name || '',
                        ownerEmail: o?.email || '',
                        ownerPhone: o?.phone || '',
                        contactNumber: o?.phone || prev.contactNumber
                      }));
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black text-xs"
                  >
                    <option value="">— Choose Hotel Owner from Portfolio —</option>
                    {ownersList.map(o => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.email}) {o.phone ? `· ${o.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    The new hotel property will be registered directly under this existing client account.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Owner Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Singhania"
                        value={wizardData.ownerName}
                        onChange={e => setWizardData({ ...wizardData, ownerName: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Owner Mobile (WhatsApp) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={wizardData.ownerPhone}
                        onChange={e => setWizardData({ 
                          ...wizardData, 
                          ownerPhone: e.target.value, 
                          contactNumber: wizardData.contactNumber || e.target.value,
                          staffPhone: wizardData.staffPhone || e.target.value
                        })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Owner Login Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="vikram@grandpalace.com"
                        value={wizardData.ownerEmail}
                        onChange={e => setWizardData({ ...wizardData, ownerEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Master Password *</label>
                      <input
                        type="text"
                        required
                        placeholder="password123"
                        value={wizardData.ownerPassword}
                        onChange={e => setWizardData({ ...wizardData, ownerPassword: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-2 text-purple-900">
                    <Crown size={15} className="text-purple-600 shrink-0" />
                    <span className="text-[11px] font-medium">
                      Hotel Owner account has master access: view live collections, run the front desk, and configure staff.
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? 'Saving...' : 'Continue to Hotel Profile'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: HOTEL PROFILE & BRANDING */}
          {/* ============================================================== */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold">Client / Owner:</span>
                <span className="text-xs font-black text-slate-900">{wizardData.ownerName} ({wizardData.ownerEmail})</span>
              </div>

              {/* Property Category Pills */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1.5">
                  Property Category / Type *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {PROPERTY_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setWizardData({ ...wizardData, propertyType: pt.value })}
                      className={`p-2 rounded-xl text-center border font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        wizardData.propertyType === pt.value
                          ? 'bg-slate-950 text-white border-slate-950 shadow-xs ring-1 ring-slate-950'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <span className="text-base">{pt.icon}</span>
                      <span className="text-[10px] leading-tight truncate">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotel Name & Logo Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 uppercase mb-1">Hotel / Property Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hotel Grand Palace"
                    value={wizardData.hotelName}
                    onChange={e => setWizardData({ ...wizardData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>

                {/* Hotel Photo / Logo Upload */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Hotel Logo / Photo</label>
                  <div className="flex items-center gap-2">
                    {wizardData.logo ? (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={wizardData.logo} alt="Logo" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setWizardData({ ...wizardData, logo: '' })}
                          className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[8px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1.5 font-bold text-[11px] text-slate-600">
                        <Upload size={13} />
                        <span>{uploadingLogo ? 'Compressing...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Location: City, State, Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jaipur"
                    value={wizardData.city}
                    onChange={e => setWizardData({ ...wizardData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">State / Province</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajasthan"
                    value={wizardData.state}
                    onChange={e => setWizardData({ ...wizardData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Total Rooms</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    value={wizardData.maxRooms}
                    onChange={e => setWizardData({ ...wizardData, maxRooms: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Street Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Station Road, Near Central Mall"
                  value={wizardData.address}
                  onChange={e => setWizardData({ ...wizardData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Direct UPI Billing for Guests */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <CreditCard size={14} className="text-emerald-700" />
                  <span>Direct UPI QR Code Billing (Guest Check-in Payments)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">UPI ID (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. hotelgrand@okhdfcbank"
                      value={wizardData.upiId}
                      onChange={e => setWizardData({ ...wizardData, upiId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg font-bold outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">UPI Payee Business Name</label>
                    <input
                      type="text"
                      placeholder="Hotel Grand Palace"
                      value={wizardData.upiPayeeName}
                      onChange={e => setWizardData({ ...wizardData, upiPayeeName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg font-bold outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings Accordion (GST & Check-in Timing) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt size={13} className="text-slate-500" />
                    <span>Optional GST & Standard Timings</span>
                  </span>
                  {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvancedSettings && (
                  <div className="p-3 bg-white space-y-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="gstToggle"
                        checked={wizardData.gstEnabled}
                        onChange={e => setWizardData({ ...wizardData, gstEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-slate-900 border-slate-300"
                      />
                      <label htmlFor="gstToggle" className="font-bold text-slate-800 text-[11px] cursor-pointer">
                        Enable GST Invoicing for this hotel
                      </label>
                    </div>

                    {wizardData.gstEnabled && (
                      <div>
                        <label className="block font-bold text-gray-700 uppercase mb-1">15-Digit GSTIN Number</label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="08AAAAA0000A1Z5"
                          value={wizardData.gstin}
                          onChange={e => setWizardData({ ...wizardData, gstin: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Check-In Time</label>
                        <input
                          type="text"
                          value={wizardData.checkInTime}
                          onChange={e => setWizardData({ ...wizardData, checkInTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Check-Out Time</label>
                        <input
                          type="text"
                          value={wizardData.checkOutTime}
                          onChange={e => setWizardData({ ...wizardData, checkOutTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  ← Back to Owner
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Plan & Demo</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 3: SUBSCRIPTION PLAN & OPTIONAL STAFF */}
          {/* ============================================================== */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              {/* Plan Selection Cards */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700 uppercase">
                    Choose Subscription Plan *
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {wizardData.plan === 'demo' ? '⭐ 7-Day Free Trial' : wizardData.plan === 'yearly' ? '🔥 Annual (₹800/mo)' : '⚡ Monthly (₹1,000/mo)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Plan 1: 7-Day Free Trial */}
                  <div
                    onClick={() => handleSelectPlan('demo')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      wizardData.plan === 'demo'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase">
                      Free Trial
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm">7-Day Free Trial</p>
                    <p className="text-base font-black text-indigo-600 mt-0.5">₹0 <span className="text-[10px] text-slate-500 font-semibold">/ 7 Days</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Full live AI scanning, room billing & testing before purchase.</p>
                  </div>

                  {/* Plan 2: Monthly (₹1,000/month) */}
                  <div
                    onClick={() => handleSelectPlan('monthly')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      wizardData.plan === 'monthly'
                        ? 'border-slate-950 bg-slate-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-slate-800 text-white text-[9px] font-black uppercase">
                      Monthly
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm">Monthly Plan</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">₹1,000 <span className="text-[10px] text-slate-500 font-semibold">/ month</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Billed ₹1,000 every 30 days. Pay-as-you-go flexibility.</p>
                  </div>

                  {/* Plan 3: Annual (₹800/month = ₹9,600/year) */}
                  <div
                    onClick={() => handleSelectPlan('yearly')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      wizardData.plan === 'yearly' || wizardData.plan === 'annual'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">
                      Save 20%
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm">Annual Plan</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">
                      ₹800 <span className="text-[10px] text-slate-500 font-semibold">/ mo (₹9,600/yr)</span>
                    </p>
                    <p className="text-[10px] text-emerald-800 mt-1">1 Year upfront at ₹800/mo. Save ₹2,400 vs monthly.</p>
                  </div>
                </div>
              </div>

              {/* 🏷️ CUSTOM PRICING, DISCOUNT & CHARGES ADJUSTMENT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Receipt size={14} className="text-slate-600" />
                    <span>Pricing, Discount & Extra Charges</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                    Base: ₹{(wizardData.basePrice || 0).toLocaleString()} {wizardData.plan === 'yearly' ? '/yr' : wizardData.plan === 'monthly' ? '/mo' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                      - Special Discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={wizardData.discountAmount || ''}
                      onChange={e => handlePriceAdjustment('discountAmount', e.target.value)}
                      disabled={wizardData.plan === 'demo'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-emerald-700 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">
                      + Extra / Add-on Charges (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={wizardData.extraCharges || ''}
                      onChange={e => handlePriceAdjustment('extraCharges', e.target.value)}
                      disabled={wizardData.plan === 'demo'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-700 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">
                      = Final Billed Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={wizardData.planPrice}
                      onChange={e => setWizardData({ ...wizardData, planPrice: Number(e.target.value) || 0 })}
                      disabled={wizardData.plan === 'demo'}
                      className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-xl font-black text-xs text-slate-950 outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Discount / Add-on Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹200 introductory discount applied / Includes biometric setup"
                    value={wizardData.planNotes}
                    onChange={e => setWizardData({ ...wizardData, planNotes: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* STRICTLY OPTIONAL STAFF SECTION */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="createStaffToggle"
                    checked={createStaffNow}
                    onChange={e => setCreateStaffNow(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-slate-900 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="createStaffToggle" className="cursor-pointer">
                    <span className="font-bold text-slate-900 text-xs">
                      Create Front Desk Staff Account Now? <span className="text-slate-500 font-normal">(Optional)</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Not needed for demo. Hotel Owner can log in directly and access the full desk. Staff can be added anytime later in 1 click.
                    </p>
                  </label>
                </div>

                {createStaffNow && (
                  <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Staff Name *</label>
                        <input
                          type="text"
                          required={createStaffNow}
                          placeholder="e.g. Front Desk Officer"
                          value={wizardData.staffName}
                          onChange={e => setWizardData({ ...wizardData, staffName: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Staff Mobile Phone</label>
                        <input
                          type="tel"
                          placeholder="Staff mobile phone"
                          value={wizardData.staffPhone}
                          onChange={e => setWizardData({ ...wizardData, staffPhone: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Staff Login Email *</label>
                        <input
                          type="email"
                          required={createStaffNow}
                          placeholder="reception@hotel.com"
                          value={wizardData.staffEmail}
                          onChange={e => setWizardData({ ...wizardData, staffEmail: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Staff Password</label>
                        <input
                          type="text"
                          required={createStaffNow}
                          placeholder="password123"
                          value={wizardData.staffPassword}
                          onChange={e => setWizardData({ ...wizardData, staffPassword: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  ← Back to Hotel Profile
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>{submitting ? 'Activating Hotel...' : 'Complete & Launch Live Demo'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 4: LAUNCHPAD & CREDENTIALS SUMMARY */}
          {/* ============================================================== */}
          {step === 4 && createdSummary && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    {createdSummary.hotelName} is Ready & Live!
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Plan: <strong>
                      {createdSummary.plan === 'demo'
                        ? '7-Day Free Trial (₹0)'
                        : createdSummary.plan === 'yearly' || createdSummary.plan === 'annual'
                        ? 'Annual Plan (₹800/mo · ₹9,600/yr)'
                        : 'Monthly Plan (₹1,000/mo)'}
                    </strong>
                    {createdSummary.plan !== 'demo' && (
                      <span className="ml-1 text-emerald-950 font-bold">· Billed: ₹{(createdSummary.planPrice || 0).toLocaleString()}</span>
                    )}
                    {' '}· Valid until <strong>{createdSummary.expiryDate}</strong>
                  </p>
                </div>
              </div>

              {/* Owner Credentials Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Crown size={14} className="text-purple-600" />
                    <span>Hotel Owner Login (Master Access)</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(`Email: ${createdSummary.ownerEmail}\nPassword: ${createdSummary.ownerPassword}`, 'owner')}
                    className="text-[10px] font-bold text-slate-700 hover:text-black flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer"
                  >
                    {copiedKey === 'owner' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedKey === 'owner' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Email:</span>
                    <span className="font-mono font-bold text-slate-900 truncate block">{createdSummary.ownerEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Password:</span>
                    <span className="font-mono font-bold text-slate-900">{createdSummary.ownerPassword}</span>
                  </div>
                </div>
              </div>

              {/* Staff Credentials Card (if created) */}
              {createdSummary.staffId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Users size={14} className="text-blue-600" />
                      <span>Front Desk Staff Login</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(`Email: ${createdSummary.staffEmail}\nPassword: ${createdSummary.staffPassword}`, 'staff')}
                      className="text-[10px] font-bold text-slate-700 hover:text-black flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      {copiedKey === 'staff' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedKey === 'staff' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Email:</span>
                      <span className="font-mono font-bold text-slate-900 truncate block">{createdSummary.staffEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Password:</span>
                      <span className="font-mono font-bold text-slate-900">{createdSummary.staffPassword}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {/* 1-Click Launch Demo */}
                <button
                  onClick={() => {
                    onClose();
                    if (onImpersonate) {
                      onImpersonate({
                        hostelId: createdSummary.hostelId,
                        userId: createdSummary.staffId || createdSummary.ownerId,
                        userName: createdSummary.staffName || createdSummary.ownerName,
                        role: createdSummary.staffId ? 'Receptionist' : 'Owner'
                      });
                    }
                  }}
                  className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Launch Live Demo Walk-Through Now</span>
                </button>

                {/* WhatsApp Notice */}
                {createdSummary.ownerPhone && (
                  <a
                    href={`https://wa.me/91${createdSummary.ownerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Namaste ${createdSummary.ownerName} ji! 🙏\n\nCongratulations, your hotel *${createdSummary.hotelName}* is now live on NXHotel PMS.\n\n🌐 Portal: ${window.location.origin}/login\n👤 Login Email: ${createdSummary.ownerEmail}\n🔑 Password: ${createdSummary.ownerPassword}\n🎟️ Plan: ${
                        createdSummary.plan === 'demo'
                          ? '7-Day Free Trial (₹0)'
                          : createdSummary.plan === 'yearly' || createdSummary.plan === 'annual'
                          ? `Annual Plan (₹800/mo · Billed ₹${(createdSummary.planPrice || 9600).toLocaleString()}/yr)`
                          : `Monthly Plan (₹${(createdSummary.planPrice || 1000).toLocaleString()}/mo)`
                      }\n📅 Valid Until: ${createdSummary.expiryDate}\n\nFeel free to explore your counter check-ins and invoice generation!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Send Welcome & Credentials on WhatsApp</span>
                  </a>
                )}

                {/* Done Button */}
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Done (Return to Dashboard)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardModal;
