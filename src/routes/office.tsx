import { createFileRoute } from "@tanstack/react-router";
import { OfficeShell } from "@/components/office-shell";

export const Route = createFileRoute("/office")({
  component: OfficeShell,
});
