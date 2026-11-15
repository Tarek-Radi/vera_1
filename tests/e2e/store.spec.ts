import { testCustomer } from "../fixtures";

import { test, expect } from "@playwright/test";

import { products } from "../../lib/catalog";

const hoodie = products.find((p) => p.identity === "black_hoodie")!;

test("responsive widths, navigation drawer and catalog controls", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",

    "The desktop context exercises the additional viewport sizes.",
  );

  for (const width of [320, 375, 768, 1024]) {
    await page.setViewportSize({ width, height: 860 });

    await page.goto("/");

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    if (width === 320)
      await page.screenshot({
        path: "test-results/home-320.png",

        animations: "disabled",
      });

    await page.goto(`/products/${hoodie.slug}`);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 375, height: 812 });

  await page.getByRole("button", { name: "Open navigation" }).click();

  await page

    .getByRole("dialog", { name: "Explore VERA" })

    .getByRole("link", { name: "Shop", exact: true })

    .click();

  await expect(page).toHaveURL(/\/shop$/);

  await page.getByRole("button", { name: "Filters", exact: true }).click();

  await page

    .getByRole("combobox", { name: "Collection", exact: true })

    .selectOption("hoodies");

  await page

    .getByRole("combobox", { name: "Colour", exact: true })

    .selectOption("Black");

  await expect(page.locator(".product-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Reset", exact: true }).click();

  await page.getByRole("spinbutton", { name: "Max price · EGP" }).fill("300");

  await expect(page.locator(".product-card")).toHaveCount(3);

  await page

    .getByRole("combobox", { name: "Sort products" })

    .selectOption("name");

  await expect(
    page

      .locator(".product-card")

      .first()

      .getByRole("link", { name: "Black Hijab", exact: true }),
  ).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("vera-intro", "seen"));
});

test("home, collections, search, FAQs, custom design and information routes", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));

  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|Minified React error/i.test(message.text())
    )
      errors.push(message.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "WEAR YOUR IDENTITY." }),
  ).toBeVisible();

  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();

    await expect(img).toHaveJSProperty("complete", true);

    await expect(img).not.toHaveJSProperty("naturalWidth", 0);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  await expect(page.locator(".site-header")).toHaveClass(/transparent/);

  if (test.info().project.name === "desktop")
    await page.screenshot({
      path: ".local/vera-preview.png",
      animations: "disabled",
    });

  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,

    fullPage: true,

    animations: "disabled",
  });

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.goto("/shop");

  await page

    .getByRole("textbox", { name: "Search the collection" })

    .fill("black hoodie");

  await expect(page.locator(".product-card")).toHaveCount(1);

  await page

    .getByRole("textbox", { name: "Search the collection" })

    .fill("missing piece");

  await expect(
    page.getByRole("heading", { name: "No pieces found." }),
  ).toBeVisible();

  await page.goto("/collections/pants");

  await expect(
    page.getByRole("heading", { name: "Pants. Coming soon." }),
  ).toBeVisible();

  await page.goto("/faq");

  await page

    .locator("summary")

    .filter({ hasText: "How does WhatsApp checkout work?" })

    .click();

  await expect(
    page.getByText("The website prepares a pending order", { exact: false }),
  ).toBeVisible();

  await page.goto("/custom-design");

  await expect(
    page.getByRole("heading", { name: "DESIGN YOUR OWN VERA." }),
  ).toBeVisible();

  for (const route of [
    "about",

    "contact",

    "terms",

    "return-policy",

    "privacy",

    "shipping",

    "size-guide",

    "cart",

    "checkout",

    "admin",
  ]) {
    const response = await page.goto(`/${route}`);

    expect(response?.status()).toBe(200);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }

  expect(errors).toEqual([]);
});

