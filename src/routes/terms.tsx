import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/brand";

// NOTE: the wording below only describes what the product actually does today
// (portal accounts, in-system video consultation, office hours, stored
// requests/documents). It is not a reviewed legal document — the office must
// approve or replace it before the commercial launch.
export const Route = createFileRoute("/terms")({
  component: Terms,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "من نحن",
    body: [
      "مكتب المحامي خالد العنزي للمحاماة والاستشارات القانونية — الرياض. تُقدَّم الخدمات عبر هذه المنصّة وداخلها، دون تطبيقات خارجية.",
    ],
  },
  {
    title: "نطاق الخدمة",
    body: [
      "تشمل الخدمات: الاستشارة المرئية، ومراجعة العقود، وصياغتها، ودراسة القضايا.",
      "التوجيه الأوّلي الذي يقدّمه المساعد الذكي في المحادثة تمهيدي فقط، ولا يُعدّ رأياً قانونياً نهائياً ولا بديلاً عن الاستشارة مع المحامي.",
    ],
  },
  {
    title: "الحساب والمواعيد",
    body: [
      "إنشاء حساب في البوابة ضروري لحجز المواعيد ومتابعة الطلبات.",
      "مواعيد الاستشارة ضمن أوقات العمل المعروضة في البوابة عند الحجز، بخانات مدّتها ٣٠ دقيقة.",
      "أنت مسؤول عن صحّة البيانات التي تُدخلها وعن حفظ وسيلة دخولك.",
    ],
  },
  {
    title: "الاستشارة المرئية",
    body: [
      "تجري الجلسة داخل النظام مباشرة، ولا تُسجَّل.",
      "يعتمد جودة الاتصال على شبكتك، وقد تتأثّر الجلسة بانقطاعها.",
    ],
  },
  {
    title: "البيانات والخصوصية",
    body: [
      "نحفظ ما تحتاجه الخدمة: بيانات حسابك، وطلباتك ومواعيدك، والمستندات التي ترفعها بنفسك.",
      "لا تُستخدم بياناتك لغير تقديم الخدمة ومتابعتها، ولا تُشارَك مع طرف ثالث إلّا بموجب نظام أو بموافقتك.",
      "المراسلات ومحتوى الاستشارة تسري عليها السرّية المهنية للمحاماة.",
    ],
  },
  {
    title: "الأتعاب",
    body: [
      "تُحدَّد أتعاب كل خدمة وتُعرض عليك قبل الاعتماد، ولا يُلزمك النظام بأي مبلغ قبل موافقتك الصريحة.",
    ],
  },
  {
    title: "تعديل الشروط",
    body: ["قد تُحدَّث هذه الشروط، ويسري التحديث من تاريخ نشره على هذه الصفحة."],
  },
];

function Terms() {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5">
          <BrandLockup />
          <Link
            to="/"
            className="ms-auto inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            العودة للموقع
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl leading-tight">شروط الخدمة والخصوصية</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          تحكم هذه الشروط استخدامك لمنصّة مكتب المحامي خالد العنزي: البوابة، والمساعد، والاستشارة
          المرئية.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl">{section.title}</h2>
              {section.body.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-muted">
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm leading-relaxed text-muted">
          لأي استفسار عن هذه الشروط، تواصل معنا من{" "}
          <Link to="/" hash="contact" className="underline">
            صفحة التواصل
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
