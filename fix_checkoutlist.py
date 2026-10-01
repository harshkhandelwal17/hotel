import sys

with open('frontend/src/pages/receptionist/CheckoutList.jsx', 'r') as f:
    content = f.read()

# Add a Skeleton Loader
target_loading = """  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );"""

rep_loading = """  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 rounded-xl" />
      <div className="h-14 w-full bg-gray-200 rounded-2xl" />
      <div className="flex gap-2"><div className="h-8 w-24 bg-gray-200 rounded-xl" /><div className="h-8 w-24 bg-gray-200 rounded-xl" /></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  );"""

content = content.replace(target_loading, rep_loading)

# Apply fade-in animation to the main div
content = content.replace('<div className="space-y-6">', '<div className="space-y-6 animate-in fade-in duration-500">')

with open('frontend/src/pages/receptionist/CheckoutList.jsx', 'w') as f:
    f.write(content)

print("CheckoutList skeleton patched")
