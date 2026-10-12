import zlib
import struct
import os

def create_png(width, height, filename):
    # Create raw RGBA image data
    # Emerald green rounded shield background (#0f172a with #10b981 center)
    raw_data = bytearray()
    
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        ny = (y - height / 2) / (height / 2)
        for x in range(width):
            nx = (x - width / 2) / (width / 2)
            dist_sq = nx * nx + ny * ny
            
            # Rounded squircle / icon shape
            if abs(nx)**4 + abs(ny)**4 < 0.85:
                # Inside icon
                # Draw a stylish 'H' in the center
                in_h = False
                if abs(ny) < 0.6:
                    if abs(nx - 0.25) < 0.08 or abs(nx + 0.25) < 0.08:
                        in_h = True
                    elif abs(nx) <= 0.25 and abs(ny) < 0.1:
                        in_h = True
                
                if in_h:
                    # White / Bright Cyan letter
                    r, g, b, a = 255, 255, 255, 255
                else:
                    # Emerald gradient (#059669 -> #10b981)
                    r = int(16 + 20 * (1 - ny))
                    g = int(185 + 30 * (1 - ny))
                    b = int(129 + 40 * (1 - ny))
                    a = 255
            else:
                # Transparent outside
                r, g, b, a = 0, 0, 0, 0
                
            raw_data.extend([r, g, b, a])
            
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += struct.pack('>I', len(ihdr)) + b'IHDR' + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xffffffff)
    
    # IDAT chunk
    compressed = zlib.compress(bytes(raw_data), 9)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    
    # IEND chunk
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Created {filename} successfully ({len(png)} bytes)")

if __name__ == '__main__':
    target = os.path.join(os.path.dirname(__file__), 'icon.png')
    create_png(256, 256, target)

