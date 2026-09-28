import os, glob

files = glob.glob("src/**/*.jsx", recursive=True)

# Replace all occurrences exactly:
# 'http://127.0.0.1:5001/api
# "http://127.0.0.1:5001/api
# `http://127.0.0.1:5001/api

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # Create a global constant import if needed, but Vite can just evaluate import.meta.env
    
    # We will replace the EXACT strings:
    content = content.replace("'http://127.0.0.1:5001", "import.meta.env.VITE_API_URL + '")
    content = content.replace('"http://127.0.0.1:5001', "import.meta.env.VITE_API_URL + '")
    
    # For backticks, it's already inside a template literal, so:
    # `http://127.0.0.1:5001/uploads...` -> `${import.meta.env.VITE_API_URL}/uploads...`
    content = content.replace("`http://127.0.0.1:5001", "`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}")
    
    # However, if we do import.meta.env.VITE_API_URL + '/api...', we need to make sure we handle the fallback.
    # Better to replace with a fallback:
    # '(import.meta.env.VITE_API_URL || "http://127.0.0.1:5001") + "'
    content = content.replace("import.meta.env.VITE_API_URL + '", "(import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '")
    
    with open(filepath, "w") as f:
        f.write(content)

print("Safe replace done!")
