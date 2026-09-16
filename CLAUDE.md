# CLAUDE.md

إرشادات للمساعدين الذكيين العاملين على هذا المستودع. المرجع البشري في
[`README.md`](README.md) و[`docs/`](docs/) — هذا الملف يشرح **كيف تعمل داخل الكود** لا ما هو المنتج.

> اللغة: واجهة المنتج ووثائقه عربية. اكتب النصوص الظاهرة للمستخدم بالعربية، وأسماء
> الرموز والملفات والالتزامات التقنية بالإنجليزية.

---

## 1. ما هذا المشروع

منصة تشغيل لمكتب محاماة سعودي واحد (المحامي خالد العنزي): بوابة موكل + مساعد ذكي
(نص وصوت) + حجز مواعيد + استشارة مرئية WebRTC داخل النظام + لوحة تشغيل للمكتب.

التقنيات: **TanStack Start** (React 19 + TanStack Router، SSR عبر Nitro) · **Tailwind
CSS v4** · **Better Auth** · **Postgres** (Neon في الإنتاج، PGLite في المعاينة) ·
**Vite 8** · **TypeScript strict**. النشر على **Vercel**.

---

## 2. أوامر التطوير

```bash
npm ci             # التثبيت النظيف — هو ما يشغّله CI
npm run dev        # خادم التطوير على 0.0.0.0:8080 (منفذ ثابت — لا تغيّره)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # node --test
npm run build:dev  # بناء بلا آثار جانبية
npm run format     # prettier --write .
npm run build      # ⚠️ vite build ثم npm run db:migrate — يمسّ قاعدة البيانات
npm run preview    # معاينة الإخراج المبني على 127.0.0.1:8081
```

### بوابة الجودة

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) يشغّل مهمة `quality-gates` على Node 22
بهذا الترتيب، وكلها **يجب أن تكون خضراء قبل أي دفع**:

```bash
npm ci && npm run typecheck && npm run lint && npm test && npm run build:dev
```

`build:dev` مقصود بدل `build`: الأخير يشغّل `db:migrate` فيمسّ قاعدة بيانات حقيقية، وبوابة
الجودة يجب أن تبقى بلا آثار جانبية. التفاصيل وإجراء التعافي في
[`docs/CI_RUNBOOK.md`](docs/CI_RUNBOOK.md).

### ملاحظات على الاختبارات

- `npm test` يعدّد ملفات الاختبار **صراحةً** في `package.json`. أي ملف اختبار جديد تحت
  `src/` يجب إضافته لتلك القائمة وإلا لن يُشغَّل أبداً.
- 5 اختبارات في `scripts/` تُعلَّم **skipped** هنا وهذا متوقّع: هي فحوص ذاتية لقالب المنصة
  تقرأ ملفات في `.gitignore` (`.grok/skills/og/SKILL.md`، `AGENTS.md`، `.grok/app-env.json`)
  غير موجودة في مستودع منتج. تتخطّى نفسها عند غياب الملف بدل أن تفشل.
- **لا تجعل اختباراً يقرأ حالة المستودع المحيطة.** `injectGrokPwaHead` مثلاً يستشير `cwd`
  بحثاً عن `src/lib/og/site.json` و`public/og.jpg`؛ مرّر `cwd` لمجلد مؤقت فارغ لتختبر الدالة
  لا هوية التطبيق.

---

## 3. خريطة المستودع

```
src/
├── routes/          الصفحات — ملف = مسار (TanStack Router، توليد تلقائي)
├── components/      واجهة مشتركة (المساعد، الغرفة المرئية، الأصداف)
│   └── ui/          بدائل صغيرة: badge, button, input, textarea
├── lib/             المنطق: قاعدة البيانات، الصلاحيات، الحجز، المساعد، WebRTC
├── styles.css       ثيم Tailwind v4 عبر @theme (المصدر الوحيد للألوان والخطوط)
├── router.tsx       إنشاء الراوتر
└── routeTree.gen.ts ⚠️ مولَّد — لا تحرّره يدوياً
migrations/          مخطط Postgres — المصدر الوحيد للجداول
scripts/             أدوات المنصة والبناء (ليست كود منتج — انظر §9)
server/middleware/   وسيط منصة (PWA) — لا تضع مسارات منتج هنا
docs/                المنتج، الهيكل، النواقص، الإطلاق، النشر
public/images/       صور المكتب والموكلين فقط
```

