import { StudioSessionWorkspace } from "@/components/app/studio-session-workspace";
import type { StudioSessionDetail } from "@/types/intake";

export function StudioSessionDetailPage({
  session,
  feedback,
}: {
  session: StudioSessionDetail;
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  return <StudioSessionWorkspace session={session} feedback={feedback} />;
}
