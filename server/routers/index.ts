import { createTRPCRouter } from "@/server/trpc";
import { authRouter } from "@/server/routers/auth";
import { dashboardRouter } from "@/server/routers/dashboard";
import { discoverRouter } from "@/server/routers/discover";
import { facultyRouter } from "@/server/routers/faculty";
import { healthRouter } from "@/server/routers/health";
import { profileRouter } from "@/server/routers/profile";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  dashboard: dashboardRouter,
  discover: discoverRouter,
  faculty: facultyRouter,
  health: healthRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