### أين تضع تغييراً

| تريد… | الملف |
|---|---|
| صفحة جديدة | `src/routes/…` (يُحدَّث `routeTree.gen.ts` تلقائياً) |
| سلوك المساعد أو الصوت | `src/lib/concierge.ts` + `src/components/ai-concierge.tsx` |
| قواعد الحجز والتعارض | `src/lib/schedule.ts` |
| مواعيد المكتب الحية | `src/lib/office-live.ts` |
| الغرفة المرئية | `src/components/video-room.tsx` · `src/lib/multiplayer/` · `src/routes/api/rtc.ts` |
| قائمة تحقق الإطلاق | `src/lib/launch.ts` + `src/routes/office/launch.tsx` |
| لون / نصف قطر / خط | `src/styles.css` داخل `@theme` — لا قيم صريحة في الأصناف |
| جدول جديد | `migrations/0005_….sql` ثم استخدمه عبر `getSql()` |

---

## 4. الأسطح الثلاثة

| المسار | الجمهور | الحارس |
|---|---|---|
| `/` | الزائر | مفتوح |
| `/login` | الموكل | مفتوح |
| `/portal/*` | الموكل | `PortalShell` → `RedirectToSignIn` عند عدم الدخول |
| `/office/*` | المحامي والطاقم | `OfficeShell` + `ensureOfficeSession()` |
| `/consult/$id` | الطرفان | `ssr: false` (WebRTC يحتاج المتصفح) |
| `/api/auth/$` · `/api/rtc` | النظام | معالجات خادم |

---

## 5. الصلاحيات (Better Auth)

- الخادم: [`src/lib/auth/server.ts`](src/lib/auth/server.ts) — **لا تعد كتابته**. Better Auth
  ذاتي الاستضافة على `/api/auth/*`.
- الدخول **يتّحد مع وسيط Grok** (`GROK_AUTH_*` + `genericOAuth`)، لا مباشرة مع Google/X.
  `.env.example` يذكر `GOOGLE_CLIENT_ID` / `X_CLIENT_ID` لكن الكود اليوم لا يقرأهما —
  المزوّدون يُعرَّفون في [`src/lib/auth/providers.ts`](src/lib/auth/providers.ts) ويمرّون
  عبر الوسيط. عالج `.env.example` كقائمة أمنيات جزئياً.
- ثلاثة أوضاع: **منشور** (حقن `GROK_AUTH_*` + `BETTER_AUTH_URL` + `DATABASE_URL`) ·
  **معاينة** (عميل معاينة مشترك + PGLite + رمز bearer لأن الكوكيز مقسّمة داخل iframe) ·
  **مطفأ** (`VITE_AUTH_ENABLED=false` → مستخدم `dev-user`).

### القاعدة غير القابلة للتفاوض

كل دالة خادم تمسّ بيانات مستخدم **يجب** أن:

```ts
export const listThings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])                 // ① دائماً
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql`select * from t where user_id = ${context.userId}`;  // ② قيّد دائماً
  });
```

لا تثق بمعرّف مستخدم قادم من العميل. `authMiddleware` يرفض الطلبات عبر المواقع
(`assertSameSiteRequest`) ويعيد `context.userId` موثوقاً.

### الطاقم مقابل الموكل

`isStaff(userId)` يقرأ جدول `staff_users`. `ensureOfficeSession()` فيه **تمهيد**: إذا كان
الجدول فارغاً، أول مستخدم يفتح `/office` يصبح طاقماً. هذا مقصود للإعداد الأولي — انتبه له
عند اختبار الصلاحيات (سجّل الدخول بحساب المحامي أولاً).

### في الواجهة

استخدم `useCurrentUserState()` وانتظر `isPending` قبل معاملة `user === null` كـ«خارج
الحساب» — وإلا يظهر وميض تسجيل دخول عند كل تحديث. لا تستورد `auth/server` أبداً في كود
عميل.

---

## 6. قاعدة البيانات

`getSql()` من [`src/lib/db.ts`](src/lib/db.ts) هو **المنفذ الوحيد**:

- `DATABASE_URL` مضبوط → Neon عبر `pg`. غير مضبوط → PGLite مدمج في الذاكرة (تُمسح البيانات
  مع إعادة تشغيل العملية).
