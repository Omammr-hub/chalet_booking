import { count, eq } from "drizzle-orm";
import { db, adminsTable, chaletImagesTable, chaletsTable, bookingsTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

const demoChalets = [
  {
    title: "Juniper House",
    slug: "juniper-house",
    description: "A light-filled timber retreat with a private cedar deck, a wood-burning stove, and long views toward the valley.",
    capacity: 4,
    weekdayPrice: "180.00",
    weekendPrice: "220.00",
    latitude: "34.045100",
    longitude: "35.857400",
    mainImageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  {
    title: "Moss & Stone",
    slug: "moss-and-stone",
    description: "An intimate stone cabin tucked into the pines, made for slow mornings, reading by the fire, and quiet evenings outside.",
    capacity: 2,
    weekdayPrice: "145.00",
    weekendPrice: "175.00",
    latitude: "34.021200",
    longitude: "35.828100",
    mainImageUrl: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  {
    title: "The Lookout",
    slug: "the-lookout",
    description: "A generous hillside chalet with a sunken lounge, panoramic windows, and a terrace that catches the last light.",
    capacity: 6,
    weekdayPrice: "260.00",
    weekendPrice: "310.00",
    latitude: "34.061500",
    longitude: "35.889600",
    mainImageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
    ],
  },
];

export async function ensureSeedData(): Promise<void> {
  const [{ value: adminCount }] = await db.select({ value: count() }).from(adminsTable);
  if (Number(adminCount) === 0) {
    await db.insert(adminsTable).values({
      name: "Cedar & Stone Admin",
      email: "admin@cedarstone.test",
      passwordHash: hashPassword("welcome123"),
    });
    logger.info("Seeded demo administrator");
  }

  const [{ value: chaletCount }] = await db.select({ value: count() }).from(chaletsTable);
  if (Number(chaletCount) > 0) return;

  for (const chalet of demoChalets) {
    const [created] = await db
      .insert(chaletsTable)
      .values({
        title: chalet.title,
        slug: chalet.slug,
        description: chalet.description,
        capacity: chalet.capacity,
        weekdayPrice: chalet.weekdayPrice,
        weekendPrice: chalet.weekendPrice,
        latitude: chalet.latitude,
        longitude: chalet.longitude,
        mainImageUrl: chalet.mainImageUrl,
      })
      .returning();
    await db.insert(chaletImagesTable).values(
      chalet.images.map((imageUrl, index) => ({ chaletId: created.id, imageUrl, sortOrder: index })),
    );
  }
  logger.info("Seeded demo chalets");
}