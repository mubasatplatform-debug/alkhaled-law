import { create } from "zustand";
import type {
  Appointment,
  CallNote,
  ChatMessage,
  Client,
  Intake,
  LegalDoc,
  LegalRequest,
  Role,
  ServiceOffer,
  ServiceSlug,
} from "./types";
import { SERVICE_LABELS } from "./types";
import {
  durationFor,
  formatDateLabel,
  formatTime,
  hasConflict,
  titleFor,
} from "./schedule";

type NewAppt = {
  id?: string;
  clientId: string;
  kind: Appointment["kind"];
  date: string;
  startMin: number;
  durationMin?: number;
  status?: Appointment["status"];
  requestId?: string;
};

type OfficeState = {
  role: Role;
  portalOnboarded: boolean;
  clients: Client[];
  requests: LegalRequest[];
  appointments: Appointment[];
  messages: ChatMessage[];
  calls: CallNote[];
  documents: LegalDoc[];
  offers: ServiceOffer[];
  setRole: (role: Role) => void;
  setPortalOnboarded: () => void;
  addIntake: (intake: Intake) => string;
  addRequest: (input: { clientId: string; service: ServiceSlug }) => string;
  ensurePortalClient: (name: string) => string;
  addMessage: (msg: Omit<ChatMessage, "id">) => void;
  saveCall: (note: Omit<CallNote, "id">) => void;
  updateClientNote: (id: string, note: string) => void;
  confirmAppointment: (id: string) => void;
  addAppointment: (input: NewAppt) => string;
  rescheduleAppointment: (id: string, date: string, startMin: number) => void;
  cancelAppointment: (id: string) => void;
  confirmSlot: (id: string) => void;
};

const clients: Client[] = [
  {
    id: "abdullah",
    name: "عبدالله",
    kind: "person",
    city: "الرياض",
    phone: "+966 5X XXX XX12",
    active: true,
    avatar: "/images/client-abdullah.jpg",
    source: "صفحة الهبوط",
    owner: "خالد",
    note: "يفضّل التواصل خلال الفترة المسائية.",
    lastContact: "اليوم",
  },
  {
    id: "sara",
    name: "سارة",
    kind: "person",
    city: "جدة",
    phone: "+966 5X XXX XX44",
    active: true,
    avatar: "/images/client-sara.jpg",
    source: "توصية",
    owner: "خالد",
    note: "موعد مراجعة العقد بعد الاستشارة.",
    lastContact: "أمس",
  },
  {
    id: "mohammed",
    name: "محمد",
    kind: "person",
    city: "الرياض",
    phone: "+966 5X XXX XX90",
    active: true,
    avatar: "/images/client-mohammed.jpg",
    source: "واتساب",
    owner: "خالد",
    note: "يحتاج متابعة بعد إرسال المسودة.",
    lastContact: "أمس",
  },
  {
    id: "nakheel",
    name: "مؤسسة النخيل",
    kind: "org",
    city: "الدمام",
    phone: "+966 13 XXX XXXX",
    active: true,
    avatar: "",
    source: "عرض مباشر",
    owner: "فريق المكتب",
    note: "يفضّل المواعيد الصباحية.",
    lastContact: "اليوم",
  },
];

const requests: LegalRequest[] = [
  {
    id: "r1025",
    number: "#1025",
    clientId: "abdullah",
    service: "review",
    serviceLabel: "مراجعة عقد",
    status: "pending-review",
    owner: "خالد",
    nextAction: "اعتماد التقرير",
    actionLabel: "فتح الطلب",
    video: false,
    createdAt: "اليوم",
  },
  {
    id: "r1024",
    number: "#1024",
    clientId: "abdullah",
    service: "consult",
    serviceLabel: "استشارة مرئية",
    status: "confirmed",
    owner: "خالد",
    nextAction: "دخول الغرفة",
    actionLabel: "بدء الاستشارة",
    video: true,
    createdAt: "اليوم",
  },
  {
    id: "r1023",
    number: "#1023",
    clientId: "sara",
    service: "consult",
    serviceLabel: "استشارة",
    status: "pending-confirm",
    owner: "خالد",
    nextAction: "تأكيد الموعد",
    actionLabel: "تأكيد الموعد",
    video: true,
    createdAt: "أمس",
  },
  {
    id: "r1022",
    number: "#1022",
    clientId: "mohammed",
    service: "case",
    serviceLabel: "دراسة قضية",
    status: "docs-missing",
    owner: "فريق المكتب",
    nextAction: "طلب مستند",
    actionLabel: "طلب مستند",
    video: false,
    createdAt: "أمس",
  },
  {
    id: "r1021",
    number: "#1021",
    clientId: "nakheel",
    service: "draft",
    serviceLabel: "صياغة عقد",
    status: "pending-approval",
    owner: "خالد",
    nextAction: "مراجعة المسودة",
    actionLabel: "مراجعة المسودة",
    video: false,
    createdAt: "14 سبتمبر",
  },
];

