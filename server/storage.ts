import {
  users,
  files,
  aiUsageLogs,
  subscriptions,
  type User,
  type UpsertUser,
  type InsertUser,
  type File,
  type InsertFile,
  type AiUsageLog,
  type InsertAiUsageLog,
  type Subscription,
  type InsertSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, lt, sql, desc, and, gte, count } from "drizzle-orm";

export interface AnalyticsData {
  totalUsers: number;
  totalFiles: number;
  totalAiOperations: number;
  activeSubscriptions: number;
  creditsUsedToday: number;
  recentUsers: User[];
  recentFiles: File[];
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  createFile(file: InsertFile): Promise<File>;
  getFile(id: string): Promise<File | undefined>;
  getUserFiles(userId: string): Promise<File[]>;
  updateFileStatus(id: string, status: string, outputPath?: string, outputName?: string): Promise<void>;
  deleteExpiredFiles(): Promise<void>;
  deleteFile(id: string): Promise<void>;
  
  logAiUsage(log: InsertAiUsageLog): Promise<AiUsageLog>;
  getUserAiUsage(userId: string): Promise<AiUsageLog[]>;
  
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  
  getAnalytics(): Promise<AnalyticsData>;
  
  checkAndUpdateCredits(userId: string, creditsNeeded: number): Promise<{ allowed: boolean; message?: string }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getUserFiles(userId: string): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
  }

  async updateFileStatus(id: string, status: string, outputPath?: string, outputName?: string): Promise<void> {
    const updates: any = { status, updatedAt: new Date() };
    if (outputPath) updates.outputPath = outputPath;
    if (outputName) updates.outputName = outputName;
    await db.update(files).set(updates).where(eq(files.id, id));
  }

  async deleteExpiredFiles(): Promise<void> {
    await db.delete(files).where(lt(files.expiresAt, new Date()));
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async logAiUsage(log: InsertAiUsageLog): Promise<AiUsageLog> {
    const [aiLog] = await db.insert(aiUsageLogs).values(log).returning();
    return aiLog;
  }

  async getUserAiUsage(userId: string): Promise<AiUsageLog[]> {
    return await db
      .select()
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.userId, userId))
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(100);
  }

  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(sub).returning();
    return subscription;
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [userCount] = await db.select({ count: count() }).from(users);
    const [fileCount] = await db.select({ count: count() }).from(files);
    const [aiOpCount] = await db.select({ count: count() }).from(aiUsageLogs);
    const [subCount] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const [creditsToday] = await db
      .select({ total: sql<number>`COALESCE(SUM(${aiUsageLogs.creditsUsed}), 0)` })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, today));

    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    const recentFiles = await db
      .select()
      .from(files)
      .orderBy(desc(files.createdAt))
      .limit(10);

    return {
      totalUsers: userCount.count,
      totalFiles: fileCount.count,
      totalAiOperations: aiOpCount.count,
      activeSubscriptions: subCount.count,
      creditsUsedToday: Number(creditsToday.total) || 0,
      recentUsers,
      recentFiles,
    };
  }

  async checkAndUpdateCredits(userId: string, creditsNeeded: number): Promise<{ allowed: boolean; message?: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, message: "User not found" };
    }

    const { CREDIT_LIMITS } = await import("@shared/schema");
    const limits = CREDIT_LIMITS[user.subscriptionTier];
    
    if (limits.daily === -1) {
      await db
        .update(users)
        .set({
          aiCreditsUsedToday: user.aiCreditsUsedToday + creditsNeeded,
          aiCreditsUsedMonth: user.aiCreditsUsedMonth + creditsNeeded,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return { allowed: true };
    }

    const now = new Date();
    const lastReset = user.lastCreditReset ? new Date(user.lastCreditReset) : new Date(0);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    let dailyCredits = user.aiCreditsUsedToday;
    let monthlyCredits = user.aiCreditsUsedMonth;

    if (lastReset < dayStart) {
      dailyCredits = 0;
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (lastReset < monthStart) {
      monthlyCredits = 0;
    }

    if (dailyCredits + creditsNeeded > limits.daily) {
      return { allowed: false, message: `Daily credit limit (${limits.daily}) reached. Upgrade to Pro for more credits.` };
    }

    if (monthlyCredits + creditsNeeded > limits.monthly) {
      return { allowed: false, message: `Monthly credit limit (${limits.monthly}) reached. Upgrade to Pro for more credits.` };
    }

    await db
      .update(users)
      .set({
        aiCreditsUsedToday: dailyCredits + creditsNeeded,
        aiCreditsUsedMonth: monthlyCredits + creditsNeeded,
        lastCreditReset: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return { allowed: true };
  }
}

export const storage = new DatabaseStorage();