test("size selection, persistent bag, editing, quantity, removal and drawer", async ({
  page,
}) => {
  await page.goto(`/products/${hoodie.slug}`);

  await page.getByRole("button", { name: "Add to bag", exact: true }).click();

  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Please select your size.",
  );

  await page.getByRole("button", { name: "XL", exact: true }).click();

  await page.getByRole("button", { name: "Add to bag", exact: true }).click();

  const drawer = page.getByRole("dialog", { name: "Your bag" });

  await expect(drawer).toBeVisible();

  await expect(drawer.getByText(hoodie.sku)).toBeVisible();

  await drawer.getByRole("button", { name: "Close Your bag" }).click();

  await page.goto("/cart");

  await page.reload();

  await expect(
    page.locator(".cart-lines").getByText("Black Hoodie", { exact: true }),
  ).toBeVisible();

  await page

    .getByRole("button", { name: "Increase Black Hoodie quantity" })

    .click();

  await expect(page.locator(".total dd")).toHaveText("1,200 EGP");

  await page

    .getByRole("combobox", { name: "Size for Black Hoodie" })

    .selectOption("L");

  await page.reload();

  await expect(
    page.getByRole("combobox", { name: "Size for Black Hoodie" }),
  ).toHaveValue("L");

  await page.getByRole("button", { name: "Remove Black Hoodie" }).click();

  await expect(
    page.getByRole("heading", { name: "Your next favourite is waiting." }),
  ).toBeVisible();
});

test("server coupons, checkout invoice, same-order retry and API protection", async ({
  page,

  request,
}) => {
  await page.goto(`/products/${hoodie.slug}`);

  await page.getByRole("button", { name: "XL", exact: true }).click();

  await page

    .getByRole("textbox", { name: "Have a private coupon?" })

    .fill("INVALIDCODE");

  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await expect(page.locator("main").getByRole("alert")).toContainText(
    "invalid",
  );

  const code =
    test.info().project.name === "desktop" ? "VALID20CODE" : "VALID30CODE";

  await page

    .getByRole("textbox", { name: "Have a private coupon?" })

    .fill(code);

  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "applied" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Buy now" }).click();

  await expect(page.locator(".total dd")).toHaveText(
    test.info().project.name === "desktop" ? "480 EGP" : "420 EGP",
  );

  await page.route("https://wa.me/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "Intercepted WhatsApp navigation. No message sent.",
    }),
  );

  for (const [field, value] of Object.entries(testCustomer))
    await page.locator(`input[name="${field}"]`).fill(value);

  await page
    .getByRole("button", { name: "Complete order via WhatsApp" })
    .click();

  await expect(page).toHaveURL(/^https:\/\/wa.me\//);

  await page.goBack();

  await expect(
    page.getByText(
      "Please press Send in WhatsApp to submit your order to VERA.",
    ),
  ).toBeVisible();

  const link = page.getByRole("link", { name: "فتح واتساب" });

  const url = new URL((await link.getAttribute("href"))!);

  expect(url.hostname).toBe("wa.me");

  expect(url.pathname).toBe("/201009785343");

  expect(url.searchParams.get("text")).toContain(testCustomer.name);

  expect(url.searchParams.get("text")).toContain("المقاس: XL");

  const key = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("vera-checkout")!).key,
  );

  const response = await request.post("/api/checkout", {
    data: {
      items: [{ sku: hoodie.sku, size: "XL", quantity: 1, coupon: code }],

      idempotencyKey: key,

      customer: testCustomer,
    },
  });

  expect(response.ok()).toBe(true);

  expect((await response.json()).whatsappUrl).toBe(url.href);

  await page.reload();

  await expect(page.getByRole("link", { name: "فتح واتساب" })).toHaveAttribute(
    "href",
    url.href,
  );

  expect(
    (
      await request.post("/api/quote", {
        data: {
          items: [{ sku: hoodie.sku, size: "XL", quantity: 1, price: 1 }],
        },
      })
    ).status(),
  ).toBe(400);

  expect(
    (
      await request.post("/api/checkout", {
        headers: { origin: "https://evil.example" },

        data: { items: [], idempotencyKey: key },
      })
    ).status(),
  ).toBe(403);

  expect((await request.get("/api/admin/orders")).ok()).toBe(false);

  expect((await request.get("/private/coupons.csv")).status()).toBe(404);

  await page.screenshot({
    path: `test-results/checkout-${test.info().project.name}.png`,

    fullPage: true,
  });
});
