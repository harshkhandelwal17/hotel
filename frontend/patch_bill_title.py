import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """          <div class="header">
            <h1 class="title">HotelPro</h1>
            <div class="subtitle">Tax Invoice / Receipt</div>
          </div>"""

replacement = """          <div class="header">
            <h1 class="title">${stay.hostel?.name || 'HotelPro'}</h1>
            <div class="subtitle">Tax Invoice / Receipt</div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">${stay.hostel?.address || ''}</div>
          </div>"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated bill title")
