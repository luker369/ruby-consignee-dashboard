import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-950">
            Ruby Baby Dashboard
          </h1>
          <p className="text-sm text-zinc-600">
            Signed in as{" "}
            <span className="font-medium text-zinc-950">
              {session.user.email}
            </span>
          </p>
        </div>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
