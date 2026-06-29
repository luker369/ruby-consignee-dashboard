"use client";

import Image from "next/image";
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
  const [showPassword, setShowPassword] = useState(false);

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
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", "/dashboard");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
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
      <div className="flex items-center gap-3">
        <Image
          src="/assets/ruby-baby-vintage-logo.jpeg"
          alt="Ruby Baby Vintage"
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-contain"
          preload
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950">
            Ruby Baby Dashboard
          </h1>
          <p className="text-sm text-zinc-600">
            Enter your email and we will send you a sign-in link.
          </p>
        </div>
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
            <div className="flex rounded-md border border-zinc-300 focus-within:border-zinc-950">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-base text-zinc-950 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="shrink-0 rounded-r-md border-l border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
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
