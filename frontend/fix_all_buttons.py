import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

target_12h = """<button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h' })}"""
replace_12h = """<button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm") })}"""
content = content.replace(target_12h, replace_12h)

target_24h = """<button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h' })}"""
replace_24h = """<button type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm") })}"""
content = content.replace(target_24h, replace_24h)

target_custom = """onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}` })}"""
replace_custom = """onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), rate.hours), "yyyy-MM-dd'T'HH:mm") })}"""
content = content.replace(target_custom, replace_custom)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Replaced all buttons!")
