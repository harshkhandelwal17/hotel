import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests?search=${query}&limit=5`);
        setResults(res.data.data);
      } catch (error) {
        console.error('Search error', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(debounceId);
  }, [query]);

  const handleSelect = (guestId) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/guests/${guestId}`);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
          placeholder="Search guest, mobile..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />
        {query && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => { setQuery(''); setResults([]); }}
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2) && (
        <div className="absolute mt-1 w-full sm:w-96 bg-white shadow-lg rounded-md border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((guest) => (
                <li
                  key={guest._id}
                  onClick={() => handleSelect(guest._id)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{guest.fullName}</p>
                      <p className="text-xs text-gray-500">{guest.mobileNumber}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">No guests found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
