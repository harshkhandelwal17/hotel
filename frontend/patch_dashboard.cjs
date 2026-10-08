const fs = require('fs');
let content = fs.readFileSync('src/pages/receptionist/Dashboard.jsx', 'utf8');

// Add Download import
content = content.replace(
  "import { Users, BedDouble, CalendarCheck, Clock, CreditCard, ChevronRight, AlertTriangle, PlusCircle } from 'lucide-react';",
  "import { Users, BedDouble, CalendarCheck, Clock, CreditCard, ChevronRight, AlertTriangle, PlusCircle, Download } from 'lucide-react';"
);

// Add download function
const fnCode = `
  const downloadPoliceReport = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays?status=Active');
      const activeStays = res.data.data;
      
      let csv = 'Guest Name,Contact Number,Address,ID Proof No,Room No,Check-in Date,Expected Checkout\\n';
      
      activeStays.forEach(stay => {
        const g = stay.guest || {};
        const r = stay.room || {};
        const name = g.fullName || 'N/A';
        const contact = g.mobileNumber || 'N/A';
        const address = (g.address || 'N/A').replace(/,/g, ' ');
        const idNo = g.idProofNumber || 'N/A';
        const roomNo = r.roomNumber || 'N/A';
        const cin = format(new Date(stay.checkInDate), 'dd MMM yyyy HH:mm');
        const cout = format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy HH:mm');
        
        csv += \`\${name},\${contact},\${address},\${idNo},\${roomNo},\${cin},\${cout}\\n\`;
        
        // Add co-guests
        if (stay.coGuests && stay.coGuests.length > 0) {
          stay.coGuests.forEach(cg => {
            const cgName = cg.fullName || 'N/A';
            const cgId = cg.idProofNumber || 'N/A';
            const cgContact = g.mobileNumber + ' (Co-guest)';
            const cgAddress = g.address ? g.address.replace(/,/g, ' ') : 'N/A';
            csv += \`\${cgName},\${cgContact},\${cgAddress},\${cgId},\${roomNo},\${cin},\${cout}\\n\`;
          });
        }
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', \`Police_Report_\${format(new Date(), 'dd_MMM_yyyy')}.csv\`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download report', error);
      alert('Failed to generate Police Report');
    }
  };
`;

content = content.replace(
  'const visibleStays = recentStays.slice(0, 5);',
  'const visibleStays = recentStays.slice(0, 5);\n' + fnCode
);

// Add Button to UI
content = content.replace(
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">',
  `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">`
);

content = content.replace(
  '<p className="text-gray-500 text-sm mt-1 font-medium">Here is what is happening at your property today.</p>\n        </div>',
  `<p className="text-gray-500 text-sm mt-1 font-medium">Here is what is happening at your property today.</p>
        </div>
        <button onClick={downloadPoliceReport} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-sm border border-indigo-100">
          <Download size={16} />
          Police Report (CSV)
        </button>`
);

fs.writeFileSync('src/pages/receptionist/Dashboard.jsx', content);
