import { test, expect, type Page } from "@playwright/test";
import { products } from "../../lib/catalog";
import { testCustomer } from "../fixtures";
import { printPositions } from "../../config/custom-design";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
  "base64",
);
async function fill(page: Page, positions: number[]) {
  await page.goto("/custom-design");
  await expect(page.locator(".studio-reference:visible")).toContainText(
    "VERA-CUSTOM-",
  );
  await expect(page.locator('input[name="name"]')).toHaveCount(1);
  for (const position of positions) {
    await page
      .getByRole("button", {
        name: position > 5 ? "Back" : "Front",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: `Position ${position}:`, exact: false })
      .click();
    await page
      .getByLabel(`Upload artwork for position ${position}`, { exact: true })
      .setInputFiles({
        name: `art${position}.png`,
        mimeType: "image/png",
        buffer: png,
      });
    await expect(page.getByText(`Export: ${position}.png`)).toBeVisible();
  }
  for (const [name, value] of Object.entries(testCustomer))
    await page.locator(`input[name="${name}"]`).fill(value);
}
function result(a: { position: number; token: string }) {
  return {
    files: [
      {
        ...a,
        id: `saved${a.position}`,
        code: `VERA-K7M4-X9Q2-${a.position}`,
        filename: `VERA-K7M4-X9Q2-${a.position}.png`,
        url: `https://drive.google.com/file/d/saved${a.position}/view`,
        folderUrl: "https://drive.google.com/drive/folders/requestSaved",
      },
    ],
  };
}
test.beforeEach(async ({ context }) => {
  await context.route("https://wa.me/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "Intercepted WhatsApp navigation; no message sent.",
    }),
  );
});
for (const positions of [[1], [1, 7]])
  test(`waits for all ${positions.length} uploads before same-tab WhatsApp`, async ({
    page,
  }) => {
    const requests: number[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/custom-artwork", async (route) => {
      const a = route.request().postDataJSON().artwork;
      expect(a).toHaveLength(1);
      requests.push(a[0].position);
      await gate;
      await route.fulfill({ json: result(a[0]) });
    });
    await fill(page, positions);
    await page
      .getByRole("button", { name: "Send Custom Request via WhatsApp" })
      .click();
    await expect(
      page.getByRole("button", { name: "Waiting… Uploading your artwork" }),
    ).toBeDisabled();
    await expect(
      page.getByText(`Uploading image 1 of ${positions.length}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeDisabled();
    expect(page.url()).toContain("/custom-design");
    expect(page.context().pages()).toHaveLength(1);
    await page
      .locator(".studio form")
      .evaluate((form: HTMLFormElement) => form.requestSubmit());
    expect(requests).toHaveLength(1);
    release();
    await expect(page).toHaveURL(/^https:\/\/wa.me\//);
    const message = new URL(page.url()).searchParams.get("text")!;
    expect(message).toContain(testCustomer.name);
    expect(message).toContain("requestSaved");
    for (const pos of positions)
      expect(message).toContain(`VERA-K7M4-X9Q2-${pos}`);
    expect(message).not.toContain("Artwork files will be attached separately");
    expect(requests).toEqual(positions);
  });
test("partial failure retains saved results and retry uploads only unfinished artwork", async ({
  page,
}) => {
  const requests: { token: string; position: number }[] = [];
  let fail = true;
  await page.addInitScript(
    (items) => localStorage.setItem("vera-bag-v1", JSON.stringify(items)),
    [{ sku: products[0].sku, size: products[0].sizes[0], quantity: 1 }],
  );
  await page.route("**/api/custom-artwork", async (route) => {
    const a = route.request().postDataJSON().artwork[0];
    requests.push(a);
    if (a.position === 7 && fail) {
      fail = false;
      await route.fulfill({
        status: 502,
        json: { error: "Drive upload failed. Retry." },
      });
    } else await route.fulfill({ json: result(a) });
  });
  await fill(page, [1, 7]);
  const bag = await page.evaluate(() => localStorage.getItem("vera-bag-v1"));
  await page
    .getByRole("button", { name: "Send Custom Request via WhatsApp" })
    .click();
  await expect(page.locator(".studio-feedback[role=alert]")).toContainText(
    "Drive upload failed",
  );
  expect(page.url()).toContain("/custom-design");
  await expect(
    page.getByRole("link", { name: "VERA-K7M4-X9Q2-1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Export: 7.png")).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue(
    testCustomer.name,
  );
  expect(await page.evaluate(() => localStorage.getItem("vera-bag-v1"))).toBe(
    bag,
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page).toHaveURL(/^https:\/\/wa.me\//);
  expect(requests.map((a) => a.position)).toEqual([1, 7, 7]);
  expect(requests[1].token).toBe(requests[2].token);
});
test("shows inline validation and missing Google configuration without navigating", async ({
  page,
}) => {
  await page.goto("/custom-design");
  await page
    .getByRole("button", { name: "Send Custom Request via WhatsApp" })
    .click();
  await expect(
    page.getByText("Customer name is required.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Select at least one position and upload artwork.", {
      exact: true,
    }),
  ).toBeVisible();
  await fill(page, [1]);
  await page
    .getByRole("button", { name: "Send Custom Request via WhatsApp" })
    .click();
  await expect(page.locator(".studio-feedback[role=alert]")).toContainText(
    "ARTWORK_SCRIPT_URL and ARTWORK_SCRIPT_SECRET",
  );
  await expect(page.getByText("Export: 1.png")).toBeVisible();
  expect(page.url()).toContain("/custom-design");
});
for (const width of [390, 1280])
  test(`template alignment at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/custom-design");
    await expect(page.locator(".studio-reference:visible")).toContainText(
      "VERA-CUSTOM-",
    );
    await expect(page.locator(".hoodie-guide")).toHaveCount(1);
    for (const view of ["front", "back"] as const) {
      await page
        .getByRole("button", {
          name: view === "front" ? "Front" : "Back",
          exact: true,
        })
        .click();
      await page
        .locator(".hoodie-guide")
        .screenshot({ path: `test-results/guide-${view}-${width}.png` });
      const box = (await page.locator(".hoodie-guide").boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(1.5, 2);
      for (const position of printPositions.filter((p) => p.view === view)) {
        const spot = (await page
          .getByRole("button", {
            name: `Position ${position.id}:`,
            exact: false,
          })
          .boundingBox())!;
        expect(
          Math.abs(
            ((spot.x + spot.width / 2 - box.x) / box.width) * 100 - position.x,
          ),
        ).toBeLessThan(0.1);
        expect(
          Math.abs(
            ((spot.y + spot.height / 2 - box.y) / box.height) * 100 -
              position.y,
          ),
        ).toBeLessThan(0.1);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/custom-${width}.png`,
      fullPage: true,
    });
  });
