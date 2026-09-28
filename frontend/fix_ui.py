import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# Fix state
old_state = "const [formData, setFormData] = useState({ roomNumber: '', hostel: '', floor: '', roomType: 'Standard Double', capacity: 2, price12h: '', price24h: '', extraPerPerson12h: '', extraPerPerson24h: '' });"
new_state = "const [formData, setFormData] = useState({ roomNumber: '', hostel: '', floor: '', roomType: 'Standard Double', capacity: 2, price12h: '', price24h: '', extraPerPerson12h: '', extraPerPerson24h: '', customRates: [] });"

content = content.replace(old_state, new_state)

target = """                  {/* Extra Per Person */}"""

insertion = """                  {/* Custom Hourly Rates */}
                  <div className="pt-2 border-t border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-gray-600">Custom Hourly Rates (Optional)</p>
                      <button type="button" onClick={() => setFormData({...formData, customRates: [...(formData.customRates || []), { hours: '', price: '' }]})} className="text-xs text-blue-600 font-bold hover:underline">+ Add Custom Rate</button>
                    </div>
                    {formData.customRates && formData.customRates.map((rate, i) => (
                      <div key={i} className="flex gap-3 mb-2 items-center">
                        <div className="flex-1">
                          <input type="number" min="1" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" placeholder="Hours (e.g. 1)" value={rate.hours} onChange={e => {
                            const newRates = [...formData.customRates];
                            newRates[i].hours = e.target.value;
                            setFormData({...formData, customRates: newRates});
                          }} />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" placeholder="Price" value={rate.price} onChange={e => {
                            const newRates = [...formData.customRates];
                            newRates[i].price = e.target.value;
                            setFormData({...formData, customRates: newRates});
                          }} />
                        </div>
                        <button type="button" onClick={() => {
                          const newRates = formData.customRates.filter((_, idx) => idx !== i);
                          setFormData({...formData, customRates: newRates});
                        }} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>

"""

if "Custom Hourly Rates" not in content:
    content = content.replace(target, insertion + target)
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Fixed")
else:
    print("Already fixed")
