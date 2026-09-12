import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

/** Builds an unsigned JWT-shaped token (middleware only decodes `exp`, never verifies signature). */
function fakeToken(expiresInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ userId: "u1", exp })).toString("base64url");
  return `${header}.${payload}.signature`;
}

function requestWithCookie(path: string, cookie?: string) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (cookie) {
    req.cookies.set("auth_token", cookie);
  }
  return req;
}

describe("auth middleware", () => {
  /** Spec AC (UI-01): no cookie on a protected page redirects to /login. */
  it("redirects to /login when no auth cookie is present", () => {
    const res = middleware(requestWithCookie("/quizzes/new"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  /** Edge case (UI-01): an expired cookie redirects to /login. */
  it("redirects to /login when the auth cookie is expired", () => {
    const expired = fakeToken(-10);
    const res = middleware(requestWithCookie("/quizzes/new", expired));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  /** Spec AC (UI-01): a valid, unexpired cookie is allowed through. */
  it("allows the request through with a valid cookie", () => {
    const valid = fakeToken(24 * 60 * 60);
    const res = middleware(requestWithCookie("/quizzes/new", valid));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
