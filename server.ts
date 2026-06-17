import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { users, students, meals, attendance, feedback, messRequests, announcements, inventory } from './src/db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { seedDatabase } from './src/db/seed.ts';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini safely on server-side
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

async function analyzeSentiment(comment: string, rating: number): Promise<string> {
  if (!comment || comment.trim().length === 0) {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }

  const ai = getGeminiClient();
  if (!ai) {
    const lower = comment.toLowerCase();
    if (lower.includes('good') || lower.includes('delicious') || lower.includes('best') || lower.includes('love') || lower.includes('great') || lower.includes('excellent') || lower.includes('tasty') || lower.includes('amazing') || lower.includes('satisfying')) {
      return 'positive';
    }
    if (lower.includes('bad') || lower.includes('worst') || lower.includes('poor') || lower.includes('yuck') || lower.includes('stale') || lower.includes('unhygienic') || lower.includes('dirty') || lower.includes('cold') || lower.includes('hair') || lower.includes('waste') || lower.includes('horrible') || lower.includes('tasteless')) {
      return 'negative';
    }
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert sentiment analyzer for student hostel feed. Analyze the sentiment of this hostel food comment and categorize it STRICTLY as one of these three options: "positive", "negative", or "neutral". Return ONLY the lowercase category word. Do not include punctuation, preamble, or explanations.
      
Comment: "${comment}"`,
    });
    const parsed = response.text?.trim().toLowerCase();
    if (['positive', 'negative', 'neutral'].includes(parsed || '')) {
      return parsed!;
    }
  } catch (err) {
    console.warn("Gemini sentiment error, falling back:", err);
  }

  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'AUR_MESS_SECRET_KEY_2026_AUR';

// In-Memory store for Audit Logs and Timings (since standard audit logs can be kept light-weight)
interface AuditLog {
  id: number;
  action: string;
  userEmail: string;
  timestamp: string;
  details: string;
}

const auditLogs: AuditLog[] = [
  { id: 1, action: 'SYSTEM_BOOT', userEmail: 'system', timestamp: new Date().toISOString(), details: 'Database connection verified' },
  { id: 2, action: 'DATABASE_SEED', userEmail: 'system', timestamp: new Date().toISOString(), details: 'Initial parameters loaded successfully' }
];

let messTimings = {
  breakfast: '07:30 AM - 09:30 AM',
  lunch: '12:30 PM - 02:30 PM',
  snacks: '05:00 PM - 06:15 PM',
  dinner: '07:30 PM - 09:30 PM'
};

function logAction(action: string, userEmail: string, details: string) {
  auditLogs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    action,
    userEmail,
    timestamp: new Date().toISOString(),
    details
  });
}

// Security Middleware
app.use(cors());
app.use(express.json());

// Auth Helper Middlewares
const requireToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// ==========================================
// 1. AUTHENTICATION ROUTERS
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { email, fullName, password, role, enrollmentNumber, hostlerId, messId } = req.body;

  if (!email || !fullName || !password || !role) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  if (role === 'student' && !enrollmentNumber) {
    return res.status(400).json({ error: 'Students must have an Enrollment Number' });
  }

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    if (role === 'student') {
      const existingEnroll = await db.select().from(students).where(eq(students.enrollmentNumber, enrollmentNumber)).limit(1);
      if (existingEnroll.length > 0) {
        return res.status(400).json({ error: 'Student with this enrollment number already exists' });
      }
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create User
    const [insertedUser] = await db.insert(users).values({
      email,
      fullName,
      role,
      hashedPassword,
      isActive: 1
    }).returning();

    let studentProfile = null;
    if (role === 'student') {
      const [profile] = await db.insert(students).values({
        userId: insertedUser.id,
        enrollmentNumber,
        hostlerId,
        messId: messId || 'mess_1',
        feeBalance: 45000 // default initial fee balance
      }).returning();
      studentProfile = profile;
    }

    logAction('USER_REGISTERED', email, `Registered with role ${role}`);

    const accessToken = jwt.sign({ id: insertedUser.id, email: insertedUser.email, role: insertedUser.role, fullName: insertedUser.fullName }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: insertedUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: insertedUser.id,
        email: insertedUser.email,
        fullName: insertedUser.fullName,
        role: insertedUser.role,
        isActive: insertedUser.isActive
      },
      studentProfile
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const matchedUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userObj = matchedUsers[0];

    if (!userObj) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (userObj.isActive === 0) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact Admin.' });
    }

    const isValidPassword = bcrypt.compareSync(password, userObj.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let studentProfile = null;
    if (userObj.role === 'student') {
      const matchedProfiles = await db.select().from(students).where(eq(students.userId, userObj.id)).limit(1);
      studentProfile = matchedProfiles[0] || null;
    }

    const accessToken = jwt.sign({
      id: userObj.id,
      email: userObj.email,
      role: userObj.role,
      fullName: userObj.fullName
    }, JWT_SECRET, { expiresIn: '12h' });

    const refreshToken = jwt.sign({ id: userObj.id }, JWT_SECRET, { expiresIn: '7d' });

    logAction('USER_LOGIN', email, `Successful login from ${email}`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: userObj.id,
        email: userObj.email,
        fullName: userObj.fullName,
        role: userObj.role,
        isActive: userObj.isActive
      },
      studentProfile
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database configuration failed' });
  }
});

// Password Reset Support
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    const matchedUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userObj = matchedUsers[0];
    if (!userObj) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentPassword) {
      const isCorrect = bcrypt.compareSync(currentPassword, userObj.hashedPassword);
      if (!isCorrect) {
        return res.status(401).json({ error: 'Current password is correct' });
      }
    }

    const newHashed = bcrypt.hashSync(newPassword, 10);
    await db.update(users).set({ hashedPassword: newHashed }).where(eq(users.id, userObj.id));

    logAction('PASSWORD_RESET', email, 'Password updated via dashboard');
    res.json({ message: 'Password reset successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


// ==========================================
// 2. MEALS / DIET MANAGEMENT
// ==========================================

app.get('/api/meals', async (req, res) => {
  try {
    const allMeals = await db.select().from(meals);
    res.json(allMeals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.post('/api/meals', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { mealType, date, menuItems } = req.body;

  if (!mealType || !date || !menuItems || !Array.isArray(menuItems)) {
    return res.status(400).json({ error: 'Parameters: mealType, date, and items array' });
  }

  try {
    // Check if meal of type and date already exists, if so update, else create
    const existing = await db.select().from(meals)
      .where(and(eq(meals.mealType, mealType), eq(meals.date, date)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(meals)
        .set({ menuItems })
        .where(eq(meals.id, existing[0].id))
        .returning();
      
      logAction('MEAL_UPDATE', req.user.email, `Updated ${mealType} menu for ${date}`);
      return res.json(updated);
    } else {
      const [inserted] = await db.insert(meals).values({
        mealType,
        date,
        menuItems
      }).returning();

      logAction('MEAL_CREATE', req.user.email, `Created ${mealType} menu for ${date}`);
      return res.status(201).json(inserted);
    }
  } catch (error) {
    console.error('Meal save error:', error);
    res.status(500).json({ error: 'Failed to save menu' });
  }
});


// ==========================================
// 3. STUDENT DASHBOARD API & FEEDBACK
// ==========================================

app.get('/api/student/dashboard', requireToken, async (req: any, res) => {
  if (req.user.role !== 'student') {
    return res.status(400).json({ error: 'Endpoint restricted to student roles' });
  }

  try {
    const studentArr = await db.select().from(students).where(eq(students.userId, req.user.id)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Get today's meals
    const todayMeals = await db.select().from(meals).where(eq(meals.date, todayStr));

    // Get latest announcements
    const recentAnnounce = await db.select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      targetAudience: announcements.targetAudience,
      createdAt: announcements.createdAt,
      creatorName: users.fullName
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.createdBy, users.id))
    .orderBy(desc(announcements.createdAt))
    .limit(5);

    // Get student's attendance history
    const history = await db.select({
      id: attendance.id,
      scanTime: attendance.scanTime,
      status: attendance.status,
      mealType: meals.mealType,
      date: meals.date
    })
    .from(attendance)
    .innerJoin(meals, eq(attendance.mealId, meals.id))
    .where(eq(attendance.studentId, profile.id))
    .orderBy(desc(attendance.scanTime))
    .limit(20);

    // Get student feedback
    const userFeedback = await db.select().from(feedback).where(eq(feedback.studentId, profile.id)).limit(20);

    // Get active special requests
    const userRequests = await db.select().from(messRequests).where(eq(messRequests.studentId, profile.id)).limit(20);

    res.json({
      profile,
      todayMeals,
      announcements: recentAnnounce,
      attendanceHistory: history,
      feedback: userFeedback,
      requests: userRequests,
      timings: messTimings
    });
  } catch (error) {
    console.error('Student dashboard fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student dashboard details' });
  }
});

app.post('/api/student/feedback', requireToken, async (req: any, res) => {
  const { mealId, rating, comment } = req.body;
  if (!mealId || !rating) {
    return res.status(400).json({ error: 'Meal ID and rating (1-5) are required' });
  }

  try {
    const studentArr = await db.select().from(students).where(eq(students.userId, req.user.id)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(404).json({ error: 'Student profile mapping error' });
    }

    // Double review prevention (optional fallback but let's allow modifying or adding)
    const existing = await db.select().from(feedback)
      .where(and(eq(feedback.studentId, profile.id), eq(feedback.mealId, Number(mealId))))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already submitted feedback for this meal.' });
    }

    // AI Sentiment analysis
    const sentiment = await analyzeSentiment(comment || '', Number(rating));

    const [newFeedback] = await db.insert(feedback).values({
      studentId: profile.id,
      mealId: Number(mealId),
      rating: Number(rating),
      comment: comment || '',
      sentiment
    }).returning();

    logAction('FEEDBACK_SUBMIT', req.user.email, `Submitted rating ${rating} for meal ${mealId} (AI Sentiment: ${sentiment.toUpperCase()})`);
    res.status(201).json(newFeedback);
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.post('/api/student/payment', requireToken, async (req: any, res) => {
  const { amount, cardNumber, cardholderName } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Please specify a valid payment amount.' });
  }

  try {
    const studentArr = await db.select().from(students).where(eq(students.userId, req.user.id)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(404).json({ error: 'Student record could not be resolved.' });
    }

    if (profile.feeBalance < amount) {
      return res.status(400).json({ error: 'Payment amount exceeds current outstanding balance.' });
    }

    const updatedFee = profile.feeBalance - Number(amount);
    
    await db.update(students)
      .set({ feeBalance: updatedFee })
      .where(eq(students.id, profile.id));

    logAction('FEE_PAYMENT', req.user.email, `Processed successful payment of ₹${amount}. Outstanding balance: ₹${updatedFee}`);

    res.json({
      success: true,
      message: `Transaction processed successfully! ₹${amount} has been credited to your mess account.`,
      newBalance: updatedFee
    });
  } catch (error) {
    console.error('Payment processing fault:', error);
    res.status(500).json({ error: 'Secure Payment Processor failed to execute this transaction.' });
  }
});

app.post('/api/student/mess-request', requireToken, async (req: any, res) => {
  const { mealType, requestDate, requestType, comment } = req.body;
  if (!mealType || !requestDate || !requestType) {
    return res.status(400).json({ error: 'Parameters: mealType, requestDate, requestType required' });
  }

  try {
    const studentArr = await db.select().from(students).where(eq(students.userId, req.user.id)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(404).json({ error: 'Student profile mapping missing' });
    }

    // Try to find the meal id if registered
    const matchedMeals = await db.select().from(meals)
      .where(and(eq(meals.mealType, mealType), eq(meals.date, requestDate)))
      .limit(1);
    
    const mealId = matchedMeals[0]?.id || null;

    const [request] = await db.insert(messRequests).values({
      studentId: profile.id,
      mealId,
      requestType, // 'medical', 'religious' etc
      mealType,
      requestDate,
      comment: comment || '',
      status: 'pending'
    }).returning();

    logAction('SPECIAL_MEAL_REQUEST', req.user.email, `Requested special ${mealType} for ${requestDate}`);
    res.status(201).json(request);
  } catch (error) {
    console.error('Mess request error:', error);
    res.status(500).json({ error: 'Database record failed' });
  }
});


// ==========================================
// 4. SCANNING & HARDWARE QR VALIDATOR
// ==========================================

// SECURE QR TOKEN GENERATOR FOR THE STUDENT COMPONENT
app.post('/api/student/qr-token', requireToken, async (req: any, res) => {
  try {
    const studentArr = await db.select().from(students).where(eq(students.userId, req.user.id)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Set time-based parameters
    const expiresAt = Date.now() + 30000; // valid for 30s
    
    // Encapsulate payload
    const qrPayload = {
      studentId: profile.id,
      enrollmentNumber: profile.enrollmentNumber,
      fullName: req.user.fullName,
      messId: profile.messId,
      feeBalance: profile.feeBalance,
      createdAt: Date.now(),
      expiresAt
    };

    // Encrypt token
    const qrtoken = jwt.sign(qrPayload, JWT_SECRET, { expiresIn: '60s' });
    res.json({ token: qrtoken, expiresAt });
  } catch (error) {
    res.status(500).json({ error: 'Could not generate entry credential token' });
  }
});

// HARDWARE entry point simulator (Manager handles this QR scanning device)
app.post('/api/manager/scan-qr', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { qrToken } = req.body;
  if (!qrToken) {
    return res.status(400).json({ error: 'Scan error: QR code scan token cannot be empty' });
  }

  try {
    // 1. Decrypt student payload
    let payload: any;
    try {
      payload = jwt.verify(qrToken, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Scan Rejected: Invalid or corrupt QR code. Sign-in session expired.' });
    }

    // 2. Check Expiration (30 seconds security policy)
    if (payload.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Scan Rejected: QR Code Expired. Student must refresh their QR Code (regenerates every 30s).' });
    }

    // 3. Find ongoing meal category based on current local hours
    const now = new Date();
    const currentHour = now.getHours();
    
    // Default matching logic or find today's meals
    let mealType = 'snacks'; // fallback
    if (currentHour >= 6 && currentHour < 11) mealType = 'breakfast';
    else if (currentHour >= 11 && currentHour < 15) mealType = 'lunch';
    else if (currentHour >= 15 && currentHour < 18) mealType = 'snacks';
    else if (currentHour >= 18 && currentHour < 23) mealType = 'dinner';

    const todayStr = now.toISOString().split('T')[0];

    // Find meal object ID
    const matchedMeals = await db.select().from(meals)
      .where(and(eq(meals.mealType, mealType), eq(meals.date, todayStr)))
      .limit(1);

    let mealId = matchedMeals[0]?.id;
    if (!mealId) {
      // Auto register meal fallback to prevent scanner crashes if menu is unconfigured
      const [newMeal] = await db.insert(meals).values({
        mealType,
        date: todayStr,
        menuItems: ['Standard AUR Campus Meal (Admin Config Required)']
      }).returning();
      mealId = newMeal.id;
    }

    // 4. Duplicate usage check (Student can scan once per meal slot)
    const alreadyScanned = await db.select().from(attendance)
      .where(and(eq(attendance.studentId, payload.studentId), eq(attendance.mealId, mealId)))
      .limit(1);

    if (alreadyScanned.length > 0) {
      return res.status(400).json({
        error: `Duplicate Scan: Entry Rejected! ${payload.fullName} (${payload.enrollmentNumber}) has already checked in for today's ${mealType.toUpperCase()} at ${new Date(alreadyScanned[0].scanTime).toLocaleTimeString()}.`
      });
    }

    // Deduce status based on simple lateness
    const isLate = now.getMinutes() > 45 && ['breakfast', 'lunch', 'dinner'].includes(mealType); // e.g. late after 45th minute
    const status = isLate ? 'late' : 'present';

    // 5. Register Attendance
    const [att] = await db.insert(attendance).values({
      studentId: payload.studentId,
      mealId,
      status,
      scanTime: now
    }).returning();

    logAction('SCAN_SUCCESS', req.user.email, `Validated student ${payload.enrollmentNumber} for the ${mealType} slot`);

    res.json({
      success: true,
      message: 'Access Granted: Welcome to AUR Dining Mess!',
      student: {
        id: payload.studentId,
        fullName: payload.fullName,
        enrollmentNumber: payload.enrollmentNumber,
        messId: payload.messId,
        feeBalance: payload.feeBalance
      },
      attendance: att,
      mealType,
      scannedAt: now.toLocaleTimeString()
    });
  } catch (error) {
    console.error('QR Scanner error:', error);
    res.status(500).json({ error: 'Internal system fault during entry scan evaluation' });
  }
});

