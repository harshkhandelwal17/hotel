import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Replace the initial state definitions with sessionStorage-aware ones
state_target = """  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  const [stayInfo, setStayInfo] = useState({
    room: '', rentFormat: '24h', occupants: 1, expectedDays: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash'
  });

  const [guests, setGuests] = useState([{
    fullName: '', mobileNumber: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false
  }]);"""

state_rep = """  const loadState = (key, defaultVal) => {
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
    room: '', rentFormat: '24h', occupants: 1, expectedDays: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash'
  }));

  const [guests, setGuests] = useState(() => loadState('checkin_guests', [{
    fullName: '', mobileNumber: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false
  }]));

  // Persist state on change to recover from iOS Camera Memory Kills
  useEffect(() => { sessionStorage.setItem('checkin_step', JSON.stringify(step)); }, [step]);
  useEffect(() => { sessionStorage.setItem('checkin_stayInfo', JSON.stringify(stayInfo)); }, [stayInfo]);
  useEffect(() => { sessionStorage.setItem('checkin_guests', JSON.stringify(guests)); }, [guests]);
"""

content = content.replace(state_target, state_rep)

# Clear sessionStorage on successful submit
submit_target = """      toast({ message: `Check-In successful for Room ${selectedRoomDetails.roomNumber}`, type: 'success' });
      navigate('/dashboard');"""
submit_rep = """      sessionStorage.removeItem('checkin_step');
      sessionStorage.removeItem('checkin_stayInfo');
      sessionStorage.removeItem('checkin_guests');
      toast({ message: `Check-In successful for Room ${selectedRoomDetails.roomNumber}`, type: 'success' });
      navigate('/dashboard');"""

content = content.replace(submit_target, submit_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("CheckIn.jsx State Recovery patched")
