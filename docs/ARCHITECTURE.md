# هيكل الملفات

المستودع مرتّب حول ثلاثة أسطح للمنتج، لا حول أدوات البناء.

```
alkhaled-law/
├── README.md                 نظرة المنتج
├── docs/                     الفكرة، النواقص، الإطلاق، هذا الملف
├── src/
│   ├── routes/               الصفحات (TanStack Router — ملف = مسار)
│   │   ├── index.tsx         الموقع
│   │   ├── login.tsx         دخول العميل
│   │   ├── portal/           بوابة الموكل
│   │   ├── office/           لوحة المكتب
│   │   ├── consult.$id.tsx   غرفة الاستشارة المرئية
│   │   └── api/              auth + إشارات WebRTC
│   ├── components/           واجهة مشتركة (المساعد، الغرفة، الأصداف)
│   └── lib/                  خادم: حجز، مساعد، قاعدة بيانات، صلاحيات
├── migrations/               مخطط Postgres (Auth، حجوزات، مكتب، إطلاق)
├── public/images/            صور المكتب والموكلين (بدون صور أسلوب حياة)
├── scripts/                  بناء، ترحيل، معاينة
└── server/                   وسيط المنصة (لا تضع مسارات المنتج هنا)
```

## أين تضع تغييراً جديداً

| تريد… | الملف |
|---|---|
| صفحة موقع / خدمة | `src/routes/index.tsx` أو `portal/services.$slug.tsx` |
| سلوك المساعد أو الصوت | `src/lib/concierge.ts` + `src/components/ai-concierge.tsx` |
| قواعد الحجز والتعارض | `src/lib/schedule.ts` |
| مواعيد المكتب الحية | `src/lib/office-live.ts` |
| الغرفة المرئية | `src/components/video-room.tsx` + `src/routes/api/rtc.ts` |
| لون أو نصف قطر أو خط | `src/styles.css` (`@theme`) |
| جدول جديد | `migrations/0005_….sql` ثم استخدمه عبر `getSql()` |

## مصادر الحقيقة

- **الحجوزات والمساعد:** Postgres (`client_bookings`, `concierge_messages`) عبر `getSql()`.
- **شاشة الإطلاق:** `office_launch`.
- **ملفات تجريبية (عملاء/مستندات/عروض/مهام):** Zustand في `src/lib/store.ts` — مؤقت حتى تُنقل للجداول.

كل دالة خادم تمس بيانات المستخدم تمر على `authMiddleware` وتُقيَّد بـ `context.userId`.
