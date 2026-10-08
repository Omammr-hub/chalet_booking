import { Router, type IRouter } from "express";
import { count, desc, eq, sql } from "drizzle-orm";
import { db, adminsTable, bookingsTable, chaletsTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  ChangeAdminPasswordBody,
  ChangeAdminPasswordParams,
  CreateAdminBody,
  CreateAdminResponse,
  GetAdminDashboardResponse,
  GetAdminSessionResponse,
  ListAdminBookingsResponse,
  ListAdminsResponse,
  UpdateBookingStatusBody,
  UpdateBookingStatusParams,
  UpdateBookingStatusResponse,
} from "@workspace/api-zod";
import {
  clearAdminSession,
  getAdminFromRequest,
  hashPassword,
  publicAdmin,
  requireAdmin,
  setAdminSession,
  verifyPassword,
} from "../lib/auth";
import { adminBookingRows, hasBookingOverlap } from "../lib/domain";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, parsed.data.email.toLowerCase())).limit(1);
  if (!admin || !verifyPassword(parsed.data.password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  setAdminSession(res, admin.id);
  res.json(AdminLoginResponse.parse(publicAdmin(admin)));
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  clearAdminSession(res);
  res.sendStatus(204);
});

router.get("/admin/session", async (req, res): Promise<void> => {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(GetAdminSessionResponse.parse(publicAdmin(admin)));
});

router.get("/admin/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  const [counts] = await db
    .select({
      revenue: sql<string>`coalesce(sum(case when ${bookingsTable.status} = 'Completed' then ${bookingsTable.totalPrice} else 0 end), 0)`,
      pendingCount: sql<number>`count(*) filter (where ${bookingsTable.status} = 'Pending')`,
      acceptedCount: sql<number>`count(*) filter (where ${bookingsTable.status} = 'Accepted')`,
      completedCount: sql<number>`count(*) filter (where ${bookingsTable.status} = 'Completed')`,
      cancelledCount: sql<number>`count(*) filter (where ${bookingsTable.status} = 'Cancelled')`,
    })
    .from(bookingsTable);
  const [{ value: chaletCount }] = await db.select({ value: count() }).from(chaletsTable);
  const recentBookings = (await adminBookingRows()).slice(0, 5);
  res.json(
    GetAdminDashboardResponse.parse({
      revenue: Number(counts?.revenue ?? 0),
      pendingCount: Number(counts?.pendingCount ?? 0),
      acceptedCount: Number(counts?.acceptedCount ?? 0),
      completedCount: Number(counts?.completedCount ?? 0),
      cancelledCount: Number(counts?.cancelledCount ?? 0),
      chaletCount: Number(chaletCount),
      recentBookings,
    }),
  );
});

router.get("/admin/bookings", requireAdmin, async (_req, res): Promise<void> => {
  res.json(ListAdminBookingsResponse.parse(await adminBookingRows()));
});

router.patch("/admin/bookings/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateBookingStatusParams.safeParse(req.params);
  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (parsed.data.status === "Accepted" && await hasBookingOverlap(existing.chaletId, existing.checkIn, existing.checkOut, existing.id)) {
    res.status(409).json({ error: "Cannot accept this booking because its dates overlap another accepted stay" });
    return;
  }
  await db.update(bookingsTable).set({ status: parsed.data.status }).where(eq(bookingsTable.id, existing.id));
  const [updated] = await db
    .select({ booking: bookingsTable, chaletTitle: chaletsTable.title })
    .from(bookingsTable)
    .innerJoin(chaletsTable, eq(bookingsTable.chaletId, chaletsTable.id))
    .where(eq(bookingsTable.id, existing.id));
  res.json(
    UpdateBookingStatusResponse.parse({
      ...updated.booking,
      chaletTitle: updated.chaletTitle,
      totalPrice: Number(updated.booking.totalPrice),
    }),
  );
});

router.get("/admin/admins", requireAdmin, async (_req, res): Promise<void> => {
  const admins = await db.select().from(adminsTable).orderBy(desc(adminsTable.createdAt));
  res.json(ListAdminsResponse.parse(admins.map(publicAdmin)));
});

router.post("/admin/admins", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(adminsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: hashPassword(parsed.data.password),
    })
    .returning();
  res.status(201).json(CreateAdminResponse.parse(publicAdmin(created)));
});

router.patch("/admin/admins/:id/password", requireAdmin, async (req, res): Promise<void> => {
  const params = ChangeAdminPasswordParams.safeParse(req.params);
  const parsed = ChangeAdminPasswordBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(adminsTable)
    .set({ passwordHash: hashPassword(parsed.data.password) })
    .where(eq(adminsTable.id, params.data.id))
    .returning({ id: adminsTable.id });
  if (!updated) {
    res.status(404).json({ error: "Administrator not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;