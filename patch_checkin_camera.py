import sys, re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Add Camera and Image imports
import_target = "import { CheckCircle2, Search, Plus, UserPlus, CreditCard, ChevronRight, Bed, Clock, Users, Percent, ShieldCheck, Calendar } from 'lucide-react';"
import_rep = "import { CheckCircle2, Search, Plus, UserPlus, CreditCard, ChevronRight, Bed, Clock, Users, Percent, ShieldCheck, Calendar, Camera, Image as ImageIcon } from 'lucide-react';"
content = content.replace(import_target, import_rep)

# Replace the input type file
target_input = """                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm font-semibold text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />"""

rep_input = """                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group">
                          <Camera size={18} className="text-gray-500 group-hover:text-white" />
                          <span className="text-xs font-black text-gray-700 group-hover:text-white uppercase tracking-widest">Take Photo</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                        </label>
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group">
                          <ImageIcon size={18} className="text-gray-500 group-hover:text-white" />
                          <span className="text-xs font-black text-gray-700 group-hover:text-white uppercase tracking-widest">Gallery</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                        </label>
                      </div>"""

content = content.replace(target_input, rep_input)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn camera/gallery logic patched")
