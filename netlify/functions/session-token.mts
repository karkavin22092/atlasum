const SESSION_COOKIE = "atlasum_session";

const readCookie = (header: string, name: string) => {
  const prefix = `${name}=`;
  const value = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
};

export const getSessionToken = (request: Request) => {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^Bearer\s+/iu, "").trim();
  if (bearer) return bearer;

  return readCookie(request.headers.get("cookie") ?? "", SESSION_COOKIE);
};

export const createSessionCookie = (token: string) =>
  `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;

export const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