// MANUAL CHECK IN BY ENROLLMENT FOR RECEPTION DESK EXCEPTION LOGGING
app.post('/api/manager/manual-attendance', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { enrollmentNumber, mealType, date } = req.body;
  if (!enrollmentNumber || !mealType || !date) {
    return res.status(400).json({ error: 'Enrollment code, mealType and date target required' });
  }

  try {
    const studentArr = await db.select().from(students).where(eq(students.enrollmentNumber, enrollmentNumber)).limit(1);
    const profile = studentArr[0];
    if (!profile) {
      return res.status(400).json({ error: 'Invalid enrollment code' });
    }

    // Find or create meal
    let matchMeals = await db.select().from(meals).where(and(eq(meals.mealType, mealType), eq(meals.date, date))).limit(1);
    let mealId = matchMeals[0]?.id;
    if (!mealId) {
      const [inserted] = await db.insert(meals).values({
        mealType,
        date,
        menuItems: ['Chef Selected Buffet']
      }).returning();
      mealId = inserted.id;
    }

    // Already checked in
    const checkDouble = await db.select().from(attendance).where(and(eq(attendance.studentId, profile.id), eq(attendance.mealId, mealId))).limit(1);
    if (checkDouble.length > 0) {
      return res.status(400).json({ error: 'Student already checked in for this meal slot today.' });
    }

    const [att] = await db.insert(attendance).values({
      studentId: profile.id,
      mealId,
      status: 'present',
      scanTime: new Date()
    }).returning();

    logAction('MANUAL_ATTENDANCE', req.user.email, `Logged attendance manually for ${enrollmentNumber}`);
    res.json({
      success: true,
      message: 'Logged successfully',
      attendance: att
    });
  } catch (error) {
    res.status(500).json({ error: 'Manual log process encountered a database error' });
  }
});


