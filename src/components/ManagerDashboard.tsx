import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, Sparkles, MessageSquare, AlertCircle, ShoppingBag, 
  Settings, CheckCircle, XCircle, FileSpreadsheet, PlusCircle, Trash2, CalendarClock, QrCode 
} from 'lucide-react';
import { User, InventoryItem, FeedbackRecord, MessRequest, AttendanceRecord } from '../types.ts';

interface ManagerDashboardProps {
  user: User;
  token: string;
}

interface StaffSchedule {
  id: number;
  name: string;
  role: string;
  shift: string;
}

export default function ManagerDashboard({ user, token }: ManagerDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'scan' | 'menu' | 'inventory' | 'requests' | 'feedback' | 'staff'>('scan');
  
  // Data lists
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // In-memory Staff schedule list
  const [staff, setStaff] = useState<StaffSchedule[]>([
    { id: 1, name: 'Sanjay Kumar', role: 'Head Cook / Halwai', shift: 'Morning Shift (06:00 - 14:00)' },
    { id: 2, name: 'Vimal Meena', role: 'Assistant Chef', shift: 'Evening Shift (14:00 - 22:00)' },
    { id: 3, name: 'Ram Singh', role: 'Store Keeper', shift: 'General Shift (09:00 - 17:00)' },
    { id: 4, name: 'Kamla Devi', role: 'Mess Warden / Staffing', shift: 'Morning Shift (07:00 - 15:00)' }
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Assistant Chef');
  const [newStaffShift, setNewStaffShift] = useState('Morning Shift (06:00 - 14:00)');

  // Selected date filter
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Menu updates state
  const [editMealType, setEditMealType] = useState<string>('breakfast');
  const [editMenuItemsText, setEditMenuItemsText] = useState<string>('');
  
  // Inventory state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemThreshold, setNewItemThreshold] = useState<number>(10);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);

  // QR Simulator State
  const [manualQrInput, setManualQrInput] = useState('');
  const [simulationStatus, setSimulationStatus] = useState<{ success: boolean; msg: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback action note
  const [requestNotes, setRequestNotes] = useState<{ [key: number]: string }>({});

  // Loading indicator for scanner
  const [scanning, setScanning] = useState(false);

  // System statistics loaders
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load attendance
      const attRes = await fetch('/api/manager/attendance', { headers });
      const attData = await attRes.json();
      setAttendance(Array.isArray(attData) ? attData : []);

      // Load feedbacks
      const fbRes = await fetch('/api/manager/feedback', { headers });
      const fbData = await fbRes.json();
      setFeedbacks(Array.isArray(fbData) ? fbData : []);

      // Load Special requests
      const rqRes = await fetch('/api/manager/requests', { headers });
      const rqData = await rqRes.json();
      setRequests(Array.isArray(rqData) ? rqData : []);

      // Load Inventory
      const invRes = await fetch('/api/inventory', { headers });
      const invData = await invRes.json();
      setInventory(Array.isArray(invData) ? invData : []);

      setError(null);
    } catch (err: any) {
      setError('Connection failure loading mess data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Handle direct QR Code Scanner Submission
  const processQrScan = async (code: string) => {
    if (!code) return;
    try {
      setScanning(true);
      setSimulationStatus(null);
      const res = await fetch('/api/manager/scan-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrToken: code })
      });

      const data = await res.json();
      if (res.ok) {
        setSimulationStatus({ 
          success: true, 
          msg: `ACCESS GRANTED: ${data.student.fullName} (${data.student.enrollmentNumber}) checked in successfully for ${data.mealType.toUpperCase()} at ${data.scannedAt}!` 
        });
        setManualQrInput('');
        fetchAllData();
      } else {
        setSimulationStatus({ 
          success: false, 
          msg: data.error || 'Scan Rejected: Validation failure' 
        });
      }
    } catch (err) {
      setSimulationStatus({ success: false, msg: 'Error connecting to validation device' });
    } finally {
      setScanning(false);
    }
  };

  // Helper: Fast simulate scan for a standard enrollment profile without generating manual local tokens
  const triggerFastSimulateCheckin = async (enrollmentNum: string) => {
    try {
      setScanning(true);
      setSimulationStatus(null);
      
      // Determine ongoing meal based on hour
      const currentHour = new Date().getHours();
      let mealType = 'snacks';
      if (currentHour >= 6 && currentHour < 11) mealType = 'breakfast';
      else if (currentHour >= 11 && currentHour < 15) mealType = 'lunch';
      else if (currentHour >= 15 && currentHour < 18) mealType = 'snacks';
      else if (currentHour >= 18 && currentHour < 23) mealType = 'dinner';

      const res = await fetch('/api/manager/manual-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enrollmentNumber: enrollmentNum,
          mealType,
          date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSimulationStatus({
          success: true,
          msg: `FAST SIMULATION GRANTED: Manual ledger check-in completed for Enrollment ${enrollmentNum} (${mealType.toUpperCase()})!`
        });
        fetchAllData();
      } else {
        setSimulationStatus({
          success: false,
          msg: data.error || 'Check-in failed'
        });
      }
    } catch (e) {
      setSimulationStatus({ success: false, msg: 'Fast Simulation failed' });
    } finally {
      setScanning(false);
    }
  };

  // Submit Menu configuration save
  const submitMenuUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMenuItemsText.trim()) return;

    const items = editMenuItemsText.split(',').map(i => i.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: editMealType,
          date: targetDate,
          menuItems: items
        })
      });

      if (res.ok) {
        alert('Menu uploaded successfully! Broadcasting update to student feeds.');
        setEditMenuItemsText('');
        fetchAllData();
      } else {
        alert('Failed to publish menu calibration');
      }
    } catch (err) {
      alert('Error updating database menu');
    }
  };

  // Save Inventory commodity (create or update)
  const submitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingInventoryId || undefined,
          itemName: newItemName,
          quantity: Number(newItemQuantity),
          unit: newItemUnit,
          threshold: Number(newItemThreshold)
        })
      });

      if (res.ok) {
        setNewItemName('');
        setNewItemQuantity(0);
        setNewItemThreshold(10);
        setEditingInventoryId(null);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed saving inventory');
      }
    } catch (err) {
      alert('Database error saving item');
    }
  };

  const deleteInventoryItem = async (id: number) => {
    if (!window.confirm('Delete this stock line from records?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      alert('Deletion error');
    }
  };

  // Resolve special dietary exceptions
  const handleRequestStatus = async (id: number, decision: 'approved' | 'rejected') => {
    const comments = requestNotes[id] || '';
    try {
      const res = await fetch(`/api/manager/requests/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: decision, comment: comments })
      });

      if (res.ok) {
        setRequestNotes(prev => {
          const dict = { ...prev };
          delete dict[id];
          return dict;
        });
        fetchAllData();
      }
    } catch (err) {
      alert('Error saving status update');
    }
  };

  // Add staff scheduling
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    setStaff([
      ...staff,
      {
        id: Date.now(),
        name: newStaffName,
        role: newStaffRole,
        shift: newStaffShift
      }
    ]);
    setNewStaffName('');
  };

  const removeStaff = (id: number) => {
    setStaff(staff.filter(s => s.id !== id));
  };


  // STATS WRAPPER CALCULATIONS
  const averageRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '4.2';

  const totalCheckInsToday = attendance.length;
  const lowStockAlertsCount = inventory.filter(i => i.quantity <= i.threshold).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Overview stats block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Today's Total Scans</p>
            <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{totalCheckInsToday}</p>
            <p className="text-[10px] text-indigo-600 font-mono mt-1">AUR Entry checkpoints active</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Feedback Metric</p>
            <p className="text-2xl font-bold font-mono text-slate-800 mt-1">⭐ {averageRating}/5.0</p>
            <p className="text-[10px] text-emerald-600 font-mono mt-1">Based on {feedbacks.length} reviews</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-605 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-450 uppercase tracking-wider font-mono">Inventory Refills</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${lowStockAlertsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
              {lowStockAlertsCount} Alerts
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Below critical threshold</p>
          </div>
          <div className={`p-3 rounded-xl ${lowStockAlertsCount > 4 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sickbed / Fast Diets</p>
            <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{pendingRequestsCount} Pending</p>
            <p className="text-[10px] text-indigo-600 font-mono mt-1">Awaiting kitchen clearance</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Navigation rails / headers */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'scan', label: 'Scanner Device Validator', icon: QrCode },
          { id: 'menu', label: 'Publish Menu Daily', icon: Calendar },
          { id: 'inventory', label: 'Inventory Commodities', icon: ShoppingBag },
          { id: 'requests', label: 'Dietary Exceptions', icon: Settings },
          { id: 'feedback', label: 'Recipe Reviews', icon: MessageSquare },
          { id: 'staff', label: 'Staff Scheduling', icon: Clock }
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

      {/* DETAILED WORKING PANELS */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[400px]">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-2 text-xs mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* 1. SECURE HARDWARE SIMULATION SCANNER DEVICE */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-sans font-bold text-slate-850 text-md">AUR Mess Entry Scanner Monitor</h3>
                <p className="text-xs text-slate-450 mt-0.5">Simulate scanning student mobile QR Codes at the dining gate counter.</p>
              </div>

              {/* CSV downloads button */}
              <a 
                href="/api/admin/reports/export"
                download
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm transition border border-emerald-500/10"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Dining Logs
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Virtual Scanner Input Console */}
              <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-150/60 space-y-4">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Hardware Validator Simulation</span>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-605 font-semibold font-mono">Scan QR Token Value:</label>
                    <textarea
                      required
                      rows={3}
                      value={manualQrInput}
                      onChange={(e) => setManualQrInput(e.target.value)}
                      placeholder="Paste the Base64 JWT string generated in the Student Gate Ticket here..."
                      className="w-full text-[10px] font-mono p-3 bg-white border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 placeholder-slate-400"
                    />
                  </div>

                  <button
                    onClick={() => processQrScan(manualQrInput)}
                    id="btn_scan_qr_value"
                    disabled={scanning || !manualQrInput}
                    className="w-full bg-brand-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-brand-800 transition shadow cursor-pointer uppercase font-sans flex items-center justify-center gap-2"
                  >
                    {scanning ? 'Decoding QR Security...' : 'Verify Entry Ticket'}
                  </button>
                </div>

                <div className="border-t border-slate-200/50 pt-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wide">Quick-Scan Presets (Demo)</p>
                  <p className="text-[10px] text-slate-500 leading-normal font-sans">
                    No student token available? Click a preset below to register instant manual entry checks for target students!
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    <button 
                      onClick={() => triggerFastSimulateCheckin('A80101221001')}
                      className="text-[11px] font-sans font-medium text-left bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 py-2 px-3 rounded-lg text-slate-700 transition flex justify-between items-center cursor-pointer"
                    >
                      <span>Scan Aarav (A80101221001)</span>
                      <span className="text-[9px] text-indigo-600 font-mono font-bold">LOBBY check-in</span>
                    </button>
                    <button 
                      onClick={() => triggerFastSimulateCheckin('A80101221002')}
                      className="text-[11px] font-sans font-medium text-left bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 py-2 px-3 rounded-lg text-slate-700 transition flex justify-between items-center cursor-pointer"
                    >
                      <span>Scan Neha (A80101221002)</span>
                      <span className="text-[9px] text-indigo-600 font-mono font-bold">LOBBY check-in</span>
                    </button>
                    <button 
                      onClick={() => triggerFastSimulateCheckin('A80101221003')}
                      className="text-[11px] font-sans font-medium text-left bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 py-2 px-3 rounded-lg text-slate-700 transition flex justify-between items-center cursor-pointer"
                    >
                      <span>Scan Kabir (A80101221003)</span>
                      <span className="text-[9px] text-indigo-600 font-mono font-bold">LOBBY check-in</span>
                    </button>
                  </div>
                </div>

                {simulationStatus && (
                  <div className={`p-4 rounded-xl border flex gap-2 font-sans ${simulationStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                    {simulationStatus.success ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" /> : <XCircle className="w-5 h-5 shrink-0 text-red-650" />}
                    <span className="text-xs">{simulationStatus.msg}</span>
                  </div>
                )}
              </div>

              {/* Display list of active checkins */}
              <div className="lg:col-span-8 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Scanned Dining Attendance Records</span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full text-xs font-sans text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider font-bold">
                      <tr>
                        <th className="p-3">Verified Time</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Enrollment No.</th>
                        <th className="p-3">Meal Slot/Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance && attendance.length > 0 ? (
                        attendance.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono text-slate-500">
                              {new Date(att.scanTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{att.studentName}</td>
                            <td className="p-3 font-mono text-slate-600">{att.studentEnrollment}</td>
                            <td className="p-3 uppercase font-mono font-medium text-slate-500 text-[10px]">
                              {att.mealType} ({att.mealDate})
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                att.status === 'present' 
                                  ? 'bg-emerald-55 text-emerald-600 border-emerald-250/30' 
                                  : 'bg-amber-50 text-amber-600 border-amber-250/30'
                              }`}>
                                {att.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-mono">No scans checked in today yet. Simulate scanner above.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. MENU UPLOAD AND CONFIG */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Daily Recipes Publishing Panel</h3>
              <p className="text-xs text-slate-450 mt-0.5">Edit or insert recipes for specific dates and meal categories.</p>
            </div>

            <form onSubmit={submitMenuUpdate} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 block">Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 block">Meal Category</label>
                  <select
                    value={editMealType}
                    onChange={(e) => setEditMealType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snacks">Snacks</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">Menu Items (comma separated):</label>
                <textarea
                  required
                  rows={3}
                  value={editMenuItemsText}
                  onChange={(e) => setEditMenuItemsText(e.target.value)}
                  placeholder="E.g., Paneer Butter Masala, Mix Veg, Tandoori Roti, Jeera Rice, Curd, Salad"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 placeholder-slate-400"
                />
                <span className="text-[10px] text-slate-400 font-mono">List items consecutively, comma-delimited.</span>
              </div>

              <button
                type="submit"
                id="btn_publish_menu"
                className="bg-brand-900 hover:bg-brand-800 text-white font-sans font-semibold text-xs py-2.5 px-5 rounded-xl border border-brand-950 shadow transition cursor-pointer"
              >
                Publish Meal Config
              </button>
            </form>
          </div>
        )}

        {/* 3. INVENTORY STOCKS & WARNINGS */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex border-b border-rose-50 pb-4 mb-4 justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-slate-850 text-md text-slate-800">AUR Raw Commodities Stock Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage kitchen warehouses, adjust quantities, or register custom stock alerts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Add/Edit commodity Form */}
              <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  {editingInventoryId ? 'Edit Stock Line' : 'Register New Commodity'}
                </span>
                
                <form onSubmit={submitInventory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 font-mono">Commodity Name:</label>
                    <input
                      required
                      type="text"
                      placeholder="E.g., Fresh Paneer, LPG Gas"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 font-mono">Quantity:</label>
                      <input
                        required
                        type="number"
                        placeholder="150"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 font-mono">Unit:</label>
                      <input
                        required
                        type="text"
                        placeholder="kg, ltr, pcs"
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 font-mono">Low-Stock Alert Trigger threshold:</label>
                    <input
                      required
                      type="number"
                      placeholder="25"
                      value={newItemThreshold}
                      onChange={(e) => setNewItemThreshold(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      id="btn_save_stock"
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-blue-950 font-sans font-extrabold text-xs py-2.5 px-4 rounded-xl border border-amber-400 transition cursor-pointer"
                    >
                      {editingInventoryId ? 'Update Ledger' : 'Register Item'}
                    </button>
                    {editingInventoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInventoryId(null);
                          setNewItemName('');
                        }}
                        className="bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Inventory details listing */}
              <div className="lg:col-span-8 border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Commodity</th>
                      <th className="p-3 text-right">Raw Stock Available</th>
                      <th className="p-3 text-right">Alert Threshold</th>
                      <th className="p-3 text-center">Ratios / Warnings</th>
                      <th className="p-3 text-center">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory && inventory.length > 0 ? (
                      inventory.map((item) => {
                        const isLow = item.quantity <= item.threshold;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/60 ${isLow ? 'bg-rose-50/20' : ''}`}>
                            <td className="p-3 font-semibold text-slate-700">{item.itemName}</td>
                            <td className="p-3 text-right font-mono font-medium text-slate-800">
                              {item.quantity} <span className="text-[10px] text-slate-400 font-sans">{item.unit}</span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">
                              {item.threshold} <span className="text-[10px] text-slate-400 font-sans">{item.unit}</span>
                            </td>
                            <td className="p-3 text-center">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-red-50 text-red-600 border border-red-200/50 animate-pulse uppercase">
                                  LOW STOCK REFIT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-50 text-emerald-600 border border-emerald-200/50 uppercase">
                                  Satisfactory
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingInventoryId(item.id);
                                    setNewItemName(item.itemName);
                                    setNewItemQuantity(item.quantity);
                                    setNewItemUnit(item.unit);
                                    setNewItemThreshold(item.threshold);
                                  }}
                                  id={`btn_edit_inv_${item.id}`}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-805 bg-indigo-50 hover:bg-indigo-100 p-1 px-2 rounded-lg border border-indigo-200/20 transition cursor-pointer"
                                >
                                  Modify
                                </button>
                                <button
                                  onClick={() => deleteInventoryItem(item.id)}
                                  id={`btn_del_inv_${item.id}`}
                                  className="text-[10px] text-rose-500 hover:text-rose-605 bg-rose-50 hover:bg-rose-100 p-1 px-2 rounded-lg border border-rose-200/20 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 font-mono">No inventory line items registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* 4. DIETARY EXCEPTIONS / REQUESTS RESOLUTIONS */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Student Dietary Exceptions Desk</h3>
              <p className="text-xs text-slate-450 mt-0.5">Approve Navratri packages, medical items or allergy alerts filed by student boards.</p>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider font-bold">
                  <tr>
                    <th className="p-3">Student Email/Enrollment</th>
                    <th className="p-3">Scope / Type</th>
                    <th className="p-3">Date/Meal target</th>
                    <th className="p-3">Descriptions</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Warden actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requests && requests.length > 0 ? (
                    requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{r.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{r.studentEnrollment}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 rounded">
                            {r.requestType}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          {r.requestDate} <span className="uppercase text-[9px] bg-indigo-50 text-indigo-700 rounded-full px-1.5 py-0.5 font-bold border border-indigo-200/25">{r.mealType}</span>
                        </td>
                        <td className="p-3 italic">"{r.comment || 'N/A'}"</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            r.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-650 border-emerald-200' 
                              : r.status === 'rejected'
                              ? 'bg-red-55 text-red-650 border-red-200'
                              : 'bg-amber-50 text-amber-600 border-amber-250'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.status === 'pending' ? (
                            <div className="flex flex-col gap-1.5 items-stretch min-w-[140px]">
                              <input
                                type="text"
                                placeholder="Add kitchen instructions..."
                                value={requestNotes[r.id] || ''}
                                onChange={(e) => setRequestNotes({ ...requestNotes, [r.id]: e.target.value })}
                                className="text-[10px] p-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleRequestStatus(r.id, 'approved')}
                                  id={`btn_approve_req_${r.id}`}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] py-1 px-2.5 rounded transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRequestStatus(r.id, 'rejected')}
                                  id={`btn_reject_req_${r.id}`}
                                  className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[10px] py-1 px-2.5 rounded transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 block text-center italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-mono">No special diets currently requested.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. RECIPE REVIEW RATINGS/REVIEWS */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
              <div>
                <h3 className="font-sans font-bold text-slate-850 text-md text-slate-800">AUR Daily Dining Reviews Analysis</h3>
                <p className="text-xs text-slate-450 mt-0.5 font-sans">Star based customer metric scores with live feedback text analytics sentiment modeling.</p>
              </div>
            </div>

            {/* Quick Insights Sentiment Analytics Panel */}
            <div className="bg-gradient-to-r from-brand-900 via-brand-850 to-brand-800 text-white rounded-3xl p-6 shadow border border-brand-850 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-amber-300">Dining Sentiment Intelligence Module</h4>
                  <p className="text-xs text-blue-105 mt-1 max-w-xl font-sans">
                    Real-time Natural Language processing via Google Gemini AI classifies student comment notes into sentiment bins, helping you manage menu recipes effectively.
                  </p>
                </div>
                <div className="bg-white/10 px-4 py-2.5 rounded-xl text-center self-start md:self-auto border border-white/15 min-w-[150px]">
                  <span className="text-[10px] text-blue-200 block font-mono font-bold uppercase">Student Satisfaction Index</span>
                  <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
                    {feedbacks.length > 0 
                      ? Math.round((feedbacks.filter(f => f.sentiment === 'positive').length / feedbacks.length) * 100)
                      : '85'}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-4">
                {/* Positive Sentiment Indicator */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-300 font-mono text-[10px] font-bold uppercase block">Positive Sentiment</span>
                    <p className="text-2xl font-bold font-mono mt-1 text-emerald-300">
                      {feedbacks.filter(f => f.sentiment === 'positive').length}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-white/10 tag-bar rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{
                          width: `${feedbacks.length > 0 ? (feedbacks.filter(f => f.sentiment === 'positive').length / feedbacks.length) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono mt-1.5 block">
                      {feedbacks.length > 0 ? Math.round((feedbacks.filter(f => f.sentiment === 'positive').length / feedbacks.length) * 100) : 0}% of all comments
                    </span>
                  </div>
                </div>

                {/* Neutral Sentiment Indicator */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-300 font-mono text-[10px] font-bold uppercase block">Neutral Sentiment</span>
                    <p className="text-2xl font-bold font-mono mt-1 text-slate-100">
                      {feedbacks.filter(f => f.sentiment === 'neutral').length}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-slate-300 h-full rounded-full transition-all duration-500" 
                        style={{
                          width: `${feedbacks.length > 0 ? (feedbacks.filter(f => f.sentiment === 'neutral').length / feedbacks.length) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono mt-1.5 block">
                      {feedbacks.length > 0 ? Math.round((feedbacks.filter(f => f.sentiment === 'neutral').length / feedbacks.length) * 100) : 0}% of all comments
                    </span>
                  </div>
                </div>

                {/* Negative Sentiment Indicator */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-red-300 font-mono text-[10px] font-bold uppercase block">Negative – Remedial Action</span>
                    <p className="text-2xl font-bold font-mono mt-1 text-red-350">
                      {feedbacks.filter(f => f.sentiment === 'negative').length}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-red-400 h-full rounded-full transition-all duration-500" 
                        style={{
                          width: `${feedbacks.length > 0 ? (feedbacks.filter(f => f.sentiment === 'negative').length / feedbacks.length) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono mt-1.5 block">
                      {feedbacks.length > 0 ? Math.round((feedbacks.filter(f => f.sentiment === 'negative').length / feedbacks.length) * 100) : 0}% of all comments
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks && feedbacks.length > 0 ? (
                feedbacks.map((f) => {
                  const stars = Array(f.rating).fill('★').join('');
                  return (
                    <div key={f.id} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex flex-col justify-between gap-3 relative overflow-hidden transition shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-xs text-slate-800">{f.studentName}</p>
                          <div className="flex gap-1 items-center mt-0.5">
                            <span className="text-amber-500 font-mono text-xs">{stars}</span>
                            <span className="text-[10px] text-slate-400">({f.rating}/5)</span>
                          </div>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider border uppercase ${
                          f.sentiment === 'positive'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : f.sentiment === 'negative'
                            ? 'bg-red-50 text-red-650 border-red-200'
                            : 'bg-slate-10s text-slate-600 border-slate-200'
                        }`}>
                          {f.sentiment} Sentiment
                        </span>
                      </div>

                      <p className="text-xs text-slate-650 leading-relaxed font-sans mt-1">
                        "{f.comment || 'Only rated, no comments submitted.'}"
                      </p>

                      <div className="border-t border-slate-200/50 pt-2 text-[9px] text-slate-400 uppercase font-mono flex justify-between">
                        <span>For: {f.mealType} ({f.date})</span>
                        <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center p-6 text-slate-400 font-mono text-xs md:col-span-2">No reviews filed yet for meals. Reviews will populate here upon submitting in the Student console!</p>
              )}
            </div>
          </div>
        )}

        {/* 6. STAFF SCHEDULER */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-slate-850 text-md">AUR Kitchen Roster & Shifts Management</h3>
              <p className="text-xs text-slate-450 mt-0.5">Setup daily duties, register staffing schedules, or coordinate cleanup crews.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Add Staff form */}
              <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Schedule kitchen worker</span>
                
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 font-mono">Worker Name:</label>
                    <input
                      required
                      type="text"
                      placeholder="E.g., Ram Lal"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 font-mono">Service Role:</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="Head Cook / Halwai">Head Cook / Halwai</option>
                      <option value="Assistant Chef">Assistant Chef</option>
                      <option value="Store Keeper">Store Keeper</option>
                      <option value="Dishwasher / Sweeper">Dishwasher / Sweeper</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 font-mono">Shift Timetable:</label>
                    <select
                      value={newStaffShift}
                      onChange={(e) => setNewStaffShift(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="Morning Shift (06:00 - 14:00)">Morning Shift (06:00 - 14:00)</option>
                      <option value="Evening Shift (14:00 - 22:00)">Evening Shift (14:00 - 22:00)</option>
                      <option value="General Shift (09:00 - 17:00)">General Shift (09:00 - 17:00)</option>
                      <option value="Night cleanup (22:00 - 06:00)">Night cleanup (22:00 - 06:00)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white font-sans font-semibold text-xs py-2.5 px-4 rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Add to duty roster
                  </button>
                </form>
              </div>

              {/* Roster timetable */}
              <div className="lg:col-span-8 border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left font-sans text-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider font-bold">
                      <tr>
                        <th className="p-3">Staff Name</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3">Timetable shifts</th>
                        <th className="p-3 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{s.name}</td>
                          <td className="p-3 text-slate-600 font-sans">{s.role}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{s.shift}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => removeStaff(s.id)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </table>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
