import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/api-client";
import { clearAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/helpers/cn";
import { Button } from "@/components/forms/controls/button";
import { Logo } from "@/components/shared/elements/logo";

const links = [
  { to: "/quizzes/new", label: "New quiz" },
  { to: "/quizzes", label: "History", end: true },
];

/** Sticky forest-green app header: logo, section links, sign-out. */
export function Navbar() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.logout();
    } catch {
      // The cookie may already be gone; clearing the local flag is what matters.
    } finally {
      clearAuthenticated();
      setSigningOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="is-dark sticky top-0 z-50 h-17 bg-forest-800 text-white">
      <div className="mx-auto flex h-full max-w-site items-center gap-6 px-5">
        <NavLink to="/quizzes/new" className="rounded-sm" aria-label="Quiz Agent home">
          <Logo />
        </NavLink>

        <nav aria-label="Primary" className="ml-auto flex items-center gap-1 sm:ml-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-pill px-2.5 py-2 text-ui transition-colors duration-300 sm:px-3.5",
                  "before:hidden before:size-1.5 before:bg-lime-500 before:opacity-0 before:transition-opacity before:content-[''] sm:before:block",
                  isActive ? "text-white before:opacity-100" : "text-forest-300 hover:text-white",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center sm:ml-auto">
          <Button variant="outline" size="sm" arrow={false} loading={signingOut} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
