export const DELETED_ACCOUNT_NAMES = new Set(["test"]);

export const isDeletedAccountName = (value: string | null | undefined) =>
  DELETED_ACCOUNT_NAMES.has(value?.trim().toLowerCase() ?? "");
