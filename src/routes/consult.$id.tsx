import { createFileRoute } from "@tanstack/react-router";
import { VideoRoom } from "@/components/video-room";
import type { Role } from "@/lib/types";

type ConsultSearch = { as: Role };

export const Route = createFileRoute("/consult/$id")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): ConsultSearch => ({
    as: raw.as === "client" ? "client" : "lawyer",
  }),
  component: ConsultPage,
});

function ConsultPage() {
  const { id } = Route.useParams();
  const { as } = Route.useSearch();
  return <VideoRoom roomId={id} role={as} />;
}
