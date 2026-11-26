import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { DEFAULT_CATEGORIES, settings } from "./schema.ts";

export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;

const serializeSettings = (row: SettingsRow) => ({
  _id: String(row.id),
  id: row.id,
  siteName: row.siteName,
  siteTagline: row.siteTagline,
  maintenanceMode: row.maintenanceMode,
  maintenanceMessage: row.maintenanceMessage,
  defaultPriority: row.defaultPriority,
  passwordMinLength: row.passwordMinLength,
  passwordRequireSpecial: row.passwordRequireSpecial,
  passwordRequireNumber: row.passwordRequireNumber,
  passwordRequireUppercase: row.passwordRequireUppercase,
  sessionTimeoutMinutes: row.sessionTimeoutMinutes,
  maxLoginAttempts: row.maxLoginAttempts,
  otpExpiryMinutes: row.otpExpiryMinutes,
  emailEnabled: row.emailEnabled,
  emailSenderName: row.emailSenderName,
  notifyOnSubmit: row.notifyOnSubmit,
  notifyOnAssign: row.notifyOnAssign,
  notifyOnResolve: row.notifyOnResolve,
  categories: Array.isArray(row.categories) ? row.categories : DEFAULT_CATEGORIES,
  autoCloseResolvedDays: row.autoCloseResolvedDays,
  blindEvaluationMode: row.blindEvaluationMode ?? true,
  institutionCode: row.institutionCode || "CAMPUS",
  allowedDomain: row.allowedDomain || "campus.edu",
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export async function getSettingsSingleton() {
  try {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.singletonKey, "default"))
      .limit(1);

    if (existing[0]) {
      return serializeSettings(existing[0]);
    }

    const inserted = await db
      .insert(settings)
      .values({ singletonKey: "default" })
      .onConflictDoNothing({ target: settings.singletonKey })
      .returning();

    if (inserted[0]) {
      return serializeSettings(inserted[0]);
    }

    const fallback = await db
      .select()
      .from(settings)
      .where(eq(settings.singletonKey, "default"))
      .limit(1);
    return serializeSettings(fallback[0]);
  } catch (error) {
    console.error("[db/settings] getSettingsSingleton failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function updateSettingsSingleton(updates: Partial<NewSettingsRow>) {
  try {
    await getSettingsSingleton();
    const rows = await db
      .update(settings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settings.singletonKey, "default"))
      .returning();
    return serializeSettings(rows[0]);
  } catch (error) {
    console.error("[db/settings] updateSettingsSingleton failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
