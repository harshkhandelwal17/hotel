import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Plus, Banknote, Tag, Calendar, FileText, Building, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiCache } from '../../utils/apiCache';

const CATEGORIES = [
  'Food & Groceries',
  'Cleaning & Housekeeping',
  'Maintenance & Repairs',
  'Electricity & Utility',
  'Staff Salary / Advance',
  'Water Supply',
  'Internet & Software',
  'Laundry Expense',
  'Miscellaneous',
  'Other'
];

export default function ExpenseModal({ isOpen, onClose, onExpenseAdded, hostels = [], defaultHostel = 'all' }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Miscellaneous',
    paymentMethod: 'Cash',
    expenseDate: new Date().toISOString().split('T')[0],
    hostel: defaultHostel !== 'all' ? defaultHostel : (hostels[0]?._id || ''),
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(formData.amount);
    if (!formData.title.trim()) {
      toast({ message: 'Please enter expense description/title', type: 'error' });
      return;
    }
    if (!amt || amt <= 0) {
      toast({ message: 'Please enter a valid expense amount', type: 'error' });
      return;
    }
    if (!formData.hostel || formData.hostel === 'all') {
      toast({ message: 'Please select a specific property/hotel', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/expenses',
        formData
      );
      if (res.data?.success) {
        toast({ message: `₹${amt} expense added successfully!`, type: 'success' });
        apiCache.invalidate();
        if (onExpenseAdded) onExpenseAdded(res.data.data);
        onClose();
      }
    } catch (err) {
      toast({ message: err.response?.data?.message || 'Failed to record expense', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <Banknote size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Record Daily Expense</h2>
              <p className="text-xs text-gray-400 font-medium">Cash/UPI expense will auto-deduct from daily revenue</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Property Selector if multiple properties */}
          {hostels.length > 0 && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Building size={13} className="text-gray-400" /> Property / Hotel
              </label>
              <select
                value={formData.hostel}
                onChange={e => setFormData({ ...formData, hostel: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
                required
              >
                <option value="" disabled>Select Property</option>
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Expense Title / Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Vegetables, Detergent, Electrician, Water can"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                placeholder="₹ Amount"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-black text-red-600 focus:ring-2 focus:ring-black outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Paid Via (Method)
              </label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
              >
                <option value="Cash">Cash (Drawn from Drawer)</option>
                <option value="UPI">UPI (Online Direct)</option>
                <option value="Card">Card / POS</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Tag size={13} className="text-gray-400" /> Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" /> Expense Date
              </label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-gray-400" /> Additional Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Vendor name, bill number, or reason..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black outline-none resize-none"
            ></textarea>
          </div>

          {/* Cash Notice */}
          {formData.paymentMethod === 'Cash' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-amber-800 text-xs font-bold">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>This cash expense will automatically be deducted from your daily Cash In Hand drawer total!</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