function appt(
  partial: Omit<Appointment, "time" | "dateLabel" | "title" | "durationMin"> & {
    durationMin?: number;
    title?: string;
  },
): Appointment {
  const durationMin = partial.durationMin ?? durationFor(partial.kind);
  const title = partial.title ?? titleFor(partial.kind);
  return {
    ...partial,
    title,
    durationMin,
    time: formatTime(partial.startMin),
    dateLabel: formatDateLabel(partial.date),
  };
}

const appointments: Appointment[] = [
  appt({
    id: "a-live",
    clientId: "abdullah",
    withLabel: "مع عبدالله",
    date: "2026-09-15",
    startMin: 10 * 60,
    kind: "video",
    status: "confirmed",
    requestId: "r1024",
    live: true,
  }),
  appt({
    id: "a-1030",
    clientId: "abdullah",
    withLabel: "مع عبدالله",
    date: "2026-09-15",
    startMin: 10 * 60,
    kind: "video",
    status: "confirmed",
    requestId: "r1024",
  }),
  appt({
    id: "a-1230",
    clientId: "sara",
    withLabel: "مع سارة",
    date: "2026-09-15",
    startMin: 12 * 60 + 30,
    kind: "review",
    status: "confirmed",
    requestId: "r1023",
  }),
  appt({
    id: "a-1600",
    clientId: "mohammed",
    withLabel: "مع محمد",
    date: "2026-09-15",
    startMin: 16 * 60,
    kind: "followup",
    status: "confirmed",
  }),
  appt({
    id: "a-sara-pending",
    clientId: "sara",
    withLabel: "مع سارة",
    date: "2026-09-16",
    startMin: 11 * 60,
    kind: "video",
    status: "pending",
    requestId: "r1023",
  }),
  appt({
    id: "a-nakheel",
    clientId: "nakheel",
    withLabel: "مع مؤسسة النخيل",
    date: "2026-09-17",
    startMin: 9 * 60 + 30,
    kind: "review",
    status: "confirmed",
    requestId: "r1021",
  }),
];

const messages: ChatMessage[] = [
  {
    id: "m1",
    clientId: "abdullah",
    from: "client",
    text: "السلام عليكم، رفعت مسودة العقد للمراجعة.",
    at: "أمس 11:20 ص",
  },
  {
    id: "m2",
    clientId: "abdullah",
    from: "lawyer",
    text: "وعليكم السلام، استلمت الملف. ندخل الاستشارة المرئية اليوم ونراجع البنود معك مباشرة.",
    at: "أمس 04:15 م",
  },
  {
    id: "m3",
    clientId: "abdullah",
    from: "client",
    text: "تمام، أدخل الغرفة في الموعد.",
    at: "اليوم 10:24 ص",
  },
];

const documents: LegalDoc[] = [
  {
    id: "d1",
    clientId: "abdullah",
    name: "مسودة عقد المراجعة.pdf",
    status: "waiting",
    uploadedAt: "اليوم · 10:24 ص",
  },
  {
    id: "d2",
    clientId: "sara",
    name: "توكيل.pdf",
    status: "approved",
    uploadedAt: "أمس",
  },
  {
    id: "d3",
    clientId: "nakheel",
    name: "عرض خدمة.docx",
    status: "draft",
    uploadedAt: "14 سبتمبر",
  },
];

const offers: ServiceOffer[] = [
  {
    id: "Q-19",
    number: "Q-19",
    clientId: "abdullah",
    title: "استشارة مرئية 30 دقيقة",
    amount: "١٬٢٠٠ ر.س",
    status: "approved",
  },
  {
    id: "Q-18",
    number: "Q-18",
    clientId: "sara",
    title: "مراجعة عقد",
    amount: "٢٬٤٠٠ ر.س",
    status: "sent",
  },
  {
    id: "Q-17",
    number: "Q-17",
    clientId: "nakheel",
    title: "صياغة عقد توريد",
    amount: "٦٬٥٠٠ ر.س",
    status: "draft",
  },
];

function buildAppt(input: NewAppt, clientsList: Client[]): Appointment {
  const client = clientsList.find((c) => c.id === input.clientId);
  const kind = input.kind;
  const durationMin = input.durationMin ?? durationFor(kind);
  return appt({
    id: input.id ?? `a-${Date.now()}`,
    clientId: input.clientId,
    withLabel: `مع ${client?.name ?? "العميل"}`,
    date: input.date,
    startMin: input.startMin,
    durationMin,
    kind,
    status: input.status ?? "confirmed",
    requestId: input.requestId,
  });
}

