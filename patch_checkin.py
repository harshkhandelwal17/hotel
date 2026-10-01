import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Import the utility
import_target = "import { CheckCircle2, Search, Plus, UserPlus, CreditCard, ChevronRight, Bed, Clock, Users, Percent, ShieldCheck, Calendar, Camera, Image as ImageIcon } from 'lucide-react';"
rep_import = import_target + "\nimport { compressImage } from '../../utils/imageCompression';"
content = content.replace(import_target, rep_import)

# Update handleImageUpload
upload_target = """  const handleImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);"""

upload_rep = """  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      // Compress the image before uploading to avoid browser memory crashes on mobile
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressedFile);"""
      
content = content.replace(upload_target, upload_rep)

finally_target = """    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    }
  };"""

finally_rep = """    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Memory issue or network error.');
    } finally {
      setUploadingImage(false);
    }
  };"""
content = content.replace(finally_target, finally_rep)

# Add a loading state UI for image upload
ui_target = """                      {guest.idProofImage && (
                        <div className="mt-3 flex items-center gap-3 bg-green-50 p-2.5 rounded-xl border border-green-100">"""

ui_rep = """                      {uploadingImage && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                          Compressing & Uploading...
                        </div>
                      )}
                      {!uploadingImage && guest.idProofImage && (
                        <div className="mt-3 flex items-center gap-3 bg-green-50 p-2.5 rounded-xl border border-green-100">"""

content = content.replace(ui_target, ui_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn.jsx image compression patched")
