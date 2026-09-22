import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authClient, ApiError } from "@/lib/api-client";
import { markAuthenticated } from "@/lib/auth";
import { Button } from "@/components/forms/controls/button";
import { Input } from "@/components/forms/controls/input";
import { Alert } from "@/components/shared/elements/alert";
import { Eyebrow } from "@/components/shared/elements/eyebrow";
import { Logo } from "@/components/shared/elements/logo";
import { ParticleBackdrop } from "@/components/shared/elements/particle-backdrop";

/** Login form (UI-01/UI-02): valid creds redirect to quiz creation; invalid creds show an inline error and never redirect. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authClient.login({ email, password });
      markAuthenticated();
      navigate("/quizzes/new");
    } catch (err) {
      const message =
        err instanceof ApiError ? "Invalid credentials" : "Could not sign in. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="is-dark relative isolate flex min-h-screen flex-col overflow-hidden bg-forest-800 text-white">
      <ParticleBackdrop />

      <header className="flex h-[68px] items-center px-5 sm:px-8">
        <Logo />
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-fluid-xl">
        <Eyebrow className="mb-4">Quiz Agent</Eyebrow>
        <h1 className="text-display text-balance">
          Turn any Markdown into a quiz.
        </h1>
        <p className="mt-3 font-serif text-h3 text-white/40">Sign in to start.</p>

        <form onSubmit={handleSubmit} className="mt-fluid-md flex flex-col gap-2" noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-forest-300">Use the seeded admin account.</p>
            <Button type="submit" variant="white" size="lg" loading={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </section>

      <footer className="px-5 py-6 text-center text-sm text-forest-400 sm:px-8 sm:text-left">
        Quizzes generated from Markdown. Created by <a href="https://github.com/ofelipechan" target="_blank">Felipe Chan</a>.
      </footer>
    </main>
  );
}
