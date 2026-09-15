export type Role = "lawyer" | "client";

export type RequestStatus =
  | "pending-review"
  | "pending-confirm"
  | "docs-missing"
  | "pending-approval"
  | "confirmed"
  | "in-review"
  | "done";

export type ServiceSlug = "consult" | "review" | "draft" | "case";

export type Client = {
  id: string;
  name: string;
  kind: "person" | "org";
  city: string;
  phone: string;
  active: boolean;
  avatar: string;
  source: string;
  owner: string;
  note: string;
  lastContact: string;
};

export type LegalRequest = {
  id: string;
  number: string;
  clientId: string;
  service: ServiceSlug;
  serviceLabel: string;
  status: RequestStatus;
  owner: string;
  nextAction: string;
  actionLabel: string;
  video: boolean;
  createdAt: string;
};

export type AppointmentStatus = "confirmed" | "pending" | "cancelled";

export type Appointment = {
  id: string;
  clientId: string;
  title: string;
  withLabel: string;
  time: string;
  dateLabel: string;
  date: string;
  startMin: number;
  durationMin: number;
  kind: "video" | "review" | "followup";
  status: AppointmentStatus;
  requestId?: string;
  live?: boolean;
  fromPortal?: boolean;
};
export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
};

export type ChatMessage = {
  id: string;
  clientId: string;
  from: Role;
  text: string;
  at: string;
};

export type CallNote = {
  id: string;
  requestId: string;
  durationSec: number;
  notes: string;
  at: string;
};

export type Intake = {
  name: string;
  phone: string;
  service: ServiceSlug;
  summary: string;
};

export type DocStatus = "draft" | "waiting" | "approved";

export type LegalDoc = {
  id: string;
  clientId: string;
  name: string;
  status: DocStatus;
  uploadedAt: string;
};

export type OfferStatus = "draft" | "sent" | "approved";

export type ServiceOffer = {
  id: string;
  number: string;
  clientId: string;
  title: string;
  amount: string;
  status: OfferStatus;
};

export const SERVICE_META: Record<
  ServiceSlug,
  { title: string; blurb: string; minutes: number }
> = {
  consult: {
    title: "استشارة قانونية",
    blurb: "مناقشة قضيتك القانونية مع محامٍ مختص عبر غرفة مرئية داخل النظام.",
    minutes: 30,
  },
  review: {
    title: "مراجعة العقود",
    blurb: "تحليل بنود العقد وتوضيح الالتزامات والملاحظات في تقرير مهني.",
    minutes: 45,
  },
  draft: {
    title: "صياغة العقود",
    blurb: "إعداد عقود قانونية دقيقة وواضحة تناسب موضوعك.",
    minutes: 60,
  },
  case: {
    title: "دراسة قضية",
    blurb: "تحليل شامل لموضوعك ووضع الخيارات المناسبة.",
    minutes: 60,
  },
};

export const SERVICE_LABELS: Record<ServiceSlug, string> = {
  consult: "استشارة مرئية",
  review: "مراجعة عقد",
  draft: "صياغة عقد",
  case: "دراسة قضية",
};

export const STATUS_META: Record<
  RequestStatus,
  { label: string; tone: "warn" | "ok" | "ink" }
> = {
  "pending-review": { label: "بانتظار المراجعة", tone: "warn" },
  "pending-confirm": { label: "بانتظار التأكيد", tone: "warn" },
  "docs-missing": { label: "مستندات ناقصة", tone: "warn" },
  "pending-approval": { label: "بانتظار الاعتماد", tone: "warn" },
  confirmed: { label: "مؤكد", tone: "ok" },
  "in-review": { label: "قيد المراجعة", tone: "warn" },
  done: { label: "مكتمل", tone: "ok" },
};

export const DOC_STATUS: Record<DocStatus, { label: string; tone: "warn" | "ok" | "line" }> = {
  draft: { label: "مسودة", tone: "line" },
  waiting: { label: "بانتظار الاعتماد", tone: "warn" },
  approved: { label: "معتمد", tone: "ok" },
};

export const OFFER_STATUS: Record<OfferStatus, { label: string; tone: "warn" | "ok" | "line" }> = {
  draft: { label: "مسودة", tone: "line" },
  sent: { label: "مرسل", tone: "warn" },
  approved: { label: "معتمد", tone: "ok" },
};
