import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/office/clients")({
  component: () => <Outlet />,
});
