import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

start_marker = "  const [typingTimeouts, setTypingTimeouts] = useState({});"
end_marker = "  // --- Step 1 Handlers ---"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_block = """  const [typingTimeouts, setTypingTimeouts] = useState({});

  const fetchRoomsAndStays = async () => {
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/rooms?status=Active${propQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active${propQuery}`)
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

"""
    content = content[:start_idx] + new_block + content[end_idx:]
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Fixed syntax")
else:
    print("Markers not found")
