import { test, expect } from "@playwright/test";

/**
 * Full smoke path (UI-01..04, GEN-08): login with the seeded admin,
 * generate a quiz from a real README URL, answer every question, submit,
 * and assert the final score renders.
 */
test("login, generate a quiz, answer it, submit, and see a score", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@solvd.com");
  await page.getByLabel("Senha").fill("solvdAdmin");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/quizzes\/new/);

  await page
    .getByLabel("URL do documento Markdown")
    .fill("https://raw.githubusercontent.com/pipecat-ai/pipecat/main/README.md");
  await page.getByRole("button", { name: "Gerar quiz" }).click();

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

  await page.getByRole("button", { name: "Enviar respostas" }).click();

  await expect(page.getByText(/Pontuação final: \d/)).toBeVisible({ timeout: 15_000 });
});
