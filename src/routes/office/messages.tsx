import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOffice } from "@/lib/store";

export const Route = createFileRoute("/office/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { clients, messages, addMessage } = useOffice();
  const [active, setActive] = useState(clients[0]?.id ?? "abdullah");
  const [draft, setDraft] = useState("");
  const thread = messages.filter((m) => m.clientId === active);
  const client = clients.find((c) => c.id === active);

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="rounded-3xl border border-line bg-card p-2">
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-right text-sm ${
              active === c.id ? "bg-cream" : ""
            }`}
          >
            {c.avatar ? (
              <img src={c.avatar} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="size-8 rounded-full bg-ok" />
            )}
            {c.name}
          </button>
        ))}
      </aside>
      <section className="flex min-h-[28rem] flex-col rounded-3xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="font-medium">{client?.name}</div>
          <Button asChild variant="lime" size="sm">
            <Link to="/consult/$id" params={{ id: "r1024" }} search={{ as: "lawyer" }}>
              ترقية لاستشارة مرئية
            </Link>
          </Button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {thread.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "lawyer" ? "ms-auto bg-lime text-paper" : "bg-tile"
              }`}
            >
              {m.text}
              <div className="mt-1 text-[10px] text-muted">{m.at}</div>
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addMessage({ clientId: active, from: "lawyer", text: draft.trim(), at: "الآن" });
            setDraft("");
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="اكتب رسالة…" />
          <Button type="submit" size="sm">
            إرسال
          </Button>
        </form>
      </section>
    </div>
  );
}
