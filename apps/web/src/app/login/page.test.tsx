import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { authClient, ApiError } from "@/lib/api-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    authClient: { login: vi.fn(), logout: vi.fn() },
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(authClient.login).mockReset();
  });

  /** Spec AC (UI-01): submitting valid credentials redirects to the quiz-creation screen. */
  it("redirects to /quizzes/new on successful login", async () => {
    vi.mocked(authClient.login).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/e-mail/i), "admin@solvd.com");
    await user.type(screen.getByLabelText(/senha/i), "solvdAdmin");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/quizzes/new"));
  });

  /** Spec AC (UI-02): a failed login shows an inline error and does not redirect. */
  it("shows an inline error and does not redirect on invalid credentials", async () => {
    vi.mocked(authClient.login).mockRejectedValueOnce(new ApiError(401, "unauthorized"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/e-mail/i), "admin@solvd.com");
    await user.type(screen.getByLabelText(/senha/i), "wrong");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/credenciais inválidas/i);
    expect(push).not.toHaveBeenCalled();
  });
});
