import { test, expect } from '@playwright/test';

test('homepage has title and expected content', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // The exact title depends on your index.html, but usually contains the app name.
  await expect(page).toHaveTitle(/Vite \+ React|Smart Student/i);

  // Expect the page to have some content, e.g. a specific heading or text.
  // Since we don't know the exact UI yet, we can check that a main element exists,
  // or that it doesn't show a basic error.
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