export const useOffice = create<OfficeState>((set) => ({
  role: "lawyer",
  portalOnboarded: false,
  clients,
  requests,
  appointments,
  messages,
  calls: [],
  documents,
  offers,
  setRole: (role) => set({ role }),
  setPortalOnboarded: () => set({ portalOnboarded: true }),
  addIntake: (intake) => {
    const id = `r${Date.now()}`;
    const clientId = intake.name.trim() || "visitor";
    set((s) => {
      const exists = s.clients.find((c) => c.name === intake.name);
      const nextClients = exists
        ? s.clients
        : [
            {
              id: clientId,
              name: intake.name || "زائر",
              kind: "person" as const,
              city: "الرياض",
              phone: intake.phone,
              active: true,
              avatar: "",
              source: "صفحة الهبوط",
              owner: "خالد",
              note: intake.summary,
              lastContact: "الآن",
            },
            ...s.clients,
          ];
      const req: LegalRequest = {
        id,
        number: `#${Math.floor(2000 + Math.random() * 700)}`,
        clientId: exists?.id ?? clientId,
        service: intake.service,
        serviceLabel: SERVICE_LABELS[intake.service] ?? "طلب",
        status: "pending-review",
        owner: "خالد",
        nextAction: intake.service === "consult" ? "دخول الغرفة" : "فتح الطلب",
        actionLabel: intake.service === "consult" ? "بدء الاستشارة" : "فتح الطلب",
        video: intake.service === "consult",
        createdAt: "الآن",
      };
      const apptRow: Appointment | null =
        intake.service === "consult"
          ? appt({
              id: `a-${id}`,
              clientId: req.clientId,
              withLabel: `مع ${intake.name || "العميل"}`,
              date: "2026-09-15",
              startMin: 10 * 60,
              kind: "video",
              status: "confirmed",
              requestId: id,
              live: true,
            })
          : null;
      return {
        clients: nextClients,
        requests: [req, ...s.requests],
        appointments: apptRow ? [apptRow, ...s.appointments] : s.appointments,
      };
    });
    return id;
  },
  addRequest: (input) => {
    const id = `r${Date.now()}`;
    const video = input.service === "consult";
    const req: LegalRequest = {
      id,
      number: `#${Math.floor(2000 + Math.random() * 700)}`,
      clientId: input.clientId,
      service: input.service,
      serviceLabel: SERVICE_LABELS[input.service],
      status: video ? "pending-confirm" : "pending-review",
      owner: "خالد",
      nextAction: video ? "تأكيد الموعد" : "فتح الطلب",
      actionLabel: video ? "تأكيد الموعد" : "فتح الطلب",
      video,
      createdAt: "الآن",
    };
    set((s) => ({ requests: [req, ...s.requests] }));
    return id;
  },
  ensurePortalClient: (name) => {
    const label = name.trim() || "عميل";
    set((s) => {
      const existing = s.clients.find((c) => c.id === "portal-self");
      if (existing) {
        return {
          clients: s.clients.map((c) =>
            c.id === "portal-self" ? { ...c, name: label, lastContact: "الآن" } : c,
          ),
        };
      }
      return {
        clients: [
          {
            id: "portal-self",
            name: label,
            kind: "person" as const,
            city: "الرياض",
            phone: "",
            active: true,
            avatar: "",
            source: "بوابة العميل",
            owner: "خالد",
            note: "عميل من البوابة — يفضّل التواصل خلال الفترة المسائية.",
            lastContact: "الآن",
          },
          ...s.clients,
        ],
      };
    });
    return "portal-self";
  },
  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}` },
      ],
    })),
  saveCall: (note) =>
    set((s) => ({
      calls: [{ ...note, id: `call-${Date.now()}` }, ...s.calls],
    })),
  updateClientNote: (id, note) =>
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, note } : c)),
    })),
  confirmAppointment: (id) =>
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "confirmed", actionLabel: "بدء الاستشارة" } : r,
      ),
    })),
  addAppointment: (input) => {
    const state = useOffice.getState();
    const durationMin = input.durationMin ?? durationFor(input.kind);
    if (hasConflict(state.appointments, input.date, input.startMin, durationMin)) {
      return "";
    }
    const row = buildAppt(input, state.clients);
    set((s) => ({ appointments: [...s.appointments, row] }));
    return row.id;
  },
  rescheduleAppointment: (id, date, startMin) =>
    set((s) => {
      const cur = s.appointments.find((a) => a.id === id);
      if (!cur) return s;
      if (hasConflict(s.appointments, date, startMin, cur.durationMin, id)) return s;
      return {
        appointments: s.appointments.map((a) =>
          a.id === id
            ? {
                ...a,
                date,
                startMin,
                time: formatTime(startMin),
                dateLabel: formatDateLabel(date),
                status: a.status === "cancelled" ? "confirmed" : a.status,
              }
            : a,
        ),
      };
    }),
  cancelAppointment: (id) =>
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, status: "cancelled" } : a,
      ),
    })),
  confirmSlot: (id) =>
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, status: "confirmed" } : a,
      ),
      requests: s.requests.map((r) => {
        const ap = s.appointments.find((x) => x.id === id);
        return ap && r.id === ap.requestId
          ? { ...r, status: "confirmed", actionLabel: "بدء الاستشارة" }
          : r;
      }),
    })),
}));

export function clientById(id: string, list: Client[]) {
  return list.find((c) => c.id === id);
}
