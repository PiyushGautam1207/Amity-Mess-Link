export type UserRole = 'student' | 'manager' | 'admin';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: number;
  createdAt: string;
}

export interface StudentProfile {
  id: number;
  userId: number;
  enrollmentNumber: string;
  hostlerId?: string | null;
  messId: string;
  feeBalance: number;
}

export interface Meal {
  id: number;
  mealType: string; // 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  date: string; // YYYY-MM-DD
  menuItems: string[];
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  mealId: number;
  scanTime: string;
  status: string; // 'present' | 'absent' | 'late'
  studentName?: string;
  studentEnrollment?: string;
  mealType?: string;
  mealDate?: string;
}

export interface FeedbackRecord {
  id: number;
  studentId: number;
  studentName?: string;
  mealId: number;
  mealType?: string;
  rating: number;
  comment?: string | null;
  sentiment: string; // 'positive' | 'neutral' | 'negative'
  createdAt: string;
}

export interface MessRequest {
  id: number;
  studentId: number;
  studentName?: string;
  studentEnrollment?: string;
  mealId?: number | null;
  requestType: string; // 'medical' | 'religious' | 'dietary'
  status: string; // 'pending' | 'approved' | 'rejected'
  comment?: string | null;
  requestDate: string;
  mealType: string;
  createdAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  targetAudience: string; // 'all' | 'students' | 'staff'
  createdBy: number;
  creatorName?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: number;
  itemName: string;
  quantity: number;
  unit: string;
  threshold: number;
  lastUpdated: string;
}

export interface Timings {
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

export interface AuditLog {
  id: number;
  action: string;
  userEmail: string;
  timestamp: string;
  details: string;
}

export interface AuthContextType {
  user: User | null;
  studentProfile: StudentProfile | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}
