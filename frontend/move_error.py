import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# Remove the error from top
content = content.replace("""            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}""", "")

# Add it to footer
footer_target = """          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-between items-center">"""
          
footer_replace = """          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex flex-col gap-3">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100 w-full animate-in fade-in">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="flex justify-between items-center w-full">"""

content = content.replace(footer_target, footer_replace)

# Close the div we opened for flex flex-col
end_target = """            </button>
          </div>
        </form>"""
end_replace = """            </button>
            </div>
          </div>
        </form>"""
content = content.replace(end_target, end_replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Moved error block to bottom.")
