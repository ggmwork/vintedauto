const defaultItemNamePattern = /^Item (\d+)$/;

export function isDefaultStockItemName(value: string) {
  return defaultItemNamePattern.test(value.trim());
}

export function createStockItemName(
  value: string | null | undefined,
  existingNames: string[]
) {
  if (value?.trim()) {
    return value.trim();
  }

  const highestDefaultNumber = existingNames.reduce((highest, name) => {
    const match = defaultItemNamePattern.exec(name.trim());
    const itemNumber = match ? Number(match[1]) : 0;

    return Number.isFinite(itemNumber) && itemNumber > highest
      ? itemNumber
      : highest;
  }, 0);
  const nextNumber = Math.max(existingNames.length, highestDefaultNumber) + 1;

  return `Item ${nextNumber}`;
}
