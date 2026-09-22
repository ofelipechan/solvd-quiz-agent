import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./navbar";
import { authClient } from "@/lib/api-client";
import { isAuthenticated, markAuthenticated } from "@/lib/auth";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    authClient: { login: vi.fn(), logout: vi.fn() },
  };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Navbar />} />
        <Route path="/login" element={<Navbar />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("<Navbar/>", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(authClient.logout).mockReset();
  });

  /**
   * Users always know which section they are in.
   * @scenario "the current section is marked in the navbar"
   */
  it("marks History as the current page on the history route", () => {
    renderAt("/quizzes");
    expect(screen.getByRole("link", { name: /history/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /new quiz/i })).not.toHaveAttribute("aria-current");
  });

  describe("given the admin is signed in", () => {
    /**
     * Signing out ends the server session and clears the local flag.
     * @scenario "signing out from the navbar ends the session"
     */
    it("clears the local session when sign-out succeeds", async () => {
      markAuthenticated();
      vi.mocked(authClient.logout).mockResolvedValueOnce({ ok: true });
      renderAt("/quizzes");

      await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

      await waitFor(() => expect(isAuthenticated()).toBe(false));
      expect(authClient.logout).toHaveBeenCalledTimes(1);
    });

    /**
     * The user is never stuck signed in when the server call fails.
     * @scenario "the local session is cleared even when the server sign-out fails"
     */
    it("clears the local session when sign-out fails", async () => {
      markAuthenticated();
      vi.mocked(authClient.logout).mockRejectedValueOnce(new Error("network"));
      renderAt("/quizzes");

      await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

      await waitFor(() => expect(isAuthenticated()).toBe(false));
    });
  });
});
