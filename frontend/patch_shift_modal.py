import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """    try {
      const res = await axios.get(`http://127.0.0.1:5001/api/rooms?status=Active&hostel=${stay.hostel._id || stay.hostel}`);
      // Filter out current room
      const availableRooms = res.data.data.filter(r => r._id !== (stay.room._id || stay.room));
      setRooms(availableRooms);
    } catch (err) {"""

replacement = """    try {
      const hostelId = stay.hostel._id || stay.hostel;
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/rooms?status=Active&hostel=${hostelId}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active&hostel=${hostelId}`)
      ]);
      
      const allRooms = roomsRes.data.data;
      const activeStays = staysRes.data.data;
      
      const availableRooms = allRooms.filter(r => {
        if (r._id === (stay.room._id || stay.room)) return false; // Filter out current room
        
        // Check if any other active stay is using this room right now
        const isOccupied = activeStays.some(s => {
          if (s.room._id !== r._id) return false;
          // Check date overlap
          const sOut = new Date(s.expectedCheckOutDate);
          const sIn = new Date(s.checkInDate);
          const currentIn = new Date(stay.checkInDate);
          const currentOut = new Date(stay.expectedCheckOutDate);
          return (currentIn < sOut && currentOut > sIn);
        });
        
        return !isOccupied;
      });
      
      setRooms(availableRooms);
    } catch (err) {"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated ShiftRoomModal availability logic")
