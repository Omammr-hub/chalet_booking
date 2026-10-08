import { and, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db, bookingsTable, chaletImagesTable, chaletsTable, type Chalet } from "@workspace/db";

export type ChaletWithImages = Chalet & { extraImageUrls: string[] };

export async function findChalet(id: number): Promise<ChaletWithImages | null> {
  const [chalet] = await db.select().from(chaletsTable).where(eq(chaletsTable.id, id)).limit(1);
  if (!chalet) return null;
  const images = await db
    .select({ imageUrl: chaletImagesTable.imageUrl })
    .from(chaletImagesTable)
    .where(eq(chaletImagesTable.chaletId, id))
    .orderBy(chaletImagesTable.sortOrder, chaletImagesTable.id);
  return { ...chalet, extraImageUrls: images.map((image) => image.imageUrl) };
}

export async function listChaletsWithImages(): Promise<ChaletWithImages[]> {
  const chalets = await db.select().from(chaletsTable).orderBy(chaletsTable.id);
  const images = await db
    .select()
    .from(chaletImagesTable)
    .orderBy(chaletImagesTable.sortOrder, chaletImagesTable.id);
  const byChalet = new Map<number, string[]>();
  for (const image of images) {
    const current = byChalet.get(image.chaletId) ?? [];
    current.push(image.imageUrl);
    byChalet.set(image.chaletId, current);
  }
  return chalets.map((chalet) => ({ ...chalet, extraImageUrls: byChalet.get(chalet.id) ?? [] }));
}

export function publicChalet(chalet: ChaletWithImages) {
  return {
    ...chalet,
    weekdayPrice: Number(chalet.weekdayPrice),
    weekendPrice: Number(chalet.weekendPrice),
    latitude: Number(chalet.latitude),
    longitude: Number(chalet.longitude),
  };
}

export async function blockedDatesForChalet(chaletId: number): Promise<string[]> {
  const bookings = await db
    .select({ checkInDate: bookingsTable.checkInDate, checkOutDate: bookingsTable.checkOutDate })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.chaletId, chaletId), inArray(bookingsTable.status, ["Accepted", "Completed"])));

  const dates = new Set<string>();
  for (const booking of bookings) {
    const cursor = new Date(`${booking.checkInDate}T00:00:00Z`);
    const end = new Date(`${booking.checkOutDate}T00:00:00Z`);
    while (cursor < end) {
      dates.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return [...dates].sort();
}

export async function hasBookingOverlap(
  chaletId: number,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: number,
): Promise<boolean> {
  const conditions = [
    eq(bookingsTable.chaletId, chaletId),
    inArray(bookingsTable.status, ["Accepted", "Completed"]),
    lt(bookingsTable.checkIn, checkOut),
    gt(bookingsTable.checkOut, checkIn),
  ];
  if (excludeBookingId) conditions.push(ne(bookingsTable.id, excludeBookingId));
  const matches = await db.select({ id: bookingsTable.id }).from(bookingsTable).where(and(...conditions)).limit(20);
  return matches.length > 0;
}

export function calculateTotalPrice(
  checkIn: Date,
  checkOut: Date,
  weekdayPrice: number,
  weekendPrice: number,
): number {
  const start = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()));
  const end = new Date(Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate()));
  let total = 0;
  for (const cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.getUTCDay();
    total += day === 0 || day === 6 ? weekendPrice : weekdayPrice;
  }
  return Math.round(total * 100) / 100;
}

export async function adminBookingRows() {
  const rows = await db
    .select({ booking: bookingsTable, chaletTitle: chaletsTable.title })
    .from(bookingsTable)
    .innerJoin(chaletsTable, eq(bookingsTable.chaletId, chaletsTable.id))
    .orderBy(desc(bookingsTable.createdAt));
  return rows.map(({ booking, chaletTitle }) => ({
    ...booking,
    chaletTitle,
    totalPrice: Number(booking.totalPrice),
  }));
}