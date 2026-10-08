import { createInsertSchema } from "drizzle-zod";
import { date, integer, numeric, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { chaletsTable } from "./chalets";

export const bookingStatusEnum = pgEnum("booking_status", ["Pending", "Accepted", "Completed", "Cancelled"]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  chaletId: integer("chalet_id").notNull().references(() => chaletsTable.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  checkIn: timestamp("check_in", { withTimezone: true }).notNull(),
  checkOut: timestamp("check_out", { withTimezone: true }).notNull(),
  checkInDate: date("check_in_date", { mode: "string" }).notNull(),
  checkOutDate: date("check_out_date", { mode: "string" }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;