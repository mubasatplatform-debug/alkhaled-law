import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/concept")({
  component: () => <Navigate to="/" />,
});
