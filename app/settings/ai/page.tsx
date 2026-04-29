import { AiSettingsPage } from "@/components/app/ai-settings-page";
import { getAiSettingsViewModel } from "@/lib/settings/ai-settings-view";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AiSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settings = getAiSettingsViewModel();
  const resolvedSearchParams = await searchParams;

  return (
    <AiSettingsPage
      settings={settings}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
