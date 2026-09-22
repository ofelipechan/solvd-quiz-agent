import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("<Input/>", () => {
  /**
   * The visible label is programmatically tied to the field.
   * @scenario "the label is tied to the field"
   */
  it("is reachable by its label text", () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
  });

  describe("given an error message", () => {
    /**
     * A field error is announced and linked so screen readers read it with the field.
     * @scenario "an error is announced and linked to the field"
     */
    it("is marked invalid and described by the message", () => {
      render(<Input id="email" label="Email" error="Email is required" />);
      const input = screen.getByLabelText("Email");
      const message = screen.getByText("Email is required");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toBe(message.id);
    });
  });

  describe("given no error", () => {
    /**
     * A clean field is not flagged invalid.
     * @scenario "a field without an error is not marked invalid"
     */
    it("is not marked invalid", () => {
      render(<Input id="email" label="Email" />);
      expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
    });
  });

  /**
   * Typing reaches the underlying input so controlled forms keep working.
   * @scenario "typing into the field updates its value"
   */
  it("holds the typed text", async () => {
    render(<Input id="url" label="URL" />);
    const input = screen.getByLabelText("URL");
    await userEvent.type(input, "https://a.md");
    expect(input).toHaveValue("https://a.md");
  });
});
