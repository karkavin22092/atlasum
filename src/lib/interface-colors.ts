export const INTERFACE_COLORS = [
  { key: "ocean", label: "Синий" },
  { key: "pink", label: "Розовый" },
  { key: "violet", label: "Фиолетовый" },
  { key: "mint", label: "Мятный" },
  { key: "amber", label: "Янтарный" },
  { key: "coral", label: "Коралловый" },
] as const;

export type InterfaceColor = (typeof INTERFACE_COLORS)[number]["key"];

export const DEFAULT_INTERFACE_COLOR: InterfaceColor = "ocean";

export const isInterfaceColor = (value: unknown): value is InterfaceColor =>
  INTERFACE_COLORS.some((color) => color.key === value);
