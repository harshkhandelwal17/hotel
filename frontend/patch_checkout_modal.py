import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# 1. Update modal wrapper to use max-h and flex column
target_wrapper = 'className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"'
replacement_wrapper = 'className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]"'
content = content.replace(target_wrapper, replacement_wrapper)

# 2. Make form flex col so it inherits height
target_form = '<form onSubmit={handleCheckout}>'
replacement_form = '<form onSubmit={handleCheckout} className="flex flex-col overflow-hidden h-full">'
content = content.replace(target_form, replacement_form)

# 3. Make the content scrollable and flex-1
target_content = '<div className="p-6 space-y-6">'
replacement_content = '<div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1">'
content = content.replace(target_content, replacement_content)

# 4. Make the footer buttons stack on mobile and flex-shrink-0
target_footer = '<div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-3xl">'
replacement_footer = '<div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-3xl flex-shrink-0">'
content = content.replace(target_footer, replacement_footer)

# Fix bottom buttons to be full width on mobile
cancel_btn = '<button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>'
rep_cancel = '<button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 text-sm font-bold text-gray-600 bg-white sm:bg-transparent border sm:border-0 border-gray-200 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-colors">Cancel</button>'
content = content.replace(cancel_btn, rep_cancel)

confirm_btn = 'className="px-8 py-2.5 bg-red-600 text-white text-sm font-black uppercase tracking-wide rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95"'
rep_confirm = 'className="w-full sm:w-auto justify-center px-8 py-3.5 sm:py-2.5 bg-red-600 text-white text-sm font-black uppercase tracking-wide rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95"'
content = content.replace(confirm_btn, rep_confirm)

# Also fix header padding for mobile
target_header = '<div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start">'
rep_header = '<div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-start flex-shrink-0">'
content = content.replace(target_header, rep_header)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal UI responsive patched.")
