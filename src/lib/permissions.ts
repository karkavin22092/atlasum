export const ADMIN_USERNAME = "lonexnesss";

export const isAdminUser = (user: { name: string } | null | undefined) =>
  user?.name.trim().toLowerCase() === ADMIN_USERNAME;
