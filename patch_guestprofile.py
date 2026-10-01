import sys

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'r') as f:
    content = f.read()

# 1. Fix activeStay Co-Guests to filter out the current guest
active_stay_target = """{activeStay.coGuests && activeStay.coGuests.length > 0 && ("""
active_stay_rep = """{activeStay.coGuests && activeStay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && ("""
content = content.replace(active_stay_target, active_stay_rep)

active_stay_map_target = """{activeStay.coGuests.map(cg => ("""
active_stay_map_rep = """{activeStay.coGuests.filter(cg => cg._id !== guest._id).map(cg => ("""
content = content.replace(active_stay_map_target, active_stay_map_rep)


# 2. Fix historyStays to show other co-guests even if isPrimary is false
history_target = """{isPrimary && stay.coGuests && stay.coGuests.length > 0 && ("""
history_rep = """{stay.coGuests && stay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && ("""
content = content.replace(history_target, history_rep)

history_map_target = """{stay.coGuests.map(cg => ("""
history_map_rep = """{stay.coGuests.filter(cg => cg._id !== guest._id).map(cg => ("""
content = content.replace(history_map_target, history_map_rep)

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'w') as f:
    f.write(content)

print("GuestProfile patched.")