// ==========================================
// 5. MANAGER ANALYTICS & REVIEWS
// ==========================================

app.get('/api/manager/attendance', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Get today's attendance details with student name
    const rawAtt = await db.select({
      id: attendance.id,
      scanTime: attendance.scanTime,
      status: attendance.status,
      studentName: users.fullName,
      studentEnrollment: students.enrollmentNumber,
      mealType: meals.mealType,
      mealDate: meals.date
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(meals, eq(attendance.mealId, meals.id))
    .orderBy(desc(attendance.scanTime));

    res.json(rawAtt);
  } catch (error) {
    console.error('Attendance compilation error:', error);
    res.status(500).json({ error: 'Failed to yield attendance report' });
  }
});

app.get('/api/manager/feedback', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  try {
    const reviews = await db.select({
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment,
      sentiment: feedback.sentiment,
      createdAt: feedback.createdAt,
      studentName: users.fullName,
      mealType: meals.mealType,
      date: meals.date
    })
    .from(feedback)
    .innerJoin(students, eq(feedback.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(meals, eq(feedback.mealId, meals.id))
    .orderBy(desc(feedback.createdAt));

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile feedback reports' });
  }
});


// ==========================================
// 6. SPECIAL MEALS & REQUESTS
// ==========================================

app.get('/api/manager/requests', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  try {
    const list = await db.select({
      id: messRequests.id,
      requestType: messRequests.requestType,
      status: messRequests.status,
      comment: messRequests.comment,
      requestDate: messRequests.requestDate,
      mealType: messRequests.mealType,
      createdAt: messRequests.createdAt,
      studentName: users.fullName,
      studentEnrollment: students.enrollmentNumber
    })
    .from(messRequests)
    .innerJoin(students, eq(messRequests.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .orderBy(desc(messRequests.createdAt));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to recover requests' });
  }
});

app.post('/api/manager/requests/:id', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { id } = req.params;
  const { status, comment } = req.body; // 'approved' or 'rejected'
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const [updated] = await db.update(messRequests)
      .set({ status, comment })
      .where(eq(messRequests.id, Number(id)))
      .returning();

    logAction('REQUEST_DECISION', req.user.email, `Set request ${id} as ${status}`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Could not fulfill request resolution' });
  }
});


// ==========================================
// 7. INVENTORY MANAGEMENT
// ==========================================

app.get('/api/inventory', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  try {
    const allStock = await db.select().from(inventory).orderBy(inventory.itemName);
    res.json(allStock);
  } catch (error) {
    res.status(500).json({ error: 'Inventory load failed' });
  }
});

