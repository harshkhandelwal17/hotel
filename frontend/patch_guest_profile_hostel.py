import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = """<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>"""
replacement1 = """<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>"""
content = content.replace(target1, replacement1)

target2 = """<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(stay.checkInDate), 'dd MMM yyyy')} - {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stay.room?.roomNumber}</td>"""
replacement2 = """<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(stay.checkInDate), 'dd MMM yyyy')} - {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{stay.hostel?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stay.room?.roomNumber}</td>"""
content = content.replace(target2, replacement2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated GuestProfile table")
