import { TRPCError, initTRPC } from "@trpc/server";
import type { User } from "@supabase/supabase-js";
import { createTRPCServerClient } from "@/lib/supabase/trpc-server";

type TRPCContextOptions = {
  req: Request;
  resHeaders: Headers;
};

export async function createTRPCContext({ req, resHeaders }: TRPCContextOptions) {
  const supabase = createTRPCServerClient({ req, resHeaders });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    req,
    resHeaders,
    supabase,
    user,
  };
}

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user as User,
    },
  });
});
