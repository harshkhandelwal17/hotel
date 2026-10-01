import sys
import re

with open('backend/src/models/Guest.js', 'r') as f:
    content = f.read()

# Replace required and unique with sparse and remove required
old_mobile = """  mobileNumber: {
    type: String,
    required: [true, 'Please add a mobile number'],
    unique: true
  },"""
new_mobile = """  mobileNumber: {
    type: String,
    sparse: true,
    unique: true
  },"""

content = content.replace(old_mobile, new_mobile)

with open('backend/src/models/Guest.js', 'w') as f:
    f.write(content)

print("Guest model updated.")
