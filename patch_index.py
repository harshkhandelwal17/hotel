import sys

with open('frontend/index.html', 'r') as f:
    content = f.read()

target = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
rep = """<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#ffffff" />"""

content = content.replace(target, rep)

with open('frontend/index.html', 'w') as f:
    f.write(content)
print("index.html patched")
