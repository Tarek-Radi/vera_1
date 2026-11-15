// Display wording only. Never apply this to IDs, URLs, SKUs or file paths.
export function scarfWording(value) {
  return value.replace(/\bhijabs\b/gi, word => word === word.toUpperCase() ? "SCARVES" : word[0] === "H" ? "Scarves" : "scarves")
    .replace(/\bhijab\b/gi, word => word === word.toUpperCase() ? "SCARF" : word[0] === "H" ? "Scarf" : "scarf");
}
