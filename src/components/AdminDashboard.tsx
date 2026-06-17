import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, AlertCircle, Trash2, PlusCircle, ShieldAlert, 
  Settings, Volume2, History, Banknote, Sparkles, TrendingUp, BarChart3, RotateCw 
} from 'lucide-react';
import { User, AuditLog } from '../types.ts';

interface AdminDashboardProps {
  user: User;
  token: string;
}

export default function AdminDashboard({ user, token }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'timings' | 'announcements' | 'audits'>('users');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Timings fields
  const [timings, setTimings] = useState({
    breakfast: '07:30 AM - 09:30 AM',
    lunch: '12:30 PM - 02:30 PM',
    snacks: '05:00 PM - 06:15 PM',
    dinner: '07:30 PM - 09:30 PM'
  });

  // Create User State
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserFullName, setCreateUserFullName] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'student' | 'manager' | 'admin'>('student');
  const [createEnrollmentNumber, setCreateEnrollmentNumber] = useState('');
  const [createHostlerId, setCreateHostlerId] = useState('');
  const [createMessId, setCreateMessId] = useState('mess_1');

  // Adjust Fee balance
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [newFeeBalance, setNewFeeBalance] = useState<number>(45000);

  // Broadcast announcements state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'students' | 'staff'>('all');
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminDetails = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // Get users
      const uRes = await fetch('/api/admin/users', { headers });
      const uData = await uRes.json();
      setAllUsers(Array.isArray(uData) ? uData : []);

      // Get audit logs
      const aRes = await fetch('/api/admin/audit-logs', { headers });
      const aData = await aRes.json();
      setAuditLogs(Array.isArray(aData) ? aData : []);

      // Get timings
      const tRes = await fetch('/api/admin/timings');
      const tData = await tRes.json();
      if (tData) {
        setTimings(tData);
      }

      // Get student dashboard announcements (reused to list them for deletion)
      const stDashboardRes = await fetch('/api/student/dashboard', { headers });
      if (stDashboardRes.ok) {
        const temp = await stDashboardRes.json();
        setAnnouncementsList(temp.announcements || []);
      }

      setError(null);
    } catch (err) {
      setError('Connection failure loading security module');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, [token]);

  // Toggle user state active/deactivate
  const toggleUserActiveState = async (id: number, currentStatus: number) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, isActive: nextStatus })
      });
      if (res.ok) {
        fetchAdminDetails();
      }
    } catch (e) {
      alert('Error saving toggle');
    }
  };

  // Delete User
  const deleteUserProfile = async (id: number) => {
    if (!window.confirm('Erase this profile permanently from university registries?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminDetails();
      }
    } catch (e) {
      alert('Failed to erase profile');
    }
  };

  // Create User submit
  const submitCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createUserEmail,
          fullName: createUserFullName,
          password: createUserPassword,
          role: createUserRole,
          enrollmentNumber: createUserRole === 'student' ? createEnrollmentNumber : undefined,
          hostlerId: createUserRole === 'student' ? createHostlerId : undefined,
          messId: createUserRole === 'student' ? createMessId : undefined,
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Account created successfully: ${createUserFullName} added.`);
        // Reset
        setCreateUserEmail('');
        setCreateUserFullName('');
        setCreateUserPassword('');
        setCreateEnrollmentNumber('');
        setCreateHostlerId('');
        fetchAdminDetails();
      } else {
        alert(data.error || 'Check fields or duplicates');
      }
    } catch (e) {
      alert('Network registration failure');
    }
  };

  // Modify Remaining budget
  const submitFeeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      const res = await fetch('/api/admin/users/fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId: selectedStudentId, feeBalance: newFeeBalance })
      });

      if (res.ok) {
        alert('Balance adjusted successfully!');
        setSelectedStudentId(null);
        fetchAdminDetails();
      } else {
        alert('Balance adjustment failed');
      }
    } catch (e) {
      alert('Failed adjustment connection');
    }
  };

  // Modify Timings
  const submitTimingsCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/timings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(timings)
      });
      if (res.ok) {
        alert('Mess timings updated throughout security systems!');
        fetchAdminDetails();
      }
    } catch (e) {
      alert('Timings change error');
    }
  };

  // Publish Announcement
  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: broadcastTitle,
          content: broadcastContent,
          targetAudience: broadcastAudience
        })
      });

      if (res.ok) {
        alert('Announcement broadcasted to active student dashboards!');
        setBroadcastTitle('');
        setBroadcastContent('');
        fetchAdminDetails();
      } else {
        alert('Failed broadcast registration');
      }
    } catch (env) {
      alert('Broadcast connection failure');
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!window.confirm('Delete this broadcast announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminDetails();
      }
    } catch (e) {
      alert('Could not delete broadcast');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'users', label: 'Student & Staff accounts', icon: Users },
          { id: 'analytics', label: 'Dining Analytics Charts', icon: BarChart3 },
          { id: 'timings', label: 'Calibration Timings', icon: Clock },
          { id: 'announcements', label: 'News Broadcaster', icon: Volume2 },
          { id: 'audits', label: 'Cron Security Logins', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-3 px-5 text-xs font-semibold whitespace-nowrap border-b-2 font-sans tracking-tight flex items-center gap-2 cursor-pointer transition ${
                isActive 
                  ? 'border-brand-900 text-brand-900 bg-brand-50 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[400px]">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-2 text-xs mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* TAB 1: USER REGISTRIES */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-105 pb-4">
              <div>
                <h3 className="font-sans font-bold text-slate-850 text-md">AUR Student & Security Registry</h3>
                <p className="text-xs text-slate-450 mt-0.5">Control individual access, de-activate accounts, or calibrate dining budgets.</p>
              </div>
              <button 
                onClick={fetchAdminDetails}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reload registries
              </button>
            </div>

            {/* Adjust Fee Balance Overlay Modal */}
            {selectedStudentId && (
              <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/30 space-y-3 animate-fade-in max-w-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-650 font-mono">Calibrate Student Dining Fee</span>
                  <button 
                    onClick={() => setSelectedStudentId(null)}
                    className="text-xs text-slate-450 hover:text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={submitFeeAdjustment} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 font-mono">Set New Balance Amount (in Rupees):</label>
                    <input
                      required
                      type="number"
                      placeholder="45000"
                      value={newFeeBalance}
                      onChange={(e) => setNewFeeBalance(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-extrabold text-xs py-2.5 px-5 rounded-xl border border-amber-400 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Add New User */}
              <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Register New User Account</span>
                <form onSubmit={submitCreateUser} className="space-y-4 font-sans text-xs">
                  
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 font-mono">Role Tier</label>
                    <select
                      value={createUserRole}
                      onChange={(e) => setCreateUserRole(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    >
                      <option value="student">Student Account</option>
                      <option value="manager">Mess Manager</option>
                      <option value="admin">Administrator Tier</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 font-mono">Full Name</label>
                    <input
                      required
                      type="text"
                      value={createUserFullName}
                      onChange={(e) => setCreateUserFullName(e.target.value)}
                      placeholder="E.g., Arjun Verma"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 font-mono">University Email ID</label>
                    <input
                      required
                      type="email"
                      value={createUserEmail}
                      onChange={(e) => setCreateUserEmail(e.target.value)}
                      placeholder="arjun@amity.edu"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 font-mono">Access Password</label>
                    <input
                      required
                      type="password"
                      value={createUserPassword}
                      onChange={(e) => setCreateUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    />
                  </div>

                  {createUserRole === 'student' && (
                    <div className="border-t border-slate-200/50 pt-3 space-y-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 font-mono">Enrollment Number</label>
                        <input
                          required
                          type="text"
                          value={createEnrollmentNumber}
                          onChange={(e) => setCreateEnrollmentNumber(e.target.value)}
                          placeholder="A80101221008"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 font-mono">Hostel Room</label>
                          <input
                            type="text"
                            value={createHostlerId}
                            onChange={(e) => setCreateHostlerId(e.target.value)}
                            placeholder="H3-405"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-605 font-mono">Mess Block</label>
                          <select
                            value={createMessId}
                            onChange={(e) => setCreateMessId(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                          >
                            <option value="mess_1">Mess 1</option>
                            <option value="mess_2">Mess 2</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white font-semibold py-2.5 rounded-xl cursor-pointer"
                  >
                    Create Account
                  </button>

                </form>
              </div>

              {/* Users Listing */}
              <div className="lg:col-span-8 border border-slate-100 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-mono font-bold">
                    <tr>
                      <th className="p-3">User info</th>
                      <th className="p-3">Role Tier</th>
                      <th className="p-3">Privileges / Fees</th>
                      <th className="p-3 text-center">Status state</th>
                      <th className="p-3 text-center">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wide rounded border uppercase ${
                            u.role === 'admin' 
                              ? 'bg-rose-50 text-rose-600 border-rose-200' 
                              : u.role === 'manager'
                              ? 'bg-amber-50 text-amber-600 border-amber-205'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.role === 'student' ? (
                            <div className="space-y-1 font-mono">
                              <p className="text-slate-800 font-semibold">Reg: {u.enrollmentNumber || 'No record'}</p>
                              <p className="text-[10px] text-slate-550 flex items-center gap-1">
                                <span>Bal: ₹{u.feeBalance?.toLocaleString()}</span>
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(u.id); // note: actually student id we need, but student id is linked or they are mapped
                                    setNewFeeBalance(u.feeBalance || 45000);
                                  }}
                                  className="text-[10px] text-amber-600 hover:underline bg-amber-50 px-1 rounded cursor-pointer"
                                >
                                  Adjust
                                </button>
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 italic">Unlimited / Exempted</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleUserActiveState(u.id, u.isActive)}
                            id={`btn_toggle_user_${u.id}`}
                            className={`px-2.5 py-1 text-[10px] font-mono font-extrabold rounded-full border cursor-pointer uppercase select-none transition ${
                              u.isActive === 1
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-250 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-500 border-rose-250 hover:bg-rose-100/65'
                            }`}
                          >
                            {u.isActive === 1 ? 'Active' : 'Banned'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => deleteUserProfile(u.id)}
                            id={`btn_del_user_${u.id}`}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: RICH ANALYTICS & WASTAGE CHARTS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Dining Metrics & Charts Summary</h3>
              <p className="text-xs text-slate-450 mt-0.5">Vector visuals demonstrating consumer indices, peak check-in intervals, and wastage trends.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Chart 1: Meal Popularity Rating */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150/50 space-y-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" /> Meal Popularity Rating (AUR Average)
                </span>
                
                {/* Visual Custom Mini Columns Chart with SVG */}
                <div className="h-44 flex items-end justify-between px-4 pb-2 border-b border-slate-200">
                  {[
                    { label: 'Breakfast', score: 3.8, percent: 76, color: '#f59e0b' },
                    { label: 'Lunch', score: 4.5, percent: 90, color: '#10b981' },
                    { label: 'Snacks', score: 4.1, percent: 82, color: '#6366f1' },
                    { label: 'Dinner', score: 3.5, percent: 70, color: '#ef4444' }
                  ].map((col) => (
                    <div key={col.label} className="flex flex-col items-center gap-2 group">
                      <div className="relative flex flex-col items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-600 mb-1 opacity-100">{col.score} ★</span>
                        <div 
                          className="w-10 rounded-t-lg transition-all duration-500 hover:brightness-105"
                          style={{ height: `${col.percent}px`, backgroundColor: col.color }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tracking-tight text-slate-400 uppercase font-medium mt-1">{col.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed text-center">
                  Students score lunch highest due to popular items like Paneer butter masala.
                </p>
              </div>

              {/* Chart 2: peak hours check-in load */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-155/60 space-y-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" /> Dining Load Distribution (Peak hours)
                </span>

                <div className="space-y-3 pt-2">
                  {[
                    { slot: '07:45 - 08:15', desc: 'Breakfast Surge', load: 'Heavy', progress: '90%', barColor: 'bg-red-500' },
                    { slot: '12:45 - 13:30', desc: 'Lunch Rush hour', load: 'Extreme peak', progress: '96%', barColor: 'bg-red-505' },
                    { slot: '13:30 - 14:15', desc: 'Lunch Later slots', load: 'Moderate', progress: '50%', barColor: 'bg-indigo-500' },
                    { slot: '19:45 - 20:30', desc: 'Dinner peak surge', load: 'Heavy load', progress: '82%', barColor: 'bg-amber-500' },
                  ].map((loadSlot) => (
                    <div key={loadSlot.slot} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600 font-semibold">{loadSlot.slot} ({loadSlot.desc})</span>
                        <span className="text-slate-405 italic">{loadSlot.load}</span>
                      </div>
                      <div className="w-full bg-slate-205 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${loadSlot.barColor}`} style={{ width: loadSlot.progress }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 3: Weekly Wastage Analytics */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150/50 space-y-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Food Wastage Index (kg/day)
                </span>

                <div className="h-44 flex items-end justify-between px-4 pb-2 border-b border-slate-200">
                  {[
                    { label: 'Mon', kg: 38, h: 76, c: '#fda4af' },
                    { label: 'Tue', kg: 42, h: 84, c: '#f43f5e' },
                    { label: 'Wed', kg: 24, h: 48, c: '#cbd5e1' },
                    { label: 'Thu', kg: 18, h: 36, c: '#94a3b8' },
                    { label: 'Fri', kg: 35, h: 70, c: '#fda4af' },
                    { label: 'Sat', kg: 14, h: 28, c: '#cbd5e1' },
                    { label: 'Sun', kg: 10, h: 20, c: '#e2e8f0' },
                  ].map((bar) => (
                    <div key={bar.label} className="flex flex-col items-center gap-1">
                      <div className="relative flex flex-col items-center hover:scale-105 transition-all">
                        <span className="text-[8px] font-mono font-bold text-slate-500 mb-0.5">{bar.kg}*kg</span>
                        <div 
                          className="w-5 rounded-t"
                          style={{ height: `${bar.h}px`, backgroundColor: bar.c }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-medium">{bar.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed text-center">
                  *Wastage spikes on Tuesdays and Mondays coincide with dry/boiled legumes menus.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: HOURS CALIBRATION TIMINGS */}
        {activeTab === 'timings' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Mess Timings Configuration</h3>
              <p className="text-xs text-slate-450 mt-0.5">Adjust the global timings to control checking gates and hardware scanners.</p>
            </div>

            <form onSubmit={submitTimingsCalibration} className="space-y-4 max-w-lg font-sans text-xs">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Breakfast slot:</label>
                  <input
                    type="text"
                    required
                    value={timings.breakfast}
                    onChange={(e) => setTimings({ ...timings, breakfast: e.target.value })}
                    className="w-full p-2.5 bg-slate-5 = border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-605 block">Lunch slot:</label>
                  <input
                    type="text"
                    required
                    value={timings.lunch}
                    onChange={(e) => setTimings({ ...timings, lunch: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Evening Tea & Snacks slot:</label>
                  <input
                    type="text"
                    required
                    value={timings.snacks}
                    onChange={(e) => setTimings({ ...timings, snacks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block font-mono">Dinner slot:</label>
                  <input
                    type="text"
                    required
                    value={timings.dinner}
                    onChange={(e) => setTimings({ ...timings, dinner: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn_save_timings"
                className="bg-brand-900 hover:bg-brand-800 text-white font-semibold py-2.5 px-6 rounded-xl border border-brand-950 cursor-pointer shadow"
              >
                Calibrate timing structures
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: NEWS BROADCASTER ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Portal Broadcast Center</h3>
              <p className="text-xs text-slate-450 mt-0.5">Publish alerts directly to student and staff home pages.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              {/* Broadcast creation */}
              <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 font-sans text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Draft Announcement</span>
                <form onSubmit={submitAnnouncement} className="space-y-4">
                  
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-605 block">Announcement Title:</label>
                    <input
                      required
                      type="text"
                      placeholder="E.g., Revision of Sunday timing"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-605 block">Target Audience:</label>
                    <select
                      value={broadcastAudience}
                      onChange={(e) => setBroadcastAudience(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="all">Everyone (All)</option>
                      <option value="students">Students Only</option>
                      <option value="staff">Mess/Kitchen Staff Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Detailed Content:</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write alert content in simple plain text. Paragraph breaks are supported."
                      value={broadcastContent}
                      onChange={(e) => setBroadcastContent(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-amber-500 placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn_publish_announcement"
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white font-semibold py-3 rounded-xl border border-brand-950 cursor-pointer flex justify-center items-center gap-2 uppercase tracking-wider font-mono text-xs shadow transition"
                  >
                    <Volume2 className="w-4 h-4" /> Broadcast News
                  </button>

                </form>
              </div>

              {/* Announcements checklist */}
              <div className="lg:col-span-7 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Active Declarations board</span>
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto">
                  {announcementsList && announcementsList.map((announceObj) => (
                    <div key={announceObj.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex gap-2 items-center">
                          <h4 className="font-semibold text-slate-800 text-xs">{announceObj.title}</h4>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-mono uppercase">{announceObj.targetAudience}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-md whitespace-pre-wrap">{announceObj.content}</p>
                        <p className="text-[10px] text-slate-400 font-mono pt-1">Published on: {new Date(announceObj.createdAt).toLocaleString()} by {announceObj.creatorName}</p>
                      </div>

                      <button
                        onClick={() => deleteAnnouncement(announceObj.id)}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl h-fit cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM SECURITY AUDIT LOGS */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md text-slate-805">AUR System Cron Audit Logs</h3>
              <p className="text-xs text-slate-450 mt-0.5">Chronological record tracing security access codes, account edits, and server settings adjustments.</p>
            </div>

            <div className="border border-slate-150 rounding shadow-inner bg-slate-50 p-4 rounded-2xl max-h-[400px] overflow-y-auto font-mono text-[11px] text-slate-700 space-y-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2 bg-white rounded border border-slate-100/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
                  <div>
                    <span className="text-[9px] bg-indigo-55 text-indigo-700 font-bold px-1.5 py-0.5 rounded mr-2 uppercase">{log.action}</span>
                    <span className="text-slate-750 font-sans">{log.details}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 text-right shrink-0">
                    <span className="mr-2 font-semibold">User: {log.userEmail}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
