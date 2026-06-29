import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const origin = requestUrl.origin;
  const redirectTo = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    console.error("Supabase auth callback failed", {
      message: "Missing auth code",
      hasCode: false,
      next: redirectTo,
    });

    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase auth callback failed", {
        message: error.message,
        hasCode: true,
        next: redirectTo,
      });

      return NextResponse.redirect(`${origin}/login?error=callback_failed`);
    }
  } catch (error) {
    console.error("Supabase auth callback failed", {
      message: error instanceof Error ? error.message : "Unknown callback error",
      hasCode: true,
      next: redirectTo,
    });

    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
