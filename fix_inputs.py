import sys
import re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Fix Camera input
old_cam = r"""<label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">\s*<Camera size=\{20\} className="group-hover:text-white" />\s*<span className="text-\[10px\] font-black uppercase tracking-widest">\s*Camera\s*</span>\s*<input\s*type="file"\s*accept="image/\*"\s*capture="environment"\s*className="hidden"\s*onChange=\{\(e\) =>\s*handleImageUpload\(\s*index,\s*e\.target\.files\[0\]\s*\)\s*\}\s*/>\s*</label>"""

new_cam = """<label htmlFor={`camera-${index}`} className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">
                      <Camera size={20} className="group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Camera
                      </span>
                      <input
                        id={`camera-${index}`}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(
                            index,
                            e.target.files[0]
                          )
                        }
                      />
                    </label>"""

content = re.sub(old_cam, new_cam, content)

# Fix Gallery input
old_gal = r"""<label className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">\s*<Upload size=\{20\} className="group-hover:text-white" />\s*<span className="text-\[10px\] font-black uppercase tracking-widest">\s*Gallery\s*</span>\s*<input\s*type="file"\s*accept="image/\*"\s*className="hidden"\s*onChange=\{\(e\) =>\s*handleImageUpload\(\s*index,\s*e\.target\.files\[0\]\s*\)\s*\}\s*/>\s*</label>"""

new_gal = """<label htmlFor={`gallery-${index}`} className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-black hover:border-black hover:text-white transition-all group text-gray-500">
                      <Upload size={20} className="group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Gallery
                      </span>
                      <input
                        id={`gallery-${index}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(
                            index,
                            e.target.files[0]
                          )
                        }
                      />
                    </label>"""

content = re.sub(old_gal, new_gal, content)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Inputs fixed.")
