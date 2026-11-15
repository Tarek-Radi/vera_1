// Owner review is required before publishing final business terms. Null means no promise is made.
export const policies = {
  approved: false,
  returnWindowDays: null as number | null,
  refundProcessingDays: null as number | null,
  shipping:
    "Delivery coverage, charges and expected timing are confirmed with VERA through WhatsApp before the order is confirmed.",
  returns:
    "Contact VERA on WhatsApp with your order number, the item and the reason for your request. We will explain the applicable return or exchange process before you send anything back.",
  condition:
    "Keep the item, tags and original packaging where possible. Tell us whether it has been worn, washed or altered so we can assess the request. This does not limit rights relating to faulty or incorrect goods.",
  refund:
    "The applicable refund method and timing will be explained when your return request is assessed. No refund processing deadline is currently published.",
  shippingResponsibility:
    "VERA will explain collection arrangements and any applicable shipping responsibility before you agree to a return or exchange.",
  retention:
    "Order records are retained for fulfilment, support and applicable record-keeping obligations. Contact VERA about access, correction or deletion; some records may need to be retained where required by law.",
};
export const sizeCharts: Record<
  string,
  { columns: string[]; rows: string[][] }
> = {
  hoodies: { columns: ["Size", "Chest (cm)", "Length (cm)"], rows: [] },
  hijabs: { columns: ["Size", "Width (cm)", "Length (cm)"], rows: [] },
  pants: { columns: ["Size", "Waist (cm)", "Length (cm)"], rows: [] },
};
