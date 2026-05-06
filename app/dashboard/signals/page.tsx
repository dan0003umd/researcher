import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  StudentSignalsDashboard,
  type StudentSignalItem,
} from "@/app/dashboard/signals/StudentSignalsDashboard";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

async function createSignalsCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/dashboard/signals`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export default async function StudentSignalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard/signals");
  }

  const caller = await createSignalsCaller();

  let signals: Awaited<ReturnType<typeof caller.profile.getMySignals>> = [];
  try {
    signals = await caller.profile.getMySignals();
  } catch {
    redirect("/dashboard");
  }

  const normalizedSignals: StudentSignalItem[] = signals.map((signal) => ({
    ...signal,
    status:
      signal.status === "reviewed" || signal.status === "archived" || signal.status === "pending"
        ? signal.status
        : "pending",
  }));

  return <StudentSignalsDashboard signals={normalizedSignals} />;
}
