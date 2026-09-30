            idProofImage: guest.idProofImage,
            hostel: typeof selectedRoom.hostel === 'object' ? selectedRoom.hostel._id : selectedRoom.hostel
        };
        if (guest._id) {
          return axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${guest._id}`, payload).then(() => guest._id);
        } else {
          return axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/guests', payload).then(res => res.data.data._id);
        }
      });
      
      const guestIds = await Promise.all(guestPromises);

      // 2. Create Stay
      const checkoutDate = stayInfo.expectedCheckOutDate;
      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays', {
        guest: guestIds[0],
        coGuests: guestIds.slice(1),
        room: selectedRoom._id,
        checkInDate: new Date(stayInfo.checkInDate).toISOString(),
        expectedCheckOutDate: new Date(checkoutDate).toISOString(),
        durationOption: stayInfo.durationOption,
        discountAmount: Number(stayInfo.discountAmount) || 0,
        occupants: stayInfo.occupants,
        totalAmount: Number(totalAmount) || 0,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel,
        commissionTo: stayInfo.commissionTo,
        commissionAmount: Number(stayInfo.commissionAmount) || 0
      });

      navigate('/checkouts', { state: { success: 'Check-in completed successfully!' } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error during check-in');
      setLoading(false);
    }
  };

  const canProceed1 = !!selectedRoom && stayInfo.occupants >= 1;
  const canProceed2 = guests.every(g => g.fullName.trim() && g.mobileNumber.length >= 10 && (g.idProofNumber.trim() || g.idProofImage));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Express Check-In</h1>
        <p className="text-gray-500 mt-1 font-medium">Quickly allocate rooms and register guests.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">{error}</div>}

      {/* Modern Progress Steps */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-500 rounded-full z-0" style={{ width: `${(step - 1) * 50}%` }}></div>
        {[1, 2, 3].map(num => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${step >= num ? 'bg-black text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}`}>
              {num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${step >= num ? 'text-black' : 'text-gray-400'}`}>
              {num === 1 ? 'Room' : num === 2 ? 'Guests' : 'Billing'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ─── STEP 1: Room & Occupants ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-7 space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Bed size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Room Selection</h2>
                <p className="text-xs text-gray-500">Configure stay duration and select a room</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left col: Duration & Occupants */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); setSelectedRoom(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Half day</p>
                    </button>
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); setSelectedRoom(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '24h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Calendar size={20} className={stayInfo.durationOption === '24h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">24 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full day / Night</p>
                    </button>
                    <div className="col-span-2 mt-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Custom Hours</label>
                      <input type="number" min="1" placeholder="e.g. 6" value={customHoursInput} 
                        onChange={(e) => {
                          const hrs = e.target.value;
                          setCustomHoursInput(hrs);
                          if(hrs && hrs > 0) {
                            setStayInfo({ ...stayInfo, durationOption: `custom_${hrs}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), parseInt(hrs)), "yyyy-MM-dd'T'HH:mm") });
                            setSelectedRoom(null);
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-in Time</label>
                    <input type="datetime-local" required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.checkInDate}
                      onChange={e => {
                        const newIn = new Date(e.target.value);
                        let newOut = new Date(stayInfo.expectedCheckOutDate);
                        if (newIn >= newOut) newOut = addDays(newIn, 1);
                        setStayInfo({ ...stayInfo, checkInDate: e.target.value, expectedCheckOutDate: format(newOut, "yyyy-MM-dd'T'HH:mm") });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-out Time</label>
                    <input type="datetime-local" required min={stayInfo.checkInDate}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.expectedCheckOutDate}
                      onChange={e => setStayInfo({ ...stayInfo, expectedCheckOutDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-indigo-600 font-bold mt-1">Calculated Math: {nights} night{nights > 1 ? 's' : ''} (or exact hours for short-stays)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users size={16} /> Total Occupants
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} type="button" onClick={() => handleOccupantsChange(n)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${stayInfo.occupants === n ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        {n}
                      </button>
                    ))}
                    <input type="number" min="1" max="20"
                      className={`w-16 py-3 text-center rounded-xl font-bold text-sm border outline-none transition-all ${stayInfo.occupants > 4 ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      placeholder="5+" value={stayInfo.occupants > 4 ? stayInfo.occupants : ''}
                      onChange={e => handleOccupantsChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right col: Room Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center justify-between">
                  <span>Available Rooms</span>
                  {selectedRoom && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Selected: {selectedRoom.roomNumber}</span>}
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2">
                  {filteredRooms.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Bed size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No rooms available</p>
                    </div>
                  ) : filteredRooms.map(room => {
                    const isSelected = selectedRoom?._id === room._id;
                    return (
                      <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType || 'Standard'}</p>
                          </div>
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                            <Bed size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
              <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                onClick={() => setStep(2)} disabled={!canProceed1}>
                Next: Guest Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
