import { createInsertSchema } from "drizzle-zod";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const chaletsTable = pgTable("chalets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  capacity: integer("capacity").notNull(),
  weekdayPrice: numeric("weekday_price", { precision: 10, scale: 2 }).notNull(),
  weekendPrice: numeric("weekend_price", { precision: 10, scale: 2 }).notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  mainImageUrl: text("main_image_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chaletImagesTable = pgTable("chalet_images", {
  id: serial("id").primaryKey(),
  chaletId: integer("chalet_id").notNull().references(() => chaletsTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertChaletSchema = createInsertSchema(chaletsTable).omit({ id: true, createdAt: true });
export const insertChaletImageSchema = createInsertSchema(chaletImagesTable).omit({ id: true });
export type InsertChalet = z.infer<typeof insertChaletSchema>;
export type Chalet = typeof chaletsTable.$inferSelect;
export type ChaletImage = typeof chaletImagesTable.$inferSelect;