(function initVintedAutoFormAdapter() {
  const FIELD_DEFINITIONS = {
    title: {
      matchers: ["title", "titulo", "titulo do anuncio", "titulo do anúncio"],
      directSelectors: [
        "input[name*='title' i]",
        "input[id*='title' i]",
        "input[placeholder*='title' i]",
        "input[aria-label*='title' i]",
      ],
    },
    description: {
      matchers: ["description", "descricao", "descrição"],
      directSelectors: [
        "textarea[name*='description' i]",
        "textarea[id*='description' i]",
        "textarea[placeholder*='description' i]",
        "textarea[aria-label*='description' i]",
      ],
    },
    price: {
      matchers: ["price", "preco", "preço"],
      directSelectors: [
        "input[name*='price' i]",
        "input[id*='price' i]",
        "input[placeholder*='price' i]",
        "input[inputmode='decimal']",
      ],
    },
    brand: {
      matchers: ["brand", "marca"],
      directSelectors: [
        "input[name*='brand' i]",
        "input[id*='brand' i]",
        "select[name*='brand' i]",
        "[aria-label*='brand' i]",
      ],
    },
    category: {
      matchers: ["category", "categoria"],
      directSelectors: [
        "input[name*='category' i]",
        "input[id*='category' i]",
        "select[name*='category' i]",
        "[aria-label*='category' i]",
      ],
    },
    size: {
      matchers: ["size", "tamanho"],
      directSelectors: [
        "input[name*='size' i]",
        "input[id*='size' i]",
        "select[name*='size' i]",
        "[aria-label*='size' i]",
      ],
    },
    condition: {
      matchers: ["condition", "estado"],
      directSelectors: [
        "input[name*='condition' i]",
        "input[id*='condition' i]",
        "select[name*='condition' i]",
        "[aria-label*='condition' i]",
      ],
    },
    color: {
      matchers: ["color", "cor"],
      directSelectors: [
        "input[name*='color' i]",
        "input[id*='color' i]",
        "select[name*='color' i]",
        "[aria-label*='color' i]",
      ],
    },
    material: {
      matchers: ["material", "tecido"],
      directSelectors: [
        "input[name*='material' i]",
        "input[id*='material' i]",
        "select[name*='material' i]",
        "[aria-label*='material' i]",
      ],
    },
  };

  const PT_CHOICE_CANDIDATES = {
    category: {
      exact: {
        "men's shirts": ["Camisas", "Camisa"],
        "mens shirts": ["Camisas", "Camisa"],
        "coats & jackets": ["Casacos", "Casacos e blusoes"],
      },
      keywordRules: [
        {
          keywords: ["shirt", "shirts", "camisa", "camisas"],
          candidates: ["Camisas"],
        },
        {
          keywords: ["coat", "coats", "jacket", "jackets", "blazer", "blazers"],
          candidates: ["Casacos", "Casacos e blusoes"],
        },
      ],
    },
    condition: {
      exact: {
        good: ["Bom"],
        "very good": ["Muito bom"],
        satisfactory: ["Satisfatorio"],
        fair: ["Satisfatorio"],
        "new with tags": ["Novo com etiqueta"],
        "new without tags": ["Novo sem etiqueta"],
        new: ["Novo"],
      },
      keywordRules: [],
    },
  };

  const PT_CATEGORY_SELECTION_PLANS = {
    "men's shirts": {
      queryCandidates: ["Camisas", "Camisa"],
      requiredBreadcrumbTerms: ["Homem", "Roupa"],
      preferredBreadcrumbTerms: ["Tops e t-shirts"],
      preferredLeafTerms: ["Camisas", "Camisa"],
    },
    "mens shirts": {
      queryCandidates: ["Camisas", "Camisa"],
      requiredBreadcrumbTerms: ["Homem", "Roupa"],
      preferredBreadcrumbTerms: ["Tops e t-shirts"],
      preferredLeafTerms: ["Camisas", "Camisa"],
    },
    "coats & jackets": {
      queryCandidates: ["Casacos", "Casaco", "Blazer"],
      requiredBreadcrumbTerms: [],
      preferredBreadcrumbTerms: [],
      preferredLeafTerms: ["Casacos", "Casaco", "Blazer"],
    },
  };

  const CONTROL_SELECTOR = [
    "input:not([type='hidden']):not([type='file'])",
    "textarea",
    "select",
    "[role='combobox']",
    "button[aria-haspopup='listbox']",
    "button[aria-expanded]",
  ].join(", ");

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function textMatches(value, matchers) {
    const normalizedValue = normalizeText(value);

    return matchers.some((matcher) => {
      const normalizedMatcher = normalizeText(matcher);
      return (
        normalizedValue === normalizedMatcher ||
        normalizedValue.includes(normalizedMatcher)
      );
    });
  }

  function queryVisible(selector) {
    return [...document.querySelectorAll(selector)].find((candidate) => {
      if (
        candidate instanceof HTMLInputElement ||
        candidate instanceof HTMLTextAreaElement ||
        candidate instanceof HTMLSelectElement ||
        candidate instanceof HTMLElement
      ) {
        return isVisible(candidate);
      }

      return false;
    });
  }

  function getMarketCode() {
    if (window.location.hostname.endsWith(".pt")) {
      return "pt";
    }

    return "default";
  }

  function findControlInContainer(container) {
    if (!(container instanceof HTMLElement)) {
      return null;
    }

    const control = container.querySelector(CONTROL_SELECTOR);

    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLElement
    ) {
      return control;
    }

    return null;
  }

  function describeControl(control) {
    if (
      !(
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLElement
      )
    ) {
      return "Unknown control.";
    }

    const parts = [
      control.tagName.toLowerCase(),
      control.getAttribute("name"),
      control.getAttribute("id"),
      control.getAttribute("aria-label"),
      control.getAttribute("placeholder"),
    ].filter(Boolean);

    return parts.join(" | ");
  }

  function summarizeVisibleLabels() {
    const labels = [...document.querySelectorAll("label, legend")]
      .filter((candidate) => candidate instanceof HTMLElement && isVisible(candidate))
      .map((candidate) => normalizeText(candidate.innerText || candidate.textContent))
      .filter(Boolean)
      .slice(0, 5);

    return labels.length > 0 ? labels.join(", ") : "none";
  }

  function buildMissingResolution(fieldKey, directSelectors) {
    return {
      control: null,
      matchedBy: null,
      detail: `No visible ${fieldKey} control matched. Checked selectors: ${directSelectors.join(", ")}. Visible labels sample: ${summarizeVisibleLabels()}.`,
    };
  }

  function resolveControl(fieldKey, definition) {
    for (const selector of definition.directSelectors) {
      const directMatch = queryVisible(selector);

      if (directMatch) {
        return {
          control: directMatch,
          matchedBy: `direct selector ${selector}`,
          detail: `Found ${fieldKey} via ${selector}: ${describeControl(directMatch)}.`,
        };
      }
    }

    const controls = [
      ...document.querySelectorAll("input, textarea, select, button, [role='combobox']"),
    ];

    for (const control of controls) {
      if (
        (control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLElement) &&
        isVisible(control)
      ) {
        const controlLabel = [
          control.getAttribute("aria-label"),
          control.getAttribute("placeholder"),
          control.getAttribute("name"),
          control.id,
        ]
          .filter(Boolean)
          .join(" ");

        if (textMatches(controlLabel, definition.matchers)) {
          return {
            control,
            matchedBy: "visible control attributes",
            detail: `Found ${fieldKey} via control attributes: ${describeControl(control)}.`,
          };
        }
      }
    }

    const labels = [...document.querySelectorAll("label, legend")];

    for (const label of labels) {
      if (!(label instanceof HTMLElement) || !textMatches(label.innerText, definition.matchers)) {
        continue;
      }

      if (label instanceof HTMLLabelElement && label.htmlFor) {
        const labeledControl = document.getElementById(label.htmlFor);

        if (
          labeledControl instanceof HTMLInputElement ||
          labeledControl instanceof HTMLTextAreaElement ||
          labeledControl instanceof HTMLSelectElement ||
          labeledControl instanceof HTMLElement
        ) {
          return {
            control: labeledControl,
            matchedBy: `label[for="${label.htmlFor}"]`,
            detail: `Found ${fieldKey} via label for attribute: ${describeControl(
              labeledControl
            )}.`,
          };
        }
      }

      const nestedControl = findControlInContainer(label);

      if (nestedControl) {
        return {
          control: nestedControl,
          matchedBy: "nested label control",
          detail: `Found ${fieldKey} nested under a matching label: ${describeControl(
            nestedControl
          )}.`,
        };
      }

      const fieldContainer = label.closest("fieldset, form, section, div");
      const siblingControl = findControlInContainer(fieldContainer);

      if (siblingControl) {
        return {
          control: siblingControl,
          matchedBy: "matching label container",
          detail: `Found ${fieldKey} near a matching label: ${describeControl(
            siblingControl
          )}.`,
        };
      }
    }

    return buildMissingResolution(fieldKey, definition.directSelectors);
  }

  function resolveField(fieldKey) {
    const definition = FIELD_DEFINITIONS[fieldKey];

    if (!definition) {
      return {
        control: null,
        matchedBy: null,
        detail: `Unknown field definition: ${fieldKey}.`,
      };
    }

    return resolveControl(fieldKey, definition);
  }

  function resolveImageInput() {
    const selector = "input[type='file'][multiple], input[type='file']";
    const control = queryVisible(selector);

    if (control instanceof HTMLInputElement) {
      return {
        control,
        matchedBy: `direct selector ${selector}`,
        detail: `Found image input via ${selector}: ${describeControl(control)}.`,
      };
    }

    const hiddenControl = document.querySelector(selector);

    if (hiddenControl instanceof HTMLInputElement) {
      return {
        control: hiddenControl,
        matchedBy: `hidden selector ${selector}`,
        detail: `Found hidden image input via ${selector}: ${describeControl(hiddenControl)}.`,
      };
    }

    return {
      control: null,
      matchedBy: null,
      detail: `No image upload control matched ${selector}.`,
    };
  }

  function buildFieldDiagnostics() {
    return {
      title: resolveField("title"),
      description: resolveField("description"),
      price: resolveField("price"),
      brand: resolveField("brand"),
      category: resolveField("category"),
      size: resolveField("size"),
      condition: resolveField("condition"),
      color: resolveField("color"),
      material: resolveField("material"),
      images: resolveImageInput(),
    };
  }

  function serializeFieldDiagnostics(fieldDiagnostics) {
    return Object.fromEntries(
      Object.entries(fieldDiagnostics).map(([fieldKey, resolution]) => [
        fieldKey,
        {
          detail: resolution.detail,
          matchedBy: resolution.matchedBy,
        },
      ])
    );
  }

  function getPageState() {
    const fieldDiagnostics = buildFieldDiagnostics();
    const serializableDiagnostics = serializeFieldDiagnostics(fieldDiagnostics);

    if (!window.location.hostname.includes("vinted.")) {
      return {
        supported: false,
        reason: "This is not a Vinted page.",
        fieldDiagnostics: serializableDiagnostics,
        debugLog: [`Host ${window.location.hostname} is outside the Vinted scope.`],
      };
    }

    if (!/\/items\/new\b/i.test(window.location.pathname)) {
      return {
        supported: false,
        reason: "Only the create-listing page is supported in this MVP.",
        fieldDiagnostics: serializableDiagnostics,
        debugLog: [`Path ${window.location.pathname} is outside the supported create-listing scope.`],
      };
    }

    const missingRequiredFields = ["title", "description", "images"].filter(
      (fieldKey) => !fieldDiagnostics[fieldKey].control
    );

    if (missingRequiredFields.length > 0) {
      return {
        supported: false,
        reason: `Listing form controls are not ready yet: missing ${missingRequiredFields.join(", ")}.`,
        fieldDiagnostics: serializableDiagnostics,
        debugLog: [
          `Supported host and path detected: ${window.location.hostname}${window.location.pathname}.`,
          `Missing required controls: ${missingRequiredFields.join(", ")}.`,
        ],
      };
    }

    return {
      supported: true,
      reason: "Supported create-listing page detected.",
      fieldDiagnostics: serializableDiagnostics,
      debugLog: [
        `Supported host and path detected: ${window.location.hostname}${window.location.pathname}.`,
        "Required controls are available.",
      ],
    };
  }

  async function waitForSupportedPage(timeoutMs = 8000) {
    const startedAt = Date.now();
    let lastState = getPageState();

    while (Date.now() - startedAt < timeoutMs) {
      if (lastState.supported) {
        return {
          ...lastState,
          debugLog: [
            ...lastState.debugLog,
            `Page became supported after ${Date.now() - startedAt}ms.`,
          ],
        };
      }

      await wait(250);
      lastState = getPageState();
    }

    return {
      ...lastState,
      debugLog: [
        ...lastState.debugLog,
        `Timed out after ${timeoutMs}ms while waiting for supported controls.`,
      ],
    };
  }

  function setControlValue(control, value) {
    const nextValue = String(value);

    control.focus();

    if (control instanceof HTMLTextAreaElement) {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      );

      descriptor?.set?.call(control, nextValue);
    } else if (control instanceof HTMLInputElement) {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      );

      descriptor?.set?.call(control, nextValue);
    }

    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.blur();
  }

  function dispatchKeyboardSequence(control, key) {
    control.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    control.dispatchEvent(new KeyboardEvent("keypress", { key, bubbles: true }));
    control.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  }

  function dispatchInputSequence(control, data, inputType) {
    try {
      control.dispatchEvent(
        new InputEvent("beforeinput", {
          data,
          inputType,
          bubbles: true,
          cancelable: true,
        })
      );
    } catch {
      // Older environments may not support constructing InputEvent fully.
    }

    try {
      control.dispatchEvent(
        new InputEvent("input", {
          data,
          inputType,
          bubbles: true,
        })
      );
    } catch {
      control.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function clearControlLikeUser(control) {
    control.focus();

    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    ) {
      const currentValue = readControlValue(control);

      if (typeof control.select === "function") {
        control.select();
      }

      control.setRangeText("", 0, currentValue.length, "end");
      dispatchInputSequence(control, null, "deleteContentBackward");
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  async function typeControlLikeUser(control, value, options) {
    const nextValue = String(value ?? "");

    clearControlLikeUser(control);
    await wait(40);
    control.focus();

    for (const character of nextValue) {
      dispatchKeyboardSequence(control, character);

      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement
      ) {
        const start = control.selectionStart ?? readControlValue(control).length;
        const end = control.selectionEnd ?? start;
        control.setRangeText(character, start, end, "end");
      } else {
        setControlValue(control, `${readControlValue(control)}${character}`);
      }

      dispatchInputSequence(control, character, "insertText");
      await wait(30);
    }

    control.dispatchEvent(new Event("change", { bubbles: true }));

    if (options?.keepFocus !== true) {
      control.blur();
    }
  }

  function readControlValue(control) {
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    ) {
      return control.value ?? "";
    }

    if (control instanceof HTMLElement) {
      return control.innerText || control.textContent || "";
    }

    return "";
  }

  function normalizeNumericText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[^\d,.-]/g, "")
      .trim();
  }

  function buildPriceCandidates(amount) {
    const numericValue = Number(amount);

    if (Number.isNaN(numericValue)) {
      return [];
    }

    return [...new Set([
      Number.isInteger(numericValue) ? numericValue.toFixed(0) : String(numericValue),
      numericValue.toFixed(2),
      numericValue.toFixed(2).replace(".", ","),
      String(Math.round(numericValue * 100)),
    ])];
  }

  function formatPriceForUi(amount) {
    return buildPriceCandidates(amount)[0] ?? "";
  }

  async function setPriceValue(control, amount) {
    const numericValue = Number(amount);

    if (Number.isNaN(numericValue)) {
      return {
        ok: false,
        detail: `Price amount "${amount}" is not numeric.`,
      };
    }

    const candidates = buildPriceCandidates(numericValue);
    let lastVisibleValue = "";

    for (const candidate of candidates) {
      await typeControlLikeUser(control, candidate);
      await wait(260);

      lastVisibleValue = readControlValue(control);
      const normalizedVisibleValue = normalizeText(lastVisibleValue);

      if (normalizedVisibleValue.includes("nan")) {
        continue;
      }

      const normalizedNumericValue = normalizeNumericText(lastVisibleValue);

      if (!normalizedNumericValue) {
        continue;
      }

      const parsedValue = Number(normalizedNumericValue.replace(",", "."));

      if (!Number.isNaN(parsedValue) && Math.abs(parsedValue - numericValue) < 0.01) {
        return {
          ok: true,
          detail: `Filled price using "${candidate}". Visible value is "${lastVisibleValue}".`,
        };
      }
    }

    return {
      ok: false,
      detail: `Price control rejected ${candidates.join(", ")}. Last visible value was "${lastVisibleValue || "empty"}".`,
    };
  }

  function buildCategorySelectionPlan(value) {
    const normalizedValue = normalizeText(value);
    const exactPlan = PT_CATEGORY_SELECTION_PLANS[normalizedValue];

    if (exactPlan) {
      return exactPlan;
    }

    const queryCandidates = buildChoiceCandidates("category", value);

    return {
      queryCandidates,
      requiredBreadcrumbTerms: [],
      preferredBreadcrumbTerms: [],
      preferredLeafTerms: queryCandidates,
    };
  }

  function normalizeCategoryLines(value) {
    return String(value ?? "")
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function summarizeCategoryOption(option) {
    return option.breadcrumb
      ? `${option.leaf} -> ${option.breadcrumb}`
      : option.leaf;
  }

  function parseCategoryOption(element) {
    const lines = normalizeCategoryLines(element.innerText || element.textContent || "");

    if (lines.length === 0) {
      return null;
    }

    return {
      element,
      leaf: lines[0],
      breadcrumb: lines.slice(1).join(" > "),
    };
  }

  function findVisibleCategoryOptions() {
    const roleCandidates = [
      ...document.querySelectorAll("[role='option'], [role='radio'], li"),
    ]
      .filter((candidate) => candidate instanceof HTMLElement && isVisible(candidate))
      .map((candidate) => parseCategoryOption(candidate))
      .filter((candidate) => candidate !== null);

    if (roleCandidates.length > 0) {
      return roleCandidates;
    }

    return [...document.querySelectorAll("button, div")]
      .filter((candidate) => candidate instanceof HTMLElement && isVisible(candidate))
      .map((candidate) => parseCategoryOption(candidate))
      .filter(
        (candidate) =>
          candidate !== null &&
          (candidate.breadcrumb.includes(" > ") || candidate.breadcrumb.length > 0)
      );
  }

  function scoreCategoryOption(option, plan, queryCandidate) {
    const normalizedLeaf = normalizeText(option.leaf);
    const normalizedBreadcrumb = normalizeText(option.breadcrumb);
    const normalizedQuery = normalizeText(queryCandidate);
    const requiredTerms = plan.requiredBreadcrumbTerms.map((term) => normalizeText(term));

    if (
      requiredTerms.length > 0 &&
      requiredTerms.some((term) => !normalizedBreadcrumb.includes(term))
    ) {
      return Number.NEGATIVE_INFINITY;
    }

    let score = 0;

    if (normalizedLeaf === normalizedQuery) {
      score += 12;
    } else if (normalizedLeaf.includes(normalizedQuery)) {
      score += 8;
    }

    for (const preferredLeafTerm of plan.preferredLeafTerms) {
      const normalizedPreferredLeafTerm = normalizeText(preferredLeafTerm);

      if (normalizedLeaf === normalizedPreferredLeafTerm) {
        score += 10;
      } else if (normalizedLeaf.includes(normalizedPreferredLeafTerm)) {
        score += 5;
      }
    }

    for (const preferredBreadcrumbTerm of plan.preferredBreadcrumbTerms) {
      if (normalizedBreadcrumb.includes(normalizeText(preferredBreadcrumbTerm))) {
        score += 4;
      }
    }

    return score;
  }

  function chooseBestCategoryOption(options, plan, queryCandidate) {
    return options
      .map((option) => ({
        option,
        score: scoreCategoryOption(option, plan, queryCandidate),
      }))
      .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.option ?? null;
  }

  function findCategorySearchInput(control) {
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      return control;
    }

    const visibleInputs = [
      ...document.querySelectorAll(
        "input:not([type='hidden']):not([type='file']), textarea"
      ),
    ].filter((candidate) => candidate instanceof HTMLElement && isVisible(candidate));

    return (
      visibleInputs.find((candidate) => {
        const attributes = [
          candidate.getAttribute("placeholder"),
          candidate.getAttribute("aria-label"),
          candidate.getAttribute("name"),
          candidate.getAttribute("id"),
        ]
          .filter(Boolean)
          .join(" ");

        return textMatches(attributes, FIELD_DEFINITIONS.category.matchers);
      }) ?? null
    );
  }

  async function selectCategoryValue(control, value) {
    const plan = buildCategorySelectionPlan(value);
    const searchControl = findCategorySearchInput(control);

    if (!searchControl) {
      return {
        ok: false,
        detail: "Could not find the category search input after opening the dropdown.",
      };
    }

    control.click();
    await wait(200);

    let lastObservedOptions = [];

    for (const queryCandidate of plan.queryCandidates) {
      await typeControlLikeUser(searchControl, queryCandidate, {
        keepFocus: true,
      });
      await wait(450);

      const options = findVisibleCategoryOptions();
      lastObservedOptions = options;
      const bestOption = chooseBestCategoryOption(options, plan, queryCandidate);

      if (!bestOption) {
        continue;
      }

      bestOption.element.click();
      await wait(220);

      return {
        ok: true,
        detail: `Typed "${queryCandidate}" and selected "${bestOption.leaf}" with path "${bestOption.breadcrumb}".`,
      };
    }

    return {
      ok: false,
      detail: `No PT category option matched ${plan.queryCandidates.join(", ")}. Visible options: ${lastObservedOptions
        .slice(0, 5)
        .map(summarizeCategoryOption)
        .join(" | ") || "none"}.`,
    };
  }

  function buildChoiceCandidates(fieldKey, value) {
    const rawValue = String(value ?? "").trim();

    if (!rawValue) {
      return [];
    }

    const candidates = [rawValue];
    const marketCode = getMarketCode();

    if (marketCode === "pt" && PT_CHOICE_CANDIDATES[fieldKey]) {
      const normalizedValue = normalizeText(rawValue);
      const mapping = PT_CHOICE_CANDIDATES[fieldKey];

      if (mapping.exact[normalizedValue]) {
        candidates.push(...mapping.exact[normalizedValue]);
      }

      for (const rule of mapping.keywordRules) {
        if (rule.keywords.some((keyword) => normalizedValue.includes(normalizeText(keyword)))) {
          candidates.push(...rule.candidates);
        }
      }
    }

    return [...new Set(candidates.map((candidate) => candidate.trim()).filter(Boolean))];
  }

  function requiresVisibleOptionMatch(fieldKey) {
    return fieldKey === "category" || fieldKey === "condition";
  }

  function findOptionCandidate(value) {
    const normalizedValue = normalizeText(value);
    const candidates = [...document.querySelectorAll("[role='option'], li, button, div")]
      .filter((candidate) => candidate instanceof HTMLElement && isVisible(candidate));

    const exactMatch = candidates.find((candidate) => {
      return normalizeText(candidate.innerText || candidate.textContent) === normalizedValue;
    });

    if (exactMatch instanceof HTMLElement) {
      return exactMatch;
    }

    const partialMatch = candidates.find((candidate) => {
      return normalizeText(candidate.innerText || candidate.textContent).includes(
        normalizedValue
      );
    });

    return partialMatch instanceof HTMLElement ? partialMatch : null;
  }

  async function selectChoiceValue(fieldKey, control, value) {
    if (fieldKey === "category" && getMarketCode() === "pt") {
      return selectCategoryValue(control, value);
    }

    const candidates = buildChoiceCandidates(fieldKey, value);

    if (candidates.length === 0) {
      return {
        ok: false,
        detail: "No candidate value was available for this choice field.",
      };
    }

    if (control instanceof HTMLSelectElement) {
      const option = candidates.flatMap((choiceCandidate) =>
        [...control.options].filter((candidate) =>
          textMatches(candidate.textContent, [choiceCandidate])
        )
      )[0];

      if (!option) {
        return {
          ok: false,
          detail: `No select option matched any of: ${candidates.join(", ")}.`,
        };
      }

      control.value = option.value;
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        ok: true,
        detail: `Selected option "${option.textContent?.trim() || value}".`,
      };
    }

    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      for (const choiceCandidate of candidates) {
        await typeControlLikeUser(control, choiceCandidate);
        await wait(350);

        const option = findOptionCandidate(choiceCandidate);

        if (option) {
          option.click();
          await wait(150);

          return {
            ok: true,
            detail: `Typed "${choiceCandidate}" and selected visible option "${option.innerText || option.textContent || choiceCandidate}".`,
          };
        }
      }

      if (requiresVisibleOptionMatch(fieldKey)) {
        return {
          ok: false,
          detail: `Typed ${candidates.join(", ")}, but no visible option matched on the ${getMarketCode().toUpperCase()} page.`,
        };
      }

      return {
        ok: true,
        detail: `Typed value "${candidates[0]}" into a free-text or combobox control with no visible option match.`,
      };
    }

    if (control instanceof HTMLElement) {
      control.click();
      await wait(250);

      for (const choiceCandidate of candidates) {
        const option = findOptionCandidate(choiceCandidate);

        if (!option) {
          continue;
        }

        option.click();
        await wait(150);

        return {
          ok: true,
          detail: `Opened chooser and selected "${option.innerText || option.textContent || choiceCandidate}".`,
        };
      }

      return {
        ok: false,
        detail: `Opened chooser but no visible option matched any of: ${candidates.join(", ")}.`,
      };
    }

    return {
      ok: false,
      detail: "Unsupported control type for choice selection.",
    };
  }

  globalThis.VintedAutoFormAdapter = {
    resolveField,
    resolveImageInput,
    getPageState,
    waitForSupportedPage,
    setControlValue,
    setPriceValue,
    formatPriceForUi,
    selectChoiceValue,
  };
})();
