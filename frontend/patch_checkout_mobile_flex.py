import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# Fix 1: Additional Charges Flex
target1 = """                <div className="flex gap-2">
                  <div className="relative w-1/3">"""
rep1 = """                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative w-full sm:w-1/3">"""
content = content.replace(target1, rep1)

# Fix 2: Final Math Final Balance
target2 = """              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-200 flex justify-between items-end">"""
rep2 = """              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-200 flex flex-col sm:flex-row justify-between sm:items-end gap-2">"""
content = content.replace(target2, rep2)

# Fix 3: Collect Payment
target3 = """                <div className="flex gap-4">
                  <div className="flex-1 relative">"""
rep3 = """                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:flex-1 relative">"""
content = content.replace(target3, rep3)

target4 = """                  <div className="flex gap-2 mt-2">"""
rep4 = """                  <div className="grid grid-cols-3 gap-2 mt-2">"""
content = content.replace(target4, rep4)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal flex layouts patched for mobile")
