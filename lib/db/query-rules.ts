export function assertNoWildcardSelect(select: string, origem: string) {
  if (select.includes("*")) {
    throw new Error(`Wildcard select proibido em ${origem}.`);
  }

  return select;
}

export function onlyDefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, currentValue]) => currentValue !== undefined)
  ) as T;
}
