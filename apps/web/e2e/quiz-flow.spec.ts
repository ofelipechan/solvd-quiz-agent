import { test, expect } from "@playwright/test";

/**
 * The whole stack works together: sign in, generate from a real README, answer, submit, see a score.
 * @scenario "sign in, generate a quiz, answer it, submit, and see a score"
 */
test("signs in, generates, answers, submits and shows the final score", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@solvd.com");
  await page.getByLabel("Password").fill("solvdAdmin");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/quizzes\/new/);

  await page
    .getByLabel("Markdown document URL")
    .fill("https://raw.githubusercontent.com/pipecat-ai/pipecat/main/README.md");
  await page.getByRole("button", { name: "Generate quiz" }).click();

  // Match a real quiz UUID, not the literal "/quizzes/new" route (which also
  // satisfies a bare `[^/]+` pattern and would pass before generation finishes).
  await expect(page).toHaveURL(/\/quizzes\/[0-9a-f-]{36}$/, { timeout: 45_000 });

  const fieldsets = page.locator("fieldset");
  const questionCount = await fieldsets.count();
  expect(questionCount).toBeGreaterThanOrEqual(5);
  expect(questionCount).toBeLessThanOrEqual(8);

  for (let i = 0; i < questionCount; i++) {
    // Answering the first option per question is enough to exercise
    // submit -> score end to end; correctness of the pick is not the point.
    await fieldsets.nth(i).locator("input").first().check();
  }

  await page.getByRole("button", { name: "Submit answers" }).click();

  await expect(page.getByText(/Final score: \d/)).toBeVisible({ timeout: 15_000 });
});