- الاستدعاء بقالب موسوم فقط: ``sql`select … where id = ${id}` `` — القيم تصبح `$1, $2`
  تلقائياً. **لا تركّب SQL بسلاسل نصية.**
- خادم فقط: استدعاؤه من المتصفح يرمي استثناءً. نفس القاعدة لكل ملف `*.server.ts` و
  `@/lib/app-data/client.server`.
- توحيد الأنواع بين المحرّكين مطبّق مسبقاً: `int8 → number`، `date → "YYYY-MM-DD"`.

### الهجرات

- ملف واحد لكل تغيير: `migrations/000N_اسم.sql` — تُطبَّق مرة واحدة وتُسجَّل في `_migrations`
  **بالاسم المجرّد** للملف.
- تُطبَّق تلقائياً: عند بناء النشر (`npm run build` → `db:migrate`)، وعند إقلاع PGLite.
- القراءة **غير تعاودية**: `migrations/auth/` خارج النطاق عمداً (نسخة احتياطية من مخطط
  Better Auth). لا تعتمد عليها.
- **لا تعرّف جدولاً داخل دالة خادم.** الاستثناء الوحيد القائم هو جدولا WebRTC
  (`webrtc_peers`, `webrtc_signals`) اللذان ينشئهما
  [`signaling.server.ts`](src/lib/multiplayer/signaling.server.ts) وقت التشغيل — لا تكرّر
  هذا النمط في كود جديد.

الجداول الحالية: `user` · `session` · `account` · `verification` (0001) ·
`concierge_messages` · `client_bookings` (0002) · `staff_users` (0003) · `office_launch` (0004).

---

## 7. مصادر الحقيقة — انتبه لهذا الانقسام

| البيانات | المصدر | ملاحظة |
|---|---|---|
| الحجوزات ومحادثة المساعد | **Postgres** عبر `getSql()` | حقيقية ومستمرة |
| حالة الطاقم وقائمة الإطلاق | **Postgres** | حقيقية |
| العملاء، المستندات، العروض، المهام، الرسائل | **Zustand** في [`src/lib/store.ts`](src/lib/store.ts) | **تجريبية في ذاكرة المتصفح** — تُمسح مع التحديث |

`useMergedOffice()` في `office-live.ts` يدمج الصفّين معاً لتُعرض شاشة واحدة. عند إضافة
ميزة تحتاج ثباتاً، أضف جدولاً — لا توسّع المتجر التجريبي.

---

## 8. مزالق حقيقية في الكود

