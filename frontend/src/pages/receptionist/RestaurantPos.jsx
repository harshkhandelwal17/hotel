import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  UtensilsCrossed, Plus, Search, ShoppingBag, Trash2, Printer, 
  CreditCard, Wallet, Smartphone, Building, RefreshCw, CheckCircle2, 
  X, Edit3, ArrowRight, Clock, Coffee, ShieldCheck, Flame, Leaf, Receipt,
  FileText, Building2, Hash, Tag, Check, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { printRestaurantReceipt, printRestaurantGstInvoice } from '../../utils/restaurantReceiptPrint';
import DynamicUpiQr from '../../components/DynamicUpiQr';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const CATEGORIES = [
  'All',
  'Tea & Beverages',
  'Breakfast',
  'Snacks & Starters',
  'Main Course',
  'Breads & Rice',
  'Chinese',
  'Desserts',
  'Other'
];

export default function RestaurantPos() {
  const { user } = useAuth();
  const { isHindi } = useLanguage();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history' | 'menu'
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  
  // Menu State
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchInputRef = useRef(null);

  // Active In-House Stays for Room Service
  const [activeStays, setActiveStays] = useState([]);

  // POS Cart State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Room Service'); // 'Room Service' | 'Quick Counter' | 'Dine-In'
  const [selectedStayId, setSelectedStayId] = useState('');
  const [customTableOrRoom, setCustomTableOrRoom] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [taxPercent, setTaxPercent] = useState(5); // 5% default restaurant GST in India
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Corporate & B2B GST Billing
  const [isB2B, setIsB2B] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Modals & Popups
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    name: '',
    category: 'Main Course',
    price: '',
    isVeg: true,
    isAvailable: true,
    description: ''
  });
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Orders History
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const activeHostelId = useMemo(() => {
    if (!selectedHostel) return '';
    if (typeof selectedHostel === 'object') return selectedHostel._id || '';
    return String(selectedHostel);
  }, [selectedHostel]);

  const currentHostelDoc = useMemo(() => {
    return hostels.find(h => (h._id || h) === activeHostelId) || null;
  }, [hostels, activeHostelId]);

  // Load Hostels
  useEffect(() => {
    axios.get(`${API}/api/hostels`)
      .then(res => {
        const list = res.data?.data || [];
        setHostels(list);
        if (list.length > 0) {
          const userH = user?.assignedHostel;
          const userHostelId = typeof userH === 'object' ? userH?._id : userH;
          const defaultH = (userHostelId && list.some(h => h._id === userHostelId)) ? userHostelId : list[0]._id;
          setSelectedHostel(defaultH);
        }
      })
      .catch(() => {});
  }, [user]);

  // Load Menu Items
  const fetchMenu = async (hostelId = activeHostelId) => {
    if (!hostelId) return;
    setLoadingMenu(true);
    try {
      const res = await axios.get(`${API}/api/restaurant/menu?hostel=${hostelId}`);
      if (res.data?.success) {
        setMenuItems(res.data.data || []);
      }
    } catch (err) {
      toast({ message: (isHindi ? 'मेनू लोड करने में त्रुटि: ' : 'Failed to load menu: ') + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setLoadingMenu(false);
    }
  };

  // Load Active Stays for Room dropdown
  const fetchActiveStays = async (hostelId = activeHostelId) => {
    if (!hostelId) return;
    try {
      const res = await axios.get(`${API}/api/stays?status=Active&hostel=${hostelId}`);
      if (res.data?.data) {
        setActiveStays(res.data.data);
      }
    } catch (_) {}
  };

  // Load Order History
  const fetchOrders = async (hostelId = activeHostelId) => {
    if (!hostelId) return;
    setLoadingOrders(true);
    try {
      const res = await axios.get(`${API}/api/restaurant/orders?hostel=${hostelId}`);
      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (_) {
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeHostelId) {
      fetchMenu(activeHostelId);
      fetchActiveStays(activeHostelId);
      if (activeTab === 'history') fetchOrders(activeHostelId);
    }
  }, [activeHostelId, activeTab]);

  // Handle Room Selection
  const handleSelectRoom = (stayId) => {
    setSelectedStayId(stayId);
    if (!stayId) {
      setCustomTableOrRoom('');
      setGuestName('');
      setGuestPhone('');
      return;
    }
    const found = activeStays.find(s => s._id === stayId);
    if (found) {
      const rNum = found.room?.roomNumber || 'Room';
      setCustomTableOrRoom(`Room ${rNum}`);
      setGuestName(found.guest?.fullName || 'In-House Guest');
      setGuestPhone(found.guest?.mobileNumber || '');
      setPaymentMethod('Room Folio');
    }
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discount = Math.min(cartSubtotal, Math.max(0, Number(discountAmount) || 0));
  const taxableAmount = Math.max(0, cartSubtotal - discount);
  const taxAmount = taxPercent > 0 ? Math.round((taxableAmount * (taxPercent / 100)) * 100) / 100 : 0;
  const grandTotal = Math.round(taxableAmount + taxAmount);

  // Cart Operations
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) {
        return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      return prev.map(i => {
        if (i._id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i._id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount('');
    setOrderNotes('');
    setIsB2B(false);
    setCompanyName('');
    setGstin('');
    setBillingAddress('');
  };

  // ⌨️ FAST DISH CODE / SHORTCUT KEYBOARD SEARCH
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      // Match exact itemCode or single filtered item
      const exactCode = menuItems.find(it => (it.itemCode || '').toUpperCase() === q && it.isAvailable);
      if (exactCode) {
        addToCart(exactCode);
        setSearchQuery('');
        return;
      }
      if (filteredMenuItems.length === 1 && filteredMenuItems[0].isAvailable) {
        addToCart(filteredMenuItems[0]);
        setSearchQuery('');
        return;
      }
    }
  };

  // Submit Fast Order
  const handleProcessOrder = async (overrideMethod = null) => {
    if (cart.length === 0) {
      toast({ message: isHindi ? 'कृपया कम से कम एक आइटम जोड़ें' : 'Please add at least one item to cart', type: 'warning' });
      return;
    }

    const effectiveMethod = overrideMethod || paymentMethod;

    if (effectiveMethod === 'Room Folio' && !selectedStayId) {
      toast({ message: isHindi ? 'कृपया कमरा नंबर चुनें' : 'Please select a room for Room Service', type: 'warning' });
      return;
    }

    if (isB2B && !companyName.trim()) {
      toast({ message: isHindi ? 'कृपया कंपनी का नाम दर्ज करें' : 'Please enter Company / Business Name for B2B billing', type: 'warning' });
      return;
    }

    const payload = {
      hostel: activeHostelId,
      orderType,
      tableOrRoom: customTableOrRoom || (orderType === 'Quick Counter' ? 'Counter' : 'Dine-In'),
      stayId: selectedStayId || null,
      guestName: (isB2B && companyName ? companyName : guestName.trim()) || (selectedStayId ? 'In-House Guest' : 'Walk-in Guest'),
      guestPhone: guestPhone.trim(),
      items: cart.map(i => ({
        menuItem: i._id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        total: i.price * i.quantity
      })),
      subtotal: cartSubtotal,
      discount,
      taxPercent,
      taxAmount,
      totalAmount: grandTotal,
      isB2B,
      companyName: companyName.trim(),
      gstin: gstin.trim().toUpperCase(),
      billingAddress: billingAddress.trim(),
      hsnSacCode: '996331',
      paymentStatus: effectiveMethod === 'Room Folio' ? 'Charged to Room' : 'Paid',
      paymentMethod: effectiveMethod,
      notes: orderNotes.trim()
    };

    // If UPI selected, open Dynamic UPI QR Modal
    if (effectiveMethod === 'UPI' && !overrideMethod) {
      setPendingOrderPayload(payload);
      setShowUpiModal(true);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await axios.post(`${API}/api/restaurant/orders`, payload);
      if (res.data?.success) {
        const createdOrder = res.data.data;
        // Open the on-screen bill success & print modal!
        setCompletedOrder(createdOrder);
        toast({ message: isHindi ? 'बिल सफलतापूर्वक जनरेट हुआ!' : 'Bill created successfully!', type: 'success' });

        // Reset cart
        clearCart();
        if (orderType !== 'Room Service') {
          setGuestName('');
          setGuestPhone('');
          setCustomTableOrRoom('');
        }
      }
    } catch (err) {
      toast({ message: (isHindi ? 'ऑर्डर में त्रुटि: ' : 'Order failed: ') + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Complete UPI Order
  const handleUpiSuccess = async () => {
    setShowUpiModal(false);
    if (!pendingOrderPayload) return;
    setIsSubmittingOrder(true);
    try {
      const res = await axios.post(`${API}/api/restaurant/orders`, pendingOrderPayload);
      if (res.data?.success) {
        setCompletedOrder(res.data.data);
        toast({ message: isHindi ? 'यूपीआई भुगतान एवं बिल सफल!' : 'UPI payment & bill created!', type: 'success' });
        clearCart();
      }
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setIsSubmittingOrder(false);
      setPendingOrderPayload(null);
    }
  };

  // Menu Item CRUD
  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) {
      toast({ message: isHindi ? 'नाम और मूल्य आवश्यक हैं' : 'Name and price are required', type: 'warning' });
      return;
    }

    try {
      if (editingItem) {
        const res = await axios.put(`${API}/api/restaurant/menu/${editingItem._id}`, itemForm);
        if (res.data?.success) {
          toast({ message: isHindi ? 'आइटम अपडेट हुआ' : 'Item updated successfully', type: 'success' });
          setShowItemModal(false);
          fetchMenu(activeHostelId);
        }
      } else {
        const res = await axios.post(`${API}/api/restaurant/menu`, { ...itemForm, hostel: activeHostelId });
        if (res.data?.success) {
          toast({ message: isHindi ? 'नया आइटम जोड़ा गया' : 'New item added successfully', type: 'success' });
          setShowItemModal(false);
          fetchMenu(activeHostelId);
        }
      }
    } catch (err) {
      toast({ message: err.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm(isHindi ? 'क्या आप इस आइटम को हटाना चाहते हैं?' : 'Are you sure you want to delete this menu item?')) return;
    try {
      const res = await axios.delete(`${API}/api/restaurant/menu/${itemId}`);
      if (res.data?.success) {
        toast({ message: isHindi ? 'आइटम हटाया गया' : 'Item deleted', type: 'success' });
        fetchMenu(activeHostelId);
      }
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    }
  };

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        item.name.toLowerCase().includes(q) || 
        (item.itemCode && item.itemCode.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Header & Property Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 shadow-xs">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              {isHindi ? 'रेस्टोरेंट एवं फ़ूड पीओएस' : 'Restaurant & Food POS'}
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {isHindi ? 'फास्ट रूम सर्विस बिलिंग, डाइन-इन, कोड सर्च एवं जीएसटी बिल' : 'Fast Room Service Billing, Dine-In, Code Search & GST Billing'}
            </p>
          </div>
        </div>

        {/* Property Selector & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {hostels.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Building size={14} className="text-slate-500" />
              <select
                value={activeHostelId}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
              >
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeTab === 'pos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ {isHindi ? 'फास्ट बिलिंग (POS)' : 'Fast Billing (POS)'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 {isHindi ? 'ऑर्डर इतिहास' : 'Order History'}
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeTab === 'menu' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🍽️ {isHindi ? 'मेनू सूची व कोड' : 'Menu & Item Codes'}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: POS BILLING SCREEN */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT 7-COLS: MENU BROWSER & DISHES */}
          <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            {/* Search and Dish Code Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={isHindi ? "कोड (#101) या नाम से खोजें + Enter दबाएं..." : "Search by Code (#101) or Name + press Enter..."}
                  className="w-full pl-9 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                  Enter ↵
                </span>
              </div>
              <button
                onClick={() => fetchMenu(activeHostelId)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                title="Refresh Menu"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dishes Grid */}
            {loadingMenu ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                {isHindi ? 'मेनू लोड हो रहा है...' : 'Loading menu items...'}
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-xs text-slate-500 font-bold">{isHindi ? 'कोई आइटम नहीं मिला' : 'No menu items found'}</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({ itemCode: '', name: '', category: 'Main Course', price: '', isVeg: true, isAvailable: true, description: '' });
                    setShowItemModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  + {isHindi ? 'नया आइटम जोड़ें' : 'Add Item'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[560px] overflow-y-auto pr-1">
                {filteredMenuItems.map(item => {
                  const cartItem = cart.find(c => c._id === item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => item.isAvailable && addToCart(item)}
                      className={`p-3 rounded-2xl border transition-all text-left relative flex flex-col justify-between ${
                        !item.isAvailable 
                          ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : cartItem
                            ? 'bg-orange-50/70 border-orange-300 shadow-xs cursor-pointer hover:border-orange-400 active:scale-98'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs hover:shadow-xs cursor-pointer active:scale-98'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center shrink-0 ${
                            item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          </span>
                          {item.itemCode && (
                            <span className="text-[10px] font-black font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              #{item.itemCode}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                        <span className="text-sm font-black text-slate-900 font-mono">
                          ₹{item.price}
                        </span>
                        {cartItem ? (
                          <span className="px-2 py-0.5 bg-orange-600 text-white text-[11px] font-black rounded-lg shadow-2xs">
                            x{cartItem.quantity}
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 5-COLS: POS ORDER CART & FAST SETTLEMENT */}
          <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-orange-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {isHindi ? 'करंट ऑर्डर एवं बिल' : 'Current Order & Bill'}
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  {isHindi ? 'साफ़ करें' : 'Clear All'}
                </button>
              )}
            </div>

            {/* Order Destination Selector */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {[
                  { key: 'Room Service', label: isHindi ? '🏨 रूम सर्विस' : '🏨 Room' },
                  { key: 'Quick Counter', label: isHindi ? '⚡ काउंटर' : '⚡ Counter' },
                  { key: 'Dine-In', label: isHindi ? '🍽️ डाइन-इन' : '🍽️ Dine-In' }
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setOrderType(t.key);
                      if (t.key !== 'Room Service') {
                        setSelectedStayId('');
                        if (paymentMethod === 'Room Folio') setPaymentMethod('Cash');
                      }
                    }}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      orderType === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Room Service Target Selection */}
              {orderType === 'Room Service' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {isHindi ? 'इन-हाउस कमरा चुनें (In-House Room):' : 'Select In-House Room:'}
                  </label>
                  <select
                    value={selectedStayId}
                    onChange={(e) => handleSelectRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                  >
                    <option value="">{isHindi ? '-- कमरा चुनें --' : '-- Select Room --'}</option>
                    {activeStays.map(s => (
                      <option key={s._id} value={s._id}>
                        Room {s.room?.roomNumber} • {s.guest?.fullName || 'Guest'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customTableOrRoom}
                    onChange={(e) => setCustomTableOrRoom(e.target.value)}
                    placeholder={orderType === 'Dine-In' ? (isHindi ? "टेबल नंबर (e.g. Table 4)" : "Table # (e.g. Table 4)") : (isHindi ? "टोकन / नाम" : "Token / Tag")}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
                  />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={isHindi ? "ग्राहक का नाम" : "Guest Name (Opt)"}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50 min-h-[140px] max-h-[190px] overflow-y-auto space-y-1.5">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-bold">
                  {isHindi ? 'कार्ट खाली है — बायीं ओर से आइटम चुनें या कोड टाइप करें' : 'Cart is empty — tap items or type item code + Enter'}
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {item.itemCode && <span className="text-[10px] font-mono text-slate-400">#{item.itemCode}</span>}
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">₹{item.price} each</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, -1)}
                        className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, 1)}
                        className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-16 text-right font-black font-mono shrink-0">
                      ₹{item.price * item.quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item._id)}
                      className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 🏢 CORPORATE & B2B GST BILLING TOGGLE */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" />
                  <span>{isHindi ? 'कंपनी / कॉर्पोरेट जीएसटी बिल (B2B)' : 'Corporate / Company GST Bill (B2B)'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={isB2B}
                  onChange={(e) => setIsB2B(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </label>

              {isB2B && (
                <div className="space-y-2 pt-1 border-t border-slate-200 text-xs animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      {isHindi ? 'कंपनी का नाम (Company Name) *' : 'Company Name *'}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Tata Consultancy Services Ltd"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="08AAAAA0000A1Z5"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        SAC Code
                      </label>
                      <input
                        type="text"
                        disabled
                        value="996331 (Restaurant)"
                        className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-600 outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      {isHindi ? 'कंपनी का पता' : 'Billing Address'}
                    </label>
                    <input
                      type="text"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Street, City, State"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>{isHindi ? 'सबटोटल (Subtotal):' : 'Subtotal:'}</span>
                <span className="font-mono font-bold">₹{cartSubtotal}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">{isHindi ? 'छूट / डिस्काउंट (₹):' : 'Discount (₹):'}</span>
                <input
                  type="number"
                  min="0"
                  max={cartSubtotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-xs font-bold outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">{isHindi ? 'जीएसटी दर (GST Rate):' : 'GST Rate:'}</span>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                  className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-hidden cursor-pointer"
                >
                  <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={0}>0% (Tax Exempt)</option>
                </select>
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                  <span>CGST ({(taxPercent/2).toFixed(1)}%) + SGST ({(taxPercent/2).toFixed(1)}%):</span>
                  <span className="font-mono">+₹{taxAmount}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>{isHindi ? 'कुल बिल राशि (Grand Total):' : 'Grand Total:'}</span>
                <span className="text-lg font-mono text-emerald-700">₹{grandTotal}</span>
              </div>
            </div>

            {/* Payment Method / Folio Actions */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {orderType === 'Room Service' ? (
                  <button
                    type="button"
                    onClick={() => handleProcessOrder('Room Folio')}
                    disabled={isSubmittingOrder || cart.length === 0 || !selectedStayId}
                    className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Building size={15} />
                    <span>{isHindi ? 'कमरा बिल में जोड़ें (Charge to Room)' : 'Charge to Room Folio'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleProcessOrder('Cash')}
                      disabled={isSubmittingOrder || cart.length === 0}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Wallet size={14} />
                      <span>{isHindi ? '💵 नकद बिल (Cash)' : '💵 Cash Bill'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessOrder('UPI')}
                      disabled={isSubmittingOrder || cart.length === 0}
                      className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Smartphone size={14} />
                      <span>{isHindi ? '📱 यूपीआई / QR' : '📱 UPI / QR'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {isHindi ? 'हाल के रेस्टोरेंट एवं रूम सर्विस ऑर्डर्स' : 'Recent Restaurant & Room Service Orders'}
            </h3>
            <button
              onClick={() => fetchOrders(activeHostelId)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>{isHindi ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              {isHindi ? 'ऑर्डर लोड हो रहे हैं...' : 'Loading orders...'}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              {isHindi ? 'अभी कोई ऑर्डर दर्ज नहीं है' : 'No restaurant orders recorded yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Type / Target</th>
                    <th className="py-2.5 px-3">Guest / Company</th>
                    <th className="py-2.5 px-3">Items Summary</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Print Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map(o => (
                    <tr key={o._id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800">{o.tableOrRoom || o.orderType}</span>
                        <span className="text-[10px] text-slate-400 block">{o.orderType}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold block">{o.companyName || o.guestName}</span>
                        {o.gstin && <span className="text-[10px] font-mono text-indigo-600 font-bold block">{o.gstin}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        ₹{o.totalAmount}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.paymentStatus === 'Charged to Room'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {o.paymentStatus} ({o.paymentMethod})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => printRestaurantReceipt(o, currentHostelDoc)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Print 80mm POS Slip"
                        >
                          <Receipt size={12} />
                          <span>80mm</span>
                        </button>
                        <button
                          onClick={() => printRestaurantGstInvoice(o, currentHostelDoc)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Print GST Tax Invoice"
                        >
                          <FileText size={12} />
                          <span>GST</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MENU & RATES MANAGEMENT */}
      {activeTab === 'menu' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isHindi ? 'रेस्टोरेंट मेनू सूची, कोड एवं मूल्य (Menu & Dish Codes)' : 'Restaurant Menu, Dish Codes & Pricing'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {isHindi ? 'हर डिश का शार्ट कोड (#101), मूल्य, वेज/नॉन-वेज व उपलब्धता सेट करें' : 'Set item search codes (#101), prices, category and availability'}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingItem(null);
                setItemForm({ itemCode: '', name: '', category: 'Main Course', price: '', isVeg: true, isAvailable: true, description: '' });
                setShowItemModal(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>{isHindi ? 'नया आइटम जोड़ें' : 'Add New Item'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Dish / Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Price (₹)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {menuItems.map(it => (
                  <tr key={it._id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-black text-slate-700">
                      #{it.itemCode || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center ${
                        it.isVeg ? 'border-emerald-600' : 'border-rose-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${it.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{it.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{it.category}</td>
                    <td className="py-2.5 px-3 font-mono font-black text-slate-900">₹{it.price}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        it.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {it.isAvailable ? (isHindi ? 'उपलब्ध' : 'Available') : (isHindi ? 'अनुपलब्ध' : 'Out of Stock')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingItem(it);
                          setItemForm({
                            itemCode: it.itemCode || '',
                            name: it.name,
                            category: it.category,
                            price: it.price,
                            isVeg: it.isVeg,
                            isAvailable: it.isAvailable,
                            description: it.description || ''
                          });
                          setShowItemModal(true);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(it._id)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🎉 ON-SCREEN BILL SUCCESS & PRINT OPTIONS MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'बिल सफलतापूर्वक जनरेट हुआ!' : 'Bill Generated Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Bill No: <span className="font-mono font-bold text-slate-800">{completedOrder.orderNumber}</span> • {completedOrder.tableOrRoom || 'Counter'}
              </p>
            </div>

            {/* Bill Summary Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">{isHindi ? 'ग्राहक / कंपनी:' : 'Client / Guest:'}</span>
                <span className="font-bold text-slate-900">{completedOrder.companyName || completedOrder.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">{isHindi ? 'ऑर्डर प्रकार:' : 'Order Type:'}</span>
                <span className="font-semibold text-slate-800">{completedOrder.orderType}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-bold">{isHindi ? 'कुल राशि:' : 'Grand Total:'}</span>
                <span className="font-mono font-black text-emerald-700 text-sm">₹{completedOrder.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">{isHindi ? 'भुगतान स्थिति:' : 'Payment:'}</span>
                <span className="font-bold text-indigo-700">{completedOrder.paymentStatus} ({completedOrder.paymentMethod})</span>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => printRestaurantReceipt(completedOrder, currentHostelDoc)}
                className="py-3 px-3 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt size={15} />
                <span>80mm POS Slip</span>
              </button>
              <button
                type="button"
                onClick={() => printRestaurantGstInvoice(completedOrder, currentHostelDoc)}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText size={15} />
                <span>GST Tax Invoice (A4)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {isHindi ? 'पूर्ण / अगला ऑर्डर लें (Next Order)' : 'Done / Take Next Order'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingItem ? (isHindi ? 'आइटम संपादित करें' : 'Edit Menu Item') : (isHindi ? 'नया डिश / आइटम जोड़ें' : 'Add New Menu Item')}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {isHindi ? 'कोड (#)' : 'Code (#)'}
                  </label>
                  <input
                    type="text"
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm(f => ({ ...f, itemCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {isHindi ? 'डिश / आइटम का नाम' : 'Dish / Item Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Masala Chai, Paneer Butter Masala"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {isHindi ? 'श्रेणी (Category)' : 'Category'}
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {isHindi ? 'मूल्य (Price in ₹)' : 'Price (₹)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.price}
                    onChange={(e) => setItemForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isVeg}
                    onChange={(e) => setItemForm(f => ({ ...f, isVeg: e.target.checked }))}
                    className="h-4 w-4 text-emerald-600 rounded-sm cursor-pointer"
                  />
                  <span>Pure Veg (शाकाहारी)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(e) => setItemForm(f => ({ ...f, isAvailable: e.target.checked }))}
                    className="h-4 w-4 text-slate-900 rounded-sm cursor-pointer"
                  />
                  <span>Available (स्टॉक में है)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-black rounded-xl cursor-pointer"
                >
                  {isHindi ? 'सुरक्षित करें' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC UPI QR MODAL FOR RESTAURANT COUNTER */}
      {showUpiModal && pendingOrderPayload && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">
                {isHindi ? 'क्यूआर स्कैन करके भुगतान करें' : 'Scan QR to Pay Bill'}
              </h3>
              <button onClick={() => setShowUpiModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-full">
                <X size={18} />
              </button>
            </div>

            <DynamicUpiQr
              amount={grandTotal}
              hostel={currentHostelDoc}
              guestName={guestName || companyName || 'Restaurant Guest'}
              roomNumber={customTableOrRoom || 'Counter'}
              transactionNote={`POS Bill - ${customTableOrRoom || 'Counter'}`}
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleUpiSuccess}
                className="flex-1 py-2 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                {isHindi ? 'भुगतान प्राप्त हुआ' : 'Payment Received'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
