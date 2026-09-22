import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";
import { Radio } from "./radio";

describe("<Checkbox/>", () => {
  /**
   * A native checkbox role keeps forms, tests and screen readers working.
   * @scenario "a checkbox toggles when pressed"
   */
  it("reports one change when pressed", async () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} aria-label="Accept" />);
    const box = screen.getByRole("checkbox", { name: "Accept" });
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  describe("given it is disabled", () => {
    /**
     * A disabled checkbox cannot be toggled.
     * @scenario "a disabled checkbox does not toggle"
     */
    it("reports no change when pressed", async () => {
      const onChange = vi.fn();
      render(<Checkbox checked={false} disabled onChange={onChange} aria-label="Accept" />);
      await userEvent.click(screen.getByRole("checkbox"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe("<Radio/>", () => {
  /**
   * Radios sharing a name stay mutually exclusive like native inputs.
   * @scenario "radios sharing a name are mutually exclusive"
   */
  it("selects the pressed radio and clears its sibling", async () => {
    render(
      <>
        <Radio name="q" value="a" aria-label="A" />
        <Radio name="q" value="b" aria-label="B" />
      </>,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    await userEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });
});
