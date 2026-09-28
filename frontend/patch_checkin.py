import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Short stay</p>
                    </button>
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '24h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Calendar size={20} className={stayInfo.durationOption === '24h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">Daily</p>
                      <p className="text-xs text-gray-500 mt-0.5">24h format</p>
                    </button>
                  </div>"""

replacement = """                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Short stay</p>
                    </button>
                    <button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '24h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Calendar size={20} className={stayInfo.durationOption === '24h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">Daily</p>
                      <p className="text-xs text-gray-500 mt-0.5">24h format</p>
                    </button>
                    {selectedRoom?.customRates?.map(rate => (
                      <button key={rate.hours} type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}` })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === `custom_${rate.hours}` ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                        <Clock size={20} className={stayInfo.durationOption === `custom_${rate.hours}` ? 'text-black' : 'text-gray-400'} />
                        <p className="font-bold text-gray-900 mt-2">{rate.hours} Hour{rate.hours > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Custom rate</p>
                      </button>
                    ))}
                  </div>
                  {(!selectedRoom || !selectedRoom.customRates?.length) && (
                    <p className="text-xs text-gray-400 mt-2">Select a room first to see custom hourly rates (if any).</p>
                  )}"""

content = content.replace(target, replacement)

# Fix math for calculations
price_math_target = """  const basePrice = selectedRoom ? (stayInfo.durationOption === '12h' ? selectedRoom.price12h : selectedRoom.price24h) : 0;
  const pricePerUnit = basePrice + extraCharge;
  const grossTotal = stayInfo.durationOption === '12h' ? pricePerUnit : pricePerUnit * nights;"""

price_math_replacement = """  const customHours = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null;
  const customRate = customHours ? selectedRoom?.customRates?.find(r => r.hours === customHours)?.price || 0 : 0;
  const basePrice = selectedRoom ? (stayInfo.durationOption === '12h' ? selectedRoom.price12h : (customHours ? customRate : selectedRoom.price24h)) : 0;
  const pricePerUnit = basePrice + (customHours ? 0 : extraCharge);
  const grossTotal = (stayInfo.durationOption === '12h' || customHours) ? pricePerUnit : pricePerUnit * nights;"""

content = content.replace(price_math_target, price_math_replacement)

# Fix checkout date passing
submit_target = "const checkoutDate = stayInfo.durationOption === '12h' ? stayInfo.checkInDate : stayInfo.expectedCheckOutDate;"
submit_replacement = "const checkoutDate = (stayInfo.durationOption === '12h' || stayInfo.durationOption.startsWith('custom_')) ? stayInfo.checkInDate : stayInfo.expectedCheckOutDate;"
content = content.replace(submit_target, submit_replacement)

# Fix display text
display_target = "<p className=\"font-bold text-gray-900 mt-0.5\">{stayInfo.durationOption === '12h' ? '12 Hours' : `${nights} Night${nights > 1 ? 's' : ''}`}</p>"
display_replacement = "<p className=\"font-bold text-gray-900 mt-0.5\">{stayInfo.durationOption.startsWith('custom_') ? `${stayInfo.durationOption.split('_')[1]} Hours` : (stayInfo.durationOption === '12h' ? '12 Hours' : `${nights} Night${nights > 1 ? 's' : ''}`)}</p>"
content = content.replace(display_target, display_replacement).replace(display_target, display_replacement)

# Room card price display
card_price_target = "const roomPrice = stayInfo.durationOption === '12h' ? room.price12h : room.price24h;"
card_price_replacement = "const customHr = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null; const roomPrice = stayInfo.durationOption === '12h' ? room.price12h : (customHr ? (room.customRates?.find(r => r.hours === customHr)?.price || 0) : room.price24h);"
content = content.replace(card_price_target, card_price_replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckIn")
