import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";

const healthInputSchema = z
  .object({
    echo: z.string().trim().max(120).optional(),
  })
  .optional();

export const healthRouter = createTRPCRouter({
  check: publicProcedure.input(healthInputSchema).query(({ input }) => {
    return {
      status: "ok",
      service: "researcher-api",
      timestamp: new Date().toISOString(),
      echo: input?.echo ?? null,
    };
  }),
});
