import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/office/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">الإعدادات</h1>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-medium">غرفة الاستشارة المرئية</h2>
        <p className="mt-1 text-sm text-muted">
          الجلسات تُعقد داخل النظام. لا يُرسل العميل إلى زووم أو رابط خارجي. الملاحظات تُحفظ في ملف الطلب.
        </p>
        <Button asChild className="mt-4" variant="lime" size="sm">
          <Link to="/consult/$id" params={{ id: "r1024" }} search={{ as: "lawyer" }}>
            تجربة الغرفة
          </Link>
        </Button>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-medium">ساعات العمل</h2>
        <p className="mt-1 text-sm text-muted">
          الأحد–الخميس · 9:00 ص–5:00 م · خانات 30 دقيقة · فاصل 15 دقيقة بين الجلسات.
        </p>
        <p className="mt-2 text-sm text-muted">الجمعة والسبت عطلة. الاقتراحات تراعي تفضيل العميل.</p>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-medium">تجهيز الإطلاق</h2>
        <p className="mt-1 text-sm text-muted">
          ساعات العمل، دخول العميل، المساعد الصوتي، الغرفة المرئية، وتذكير المواعيد — في مسار واحد.
        </p>
        <Button asChild className="mt-4" variant="forest" size="sm">
          <Link to="/office/launch">فتح مسار التجهيز</Link>
        </Button>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-medium">المكتب</h2>
        <p className="mt-1 text-sm text-muted">المحامي خالد العنزي · الرياض.</p>
      </section>
    </div>
  );
}
