import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = """  useEffect(() => {
    fetchRoomsAndStays();
  }, [globalProperty]);
  useEffect(() => {
    const handlePropChange = () => fetchRoomsAndStays();
    window.addEventListener('propertyChanged', handlePropChange);
    return () => window.removeEventListener('propertyChanged', handlePropChange);
  }, [globalProperty]);

  const fetchRoomsAndStays = async () => {"""

target2 = """  const fetchRoomsAndStays = async () => {
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
  }, [globalProperty]);"""

content = content.replace(target1, target2)
with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed CheckIn hoist")
