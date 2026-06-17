import React, { useState, useEffect } from 'react';
import { 
  QrCode, Calendar, Clock, Sparkles, MessageSquareHeart, 
  Send, AlertCircle, RefreshCw, Landmark, HeartHandshake, Bell, Search, Star,
  CreditCard, X, Wallet
} from 'lucide-react';
import { User, StudentProfile } from '../types.ts';

interface StudentDashboardProps {
  user: User;
  token: string;
  onRefreshUser: () => void;
}

export default function StudentDashboard({ user, token, onRefreshUser }: StudentDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QR Code Single-use rotation state
  const [qrToken, setQrToken] = useState<string>('');
  const [qrExpiresAt, setQrExpiresAt] = useState<number>(0);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(30);
  const [generatingQr, setGeneratingQr] = useState(false);

  // Dynamic state for feedback form
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Dynamic state for Special Meals requests
  const [requestMealType, setRequestMealType] = useState<string>('lunch');
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [requestType, setRequestType] = useState<string>('medical');
  const [requestComment, setRequestComment] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Payment Gateway State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // PCI Card Dummy Details for simulation
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Active UI filters
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch student payload
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Could not fetch student dashboard payload');
      }
      const data = await res.json();
      setDashboardData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed load action');
    } finally {
      setLoading(false);
    }
  };

  // Generate 30s entry token
  const generateQrToken = async () => {
    try {
      setGeneratingQr(true);
      const res = await fetch('/api/student/qr-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.token);
        setQrExpiresAt(data.expiresAt);
        const secRemaining = Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000));
        setQrTimeLeft(secRemaining);
      }
    } catch (e) {
      console.error('Error creating Entry credential verification token', e);
    } finally {
      setGeneratingQr(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  // Handle QR countdown ticker
  useEffect(() => {
    if (!qrExpiresAt) {
      generateQrToken();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const secRemaining = Math.max(0, Math.ceil((qrExpiresAt - now) / 1000));
      setQrTimeLeft(secRemaining);

      if (secRemaining <= 0) {
        generateQrToken();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiresAt]);

  // Handle feedback submit
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMealId) return;

    try {
      setSubmittingFeedback(true);
      const res = await fetch('/api/student/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mealId: selectedMealId,
          rating: feedbackRating,
          comment: feedbackComment
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Feedback submission failed');
      }

      setSuccessMessage('Thank you! Your feedback has been registered and analyzed.');
      setSelectedMealId(null);
      setFeedbackComment('');
      setFeedbackRating(5);
      fetchDashboard();
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle special meal request
  const submitSpecialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate) return;

    try {
      setSubmittingRequest(true);
      const res = await fetch('/api/student/mess-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: requestMealType,
          requestDate,
          requestType,
          comment: requestComment
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to file request');
      }

      setSuccessMessage('Dietary support request filed successfully!');
      setRequestComment('');
      fetchDashboard();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError('Please enter a valid amount.');
      return;
    }
    const maxBalance = profile?.feeBalance || 0;
    if (amountNum > maxBalance) {
      setPaymentError(`Amount cannot exceed the outstanding balance of ₹${maxBalance.toLocaleString()}.`);
      return;
    }
    if (cardNumber.replace(/\s+/g, '').length < 16) {
      setPaymentError('Please enter a valid 16-digit card number.');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setPaymentError('Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (cardCvv.length < 3) {
      setPaymentError('Please enter a valid 3-digit CVV.');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError(null);
      const res = await fetch('/api/student/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amountNum,
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardholderName
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment gateway failed.');
      }

      setSuccessMessage(`Outstanding Fees paid: ₹${amountNum.toLocaleString()} successfully processed and cleared via secure gateway!`);
      setIsPaymentOpen(false);
      setPaymentAmount('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardholderName('');
      
      fetchDashboard();
      onRefreshUser();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment system error.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-slate-500 font-mono text-sm">Assembling Student Hub payload...</p>
      </div>
    );
  }

  const { profile, todayMeals, announcements, attendanceHistory, feedback: userFeedbacks, requests, timings } = dashboardData || {};

  // Simple pseudo QR SVG Matrix generator for realistic display
  const renderMockQrSvg = (seedString: string) => {
    // Generate a simple deterministic grid of blocks based on string character codes
    const blocks: boolean[] = [];
    const size = 15; // 15x15 matrix
    let stringIndex = 0;
    
    for (let i = 0; i < size * size; i++) {
      if (i % size === 0 || i < size || i > size * (size - 1) || (i + 1) % size === 0) {
        // Border guidelines
        blocks.push(true);
      } else {
        const charCode = seedString.charCodeAt(stringIndex % seedString.length) || 7;
        blocks.push((charCode + i) % 3 === 0 || (charCode * i) % 7 === 0);
        stringIndex++;
      }
    }

    // Embed corner anchors
    const isAnchor = (row: number, col: number) => {
      if (row < 4 && col < 4) return true;
      if (row < 4 && col > size - 5) return true;
      if (row > size - 5 && col < 4) return true;
      return false;
    };

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full text-slate-900" shapeRendering="crispEdges">
        <rect width={size} height={size} fill="white" />
        {blocks.map((block, idx) => {
          const r = Math.floor(idx / size);
          const c = idx % size;
          let fill = "transparent";
          
          if (isAnchor(r, c)) {
            // Anchor dark color (navy)
            fill = "#1e3a8a";
          } else if (block) {
            fill = "#334155";
          }
          
          return fill !== "transparent" ? (
            <rect key={idx} x={c} y={r} width="1.0" height="1.0" fill={fill} />
          ) : null;
        })}
      </svg>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-brand-850">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-sans font-extrabold tracking-tight text-white flex items-center gap-2">
              Namaste, {user.fullName}! <Sparkles className="text-amber-300 w-6 h-6 animate-pulse" />
            </h1>
            <p className="text-blue-105 text-sm mt-1 max-w-xl font-sans">
              Welcome back to your AUR Dining Account list. Generate your meal entrance ticket, submit recipe reviews, or submit dietary modifications.
            </p>
            <div className="flex flex-wrap gap-4 mt-4 font-mono text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-amber-200">
                Enrollment: {profile?.enrollmentNumber || 'N/A'}
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-indigo-100">
                Hosteler: {profile?.hostlerId || 'Day Scholar'}
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-teal-200">
                Mess Subscribed: {profile?.messId === 'mess_1' ? 'Mess Block 1' : 'Mess Block 2'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg border border-white/25 self-start md:self-auto min-w-[220px]">
            <div className="flex items-center gap-3">
              <Landmark className="w-8 h-8 text-amber-300 opacity-90" />
              <div>
                <p className="text-[10px] uppercase tracking-wider font-mono font-bold text-blue-100">AUR Account Balance</p>
                <p className="text-xl font-bold font-mono text-amber-300">₹{profile?.feeBalance?.toLocaleString() || '0'}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setPaymentAmount(String(profile?.feeBalance || 0));
                setCardholderName(user.fullName);
                setIsPaymentOpen(true);
              }}
              id="btn_pay_now_welcome"
              className="mt-3 w-full bg-white text-brand-900 hover:bg-amber-100 transition py-1.5 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wide cursor-pointer shadow-sm text-center"
            >
              Pay Mess Fees
            </button>

            <p className="text-[9px] text-blue-200 border-t border-white/15 mt-2 pt-1 opacity-85 text-center">Subscribed until Term End</p>
          </div>
        </div>

        {/* Ambient background designs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {successMessage && (
        <div id="toast_success" className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 shadow animate-fade-in font-sans">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (8 cols): QR system + Menu + feedback */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECURE MEAL EXPANSION GATE / QR CODE CARDS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <QrCode className="text-brand-900 w-5 h-5" />
                <h2 className="font-sans font-bold text-slate-800 text-md">Secure Entry Ticket</h2>
              </div>
              <span className="text-[10px] bg-brand-50 text-brand-900 px-2.5 py-1 rounded font-mono font-semibold uppercase border border-brand-50">
                Single Use Token
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* QR display box */}
              <div className="relative group flex-shrink-0">
                <div className="w-52 h-52 bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-inner flex items-center justify-center relative">
                  {qrToken ? (
                    renderMockQrSvg(qrToken)
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-350">
                      <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
                    </div>
                  )}
                  {generatingQr && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                      <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                    </div>
                  )}
                </div>
                
                {/* Visual scanner guideline */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-500"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-500"></span>
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-500"></span>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-500"></span>
              </div>

              {/* Instructions and ticker controls */}
              <div className="md:flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Scan QR at Entry Validator</h3>
                  <p className="text-xs text-slate-500 mt-1 font-sans">
                    Present this code to the mess camera validator. It automatically certifies subscription rights for the ongoing slot and registers attendance.
                  </p>
                </div>

                {/* Countdown progress dynamic slider */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-500">Auto-regenerates in</span>
                    <span className={`font-bold ${qrTimeLeft < 8 ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
                      {qrTimeLeft} seconds
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${qrTimeLeft < 8 ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${(qrTimeLeft / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={generateQrToken}
                    id="btn_refresh_token"
                    className="flex-1 flex justify-center items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200/50 transition duration-150"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Force Refresh
                  </button>
                </div>

                <div className="p-3 bg-amber-50 text-amber-800 text-[10px] font-medium leading-relaxed rounded-xl border border-amber-250 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Anti-Spoof Policy:</strong> Do not capture screenshots. The hardware scanner checks server timestamp. Expired tickets are rejected.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TODAY'S MENU BLOCK */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="text-brand-900 w-5 h-5" />
                <h2 className="font-sans font-bold text-slate-800 text-md">AUR Daily Meal Plans</h2>
              </div>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Timings reference strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pb-5">
              {['breakfast', 'lunch', 'snacks', 'dinner'].map((slot) => {
                const clockRange = timings ? timings[slot as keyof typeof timings] : 'Not set';
                return (
                  <div key={slot} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{slot}</p>
                    <p className="text-[11px] font-mono text-slate-700 font-medium mt-0.5">{clockRange}</p>
                  </div>
                );
              })}
            </div>

            {todayMeals && todayMeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayMeals.map((meal: any) => (
                  <div key={meal.id} className="border border-slate-100 hover:border-brand-100 p-5 rounded-xl bg-white space-y-3 relative group transition">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-brand-50 text-brand-900 font-mono font-bold px-2.5 py-0.5 rounded uppercase border border-brand-50">
                        {meal.mealType}
                      </span>
                      <button 
                        onClick={() => setSelectedMealId(meal.id)}
                        id={`btn_review_${meal.id}`}
                        className="text-[11px] text-brand-900 hover:text-brand-800 flex items-center gap-1 font-semibold bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-50 transition cursor-pointer"
                      >
                        <MessageSquareHeart className="w-3.5 h-3.5" /> Write Review
                      </button>
                    </div>

                    <div className="min-h-[70px]">
                      <ul className="flex flex-wrap gap-1.5 pt-1">
                        {Array.isArray(meal.menuItems) && meal.menuItems.map((item: string, idx: number) => (
                          <li key={idx} className="text-xs bg-slate-50 text-slate-700 font-sans px-2.5 py-1 rounded-lg border border-slate-100/50">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-mono text-xs">No meals registered in standard database for today. Please contact Mess Desk.</p>
              </div>
            )}
          </div>

          {/* DYNAMIC MEAL FEEDBACK SUBMISSION WRAPPER */}
          {selectedMealId && (
            <div id="feedback_panel" className="bg-amber-500/10 rounded-3xl p-6 border border-amber-500/30 shadow-md animate-fade-in space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Star className="text-amber-500 w-5 h-5 fill-amber-400" />
                  <h3 className="font-sans font-bold text-amber-300 text-md">Submit Meal Rating & Review</h3>
                </div>
                <button 
                  onClick={() => setSelectedMealId(null)}
                  className="text-xs text-slate-400 hover:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={submitFeedback} className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-300 font-mono text-slate-700">Rating:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        type="button"
                        key={starValue}
                        onClick={() => setFeedbackRating(starValue)}
                        className={`p-1 rounded transition cursor-pointer ${feedbackRating >= starValue ? 'text-amber-400 fill-amber-300Scale scale-110' : 'text-slate-400 fill-transparentScale'}`}
                      >
                        <Star className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-amber-500 font-semibold font-mono">
                    {feedbackRating === 5 && 'Excellent Outstanding'}
                    {feedbackRating === 4 && 'Good quality'}
                    {feedbackRating === 3 && 'Average'}
                    {feedbackRating === 2 && 'Needs improvement'}
                    {feedbackRating === 1 && 'Unsatisfactory'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold font-mono text-slate-700 block">Comments or Suggestions:</label>
                  <textarea
                    required
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="We review all student reviews. Be specific (e.g., 'Dal was too watery' or 'The chicken portion was generous')."
                    rows={3}
                    className="w-full text-xs font-sans p-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-blue-950 font-sans font-extrabold text-xs tracking-wide py-3 px-5 rounded-xl border border-amber-400 shadow cursor-pointer uppercase flex items-center gap-2"
                >
                  {submittingFeedback ? 'Analyzing Review text...' : 'Transmit Feedback Report'}
                </button>
              </form>
            </div>
          )}

          {/* ATTENDANCE HISTORY & LOGS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-sans font-bold text-slate-800 text-md border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <Clock className="text-slate-500 w-5 h-5" /> Your Dining Logs & Activity
            </h2>

            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 max-h-72 overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead className="bg-slate-100 text-slate-500 uppercase font-mono tracking-wider font-bold">
                  <tr>
                    <th className="p-3">Meal Slot</th>
                    <th className="p-3">Target Date</th>
                    <th className="p-3">Verified Entrance Time</th>
                    <th className="p-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceHistory && attendanceHistory.length > 0 ? (
                    attendanceHistory.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800 uppercase font-mono">{item.mealType}</td>
                        <td className="p-3 text-slate-500">{item.date}</td>
                        <td className="p-3 text-slate-500 font-mono">
                          {new Date(item.scanTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            item.status === 'present' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50' 
                              : item.status === 'late'
                              ? 'bg-amber-50 text-amber-600 border-amber-200/50'
                              : 'bg-red-50 text-red-600 border-red-200/50'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 font-mono">
                        No previous meals registered. Check-in via QR Code to see your dining metrics populate here!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols): Special dietary controls + TIMINGS + ANNOUNCEMENTS */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* SPECIAL FEAST / MEDICAL / DIETARY MEAL ADJUSTMENT CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-sans font-bold text-slate-800 text-md border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <HeartHandshake className="text-brand-900 w-5 h-5 animate-pulse" /> Dietary & Special Support
            </h2>
            <form onSubmit={submitSpecialRequest} className="space-y-4">
              <p className="text-[11px] text-slate-500 font-sans">
                Request medical sick-bed food, religious fast items (e.g. Navratri/Ramadan), or special dietary allowances. MUST file six hours prior.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Request Scope</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    >
                      <option value="medical">Medical / Sick Diet</option>
                      <option value="religious">Religious Fasting</option>
                      <option value="dietary">Specific Allergy</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Meal category</label>
                    <select
                      value={requestMealType}
                      onChange={(e) => setRequestMealType(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="snacks">Snacks</option>
                      <option value="dinner">Dinner</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Effective Date</label>
                  <input
                    required
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Description Comments</label>
                  <input
                    required
                    type="text"
                    value={requestComment}
                    onChange={(e) => setRequestComment(e.target.value)}
                    placeholder="E.g., 'Sick-bed khichdi without spice', 'Navratri setup'"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn_submit_special"
                disabled={submittingRequest}
                className="w-full bg-brand-900 hover:bg-brand-800 text-white font-sans font-semibold text-xs py-2.5 px-4 rounded-xl border border-brand-900 transition cursor-pointer"
              >
                {submittingRequest ? 'Routing Request...' : 'Submit Support Request'}
              </button>
            </form>

            {/* Request statuses history links */}
            {requests && requests.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">My Requests History</p>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {requests.map((reqItem: any) => (
                    <div key={reqItem.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700 uppercase font-mono">
                          {reqItem.requestType} diet ({reqItem.mealType})
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          reqItem.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : reqItem.status === 'rejected'
                            ? 'bg-red-50 text-red-650 border-red-200'
                            : 'bg-amber-50 text-amber-600 border-amber-250'
                        }`}>
                          {reqItem.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>For: {reqItem.requestDate}</span>
                        <span className="italic">"{reqItem.comment}"</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ANNOUNCEMENT BOARD FOR STUDENTS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-sans font-bold text-slate-800 text-md border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <Bell className="text-brand-900 w-5 h-5 fill-brand-50" /> Dining Board Announcements
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {announcements && announcements.length > 0 ? (
                announcements.map((item: any) => (
                  <div key={item.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100/50 space-y-2 shadow-sm">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="font-semibold text-xs text-slate-850 font-sans tracking-tight">{item.title}</h3>
                      <span className="text-[9px] font-mono text-slate-400 bg-white/85 px-1.5 py-0.5 rounded border border-slate-100/60 flex-shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal font-sans whitespace-pre-line">{item.content}</p>
                    <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200/40 pt-2 flex justify-between">
                      <span>Publisher: {item.creatorName}</span>
                      <span className="capitalize">{item.targetAudience}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center p-6 text-slate-400 font-mono text-xs">No active declarations registered.</p>
              )}
            </div>
          </div>

          {/* MONTHLY MESS TIMINGS REFERENCE */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-sans font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-3">AUR Dining Policies</h2>
            <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <span className="text-brand-900 shrink-0 select-none">•</span>
                <span>Students MUST always produce their active 30s QR on their mobile screen to enter AUR Mess Block.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-900 shrink-0 select-none">•</span>
                <span>Wastage metrics are logged daily by the student council. Please do not waste food.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-900 shrink-0 select-none">•</span>
                <span>Subletting QR codes or sharing credential details violates the AUR Code of Conduct.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* SECURE STRIPE/PAYPAL PAYMENT GATEWAY MODAL */}
      {isPaymentOpen && (
        <div id="modal_payment_gateway" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 animate-fade-in flex flex-col">
            <div className="bg-gradient-to-r from-brand-900 to-brand-800 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <CreditCard className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-white">AUR Mess Fee Gateway</h3>
                  <p className="text-[10px] text-blue-100 font-mono">128-Bit SSL Encrypted Standard Pipeline</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Cancel Payment"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between col-span-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">Registered Student</span>
                  <p className="text-xs font-bold text-slate-700 font-sans">{user.fullName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">Mess Balance Due</span>
                  <p className="text-xs font-bold font-mono text-brand-900">₹{profile?.feeBalance?.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Amount to Pay (INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-450 font-bold">₹</span>
                  <input
                    required
                    type="number"
                    min="1"
                    max={profile?.feeBalance || 0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="E.g., 5000"
                    className="w-full text-xs p-2.5 pl-8 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Stripe Sandbox Credentials</p>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold font-mono">Cardholder Name</label>
                  <input
                    required
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Arjun Verma"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold font-mono">Card Number</label>
                    <input
                      required
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setCardNumber(val);
                      }}
                      placeholder="4000 1234 5678 9010"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold font-mono">Expiry MM/YY</label>
                      <input
                        required
                        type="text"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) {
                            val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          }
                          setCardExpiry(val);
                        }}
                        placeholder="12/28"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold font-mono">CVC/CVV</label>
                      <input
                        required
                        type="password"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="***"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2.5 rounded-xl flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Encrypted using Secure Socket Layer (SSL). Payment updates student balance immediately.</span>
              </div>

              <button
                type="submit"
                id="btn_submit_payment"
                disabled={paymentLoading}
                className="w-full bg-brand-900 hover:bg-brand-800 text-white font-sans font-extrabold text-xs py-3 px-4 rounded-xl border border-brand-900 transition cursor-pointer shadow flex justify-center items-center gap-2 uppercase tracking-wide"
              >
                {paymentLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" /> Connecting Gateway...
                  </>
                ) : (
                  <>Pay ₹{Number(paymentAmount || 0).toLocaleString()} Now</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
