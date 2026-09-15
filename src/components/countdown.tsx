import { useEffect, useState } from "react";
import { formatCountdown, minutesUntil } from "@/lib/schedule";

export function Countdown({
  date,
  startMin,
}: {
  date: string;
  startMin: number;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => setText(formatCountdown(minutesUntil(date, startMin)));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [date, startMin]);
  if (!text) return null;
  return <span>{text}</span>;
}
