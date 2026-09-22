import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./login";
import { authClient, ApiError } from "@/lib/api-client";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    authClient: { login: vi.fn(), logout: vi.fn() },
  };
});

describe("<LoginPage/>", () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.mocked(authClient.login).mockReset();
  });

  describe("given the sign-in succeeds", () => {
    /**
     * A successful sign-in lands the admin where a quiz can be created.
     * @scenario "a successful sign-in takes the admin to the new-quiz screen"
     */
    it("takes the admin to the new-quiz screen", async () => {
      vi.mocked(authClient.login).mockResolvedValueOnce({ ok: true });
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "admin@solvd.com");
      await user.type(screen.getByLabelText(/password/i), "solvdAdmin");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/quizzes/new"));
    });
  });

  describe("given the sign-in is rejected", () => {
    /**
     * A failed sign-in explains itself inline and keeps the admin on the page.
     * @scenario "a failed sign-in shows an inline error and stays on the page"
     */
    it("shows an alert and stays on the page", async () => {
      vi.mocked(authClient.login).mockRejectedValueOnce(new ApiError(401, "unauthorized"));
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "admin@solvd.com");
      await user.type(screen.getByLabelText(/password/i), "wrong");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
