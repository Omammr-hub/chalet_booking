import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, adminsTable, type Admin } from "@workspace/db";

const COOKIE_NAME = "cedar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function signSession(id: number, issuedAt: number): string {
  const secret = process.env.SESSION_SECRET ?? "development-only-session-secret";
  return createHmac("sha256", secret).update(`${id}.${issuedAt}`).digest("hex");
}

function createSession(id: number): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  return `${id}.${issuedAt}.${signSession(id, issuedAt)}`;
}

function getSessionId(value: string | undefined): number | null {
  if (!value) return null;
  const [rawId, rawIssuedAt, signature] = value.split(".");
  const id = Number(rawId);
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isInteger(id) || !Number.isInteger(issuedAt) || !signature) return null;
  if (Math.floor(Date.now() / 1000) - issuedAt > SESSION_TTL_SECONDS) return null;
  const expected = signSession(id, issuedAt);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export function setAdminSession(res: Response, id: number): void {
  res.cookie(COOKIE_NAME, createSession(id), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearAdminSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { sameSite: "none", secure: true });
}

export async function getAdminFromRequest(req: Request): Promise<Admin | null> {
  const id = getSessionId(req.cookies?.[COOKIE_NAME]);
  if (!id) return null;
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, id)).limit(1);
  return admin ?? null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.locals.admin = admin;
  next();
}

export function publicAdmin(admin: Admin) {
  return { id: admin.id, name: admin.name, email: admin.email, createdAt: admin.createdAt };
}