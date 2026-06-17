import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import StudentDashboard from './components/StudentDashboard.tsx';
import ManagerDashboard from './components/ManagerDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { User, StudentProfile } from './types.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);

  // Sync state with localStorage on startup for consistent iframe experience
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('aur_mess_token');
      const storedUser = localStorage.getItem('aur_mess_user');
      const storedProfile = localStorage.getItem('aur_mess_profile');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedProfile) {
          setStudentProfile(JSON.parse(storedProfile));
        }
      }
    } catch (e) {
      console.warn('Session loading failed from localStorage');
    } finally {
      setAppReady(true);
    }
  }, []);

  const handleLoginSuccess = (
    loggedInUser: User,
    profile: StudentProfile | null,
    accessToken: string
  ) => {
    setUser(loggedInUser);
    setStudentProfile(profile);
    setToken(accessToken);

    // Persist session index
    localStorage.setItem('aur_mess_token', accessToken);
    localStorage.setItem('aur_mess_user', JSON.stringify(loggedInUser));
    if (profile) {
      localStorage.setItem('aur_mess_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('aur_mess_profile');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStudentProfile(null);
    setToken(null);
    localStorage.removeItem('aur_mess_token');
    localStorage.removeItem('aur_mess_user');
    localStorage.removeItem('aur_mess_profile');
  };

  const syncRefreshedUserData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/student/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setStudentProfile(data.profile);
          localStorage.setItem('aur_mess_profile', JSON.stringify(data.profile));
        }
      }
    } catch (e) {
      console.warn('Silent refresh was bypassed');
    }
  };

  if (!appReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-mono text-xs text-amber-500 gap-2">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"></span>
        Synchronizing AUR Portal State...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Visual background header element */}
      <div className="flex flex-col flex-1">
        {user && <Header user={user} onLogout={handleLogout} />}

        <main className="flex-1">
          {!user ? (
            <AuthScreen onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              {user.role === 'student' && (
                <StudentDashboard 
                  user={user} 
                  token={token!} 
                  onRefreshUser={syncRefreshedUserData} 
                />
              )}
              {user.role === 'manager' && (
                <ManagerDashboard 
                  user={user} 
                  token={token!} 
                />
              )}
              {user.role === 'admin' && (
                <AdminDashboard 
                  user={user} 
                  token={token!} 
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Humble literal footer credits conforming to anti-slop guidelines */}
      <footer className="py-4 text-center border-t border-slate-200/50 text-[10px] text-slate-400 font-mono tracking-tight bg-white">
        Amity University Rajasthan • Department of Student Welfare • AUR Mess Portal 2026
      </footer>
    </div>
  );
}
