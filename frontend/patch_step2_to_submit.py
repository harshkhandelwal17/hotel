import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Update Step 2 Submit Button
target_button = """<button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                onClick={() => setStep(3)} disabled={!canProceed2}>
                Next: Payment <ChevronRight size={18} />
              </button>"""

replacement_button = """<button type="button" className="bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md uppercase tracking-wide text-sm"
                onClick={handleSubmit} disabled={!canProceed2 || loading}>
                {loading ? 'Processing...' : 'Complete Check-In'} <CheckCircle2 size={18} />
              </button>"""

content = content.replace(target_button, replacement_button)

# 2. Delete Step 3 block
# We match from `{/* ─── STEP 3: Payment ────────────────────────────────────────────── */}`
# up to the end of the `step === 3` block, which is just before `</div>\n    </div>\n  );\n};\n\nexport default CheckIn;`
step3_pattern = re.compile(r'\{/\* ─── STEP 3: Payment ────────────────────────────────────────────── \*/\}.*?(?=\s*</div>\s*</div>\s*\);\s*\};\s*export default CheckIn;)', re.DOTALL)

content = re.sub(step3_pattern, '', content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Removed Step 3 and updated Step 2.")
