import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileOnboardingWizard } from "@/app/onboarding/profile/ProfileOnboardingWizard";
import { buildMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = buildMetadata({
  title: "Set Up Your Profile",
  description: "Complete your student profile to start matching with UMD research labs.",
  path: "/onboarding/profile",
});

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
