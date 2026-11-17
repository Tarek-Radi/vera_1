export const printPositions = [
  { id: 1, view: "front", label: "Wearer's left chest", x: 59.9, y: 32 },
  { id: 2, view: "front", label: "Center chest", x: 50, y: 38.7 },
  { id: 3, view: "front", label: "Wearer's right chest", x: 40.4, y: 32 },
  {
    id: 4,
    view: "front",
    label: "Wearer's right sleeve, above cuff",
    x: 18.6,
    y: 83.9,
  },
  {
    id: 5,
    view: "front",
    label: "Wearer's left sleeve, above cuff",
    x: 81.2,
    y: 83.9,
  },
  { id: 6, view: "back", label: "On the hood", x: 50, y: 15.2 },
  { id: 7, view: "back", label: "Center back", x: 50, y: 50.6 },
] as const;
export type PositionId = (typeof printPositions)[number]["id"];
export const customColors = ["Black", "Burgundy", "Gray"] as const;
export const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
// No approved custom garment / printing tariff exists. Catalog retail prices do not cover custom printing.
export const customPriceLabel = "Price to be confirmed on WhatsApp.";