app.post('/api/inventory', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { id, itemName, quantity, unit, threshold } = req.body;
  if (!itemName || quantity === undefined || !unit || threshold === undefined) {
    return res.status(400).json({ error: 'Required: itemName, quantity, unit, and threshold' });
  }

  try {
    if (id) {
      // update
      const [updated] = await db.update(inventory)
        .set({ itemName, quantity: Number(quantity), unit, threshold: Number(threshold), lastUpdated: new Date() })
        .where(eq(inventory.id, Number(id)))
        .returning();
      
      logAction('INVENTORY_UPDATE', req.user.email, `Updated commodity ${itemName}`);
      return res.json(updated);
    } else {
      // create
      const [inserted] = await db.insert(inventory).values({
        itemName,
        quantity: Number(quantity),
        unit,
        threshold: Number(threshold)
      }).returning();

      logAction('INVENTORY_CREATE', req.user.email, `Created commodity ${itemName}`);
      return res.status(201).json(inserted);
    }
  } catch (error) {
    console.error('Inventory save error:', error);
    res.status(500).json({ error: 'Could not save inventory commodity' });
  }
});

app.delete('/api/inventory/:id', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.delete(inventory).where(eq(inventory.id, Number(id)));
    logAction('INVENTORY_DELETE', req.user.email, `Removed inventory item ID: ${id}`);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to erase item' });
  }
});


