import { LogOut, ShieldAlert, Award, Coffee, BookOpen } from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  if (!user) return null;

  return (
    <header className="bg-brand-900 text-white shadow-md px-6 py-4 border-b border-brand-850">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* University Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl text-white shadow-inner border border-white/20">
            <BookOpen className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-extrabold text-lg tracking-tight text-white">AMITY UNIVERSITY</span>
              <span className="text-[10px] bg-brand-700 text-white font-bold px-2 py-0.5 rounded tracking-wider">RAJASTHAN</span>
            </div>
            <p className="text-[11px] text-blue-200 tracking-tight font-medium">AUR Campus Dining & Mess Management Portal</p>
          </div>
        </div>

        {/* User Badge Info & Action */}
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-sm">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="font-sans font-semibold text-sm tracking-tight text-white">{user.fullName}</span>
              {user.role === 'admin' && (
                <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-200 border border-rose-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Admin
                </span>
              )}
              {user.role === 'manager' && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  <Award className="w-3 h-3" /> Manager
                </span>
              )}
              {user.role === 'student' && (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Student
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-slate-300">{user.email}</p>
          </div>

          <button
            onClick={onLogout}
            id="btn_logout_header"
            className="p-2.5 bg-white/10 text-white hover:bg-rose-600 hover:text-white rounded-lg border border-white/10 transition-all duration-200 cursor-pointer"
            title="Log Out Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
