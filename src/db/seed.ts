import { db } from './index.ts';
import { users, students, meals, inventory, announcements, attendance, feedback } from './schema.ts';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length > 0) {
      console.log('Database already has seeded users. Skipping seed process.');
      return;
    }

    console.log('No users found in database. Starting database seeding...');

    // 1. Create Users
    const hashedPasswordAdmin = bcrypt.hashSync('admin123', 10);
    const hashedPasswordManager = bcrypt.hashSync('manager123', 10);
    const hashedPasswordStudent = bcrypt.hashSync('student123', 10);

    const [adminUser] = await db.insert(users).values({
      email: 'admin@amity.edu',
      fullName: 'AUR Mess Administrator',
      role: 'admin',
      hashedPassword: hashedPasswordAdmin,
      isActive: 1,
    }).returning();

    const [managerUser] = await db.insert(users).values({
      email: 'manager@amity.edu',
      fullName: 'Chef Rajesh Kumar',
      role: 'manager',
      hashedPassword: hashedPasswordManager,
      isActive: 1,
    }).returning();

    const [st1User] = await db.insert(users).values({
      email: 'student@amity.edu',
      fullName: 'Aarav Sharma',
      role: 'student',
      hashedPassword: hashedPasswordStudent,
      isActive: 1,
    }).returning();

    const [st2User] = await db.insert(users).values({
      email: 'student2@amity.edu',
      fullName: 'Neha Verma',
      role: 'student',
      hashedPassword: hashedPasswordStudent,
      isActive: 1,
    }).returning();

    const [st3User] = await db.insert(users).values({
      email: 'student3@amity.edu',
      fullName: 'Kabir Singh',
      role: 'student',
      hashedPassword: hashedPasswordStudent,
      isActive: 1,
    }).returning();

    console.log('Users seeded successfully');

    // 2. Create Students link
    const [st1] = await db.insert(students).values({
      userId: st1User.id,
      enrollmentNumber: 'A80101221001',
      hostlerId: 'H3-402',
      messId: 'mess_1',
      feeBalance: 24500,
    }).returning();

    const [st2] = await db.insert(students).values({
      userId: st2User.id,
      enrollmentNumber: 'A80101221002',
      hostlerId: 'H2-205',
      messId: 'mess_1',
      feeBalance: 1200,
    }).returning();

    const [st3] = await db.insert(students).values({
      userId: st3User.id,
      enrollmentNumber: 'A80101221003',
      hostlerId: 'H1-108',
      messId: 'mess_2',
      feeBalance: 45000,
    }).returning();

    console.log('Student profiles seeded successfully');

    // Get current dates
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 3. Create meals
    // Seed Yesterday's meals
    const [yB, yL, yD, yS] = await db.insert(meals).values([
      { mealType: 'breakfast', date: yesterday, menuItems: ['Poha', 'Jalebi', 'Boiled Eggs', 'Tea', 'Milk'] },
      { mealType: 'lunch', date: yesterday, menuItems: ['Dal Makhani', 'Aloo Gobi Matar', 'Plain Rice', 'Roti', 'Salad', 'Curd'] },
      { mealType: 'dinner', date: yesterday, menuItems: ['Egg Curry / Kadai Paneer', 'Dry Veg', 'Mix Dal', 'Jeera Rice', 'Roti', 'Gulab Jamun'] },
      { mealType: 'snacks', date: yesterday, menuItems: ['Veg Cutlet', 'Green Chutney', 'Tea'] },
    ]).returning();

    // Seed Today's meals
    const [tB, tL, tD, tS] = await db.insert(meals).values([
      { mealType: 'breakfast', date: today, menuItems: ['Idli Sambar', 'Vada', 'Bread Butter Jam', 'Tea & Coffee', 'Boiled Eggs'] },
      { mealType: 'lunch', date: today, menuItems: ['Paneer Butter Masala', 'Dal Tadka', 'Mix Veg', 'Jeera Rice', 'Roti', 'Salad', 'Boondi Raita'] },
      { mealType: 'dinner', date: today, menuItems: ['Butter Chicken / Palak Paneer', 'Aloo Jeera', 'Panchratna Dal', 'Plain Rice', 'Roti', 'Rasgulla'] },
      { mealType: 'snacks', date: today, menuItems: ['Samosa', 'Mint Chutney', 'Tea', 'Biscuits'] },
    ]).returning();

    // Seed Tomorrow's meals
    await db.insert(meals).values([
      { mealType: 'breakfast', date: tomorrow, menuItems: ['Aloo Paratha', 'Butter', 'Pickle', 'Tea', 'Milk'] },
      { mealType: 'lunch', date: tomorrow, menuItems: ['Rajma', 'Aloo Shimla Mirch', 'Basmati Rice', 'Roti', 'Cucumber Raita'] },
      { mealType: 'dinner', date: tomorrow, menuItems: ['Shahi Paneer', 'Bhindi Masala', 'Chana Dal', 'Steamed Rice', 'Tandoori Roti', 'Kheer'] },
      { mealType: 'snacks', date: tomorrow, menuItems: ['Aloo Tikki Burger', 'Sauce', 'Cold Coffee'] },
    ]);

    console.log('Meals seeded successfully');

    // 4. Create Attendance History
    await db.insert(attendance).values([
      { studentId: st1.id, mealId: yB.id, scanTime: new Date(yesterday + 'T08:15:00Z'), status: 'present' },
      { studentId: st1.id, mealId: yL.id, scanTime: new Date(yesterday + 'T13:02:00Z'), status: 'present' },
      { studentId: st1.id, mealId: yD.id, scanTime: new Date(yesterday + 'T20:45:00Z'), status: 'late' },
      { studentId: st2.id, mealId: yB.id, scanTime: new Date(yesterday + 'T08:44:00Z'), status: 'present' },
      { studentId: st2.id, mealId: yL.id, scanTime: new Date(yesterday + 'T13:20:00Z'), status: 'present' },
      { studentId: st3.id, mealId: yL.id, scanTime: new Date(yesterday + 'T12:55:00Z'), status: 'present' },
      { studentId: st3.id, mealId: yD.id, scanTime: new Date(yesterday + 'T20:10:00Z'), status: 'present' },
    ]);

    console.log('Attendance seeded successfully');

    // 5. Create Feedback
    await db.insert(feedback).values([
      { studentId: st1.id, mealId: yL.id, rating: 5, comment: 'Dal Makhani was absolutely amazing! Felt like home.', sentiment: 'positive' },
      { studentId: st2.id, mealId: yL.id, rating: 4, comment: 'Good quality, but ritas could have been colder.', sentiment: 'positive' },
      { studentId: st3.id, mealId: yD.id, rating: 2, comment: 'The rotis were quite hard to chew today, please check tandoor temperature.', sentiment: 'negative' },
    ]);

    console.log('Feedback seeded successfully');

    // 6. Create Inventory
    await db.insert(inventory).values([
      { itemName: 'Wheat Flour (Atta)', quantity: 450, unit: 'kg', threshold: 100 },
      { itemName: 'Basmati Rice', quantity: 380, unit: 'kg', threshold: 80 },
      { itemName: 'Fresh Paneer', quantity: 18, unit: 'kg', threshold: 25 }, // Below threshold!
      { itemName: 'Broiler Chicken', quantity: 45, unit: 'kg', threshold: 15 },
      { itemName: 'Refined Sugar', quantity: 12, unit: 'kg', threshold: 30 }, // Below threshold!
      { itemName: 'Mustard Oil', quantity: 85, unit: 'ltr', threshold: 30 },
      { itemName: 'Fresh Milk', quantity: 140, unit: 'ltr', threshold: 50 },
      { itemName: 'LPG Gas Cylinders', quantity: 5, unit: 'pcs', threshold: 3 },
    ]);

    console.log('Inventory stock seeded successfully');

    // 7. Create announcements
    await db.insert(announcements).values([
      {
        title: 'Revised Summer Mess Timings',
        content: 'Dear Students,\n\nPlease note the updated mess timings for summer semester starting Monday:\n- Breakfast: 07:30 AM to 09:30 AM\n- Lunch: 12:30 PM to 02:30 PM\n- Snacks: 05:00 PM to 06:15 PM\n- Dinner: 07:30 PM to 09:30 PM\nStrict compliance is appreciated.',
        targetAudience: 'all',
        createdBy: adminUser.id,
      },
      {
        title: 'Special Menu for Hostel Fest',
        content: 'Hi Everyone,\n\nOn the occasion of Sansthan (AUR Campus Fest), the mess will host a Special Feast on Friday dinner containing Paneer Lababdar, Butter Naan, Veg Biryani, and Rabri Falooda. Day Scholars can register at the counter before Wednesday.',
        targetAudience: 'students',
        createdBy: managerUser.id,
      },
      {
        title: 'Avoid Food Wastage',
        content: 'We noticed a severe spike in waste levels (average 38kg per day). Students are highly urged to take only what they intend to consume. Let us act responsibly.',
        targetAudience: 'students',
        createdBy: managerUser.id,
      }
    ]);

    console.log('Announcements seeded successfully.');
    console.log('Database Seeding Complete.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
