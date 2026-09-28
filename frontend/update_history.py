import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

old_thead = """                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>"""

new_thead = """                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accompanied By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>"""

old_tbody = """                  <tr key={stay._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(stay.checkInDate), 'dd MMM yyyy')} - {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stay.room?.roomNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{stay.totalAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {stay.status}
                      </span>
                    </td>
                  </tr>"""

new_tbody = """                  <tr key={stay._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(stay.checkInDate), 'dd MMM yyyy')} - {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stay.room?.roomNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {stay.coGuests && stay.coGuests.length > 0 
                        ? stay.coGuests.map(g => g.fullName).join(', ') 
                        : <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{stay.totalAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {stay.status}
                      </span>
                    </td>
                  </tr>"""

if old_thead in content and old_tbody in content:
    content = content.replace(old_thead, new_thead).replace(old_tbody, new_tbody)
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Updated GuestProfile")
else:
    print("Not found")
