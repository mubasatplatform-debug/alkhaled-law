import type { DbSource } from "./db.ts";

export interface DbReadiness {
  /** Whether the active backend survives a restart. PGLite does not. */
  durable: boolean;
  title: string;
  body: string;
}

/**
 * PGLite is the deliberate zero-config fallback: right for a preview, wrong for
 * a live office, where every cold start throws away accounts, bookings and
 * requests. Nothing in the UI said which backend was active, so the office had
 * no way to notice. The launch checklist asks the server and shows this.
 */
export function describeDb(source: DbSource): DbReadiness {
  if (source === "neon") {
    return {
      durable: true,
      title: "قاعدة البيانات دائمة",
      body: "الحسابات والمواعيد والطلبات محفوظة في Postgres وتبقى بعد إعادة التشغيل.",
    };
  }
  return {
    durable: false,
    title: "قاعدة البيانات مؤقتة — البيانات تُمسح",
    body: "لا يوجد DATABASE_URL، فالنظام يعمل على قاعدة مدمجة داخل الخادم: كل حساب أو موعد أو طلب يختفي مع أول إعادة تشغيل. اربط Neon قبل استقبال أي موكل حقيقي.",
  };
}
