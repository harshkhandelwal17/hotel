import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Navigation & Layout
    nav: {
      dashboard: 'Dashboard',
      stays: 'Stays',
      rooms: 'Rooms',
      history: 'History',
      payments: 'Payments',
      laundry: 'Laundry',
      admin: 'Admin',
      superadmin: 'Super Admin',
      policeReport: 'Police Report',
      searchPlaceholder: 'Search or command...',
      shortcuts: 'Shortcuts',
      logout: 'Logout',
      allProperties: 'All Properties',
      management: 'Management',
      manageRooms: 'Manage Rooms',
      manageStaff: 'Manage Staff',
      financialReports: 'Financial Reports',
      propertySettings: 'Property Settings',
      shiftSlip: 'Shift Slip',
      checkoutAlerts: 'Checkout Alerts',
      noAlerts: 'No checkout alerts right now. All on schedule!',
      testBell: 'Test Bell',
      soundOn: 'Sound On',
      muted: 'Muted',
      call: 'Call',
      impersonating: 'You are impersonating',
      returnToSuperadmin: 'Return to Superadmin'
    },

    // Common Actions & Badges
    common: {
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      active: 'Active',
      overdue: 'Overdue',
      dueToday: 'Due Today',
      pending: 'Pending',
      paid: 'Paid',
      all: 'All',
      viewAll: 'View All',
      view: 'View',
      print: 'Print',
      whatsapp: 'WhatsApp',
      download: 'Download',
      export: 'Export',
      loading: 'Loading...',
      actions: 'Actions',
      room: 'Room',
      guest: 'Guest',
      guests: 'Guests',
      total: 'Total',
      balance: 'Balance',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      amount: 'Amount',
      phone: 'Phone',
      address: 'Address',
      idProof: 'ID Proof',
      cash: 'Cash',
      upi: 'UPI',
      card: 'Card',
      khata: 'Khata',
      wallet: 'Wallet',
      mixed: 'Mixed (Split)',
      success: 'Success',
      error: 'Error',
      actionRequired: 'Action Required'
    },

    // Dashboard
    dashboard: {
      greetingMorning: 'Good Morning',
      greetingAfternoon: 'Good Afternoon',
      greetingEvening: 'Good Evening',
      liveOperations: 'Live Operations',
      occupiedSummary: 'rooms occupied',
      capacity: 'Capacity',
      addExpense: 'Add Expense',
      checkIn: 'Check-In',
      overdueBanner: 'Checkout(s) Overdue',
      processCheckouts: 'Process Checkouts',
      occupiedTitle: 'Occupied',
      availableTitle: 'Available',
      roomsFree: 'rooms free',
      readyToCheckIn: 'Ready for check-in',
      checkinsToday: 'Check-Ins Today',
      arrivals: 'arrivals',
      recordedToday: 'Recorded today',
      checkoutsToday: 'Checkouts Today',
      processDepartures: 'Process departures',
      pendingDues: 'Pending Dues',
      uncollectedBalance: 'Uncollected guest balance',
      drawerCash: 'Drawer Cash',
      cashIn: 'In',
      cashExp: 'Exp',
      inHouseTitle: 'In-House Guests & Stays',
      inHouseSubtitle: 'Real-time room occupancy, checkout schedule, and folio balances',
      allActive: 'All Active',
      searchGuestOrRoom: 'Search guest or room...',
      expectedCheckout: 'Expected Checkout',
      folio: 'Folio',
      paidInFull: 'Paid in Full',
      due: 'Due',
      profile: 'Profile',
      manage: 'Manage',
      urgent: 'Urgent',
      noActiveGuests: 'No in-house guests currently',
      hotelEmpty: 'Rooms are vacant and ready for new reservations.',
      startCheckIn: 'Start Check-In'
    },

    // CheckIn Page
    checkin: {
      title: 'Express Check-In',
      fastBookingBanner: 'Fast Booking',
      profileLinked: 'Profile Linked',
      bannerSubtitle: 'Select room & dates below. Guest 1 details and past co-guests will be auto-filled in Step 2!',
      clearPrefill: 'Clear Prefill',
      step1: '1. Guests & Duration',
      step2: '2. Guest Details',
      step3: '3. Payment & Summary',
      totalOccupants: 'Total Occupants',
      guestCount: 'Guest',
      guestsCount: 'Guests',
      selectRoom: 'Select Room',
      availableRooms: 'Available Rooms',
      allFloors: 'All Floors',
      duration: 'Stay Duration',
      days: 'Day(s)',
      hours: 'Hour(s)',
      morningCheckout: 'Morning Checkout (11:00 AM)',
      dailyPrice: 'Base Price / Day',
      totalRent: 'Total Room Rent',
      quickAddPastCoGuests: 'Past Companions / Co-Guests',
      recentCompanion: 'Recent',
      foundCompanions: 'Found',
      companionsSubtitle: 'Previously accompanied this guest. Click any companion below to auto-fill Guest 2 (or next slot) instantly:',
      primaryGuest: 'Primary Guest',
      coGuest: 'Co-Guest',
      fullName: 'Full Name',
      mobileNumber: 'Mobile Number',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      dateOfBirth: 'Date of Birth',
      idProofType: 'ID Proof Type',
      idProofNumber: 'ID Number',
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      passport: 'Passport',
      drivingLicense: 'Driving License',
      voterId: 'Voter ID',
      uidaiVerified: 'UIDAI Verified',
      scanQr: 'Scan QR Code',
      uploadIdFront: 'Front ID Photo',
      uploadIdBack: 'Back ID Photo',
      takeCameraPhoto: 'Camera Photo',
      syncWithWhatsApp: 'Sync from WhatsApp',
      advancePayment: 'Advance Payment Received',
      paymentMode: 'Payment Method',
      balanceDue: 'Balance Due at Checkout',
      confirmCheckIn: 'Complete & Check-In Guest',
      printGrc: 'Print Guest Registration Card (GRC)',
      printBill: 'Print Invoice Bill'
    },

    // Checkout & Stay Management
    checkout: {
      title: 'Active Stays & Checkouts',
      subtitle: 'Manage in-house room folios, extensions, and departures',
      checkoutGuest: 'Checkout Guest',
      confirmCheckout: 'Confirm Checkout',
      extendStay: 'Extend Stay',
      shiftRoom: 'Shift Room',
      addCharges: 'Add Extra Charges (Food / Services)',
      chargesReason: 'Charge Reason / Item',
      chargesAmount: 'Amount (₹)',
      totalBill: 'Total Bill Amount',
      alreadyPaid: 'Already Paid',
      finalPaymentDue: 'Final Payment Due',
      checkoutSuccess: 'Guest checked out successfully! Room is now released.',
      viewFinalBill: 'View Final Bill',
      whatsappInvoice: 'WhatsApp Bill to Guest'
    },

    // Guest Profile & Passbook
    profile: {
      guestProfile: 'Guest Profile',
      pastGuest: 'Past Guest',
      activeGuest: 'Active Guest',
      bookRoomCheckIn: 'Book Room / Check-In',
      walletBalance: 'Advance Wallet',
      khataDue: 'Khata Due / Balance',
      currentInHouseStay: 'Current In-House Stay',
      stayHistory: 'Stay History',
      khataPassbook: 'Khata & Passbook',
      addAdvance: '+ Advance Jama',
      wasoolDue: 'Wasool Karein',
      transactions: 'Transactions',
      primaryContact: 'Primary Contact',
      ledgerTransactions: 'Wallet deposit & credit ledger transactions',
      noPastStays: 'No past stays recorded yet.',
      noLedgerEntries: 'No ledger transactions recorded yet for this guest.'
    },

    // Reports
    reports: {
      title: 'Financial & Operating Reports',
      subtitle: 'Reconciled drawer cash, digital collections, headcount, and daily expenses.',
      netProfit: 'Total Net Profit',
      netCashInDrawer: 'Net Cash in Drawer',
      dailyExpenses: 'Daily Expenses',
      totalRevenue: 'Total Collections',
      grossBookings: 'Gross Bookings',
      drawerReconciliation: 'Drawer Reconciliation',
      staffCollections: 'Staff Shift Collections',
      addDailyExpense: 'Add Daily Expense',
      expenseTitle: 'Expense Title',
      expenseCategory: 'Category',
      paidVia: 'Paid Via',
      deductedFromDrawer: 'Deducted from Drawer Cash'
    },

    // Language Modal
    langModal: {
      title: 'Language Settings / भाषा सेटिंग्स',
      subtitle: 'Select your preferred application display language',
      englishName: 'English (English)',
      englishDesc: 'Default professional hotel management system interface',
      hindiName: 'हिंदी (Hindi)',
      hindiDesc: 'संपूर्ण होटल मैनेजमेंट सिस्टम हिंदी भाषा में',
      saveAndApply: 'Save & Apply Language',
      languageChanged: 'Language updated to English'
    }
  },

  hi: {
    // Navigation & Layout
    nav: {
      dashboard: 'डैशबोर्ड',
      stays: 'स्टे लिस्ट',
      rooms: 'कमरे (Rooms)',
      history: 'हिस्ट्री / रिकॉर्ड',
      payments: 'भुगतान (Payments)',
      laundry: 'लॉन्ड्री',
      admin: 'एडमिन',
      superadmin: 'सुपर एडमिन',
      policeReport: 'पुलिस रिपोर्ट',
      searchPlaceholder: 'सर्च या कमांड (⌘K)...',
      shortcuts: 'शॉर्टकट',
      logout: 'लॉगआउट',
      allProperties: 'सभी संपत्तियां (Properties)',
      management: 'होटल मैनेजमेंट',
      manageRooms: 'कमरे मैनेज करें',
      manageStaff: 'स्टाफ मैनेज करें',
      financialReports: 'वित्तीय रिपोर्ट्स (Reports)',
      propertySettings: 'होटल सेटिंग्स',
      shiftSlip: 'शिफ्ट स्लिप (Handover)',
      checkoutAlerts: 'चेकआउट अलर्ट्स',
      noAlerts: 'अभी कोई चेकआउट ओवरड्यू नहीं है। सब समय पर है!',
      testBell: 'बेल टेस्ट करें',
      soundOn: 'आवाज चालू',
      muted: 'म्यूट',
      call: 'कॉल करें',
      impersonating: 'आप लॉगिन हैं बतौर',
      returnToSuperadmin: 'सुपरएडमिन पर वापस जाएं'
    },

    // Common Actions & Badges
    common: {
      save: 'सुरक्षित करें (Save)',
      cancel: 'रद्द करें (Cancel)',
      confirm: 'पुष्टि करें (Confirm)',
      close: 'बंद करें',
      delete: 'हटाएं',
      edit: 'बदलें',
      back: 'पीछे जाएं',
      next: 'आगे बढ़ें',
      done: 'हो गया',
      search: 'खोजें (Search)',
      filter: 'फिल्टर',
      refresh: 'रिफ्रेश',
      active: 'एक्टिव',
      overdue: 'ओवरड्यू (समय समाप्त)',
      dueToday: 'आज का चेकआउट',
      pending: 'बाकी',
      paid: 'जमा / चुकता',
      all: 'सभी',
      viewAll: 'सभी देखें',
      view: 'देखें',
      print: 'प्रिंट करें',
      whatsapp: 'व्हाट्सएप',
      download: 'डाउनलोड',
      export: 'एक्सपोर्ट',
      loading: 'लोड हो रहा है...',
      actions: 'कार्रवाई (Actions)',
      room: 'कमरा',
      guest: 'अतिथि (Guest)',
      guests: 'अतिथिगण (Guests)',
      total: 'कुल राशि',
      balance: 'बकाया राशि',
      status: 'स्थिति (Status)',
      date: 'तारीख',
      time: 'समय',
      amount: 'राशि (₹)',
      phone: 'मोबाइल नंबर',
      address: 'पता (Address)',
      idProof: 'पहचान पत्र (ID Proof)',
      cash: 'कैश (नकद)',
      upi: 'UPI / ऑनलाइन',
      card: 'कार्ड (POS)',
      khata: 'खाता (उधार लेजर)',
      wallet: 'वॉलेट (जमा एडवांस)',
      mixed: 'मिश्रित भुगतान (Mixed)',
      success: 'सफलतापूर्वक संपन्न',
      error: 'त्रुटि (Error)',
      actionRequired: 'कार्रवाई आवश्यक'
    },

    // Dashboard
    dashboard: {
      greetingMorning: 'शुभ प्रभात',
      greetingAfternoon: 'नमस्ते / शुभ दोपहर',
      greetingEvening: 'शुभ संध्या',
      liveOperations: 'लाइव होटल ऑपरेशंस',
      occupiedSummary: 'कमरे बुक हैं',
      capacity: 'क्षमता (Capacity)',
      addExpense: '+ खर्च दर्ज करें',
      checkIn: '⚡ नया चेक-इन',
      overdueBanner: 'कमरे का चेकआउट ओवरड्यू है',
      processCheckouts: 'चेकआउट पूरा करें',
      occupiedTitle: 'बुक कमरे (Occupied)',
      availableTitle: 'खाली कमरे (Available)',
      roomsFree: 'कमरे खाली हैं',
      readyToCheckIn: 'चेक-इन के लिए तैयार',
      checkinsToday: 'आज के चेक-इन',
      arrivals: 'अतिथि आए',
      recordedToday: 'आज दर्ज हुए',
      checkoutsToday: 'आज के चेकआउट',
      processDepartures: 'चेकआउट प्रोसेस करें',
      pendingDues: 'कुल बकाया राशि (Dues)',
      uncollectedBalance: 'मेहमानों पर बकाया राशि',
      drawerCash: 'गल्ले में नकद (Drawer Cash)',
      cashIn: 'आवक',
      cashExp: 'खर्च',
      inHouseTitle: 'होटल में मौजूद मेहमान (In-House Stays)',
      inHouseSubtitle: 'कमरों की लाइव स्थिति, चेकआउट समय और बकाया बिल विवरण',
      allActive: 'सभी एक्टिव',
      searchGuestOrRoom: 'मेहमान का नाम या कमरा खोजें...',
      expectedCheckout: 'चेकआउट समय',
      folio: 'बिल स्थिति',
      paidInFull: 'पूरा चुकता',
      due: 'बाकी',
      profile: 'प्रोफाइल',
      manage: 'मैनेज',
      urgent: 'जरूरी (Urgent)',
      noActiveGuests: 'होटल में अभी कोई सक्रिय मेहमान नहीं है',
      hotelEmpty: 'सभी कमरे खाली हैं और नए चेक-इन के लिए तैयार हैं।',
      startCheckIn: 'चेक-इन शुरू करें'
    },

    // CheckIn Page
    checkin: {
      title: 'फास्ट चेक-इन (Express Check-In)',
      fastBookingBanner: 'त्वरित बुकिंग (Fast Booking)',
      profileLinked: 'प्रोफाइल लिंक हो गई',
      bannerSubtitle: 'नीचे कमरा और अवधि चुनें। स्टेप 2 में मुख्य मेहमान और पुराने साथियों का विवरण अपने आप भर जाएगा!',
      clearPrefill: 'कैंसिल करें',
      step1: '१. कमरे और अवधि का चयन',
      step2: '२. मेहमान का विवरण व पहचान पत्र',
      step3: '३. भुगतान व चेक-इन पुष्टि',
      totalOccupants: 'कुल मेहमान (Occupants)',
      guestCount: 'मेहमान',
      guestsCount: 'मेहमान',
      selectRoom: 'कमरा चुनें',
      availableRooms: 'उपलब्ध कमरे',
      allFloors: 'सभी मंजिलें (Floors)',
      duration: 'रुकने की अवधि',
      days: 'दिन (Days)',
      hours: 'घंटे (Hours)',
      morningCheckout: 'सुबह 11:00 बजे चेकआउट',
      dailyPrice: 'प्रति दिन किराया',
      totalRent: 'कुल कमरा किराया',
      quickAddPastCoGuests: 'पुराने साथी मेहमान (Past Companions)',
      recentCompanion: 'हाल ही में साथ आए',
      foundCompanions: 'मिले',
      companionsSubtitle: 'यह मेहमान पहले इनके साथ रुक चुके हैं। नीचे किसी भी साथी पर क्लिक करके सीधे Guest 2 में ऑटो-फिल करें:',
      primaryGuest: 'मुख्य मेहमान (Primary)',
      coGuest: 'साथी मेहमान (Co-Guest)',
      fullName: 'पूरा नाम',
      mobileNumber: 'मोबाइल नंबर',
      gender: 'लिंग (Gender)',
      male: 'पुरुष (Male)',
      female: 'महिला (Female)',
      other: 'अन्य (Other)',
      dateOfBirth: 'जन्म तिथि',
      idProofType: 'पहचान पत्र का प्रकार',
      idProofNumber: 'पहचान पत्र नंबर',
      aadhaar: 'आधार कार्ड',
      pan: 'पैन कार्ड',
      passport: 'पासपोर्ट',
      drivingLicense: 'ड्राइविंग लाइसेंस',
      voterId: 'वोटर आईडी कार्ड',
      uidaiVerified: 'UIDAI द्वारा सत्यापित',
      scanQr: 'QR कोड स्कैन करें',
      uploadIdFront: 'आईडी का अगला फोटो',
      uploadIdBack: 'आईडी का पिछला फोटो',
      takeCameraPhoto: 'कैमरा से फोटो लें',
      syncWithWhatsApp: 'व्हाट्सएप से आईडी लाएं',
      advancePayment: 'एडवांस जमा राशि',
      paymentMode: 'भुगतान का माध्यम',
      balanceDue: 'चेकआउट पर बाकी राशि',
      confirmCheckIn: 'चेक-इन पूरा करें व कमरा अलॉट करें',
      printGrc: 'GRC कार्ड प्रिंट करें',
      printBill: 'बिल रसीद प्रिंट करें'
    },

    // Checkout & Stay Management
    checkout: {
      title: 'सक्रिय स्टे व चेकआउट रजिस्टर',
      subtitle: 'होटल के कमरों के बिल, स्टे एक्सटेंशन और चेकआउट प्रोसेस करें',
      checkoutGuest: 'चेकआउट करें',
      confirmCheckout: 'चेकआउट की पुष्टि करें',
      extendStay: 'स्टे बढ़ाएं (Extend)',
      shiftRoom: 'कमरा बदलें (Shift Room)',
      addCharges: 'अतिरिक्त खर्च जोड़ें (खाना / सेवाएं)',
      chargesReason: 'खर्च का विवरण',
      chargesAmount: 'राशि (₹)',
      totalBill: 'कुल बिल राशि',
      alreadyPaid: 'पहले से जमा',
      finalPaymentDue: 'अंतिम देय राशि',
      checkoutSuccess: 'चेकआउट सफलतापूर्वक संपन्न! कमरा अब खाली है।',
      viewFinalBill: 'अंतिम बिल देखें',
      whatsappInvoice: 'मेहमान को व्हाट्सएप पर बिल भेजें'
    },

    // Guest Profile & Passbook
    profile: {
      guestProfile: 'अतिथि प्रोफाइल',
      pastGuest: 'पुराने अतिथि',
      activeGuest: 'होटल में मौजूद',
      bookRoomCheckIn: 'कमरा बुक करें / चेक-इन',
      walletBalance: 'वॉलेट एडवांस बैलेंस',
      khataDue: 'खाता बकाया (उधार बाकी)',
      currentInHouseStay: 'वर्तमान में चल रहा स्टे',
      stayHistory: 'पुराने स्टे का रिकॉर्ड',
      khataPassbook: 'खाता एवं एडवांस पासबुक',
      addAdvance: '+ एडवांस जमा करें',
      wasoolDue: 'वसूल करें',
      transactions: 'लेनदेन (Transactions)',
      primaryContact: 'प्राथमिक संपर्क',
      ledgerTransactions: 'वॉलेट डिपॉजिट और क्रेडिट लेजर लेनदेन विवरण',
      noPastStays: 'इस मेहमान का कोई पिछला स्टे रिकॉर्ड नहीं है।',
      noLedgerEntries: 'इस मेहमान के लिए अभी तक कोई खाता लेजर एंट्री नहीं है।'
    },

    // Reports
    reports: {
      title: 'वित्तीय व संचालन रिपोर्ट्स (Reports)',
      subtitle: 'गल्ला नकद, ऑनलाइन कलेक्शन, अतिथि संख्या और दैनिक खर्चों का संपूर्ण मिलान।',
      netProfit: 'कुल शुद्ध लाभ (Net Profit)',
      netCashInDrawer: 'गल्ले में शुद्ध नकद (Cash in Drawer)',
      dailyExpenses: 'दैनिक खर्चे (Daily Expenses)',
      totalRevenue: 'कुल कलेक्शन (Revenue)',
      grossBookings: 'सकल बुकिंग राशि',
      drawerReconciliation: 'कैश ड्रॉअर मिलान',
      staffCollections: 'स्टाफ शिफ्ट कलेक्शन',
      addDailyExpense: '+ दैनिक खर्च दर्ज करें',
      expenseTitle: 'खर्च का नाम / विवरण',
      expenseCategory: 'खर्च श्रेणी (Category)',
      paidVia: 'भुगतान माध्यम',
      deductedFromDrawer: 'कैश गल्ले से काटा गया'
    },

    // Language Modal
    langModal: {
      title: 'भाषा सेटिंग्स (Language Settings)',
      subtitle: 'अपनी पसंदीदा भाषा चुनें (Select your preferred language)',
      englishName: 'English (अंग्रेज़ी)',
      englishDesc: 'Standard hotel management interface in English',
      hindiName: 'हिंदी (Hindi)',
      hindiDesc: 'संपूर्ण होटल मैनेजमेंट सिस्टम सरल व स्पष्ट हिंदी भाषा में',
      saveAndApply: 'भाषा सुरक्षित करें (Apply Language)',
      languageChanged: 'भाषा बदलकर हिंदी कर दी गई है'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('app_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'hi' ? 'hi' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('app_language', validLang);
      document.documentElement.lang = validLang;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  // Translation helper: t('nav.dashboard') or t('dashboard.checkIn')
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');
    let curr = translations[language];
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        // Fallback to English if missing in Hindi
        let eng = translations['en'];
        for (const ep of parts) {
          if (eng && typeof eng === 'object' && ep in eng) eng = eng[ep];
          else return fallback || path;
        }
        return typeof eng === 'string' ? eng : (fallback || path);
      }
    }
    return typeof curr === 'string' ? curr : (fallback || path);
  };

  const isHindi = language === 'hi';

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    isHindi,
    toggleLanguage: () => setLanguage(language === 'en' ? 'hi' : 'en')
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback if called outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (path, fallback = '') => fallback || path,
      isHindi: false,
      toggleLanguage: () => {}
    };
  }
  return ctx;
};

export default LanguageContext;
