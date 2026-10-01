import sys

with open('frontend/src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# Add useToast import
target_import = "import { X, Clock, CreditCard, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';"
rep_import = "import { X, Clock, CreditCard, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';\nimport { useToast } from '../../components/ui/Toast';"
content = content.replace(target_import, rep_import)

# Initialize useToast
target_init = """const CheckoutModal = ({ stay, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);"""
rep_init = """const CheckoutModal = ({ stay, onClose, onSuccess }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);"""
content = content.replace(target_init, rep_init)

# Use toast in handleCheckout
target_submit = """    } catch (err) {
      alert(err.response?.data?.message || 'Error processing checkout');
    } finally {
      setLoading(false);
    }
  };"""
rep_submit = """    } catch (err) {
      toast({ message: err.response?.data?.message || 'Error processing checkout', type: 'error' });
    } finally {
      setLoading(false);
    }
  };"""
content = content.replace(target_submit, rep_submit)

# Also toast on success
target_success = """      onSuccess();
    } catch (err) {"""
rep_success = """      toast({ message: `Successfully checked out ${stay.guest?.fullName}`, type: 'success' });
      onSuccess();
    } catch (err) {"""
content = content.replace(target_success, rep_success)

with open('frontend/src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)

print("CheckoutModal toast patched")
