import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, bookingsTable, chaletsTable } from "@workspace/db";
import { CreateBookingBody, CreateBookingResponse } from "@workspace/api-zod";
import { calculateTotalPrice, findChalet, hasBookingOverlap } from "../lib/domain";

const router: IRouter = Router();

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
    res.status(400).json({ error: "Check-out must be after check-in" });
    return;
  }
  const chalet = await findChalet(data.chaletId);
  if (!chalet) {
    res.status(404).json({ error: "Chalet not found" });
    return;
  }
  if (await hasBookingOverlap(data.chaletId, checkIn, checkOut)) {
    res.status(409).json({ error: "Those dates are no longer available" });
    return;
  }
  const checkInDate = checkIn.toISOString().slice(0, 10);
  const checkOutDate = checkOut.toISOString().slice(0, 10);
  if (checkInDate === checkOutDate) {
    res.status(400).json({ error: "A stay must include at least one night" });
    return;
  }
  const [created] = await db
    .insert(bookingsTable)
    .values({
      chaletId: data.chaletId,
      guestName: data.guestName,
      phone: data.phone,
      checkIn,
      checkOut,
      checkInDate,
      checkOutDate,
      totalPrice: calculateTotalPrice(
        checkIn,
        checkOut,
        Number(chalet.weekdayPrice),
        Number(chalet.weekendPrice),
      ).toFixed(2),
      status: "Pending",
    })
    .returning();
  res.status(201).json(
    CreateBookingResponse.parse({
      ...created,
      chaletTitle: chalet.title,
      totalPrice: Number(created.totalPrice),
    }),
  );
});

export default router;