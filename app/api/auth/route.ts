import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  });
}

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
