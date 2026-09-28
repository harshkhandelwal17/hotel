import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

# Replace the Standard Options mapping
def standard_button_replacer(match):
    return """<button
                      key={o.id} type="button"
                      onClick={() => {
                        let newCheckOut = new Date(stayInfo.checkInDate);
                        if (o.id === '24h') {
                          newCheckOut = addDays(newCheckOut, 1);
                        } else if (o.id === '12h') {
                          newCheckOut = addHours(newCheckOut, 12);
                        }
                        setStayInfo({ 
                          ...stayInfo, 
                          durationOption: o.id,
                          expectedCheckOutDate: format(newCheckOut, "yyyy-MM-dd'T'HH:mm")
                        });
                      }}"""

content = re.sub(r'<button\s*key=\{o\.id\}\s*type="button"\s*onClick=\{[^{]*setStayInfo\(\{ \.\.\.stayInfo, durationOption: o\.id \}\)\}', standard_button_replacer, content)

# Replace the Custom Rates mapping
def custom_button_replacer(match):
    return """<button
                      key={rate._id} type="button"
                      onClick={() => {
                        const newCheckOut = addHours(new Date(stayInfo.checkInDate), rate.hours);
                        setStayInfo({ 
                          ...stayInfo, 
                          durationOption: `custom_${rate.hours}`, 
                          expectedCheckOutDate: format(newCheckOut, "yyyy-MM-dd'T'HH:mm") 
                        });
                      }}"""

content = re.sub(r'<button\s*key=\{rate\._id\}\s*type="button"\s*onClick=\{[^{]*setStayInfo\(\{ \.\.\.stayInfo, durationOption: `custom_\$\{rate\.hours\}` \}\)\}', custom_button_replacer, content)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed buttons")