// ==========================================
// 8. ADMIN USER & TIMING AUDITS
// ==========================================

app.get('/api/admin/users', requireToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const list = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      enrollmentNumber: students.enrollmentNumber,
      hostlerId: students.hostlerId,
      messId: students.messId,
      feeBalance: students.feeBalance,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(students, eq(users.id, students.userId));

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to output user listing' });
  }
});

app.post('/api/admin/users/toggle', requireToken, requireRole(['admin']), async (req: any, res) => {
  const { id, isActive } = req.body;
  if (!id) return res.status(400).json({ error: 'ID is required' });

  try {
    const [updated] = await db.update(users).set({ isActive }).where(eq(users.id, Number(id))).returning();
    logAction('USER_TOGGLE', req.user.email, `Toggled active of ID ${id} to ${isActive}`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle account' });
  }
});

app.post('/api/admin/users/fee', requireToken, requireRole(['admin']), async (req: any, res) => {
  const { studentId, feeBalance } = req.body;
  if (!studentId || feeBalance === undefined) return res.status(400).json({ error: 'Required: studentId and feeBalance' });

  try {
    const [updated] = await db.update(students).set({ feeBalance: Number(feeBalance) }).where(eq(students.id, Number(studentId))).returning();
    logAction('FEE_UPDATE', req.user.email, `Set fee of student ID ${studentId} to Rs. ${feeBalance}`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fee scale' });
  }
});

app.delete('/api/admin/users/:id', requireToken, requireRole(['admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    const matched = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
    const targetEmail = matched[0]?.email || 'Unknown';
    await db.delete(users).where(eq(users.id, Number(id)));
    logAction('USER_DELETE', req.user.email, `Erased user: ${targetEmail}`);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete process failed' });
  }
});

app.get('/api/admin/audit-logs', requireToken, requireRole(['admin']), (req: any, res) => {
  res.json(auditLogs);
});

// Broadcast Announcements
app.post('/api/announcements', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { title, content, targetAudience } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const [announce] = await db.insert(announcements).values({
      title,
      content,
      targetAudience: targetAudience || 'all',
      createdBy: req.user.id
    }).returning();

    logAction('ANNOUNCEMENT_CREATE', req.user.email, `Broadcasted: "${title}"`);
    res.status(201).json(announce);
  } catch (error) {
    res.status(500).json({ error: 'Insertion failed' });
  }
});

