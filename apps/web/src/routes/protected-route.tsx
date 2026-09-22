import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

/** UI-01: redirects unauthenticated requests to `/quizzes/*` to `/login`. Replaces the old Next.js edge middleware — see the note in `lib/auth.ts`. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
