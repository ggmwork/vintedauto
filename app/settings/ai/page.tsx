import { AiSettingsPage } from "@/components/app/ai-settings-page";
import { getDatabaseSettingsViewModel } from "@/lib/data-portability/database-settings-view";
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
  const database = await getDatabaseSettingsViewModel();
  const resolvedSearchParams = await searchParams;

  return (
    <AiSettingsPage
      settings={settings}
      database={database}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
