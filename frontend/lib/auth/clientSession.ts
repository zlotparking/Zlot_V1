import type { AccountType } from "./accountType";

const AUTH_COOKIE_NAME = "zlot_auth";
const ROLE_COOKIE_NAME = "zlot_role";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setClientAuthCookie(isLoggedIn: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  if (!isLoggedIn) {
    document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=1; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function setClientRoleCookie(accountType: AccountType | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!accountType) {
    document.cookie = `${ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${ROLE_COOKIE_NAME}=${accountType}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
