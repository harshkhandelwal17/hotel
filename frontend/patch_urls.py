import os, re, glob

files = glob.glob("src/**/*.jsx", recursive=True)

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # Step 1: Replace single quoted URLs
    # Match: 'http://127.0.0.1:5001/api/auth/me'
    # Change to: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/auth/me`
    content = re.sub(r"'http://127\.0\.0\.1:5001(.*?)'", r"`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}\1`", content)
    
    # Step 2: Replace double quoted URLs
    content = re.sub(r'"http://127\.0\.0\.1:5001(.*?)"', r"`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}\1`", content)
    
    # Step 3: Replace URLs inside existing backticks
    # E.g. `http://127.0.0.1:5001/api/guests?mobile=${value}`
    content = re.sub(r"http://127\.0\.0\.1:5001", r"${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}", content)
    
    with open(filepath, "w") as f:
        f.write(content)

print("Patched all API URLs")