app.delete('/api/announcements/:id', requireToken, requireRole(['manager', 'admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.delete(announcements).where(eq(announcements.id, Number(id)));
    logAction('ANNOUNCEMENT_DELETE', req.user.email, `Removed announcement ID: ${id}`);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Timing controls updates
app.post('/api/admin/timings', requireToken, requireRole(['admin']), (req: any, res) => {
  const { breakfast, lunch, snacks, dinner } = req.body;
  if (breakfast) messTimings.breakfast = breakfast;
  if (lunch) messTimings.lunch = lunch;
  if (snacks) messTimings.snacks = snacks;
  if (dinner) messTimings.dinner = dinner;

  logAction('TIMING_UPDATE', req.user.email, 'Calibrated system timings');
  res.json({ success: true, timings: messTimings });
});

app.get('/api/admin/timings', (req, res) => {
  res.json(messTimings);
});


// ==========================================
// 9. EXPORTS & REPORTS CSV ROUTE
// ==========================================

app.get('/api/admin/reports/export', requireToken, requireRole(['admin', 'manager']), async (req: any, res) => {
  try {
    const records = await db.select({
      id: attendance.id,
      scanTime: attendance.scanTime,
      status: attendance.status,
      studentName: users.fullName,
      studentEnrollment: students.enrollmentNumber,
      mealType: meals.mealType,
      mealDate: meals.date
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(meals, eq(attendance.mealId, meals.id))
    .orderBy(desc(attendance.scanTime));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=aur_mess_attendance_report.csv');

    let csvContent = "Record ID,Scan Time,Status,Student Name,Enrollment Number,Meal Type,Meal Date\n";
    for (const r of records) {
      csvContent += `"${r.id}","${new Date(r.scanTime).toLocaleString()}","${r.status}","${r.studentName}","${r.studentEnrollment}","${r.mealType}","${r.mealDate}"\n`;
    }

    res.send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to compile CSV download");
  }
});


// ==========================================
// 10. BOOTSTRAP, VITE SETUP, AND LISTENER
// ==========================================

async function startServer() {
  // Try to seed database on startup
  try {
    await seedDatabase();
  } catch (err) {
    console.warn("Seeding database was bypassed or failed:", err);
  }

  // Vite configuration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mess Management System running at http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
