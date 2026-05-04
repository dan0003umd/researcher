import { redirect } from "next/navigation";
import { VerifyEmailClient } from "@/app/onboarding/verify-email/VerifyEmailClient";
import { createClient } from "@/lib/supabase/server";

type VerifyEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const tokenParam = resolvedSearchParams.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (token) {
    return <VerifyEmailClient defaultEmail="" isAuthenticated={false} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/onboarding/verify-email");
  }

  return <VerifyEmailClient defaultEmail={user.email ?? ""} isAuthenticated />;
}
