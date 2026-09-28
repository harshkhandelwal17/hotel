import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stay._id}/extend`, {
        newCheckOutDate,
        extensionPayment: Number(extensionPayment)
      });"""

replace = """      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stay._id}/extend`, {
        newCheckOutDate: new Date(newCheckOutDate).toISOString(),
        extensionPayment: Number(extensionPayment)
      });"""

content = content.replace(target, replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched ExtendStay payload with toISOString()")
