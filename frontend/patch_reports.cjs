const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/Reports.jsx', 'utf8');

const summaryCode = `
      {/* Payment Summary */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Collected</p>
              <p className="text-2xl font-black text-gray-900 mt-1">₹{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-green-50 p-5 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Cash</p>
              <p className="text-2xl font-black text-green-700 mt-1">₹{filteredPayments.filter(p => p.paymentMethod === 'Cash').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-purple-50 p-5 rounded-2xl shadow-sm border border-purple-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">UPI</p>
              <p className="text-2xl font-black text-purple-700 mt-1">₹{filteredPayments.filter(p => p.paymentMethod === 'UPI').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Card/Bank</p>
              <p className="text-2xl font-black text-blue-700 mt-1">₹{filteredPayments.filter(p => p.paymentMethod === 'Card' || p.paymentMethod === 'Bank').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
`;

content = content.replace('{/* Data Table */}', summaryCode);

fs.writeFileSync('src/pages/admin/Reports.jsx', content);
