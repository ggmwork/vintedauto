import { Badge } from "@/components/ui/badge";
import {
  buildVintedFieldFormName,
  buildVintedFieldPresenceName,
  formatVintedCategoryPathInput,
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";
import type { DraftDetail } from "@/types/draft";

const SECTION_LABELS = {
  category_plan: "Category plan",
  measurements: "Measurements",
  logistics: "Shipping",
  compliance: "Compliance",
} as const;

function getFieldInputValue(
  draft: DraftDetail,
  fieldKey: string
) {
  return draft.vintedProfile.fieldValues[fieldKey];
}

function formatSavedCategorySource(source: string | null | undefined) {
  switch (source) {
    case "user_manual":
      return "Saved from Vinted";
    case "extension_auto":
      return "Saved from extension fill";
    default:
      return "Inferred by app";
  }
}

function formatCapturedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DraftVintedProfileSection({
  draft,
  inputClassName,
}: {
  draft: DraftDetail;
  inputClassName: string;
}) {
  const vintedProfileState = hydrateDraftVintedProfileState({
    category: draft.metadata.category,
    state: draft.vintedProfile,
  });
  const resolvedProfile = resolveVintedListingProfile({
    category: draft.metadata.category,
    state: vintedProfileState,
  });
  const missingManualFieldKeys = getVintedProfileMissingFieldKeys(
    resolvedProfile,
    vintedProfileState
  );
  const savedCategoryPlan = vintedProfileState.categoryPlan;
  const savedCategoryTime = formatCapturedAt(savedCategoryPlan?.capturedAt);
  const groupedFields = Object.entries(SECTION_LABELS)
    .map(([sectionKey, sectionLabel]) => ({
      sectionKey,
      sectionLabel,
      fields: resolvedProfile.dynamicFields.filter(
        (fieldDefinition) => fieldDefinition.section === sectionKey
      ),
    }))
    .filter((section) => section.fields.length > 0);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">Vinted PT fields</h3>
            <Badge variant="outline">{resolvedProfile.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {resolvedProfile.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{resolvedProfile.market}</Badge>
          <Badge variant={missingManualFieldKeys.length === 0 ? "default" : "outline"}>
            {missingManualFieldKeys.length === 0
              ? "optional fields complete"
              : `${missingManualFieldKeys.length} optional field${missingManualFieldKeys.length === 1 ? "" : "s"} left for manual fill`}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">
            Vinted category search query
          </label>
          <input
            type="text"
            name="vintedCategorySearchQuery"
            defaultValue={
              vintedProfileState.categoryPlan?.searchQuery ??
              resolvedProfile.categoryPlan.searchQuery ??
              ""
            }
            placeholder={resolvedProfile.categoryPlan.searchQuery ?? "Camisas"}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Keep this in the target Vinted market language. The extension uses it
            to open the searchable dropdown and narrow the real category branch.
          </p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">
            Vinted category path
          </label>
          <input
            type="text"
            name="vintedCategoryPath"
            defaultValue={
              formatVintedCategoryPathInput(vintedProfileState.categoryPlan) ||
              formatVintedCategoryPathInput(resolvedProfile.categoryPlan)
            }
            placeholder={formatVintedCategoryPathInput(resolvedProfile.categoryPlan)}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Use the exact dropdown path separated by ` &gt; `. Example:
            `Homem &gt; Roupa &gt; Tops e t-shirts &gt; Camisas`.
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSavedCategorySource(savedCategoryPlan?.source)}
            {savedCategoryTime ? ` on ${savedCategoryTime}` : ""}.
          </p>
        </div>
      </div>

      {groupedFields.map((section) => (
        <div key={section.sectionKey} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-foreground">
              {section.sectionLabel}
            </h4>
            <Badge variant="outline">
              {section.fields.length} field{section.fields.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((fieldDefinition) => {
              const fieldName = buildVintedFieldFormName(fieldDefinition.key);
              const presenceName = buildVintedFieldPresenceName(fieldDefinition.key);
              const fieldValue =
                vintedProfileState.fieldValues[fieldDefinition.key] ??
                getFieldInputValue(draft, fieldDefinition.key);

              return (
                <div
                  key={fieldDefinition.key}
                  className="grid gap-2 rounded-lg border border-border bg-background px-4 py-4"
                >
                  <input type="hidden" name={presenceName} value="1" />

                  {fieldDefinition.valueType === "boolean" ? (
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name={fieldName}
                        value="true"
                        defaultChecked={fieldValue === true}
                        className="mt-1 size-4 rounded border-border"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {fieldDefinition.label}
                          </span>
                          {fieldDefinition.required ? (
                            <Badge variant="outline">manual ok</Badge>
                          ) : null}
                          {fieldDefinition.recommended ? (
                            <Badge variant="secondary">recommended</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {fieldDefinition.description}
                        </p>
                      </div>
                    </label>
                  ) : fieldDefinition.valueType === "single_select" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-foreground">
                          {fieldDefinition.label}
                        </label>
                        {fieldDefinition.required ? (
                          <Badge variant="outline">manual ok</Badge>
                        ) : null}
                        {fieldDefinition.recommended ? (
                          <Badge variant="secondary">recommended</Badge>
                        ) : null}
                      </div>
                      <select
                        name={fieldName}
                        defaultValue={typeof fieldValue === "string" ? fieldValue : ""}
                        className={inputClassName}
                      >
                        <option value="">Select an option</option>
                        {fieldDefinition.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        {fieldDefinition.description}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-foreground">
                          {fieldDefinition.label}
                        </label>
                        {fieldDefinition.required ? (
                          <Badge variant="outline">manual ok</Badge>
                        ) : null}
                        {fieldDefinition.recommended ? (
                          <Badge variant="secondary">recommended</Badge>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <input
                          type={fieldDefinition.valueType === "number" ? "number" : "text"}
                          step={fieldDefinition.valueType === "number" ? "0.01" : undefined}
                          name={fieldName}
                          defaultValue={
                            typeof fieldValue === "number" || typeof fieldValue === "string"
                              ? String(fieldValue)
                              : ""
                          }
                          placeholder={fieldDefinition.placeholder}
                          className={inputClassName}
                        />
                        <p className="text-xs text-muted-foreground">
                          {fieldDefinition.description}
                          {fieldDefinition.unit ? ` Unit: ${fieldDefinition.unit}.` : ""}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
