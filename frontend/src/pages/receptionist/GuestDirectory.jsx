import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Users, ChevronRight, Phone, ShieldCheck, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const GuestDirectory = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchGuests();
  }, [debouncedSearch, page]);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/guests?search=${debouncedSearch}&page=${page}&limit=12`);
      setGuests(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users size={28} className="text-indigo-600" />
            Guest History
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1">Directory of all past and present guests</p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name, mobile, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none font-bold text-sm text-gray-900 transition-colors shadow-sm"
          />
          <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <span className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : guests.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-black text-gray-900">No guests found</h3>
            <p className="text-gray-500 mt-1 font-medium">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Guest Info</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hidden sm:table-cell">Contact</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hidden md:table-cell">ID Proof</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hidden lg:table-cell">Added On</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.map(guest => (
                  <tr key={guest._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center flex-shrink-0 text-indigo-700 font-black">
                          {guest.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-base group-hover:text-indigo-700 transition-colors">{guest.fullName}</p>
                          <p className="text-xs font-bold text-gray-500 mt-0.5 sm:hidden">{guest.mobileNumber || 'No Mobile'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell">
                      {guest.mobileNumber ? (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                          <Phone size={14} className="text-gray-400" /> {guest.mobileNumber}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      {guest.idProofNumber ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{guest.idProofType}</span>
                          <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500"/> {guest.idProofNumber}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <span className="text-sm font-bold text-gray-600">{format(new Date(guest.createdAt), 'dd MMM yyyy')}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link to={`/guests/${guest._id}`} className="inline-flex items-center gap-1 bg-white border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                        View History <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Page {page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={page === pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestDirectory;
