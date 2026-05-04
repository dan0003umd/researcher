import { redirect } from "next/navigation";
import { FacultyProfileOnboardingWizard } from "@/app/onboarding/faculty-profile/FacultyProfileOnboardingWizard";
import { createClient } from "@/lib/supabase/server";

export default async function FacultyProfileOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/onboarding/faculty-profile");
  }

  return <FacultyProfileOnboardingWizard />;
}

