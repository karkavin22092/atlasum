export const DELETED_ACCOUNT_NAMES = new Set(["test"]);
export const RESERVED_ACCOUNT_NAMES = new Set(["lonexnesss"]);

export const isDeletedAccountName = (value: string | null | undefined) =>
  DELETED_ACCOUNT_NAMES.has(value?.trim().toLowerCase() ?? "");

export const isReservedAccountName = (value: string | null | undefined) =>
  RESERVED_ACCOUNT_NAMES.has(value?.trim().toLowerCase() ?? "");
