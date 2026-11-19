import { z } from "zod";
import * as authService from "../services/authService.js";
import { success, fail } from "../utils/apiResponse.js";

const REFRESH_COOKIE = "vl_refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     "/api/auth",
};

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export async function login(req, res) {
  const result = await authService.login({
    email:      req.body.email,
    password:   req.body.password,
    deviceInfo: req.headers["user-agent"],
    ip:         req.ip,
  });

  if (!result) return fail(res, "Invalid credentials", 401);

  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
  return success(res, { accessToken: result.accessToken, user: result.user });
}

export async function refreshToken(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return fail(res, "No refresh token", 401);

  const result = await authService.refresh(token);
  if (!result) return fail(res, "Invalid or revoked refresh token", 401);

  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
  return success(res, { accessToken: result.accessToken });
}

export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.revokeSession(token);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  return success(res, null, "Logged out");
}

export async function me(req, res) {
  const societies = await authService.getUserSocieties(req.user.id, req.user.isSuperadmin);
  return success(res, {
    ...req.user,
    societies,
    currentSocietyId: societies[0]?.id || 1,
  });
}
