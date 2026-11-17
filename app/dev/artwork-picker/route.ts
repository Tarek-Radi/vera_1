// Raw HTML intentionally avoids the storefront layout, CSS and React handlers.
export function GET() {
  if (process.env.NODE_ENV !== "development")
    return new Response("Not found", { status: 404 });
  return new Response(`<!doctype html>
<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Native picker diagnostic</title></head>
<body><h1>Native picker diagnostic</h1><label for="artwork">Choose an image</label>
<input id="artwork" type="file" accept="image/*"></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
