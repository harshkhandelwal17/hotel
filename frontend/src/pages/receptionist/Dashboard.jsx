import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Users, BedDouble, CalendarCheck, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentStays, setRecentStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  useEffect(() => {
    fetchDashboardData();
  }, [globalProperty]);
  useEffect(() => {
    const handlePropChange = () => fetchDashboardData();
    window.addEventListener('propertyChanged', handlePropChange);
    return () => window.removeEventListener('propertyChanged', handlePropChange);
  }, [globalProperty]);

  async function fetchDashboardData() {
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [statsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/reports/dashboard${propQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active${ampQuery}`)
      ]);
      setStats(statsRes.data.data);
      // Get the most recent 5 stays
      setRecentStays(staysRes.data.data.slice(-5).reverse());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Today's Overview</h1>
          <p className="text-gray-500 mt-1 font-medium">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/checkin" className="bg-black text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-xl hover:bg-gray-800 transition-all hover:-translate-y-0.5">
            + Express Check-In
          </Link>
        </div>
      </div>

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-semibold text-sm tracking-wide uppercase">Occupied Rooms</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><BedDouble size={20} /></div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.occupiedRooms || 0}</span>
            <span className="text-sm font-semibold text-gray-400 ml-2">/ {(stats?.occupiedRooms || 0) + (stats?.availableRooms || 0)} Total</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-green-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-semibold text-sm tracking-wide uppercase">Available</span>
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform"><CalendarCheck size={20} /></div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-black text-green-600 tracking-tighter">{stats?.availableRooms || 0}</span>
            <span className="text-sm font-semibold text-gray-400 ml-2">Rooms Free</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-orange-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-semibold text-sm tracking-wide uppercase">Checkouts Due</span>
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform"><Clock size={20} /></div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.checkoutsToday || 0}</span>
            <span className="text-sm font-semibold text-gray-400 ml-2">Leaving Today</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-purple-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-semibold text-sm tracking-wide uppercase">Pending Dues</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><CreditCard size={20} /></div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{stats?.pendingPayments || 0}</span>
            <span className="text-sm font-semibold text-gray-400 ml-2">Uncollected</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity / Guests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Recent Check-ins</h2>
            <Link to="/checkouts" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center">
              View all active stays <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {recentStays.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {recentStays.map(stay => (
                  <li key={stay._id} className="p-5 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                          {stay.guest?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{stay.guest?.fullName}</p>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">Room {stay.room?.roomNumber} • ({stay.occupants} Guests)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Checkout</p>
                        <p className="text-sm font-bold text-gray-900">{format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No active guests</h3>
                <p className="text-sm text-gray-500 mt-1">Check-in a guest to see them here.</p>
                <Link to="/checkin" className="mt-4 inline-block text-sm font-semibold text-blue-600">Start Check-in &rarr;</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Highlights */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Need Attention</h2>
          
          <div className="bg-gradient-to-b from-orange-50 to-orange-100/50 rounded-2xl p-6 border border-orange-100">
            <h3 className="font-bold text-orange-900 flex items-center mb-2">
              <Clock className="w-5 h-5 mr-2" /> Checkouts Today
            </h3>
            <p className="text-orange-800 text-sm font-medium mb-4">
              You have <span className="font-black">{stats?.checkoutsToday || 0}</span> guests scheduled to leave today.
            </p>
            <Link to="/checkouts" className="block w-full py-2.5 px-4 bg-white/80 hover:bg-white text-orange-900 text-center font-bold text-sm rounded-xl transition-colors shadow-sm">
              Process Checkouts
            </Link>
          </div>

          <div className="bg-gradient-to-b from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-100 mt-4">
            <h3 className="font-bold text-purple-900 flex items-center mb-2">
              <CreditCard className="w-5 h-5 mr-2" /> Outstanding Balance
            </h3>
            <p className="text-purple-800 text-sm font-medium mb-4">
              Total pending dues across all active stays: <span className="font-black">₹{stats?.pendingPayments || 0}</span>
            </p>
            <Link to="/payments" className="block w-full py-2.5 px-4 bg-white/80 hover:bg-white text-purple-900 text-center font-bold text-sm rounded-xl transition-colors shadow-sm">
              View Ledger
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
