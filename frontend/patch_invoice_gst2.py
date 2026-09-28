import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """<td style="text-align:right; padding-top:30px;">Rs ${stay.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 60px; text-align: center; color: #888; font-size: 14px;">"""

replacement = """<td style="text-align:right; padding-top:30px;">Rs ${stay.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 15px; text-align: right; color: #666; font-size: 11px; font-style: italic;">
            * Amount is inclusive of all applicable taxes (GST)
          </div>
          <div style="margin-top: 60px; text-align: center; color: #888; font-size: 14px;">"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added GST line to GuestProfile Invoice")
