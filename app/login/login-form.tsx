"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/src/lib/supabase/browser";

type FormState = {
  error?: string;
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setFormState({});

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setFormState({ error: error.message });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSendMagicLink(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setIsSendingLink(true);
    setFormState({});

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        shouldCreateUser: false,
      },
    });

    setIsSendingLink(false);

    if (error) {
      setFormState({ error: error.message });
      return;
    }

    setFormState({
      message: "Check your email for a sign-in link.",
    });
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-950">
          Ruby Baby Dashboard
        </h1>
        <p className="text-sm text-zinc-600">
          Enter your email and we will send you a sign-in link.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-950"
        />
      </label>

      {formState.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formState.error}
        </p>
      ) : null}

      {formState.message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {formState.message}
        </p>
      ) : null}

      <form onSubmit={handleSendMagicLink}>
        <button
          type="submit"
          disabled={!email || isSubmitting || isSendingLink}
          className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSendingLink ? "Sending link..." : "Send sign-in link"}
        </button>
      </form>

      <div className="border-t border-zinc-200 pt-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Optional password sign-in
        </p>
        <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-950"
            />
          </label>

          <button
            type="submit"
            disabled={!email || !password || isSubmitting || isSendingLink}
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {isSubmitting ? "Signing in..." : "Sign in with password"}
          </button>
        </form>
      </div>
    </div>
  );
}
