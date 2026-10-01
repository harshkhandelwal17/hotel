with open('frontend/src/index.css', 'a') as f:
    f.write("""
/* Mobile App Feel Enhancements */
html, body {
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none; /* Prevents pull-to-refresh bounce on iOS */
  scroll-behavior: smooth;
}

body {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Hide scrollbar for a cleaner app look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #E5E7EB; 
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #D1D5DB; 
}
""")
print("CSS patched")
