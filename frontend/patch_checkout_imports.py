import sys

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { X, User, Home, Calendar, CreditCard, AlertCircle, CheckCircle2, Plus, Printer } from 'lucide-react';",
    "import { X, User, Home, Calendar, CreditCard, AlertCircle, CheckCircle2, Plus, Printer, ChevronRight } from 'lucide-react';"
)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("Added ChevronRight to imports.")
