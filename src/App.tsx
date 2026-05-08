import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shirt, Sparkles, BookOpen, User, Loader2, LogIn } from 'lucide-react';
import { auth } from './lib/firebase';

import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import Inspiration from './pages/Inspiration';

export default function App() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}

function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-sand-50">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen pb-20 md:pb-0 md:pt-0">
        {!user ? <LoginView /> : <MainLayout />}
      </div>
    </Router>
  );
}

function LoginView() {
  const { signIn } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 text-center space-y-8 bg-sand-100">
      <div className="space-y-4">
        <h1 className="serif text-5xl md:text-7xl font-light tracking-tight text-ink">StyleMate</h1>
        <p className="text-accent max-w-xs mx-auto text-sm tracking-wide uppercase">Your Intelligent AI Fashion Stylist</p>
      </div>
      
      <div className="relative group cursor-pointer" onClick={signIn}>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-ink rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
        <button className="relative px-8 py-3 bg-white text-ink rounded-full leading-none flex items-center space-x-3 transition duration-200 hover:bg-sand-50 border border-ink/5">
          <LogIn className="w-4 h-4" />
          <span className="text-sm font-medium">Continue with Google</span>
        </button>
      </div>

      <p className="text-[10px] text-ink/40 max-w-[200px] leading-relaxed italic">
        If login doesn't respond, please try opening this app in a <strong>new tab</strong>.
      </p>
      
      <div className="absolute bottom-8 text-[10px] text-ink/40 uppercase tracking-[0.2em]">
        Fashion meets Intelligence
      </div>
    </div>
  );
}

function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Bottom Nav for Mobile, Sidebar for Desktop */}
      <main className="flex-1 overflow-y-auto scroll-smooth pb-32 pt-12 md:pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/inspiration" element={<Inspiration />} />
        </Routes>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass px-6 py-4 flex items-center justify-around z-50 md:justify-between md:px-12 lg:px-24">
        <div className="hidden md:block">
          <h2 className="serif text-2xl font-light tracking-tighter">StyleMate</h2>
        </div>

        <div className="flex items-center space-x-8 md:space-x-12">
          <NavIcon to="/" icon={<Sparkles />} label="Daily" active={location.pathname === '/'} />
          <NavIcon to="/wardrobe" icon={<Shirt />} label="Wardrobe" active={location.pathname === '/wardrobe'} />
          <NavIcon to="/inspiration" icon={<BookOpen />} label="Inspo" active={location.pathname === '/inspiration'} />
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <button onClick={() => auth.signOut()} className="text-[10px] font-bold uppercase tracking-widest text-ink/40 hover:text-ink transition-colors">Sign Out</button>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
             <User className="w-4 h-4 text-accent" />
          </div>
        </div>
      </nav>
    </div>
  );
}

function NavIcon({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link to={to} className={`flex flex-col items-center space-y-1 transition-all duration-300 ${active ? 'text-ink scale-110' : 'text-ink/40 hover:text-ink/60'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: active ? 2.5 : 1.5 })}
      <span className={`text-[10px] uppercase tracking-widest font-medium ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </Link>
  );
}
