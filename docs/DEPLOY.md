# النشر على Vercel

المستودع: [mubasatplatform-debug/alkhaled-law](https://github.com/mubasatplatform-debug/alkhaled-law)

حساب GitHub المتصل بأدوات البناء هو `mubasatplatform-debug`. فريق Vercel (`saas`) غير مربوط بهذا الحساب بعد، لذلك الاستيراد يتم مرة واحدة من لوحة Vercel:

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository
2. اختر `alkhaled-law` (إن لم يظهر: GitHub → Settings → Applications → Vercel → Grant access للحساب/المستودع)
3. Framework Preset: Vite · Build Command: `npm run build`
4. Environment Variables من [`.env.example`](../.env.example):
   - `DATABASE_URL` (Neon) — إلزامي للإنتاج
   - `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
   - `XAI_API_KEY` للصوت والاستشارة
   - Google / X اختيارياً
5. Deploy
6. بعد نجاح التجربة: Project → Domains → `app.alkhaledlaw.com`

كل دفع على `main` ينشر تلقائياً بعد الربط.
