import { pgTable, serial, text, integer, timestamp, real, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(), // 'student', 'manager', 'admin'
  hashedPassword: text('hashed_password').notNull(),
  isActive: integer('is_active').default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  enrollmentNumber: text('enrollment_number').notNull().unique(),
  hostlerId: text('hostler_id'),
  messId: text('mess_id').default('mess_1').notNull(), // E.g., 'Mess 1', 'Mess 2'
  feeBalance: integer('fee_balance').default(45000).notNull(), // Monthly/semester fee balance in Rupees
});

export const meals = pgTable('meals', {
  id: serial('id').primaryKey(),
  mealType: text('meal_type').notNull(), // 'breakfast', 'lunch', 'dinner', 'snacks'
  date: text('date').notNull(), // Format 'YYYY-MM-DD'
  menuItems: jsonb('menu_items').notNull(), // Array of strings: e.g. ["Paneer Tikka", "Roti", "Rice"]
});

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  mealId: integer('meal_id').references(() => meals.id, { onDelete: 'cascade' }).notNull(),
  scanTime: timestamp('scan_time').defaultNow().notNull(),
  status: text('status').default('present').notNull(), // 'present', 'absent', 'late'
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  mealId: integer('meal_id').references(() => meals.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  sentiment: text('sentiment').default('neutral').notNull(), // 'positive', 'neutral', 'negative'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messRequests = pgTable('mess_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  mealId: integer('meal_id').references(() => meals.id, { onDelete: 'cascade' }),
  requestType: text('request_type').notNull(), // 'medical', 'religious', 'dietary'
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected'
  comment: text('comment'),
  requestDate: text('request_date').notNull(), // Format: 'YYYY-MM-DD'
  mealType: text('meal_type').notNull(), // 'breakfast', 'lunch', 'dinner', 'snacks'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  targetAudience: text('target_audience').default('all').notNull(), // 'all', 'students', 'staff'
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  itemName: text('item_name').notNull().unique(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // 'kg', 'ltr', 'pcs', 'bags', etc.
  threshold: real('threshold').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  studentProfile: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  announcementsCreated: many(announcements),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  attendanceRecords: many(attendance),
  feedbacks: many(feedback),
  messRequests: many(messRequests),
}));

export const mealsRelations = relations(meals, ({ many }) => ({
  attendanceRecords: many(attendance),
  feedbacks: many(feedback),
  messRequests: many(messRequests),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
  meal: one(meals, {
    fields: [attendance.mealId],
    references: [meals.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  student: one(students, {
    fields: [feedback.studentId],
    references: [students.id],
  }),
  meal: one(meals, {
    fields: [feedback.mealId],
    references: [meals.id],
  }),
}));

export const messRequestsRelations = relations(messRequests, ({ one }) => ({
  student: one(students, {
    fields: [messRequests.studentId],
    references: [students.id],
  }),
  meal: one(meals, {
    fields: [messRequests.mealId],
    references: [meals.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));
