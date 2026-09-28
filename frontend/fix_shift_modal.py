import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  const fetchAvailableRooms = async () => {"""

replacement = """  const fetchAvailableRooms = async () => {
    try {
      const hostelId = stay.hostel._id || stay.hostel;
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/rooms?status=Active&hostel=${hostelId}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active&hostel=${hostelId}`)
      ]);
      
      const allRooms = roomsRes.data.data;
      const activeStays = staysRes.data.data;
      
      const availableRooms = allRooms.filter(r => {
        if (r._id === (stay.room._id || stay.room)) return false; 
        
        const isOccupied = activeStays.some(s => {
          if (s.room._id !== r._id) return false;
          const sOut = new Date(s.expectedCheckOutDate);
          const sIn = new Date(s.checkInDate);
          const currentIn = new Date(stay.checkInDate);
          const currentOut = new Date(stay.expectedCheckOutDate);
          return (currentIn < sOut && currentOut > sIn);
        });
        
        return !isOccupied;
      });
      
      setRooms(availableRooms);
    } catch (err) {
      setError('Failed to fetch rooms');
    }
  };

  useEffect(() => {
    fetchAvailableRooms();
  }, [stay.hostel, stay.room._id, stay.room, stay.checkInDate, stay.expectedCheckOutDate]);

  // Remove the old fetchAvailableRooms definition if we just injected the new one.
"""
# A bit messy, let's just do a clean regex or exact string replacement for the hoisting.

with open(sys.argv[1], "r") as f:
    lines = f.readlines()

new_lines = []
use_effect_lines = []
in_use_effect = False
for line in lines:
    if line.strip() == "useEffect(() => {":
        in_use_effect = True
        use_effect_lines.append(line)
    elif in_use_effect:
        use_effect_lines.append(line)
        if line.strip() == "}, []);":
            in_use_effect = False
    else:
        new_lines.append(line)

# now insert use_effect_lines right after fetchAvailableRooms ends
final_lines = []
for line in new_lines:
    final_lines.append(line)
    if line.strip() == "setError('Failed to fetch rooms');":
        pass
    if line.strip() == "};" and "fetchAvailableRooms" in "".join(new_lines):
        # We need to find the exact end of fetchAvailableRooms
        pass

