import sys, re

with open('frontend/src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

# Make the main layout have padding-bottom so content doesn't get hidden behind bottom nav
target_main = '<main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">'
rep_main = '<main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8 animate-in fade-in duration-500">'
content = content.replace(target_main, rep_main)

# Add Bottom Nav before the closing </div> of AppLayout
bottom_nav = """
      {/* ─── Mobile Bottom App Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          <Link to="/dashboard" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/dashboard' ? 'text-black' : 'text-gray-400'}`}>
            <Home size={22} className={location.pathname === '/dashboard' ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Home</span>
          </Link>
          
          <Link to="/checkouts" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'text-black' : 'text-gray-400'}`}>
            <Users size={22} className={location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Guests</span>
          </Link>
          
          <div className="relative -top-5">
            <Link to="/checkin" className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-xl hover:bg-gray-800 transition-all active:scale-95 border-4 border-[#F9FAFB]">
              <PlusCircle size={28} />
            </Link>
          </div>
          
          <Link to="/payments" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/payments' ? 'text-black' : 'text-gray-400'}`}>
            <CreditCard size={22} className={location.pathname === '/payments' ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Pay</span>
          </Link>
          
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-black transition-colors">
            <Menu size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">More</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
};"""

target_end = """    </div>
  );
};"""

content = content.replace(target_end, bottom_nav)

with open('frontend/src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("Bottom Nav patched")
