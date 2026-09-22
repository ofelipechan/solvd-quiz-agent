import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("<Button/>", () => {
  describe("given the loading state", () => {
    /**
     * A loading button blocks double submission and tells assistive tech it is busy.
     * @scenario "a loading button cannot be pressed and announces it is busy"
     */
    it("cannot be pressed and announces busy", () => {
      render(<Button loading>Saving</Button>);
      const button = screen.getByRole("button", { name: /saving/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    /**
     * A click while loading never reaches the handler.
     * @scenario "pressing a loading button does nothing"
     */
    it("runs no action when pressed", async () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Go
        </Button>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  /**
   * A button inside a form must not submit it unless asked to.
   * @scenario "a button inside a form does not submit it by default"
   */
  it("does not submit a form by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  /**
   * Navigation keeps native link semantics.
   * @scenario "a button with a destination behaves as a link"
   */
  it("becomes a link to the destination", () => {
    render(<Button href="/quizzes/new">New quiz</Button>);
    expect(screen.getByRole("link", { name: /new quiz/i })).toHaveAttribute("href", "/quizzes/new");
  });

  /**
   * The trailing arrow is decorative only and optional.
   * @scenario "the decorative arrow is hidden from assistive tech and can be turned off"
   */
  it("hides the arrow from assistive tech and drops it when turned off", () => {
    const { rerender } = render(<Button>Go</Button>);
    expect(screen.getByRole("button").querySelector("[aria-hidden='true']")).not.toBeNull();
    rerender(<Button arrow={false}>Go</Button>);
    expect(screen.getByRole("button").querySelector("[aria-hidden='true']")).toBeNull();
  });
});
