import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, chaletImagesTable, chaletsTable } from "@workspace/db";
import {
  CreateChaletBody,
  CreateChaletResponse,
  DeleteChaletParams,
  GetChaletAvailabilityParams,
  GetChaletParams,
  GetChaletResponse,
  GetChaletAvailabilityResponse,
  ListChaletsResponse,
  UpdateChaletBody,
  UpdateChaletParams,
  UpdateChaletResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { blockedDatesForChalet, findChalet, listChaletsWithImages, publicChalet } from "../lib/domain";

const router: IRouter = Router();

router.get("/chalets", async (_req, res): Promise<void> => {
  const chalets = await listChaletsWithImages();
  res.json(ListChaletsResponse.parse(chalets.map(publicChalet)));
});

router.get("/chalets/:id", async (req, res): Promise<void> => {
  const params = GetChaletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const chalet = await findChalet(params.data.id);
  if (!chalet) {
    res.status(404).json({ error: "Chalet not found" });
    return;
  }
  res.json(GetChaletResponse.parse(publicChalet(chalet)));
});

router.get("/chalets/:id/availability", async (req, res): Promise<void> => {
  const params = GetChaletAvailabilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const chalet = await findChalet(params.data.id);
  if (!chalet) {
    res.status(404).json({ error: "Chalet not found" });
    return;
  }
  res.json(GetChaletAvailabilityResponse.parse({ blockedDates: await blockedDatesForChalet(params.data.id) }));
});

router.post("/chalets", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateChaletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const slug = data.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [created] = await db
    .insert(chaletsTable)
    .values({
      title: data.title,
      slug: `${slug}-${Date.now().toString(36)}`,
      description: data.description,
      capacity: data.capacity,
      weekdayPrice: data.weekdayPrice.toFixed(2),
      weekendPrice: data.weekendPrice.toFixed(2),
      latitude: data.latitude.toFixed(6),
      longitude: data.longitude.toFixed(6),
      mainImageUrl: data.mainImageUrl,
    })
    .returning();
  if (data.extraImageUrls.length > 0) {
    await db.insert(chaletImagesTable).values(
      data.extraImageUrls.map((imageUrl, index) => ({ chaletId: created.id, imageUrl, sortOrder: index })),
    );
  }
  const chalet = await findChalet(created.id);
  res.status(201).json(CreateChaletResponse.parse(publicChalet(chalet!)));
});

router.patch("/chalets/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateChaletParams.safeParse(req.params);
  const parsed = UpdateChaletBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [updated] = await db
    .update(chaletsTable)
    .set({
      title: data.title,
      description: data.description,
      capacity: data.capacity,
      weekdayPrice: data.weekdayPrice.toFixed(2),
      weekendPrice: data.weekendPrice.toFixed(2),
      latitude: data.latitude.toFixed(6),
      longitude: data.longitude.toFixed(6),
      mainImageUrl: data.mainImageUrl,
    })
    .where(eq(chaletsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Chalet not found" });
    return;
  }
  await db.delete(chaletImagesTable).where(eq(chaletImagesTable.chaletId, updated.id));
  if (data.extraImageUrls.length > 0) {
    await db.insert(chaletImagesTable).values(
      data.extraImageUrls.map((imageUrl, index) => ({ chaletId: updated.id, imageUrl, sortOrder: index })),
    );
  }
  const chalet = await findChalet(updated.id);
  res.json(UpdateChaletResponse.parse(publicChalet(chalet!)));
});

router.delete("/chalets/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteChaletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(chaletsTable).where(eq(chaletsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Chalet not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;