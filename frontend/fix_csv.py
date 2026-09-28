import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

func = """
  const downloadCSV = () => {
    const headers = ['Guest Name', 'Mobile', 'Co-Guests', 'Room', 'Check-in', 'Expected Check-out', 'Total Bill', 'Paid', 'Balance', 'Status'];
    const csvData = stays.map(stay => {
      const coGuestsStr = stay.coGuests?.map(g => g.fullName).join(', ') || 'None';
      const checkIn = format(new Date(stay.checkInDate), 'dd MMM yyyy');
      const checkOut = format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy');
      const balance = stay.totalAmount - stay.paidAmount;
      return `"${stay.guest?.fullName}","${stay.guest?.mobileNumber}","${coGuestsStr}","${stay.room?.roomNumber}","${checkIn}","${checkOut}",${stay.totalAmount},${stay.paidAmount},${balance},"${stay.status}"`;
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `hotel_guests_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
"""

target = "  const getStayBadge = (stay) => {"

if "downloadCSV" not in content[:content.find("<button")]:
    content = content.replace(target, func + "\n" + target)
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Function added")
else:
    print("Function already exists")
