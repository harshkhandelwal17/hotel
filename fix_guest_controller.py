import sys

with open('backend/src/controllers/guestController.js', 'r') as f:
    content = f.read()

# For createGuest
create_target = """exports.createGuest = async (req, res, next) => {
  try {
    const hostel = req.user.role === 'admin' ? req.body.hostel : req.user.assignedHostel;
    const guest = await Guest.create({ ...req.body, hostel });"""

create_rep = """exports.createGuest = async (req, res, next) => {
  try {
    const hostel = req.user.role === 'admin' ? req.body.hostel : req.user.assignedHostel;
    const payload = { ...req.body, hostel };
    if (payload.mobileNumber === '') delete payload.mobileNumber;
    const guest = await Guest.create(payload);"""

content = content.replace(create_target, create_rep)

# For updateGuest
update_target = """exports.updateGuest = async (req, res, next) => {
  try {
    let guest = await Guest.findById(req.params.id);"""

update_rep = """exports.updateGuest = async (req, res, next) => {
  try {
    if (req.body.mobileNumber === '') delete req.body.mobileNumber;
    let guest = await Guest.findById(req.params.id);"""

content = content.replace(update_target, update_rep)

with open('backend/src/controllers/guestController.js', 'w') as f:
    f.write(content)

print("Guest controller updated.")
