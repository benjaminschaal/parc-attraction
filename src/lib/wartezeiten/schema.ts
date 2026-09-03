import { z } from "zod";
import { RIDE_STATUSES } from "@/lib/snapshot";

/**
 * Schemas are deliberately lenient: the upstream API occasionally ships new
 * statuses and returns `crowdlevel` as a bare object even though its OpenAPI
 * spec documents an array. Anything we cannot classify degrades to `closed`
 * rather than failing the whole request.
 */
export const waitingTimeSchema = z.object({
  datetime: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  code: z.string(),
  uuid: z.string(),
  waitingtime: z.coerce.number().catch(0),
  status: z.enum(RIDE_STATUSES).catch("closed"),
  // Futuroscope serves a row with no name at all. `z.string()` would reject
  // it and, with it, every other ride in the park — the server drops the row
  // instead, in `fetchWartezeitenSnapshot`.
  name: z.string().nullish().transform((v) => v ?? ""),
});

export const waitingTimesSchema = z.array(waitingTimeSchema);

export const openingTimesSchema = z
  .array(
    z.object({
      opened_today: z.boolean().catch(false),
      open_from: z.string().nullish(),
      closed_from: z.string().nullish(),
    }),
  )
  .catch([]);

const crowdLevelObject = z.object({
  crowd_level: z.coerce.number(),
  timestamp: z.string().nullish(),
});

export const crowdLevelSchema = z
  .union([crowdLevelObject, z.array(crowdLevelObject)])
  .transform((v) => (Array.isArray(v) ? (v[0] ?? null) : v))
  .nullable()
  .catch(null);
