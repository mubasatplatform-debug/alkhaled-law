import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <main className="flex min-h-dvh items-center justify-center bg-cream px-6 text-ink">
        <p className="text-muted">الصفحة غير موجودة.</p>
      </main>
    ),
  });
}
