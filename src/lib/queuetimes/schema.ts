import { z } from "zod";

/**
 * Queue-Times groups rides into "lands", but parks with no themed areas put
 * them straight in a top-level `rides` array — both shapes have to be read.
 * Lenient like the Wartezeiten schemas: a ride we cannot parse is dropped
 * rather than failing the whole park.
 */
const rideSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  is_open: z.boolean().catch(false),
  wait_time: z.coerce.number().catch(0),
  last_updated: z.string().nullish(),
});

export const queueTimesSchema = z.object({
  lands: z
    .array(z.object({ rides: z.array(rideSchema).catch([]) }))
    .catch([]),
  rides: z.array(rideSchema).catch([]),
});

export type QueueTimesRide = z.infer<typeof rideSchema>;
