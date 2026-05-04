import { redirect } from "next/navigation";
import { ProfileOnboardingWizard } from "@/app/onboarding/profile/ProfileOnboardingWizard";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/onboarding/profile");
  }

  return <ProfileOnboardingWizard />;
}
