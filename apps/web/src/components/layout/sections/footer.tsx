import { Logo } from "@/components/shared/elements/logo";

/** Minimal black footer with the wordmark and a one-line note. */
export function Footer() {
  return (
    <footer className="is-dark mt-auto bg-ink text-white">
      <div className="mx-auto flex max-w-site flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="text-sm text-warm-400">Created by <a href="https://github.com/ofelipechan" target="_blank">Felipe Chan</a>.</p>
      </div>
    </footer>
  );
}