1. **`todayISO()` يعيد ثابتاً مكتوباً في الكود**: `TODAY = "2026-09-15"` في
   [`schedule.ts`](src/lib/schedule.ts#L3). كل حسابات «اليوم» و«الأقرب» و«العدّ التنازلي»
   تبني عليه. لا تفترض `new Date()`، ولا تبدّله دون تتبّع كل مستدعٍ.
2. **TanStack Query مثبّت لكنه غير مستخدم.** نمط الجلب القائم هو `useEffect` + استدعاء
   دالة الخادم مباشرة (`void loadLaunch().then(setState)`). التزم بالنمط القائم أو حوّل
   الملف كاملاً — لا تخلط النمطين في مكوّن واحد.
3. **ساعات العمل مكتوبة في الكود**: الأحد–الخميس، 9–17، خانة 30 د، فاصل 15 د
   (`WORK_START` / `WORK_END` / `SLOT` / `BUFFER`).
4. **`OFFICE_SEED_OCC`** يحقن انشغالات تجريبية في حساب التعارض — ستظهر خانات محجوزة بلا
   صفوف في القاعدة.
5. **المنافذ عقد ثابت**: dev على `0.0.0.0:8080`، المعاينة على `127.0.0.1:8081`،
   كلاهما `strictPort`.
6. **مفاتيح المساعد اختيارية بصمت**: بدون `XAI_API_KEY` يسقط
   [`concierge.ts`](src/lib/concierge.ts) إلى `fallbackReply()` والصوت يعيد رسالة خطأ —
   بلا تعطّل. لا تستنتج من رد ضعيف أن المنطق مكسور قبل فحص المفتاح.
7. **WebRTC عبر STUN فقط** — لا خادم TURN. الفشل خلف NAT صارم متوقّع (مسجّل في
   [`docs/GAPS.md`](docs/GAPS.md)).
8. **`vite.config.ts` يحمل وسيطين حرجين**: `/auth/popup` (نافذة الدخول في المعاينة) و
   `pgliteBootstrapPlugin`. لا تنشئ مسار React اسمه `/auth/popup` — سيُحجب.

---

## 9. ما لا تلمسه

هذه ملفات قالب المنصة، لا كود المنتج. عدّلها فقط بطلب صريح:

- `scripts/grok-pwa-*.mjs` · `scripts/brand-check.mjs` · `scripts/browser-smoke*.mjs` ·
  `scripts/preview.mjs` · `scripts/with-app-env.mjs` · `scripts/check-auth-invariant.mjs`
  · `scripts/browser-guard.mjs`
- `server/middleware/grok-pwa.ts` · `public/__grok/`
- `src/lib/auth/*` (عدا الاستهلاك عبر `middleware` و`use-current-user` و`gates`)
- `src/lib/app-data/*` — طبقة موصّلات المنصة، **غير مستخدمة من المنتج حالياً**
- `src/routeTree.gen.ts` — مولَّد

---

## 10. الأسلوب

- **Prettier**: فاصلة منقوطة، اقتباس مزدوج، فاصلة لاحقة `all`، عرض 100. شغّل `npm run format`.
- **الاستيراد**: `@/*` → `src/*`. الامتدادات `.ts` مسموحة في الاستيراد.
- **RTL أولاً**: الجذر `<html lang="ar" dir="rtl">` والاتجاه ثابت (لا وضع LTR). للهوامش
  يستخدم الكود القائم الخصائص المنطقية (`ms-*`/`me-*` — لا وجود لـ `ml-*`/`mr-*`)، بينما
  التموضع المطلق والمحاذاة يستخدمان الصيغة الفيزيائية عمداً (`right-*`، `left-*`،
  `text-right`) لأن الاتجاه لا ينقلب. طابق الملف الذي تعدّله، ولا تخلط النمطين في مكوّن
  واحد. تذكّر أن `text-right` هنا تعني «بداية السطر».
- **الثيم**: ألوان ومقاسات من رموز `@theme` (`bg-cream`, `text-ink`, `text-muted`,
  `border-line`, `bg-tile`, `shadow-card`…). البنفسجي `--color-lime: #9601F1`. العناوين
  بخط `--font-kufi`. لا hex صريح في JSX — الاستثناءان القائمان هما `theme-color` في
  `__root.tsx` وألوان شعار Google داخل SVG في `login.tsx`.
- **الجوال أولاً**: البوابة تُصمَّم للجوال والمكتب لسطح المكتب.
- **TypeScript strict** مع `checkJs` — ملفات `scripts/*.mjs` مفحوصة أيضاً عبر JSDoc.
- **الالتزامات** بالعربية بصيغة `type: وصف` (`feat:`، `docs:`) اتساقاً مع التاريخ القائم.

---

## 11. البيئة والنشر

المتغيرات في [`.env.example`](.env.example). لا تضع أسراراً في المستودع.

| المتغير | الأثر عند غيابه |
|---|---|
| `DATABASE_URL` | PGLite مؤقت — بيانات تُمسح مع كل إقلاع |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | سرّ معاينة يُولَّد لكل عملية |
| `XAI_API_KEY` | المساعد يردّ بمنطق احتياطي، والصوت معطّل |
| `VITE_AUTH_ENABLED` | الافتراضي «مفعّل»؛ `false` يفرض مستخدم `dev-user` |

النشر: Vercel، `npm run build`، كل دفع على `main` ينشر. التفاصيل في
[`docs/DEPLOY.md`](docs/DEPLOY.md) ومسار الإطلاق في [`docs/LAUNCH.md`](docs/LAUNCH.md).

---

## 12. قبل أن تنهي أي مهمة

1. بوابة الجودة كاملة خضراء:
   `npm ci && npm run typecheck && npm run lint && npm test && npm run build:dev`.
   **صفر فشل** في الاختبارات — الـ5 المتخطّاة وحدها متوقّعة.
2. التزم بأسلوب Prettier في الملفات التي مسستها. لا تشغّل `npm run format` على المستودع
   كله: عدة ملفات Markdown قائمة غير منسّقة، فستولّد ضجيجاً لا علاقة له بتغييرك.
3. أي جدول جديد له ملف هجرة، وأي دالة خادم جديدة عليها `authMiddleware` + تقييد بـ
   `context.userId`.
4. النصوص الظاهرة عربية، والتنسيق RTL سليم.
