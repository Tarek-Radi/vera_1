import { brand } from "./brand";
import { policies } from "./policies";
export const faqs = [
  [
    "How do I place an order?",
    "Choose your pieces and sizes, review your bag and enter your delivery details at checkout. The website prepares your order and opens an Arabic summary in WhatsApp. Press Send to share it with VERA. We then confirm availability, payment and delivery with you.",
  ],
  [
    "How can I contact VERA?",
    `Message our official WhatsApp number, ${brand.whatsappDisplay}, or visit @vera.egbrand on Instagram.`,
  ],
  [
    "How do I select my size?",
    "Use the sizes shown on each product. When measurements are not yet listed, ask VERA for the measurements of that exact piece before ordering.",
  ],
  [
    "Can I change the size after ordering?",
    "Contact VERA with your order number and preferred size as soon as possible. We will check availability and whether the order can still be changed.",
  ],
  [
    "How does WhatsApp checkout work?",
    "The website prepares a pending order and a prefilled message. You must press Send in WhatsApp. Opening WhatsApp does not send the message, confirm the order or record a payment.",
  ],
  [
    "What payment methods are available?",
    "Payment is arranged directly with VERA. Possible arrangements include Cash on Delivery, InstaPay, Vodafone Cash or another agreed method. No payment is taken on this website.",
  ],
  [
    "How are delivery fees calculated?",
    "VERA confirms the delivery charge for your location before you confirm the order. Website totals exclude shipping.",
  ],
  [
    "When will my order arrive?",
    "Ask VERA for the expected delivery timing for your location and chosen items. No delivery date is promised until arrangements are confirmed.",
  ],
  ["Can I exchange an item?", policies.returns],
  [
    "Can I return an item?",
    "Contact VERA with your order number and reason for return. Review our returns information for the request process. Your applicable statutory rights remain unaffected.",
  ],
  [
    "What if an item arrives damaged or incorrect?",
    "Keep the packaging and contact VERA with your order number, a description and photos if available. We will assess the issue and explain the next steps and any collection arrangements.",
  ],
  [
    "How do private coupon codes work?",
    "Enter a code on a product page or a bag item. Eligible discounts are calculated from the selling price. Codes are checked again at checkout and reserved for 30 minutes while VERA confirms the order.",
  ],
  [
    "Can I use multiple coupons?",
    "You can use different codes on different bag items. Only one code can apply to a line item, including all units of that item. The same code cannot apply to two separate line items.",
  ],
  [
    "Can a coupon be used more than once?",
    "No. Each code is redeemed once globally when VERA confirms its order. Unconfirmed reservations expire or are released on cancellation; redeemed codes are never automatically restored.",
  ],
  [
    "Can I customise my hoodie?",
    "VERA Studio is coming soon. The custom-design editor and artwork uploads are not available in this release.",
  ],
  [
    "Does VERA have physical stores?",
    "VERA is currently an online-only store. Browse here and arrange your order with us through WhatsApp.",
  ],
];
export const informationPages: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  about: {
    title: "This is VERA.",
    intro: "Your style. Your identity. Your VERA.",
    sections: [
      [
        "A point of view, all your own",
        "VERA is an Egyptian fashion brand with a simple belief: what you wear should feel like you. Explore hoodies, hijabs and the pieces that fit into your everyday expression.",
      ],
      [
        "A more personal experience",
        "We are an online-only store. Browse at your own pace, choose your pieces, then speak with VERA on WhatsApp to arrange the details of your order.",
      ],
      [
        "The next chapter",
        "VERA Studio is taking shape: a future space for making a hoodie your canvas. For now, explore our current collection and find your colour.",
      ],
    ],
  },
  shipping: {
    title: "Shipping & delivery.",
    intro: "Your order, thoughtfully arranged.",
    sections: [
      ["Delivery coverage and fees", policies.shipping],
      [
        "Your delivery address",
        "Enter your governorate, city or area and full shipping address at checkout. They are saved with the pending order and included in your WhatsApp summary. Website totals exclude shipping. VERA will confirm the complete amount before you agree to the order.",
      ],
      [
        "Timing and tracking",
        "Expected dispatch and delivery timing depend on availability and the agreed delivery arrangement. Ask VERA for an update using your order number.",
      ],
      [
        "Damaged or missed deliveries",
        "If a package is damaged or a delivery is missed, contact VERA with the order number and details so we can help coordinate the next steps.",
      ],
    ],
  },
  "return-policy": {
    title: "Returns & exchanges.",
    intro: "A clear conversation, from the first request.",
    sections: [
      [
        "Policy status",
        policies.approved
          ? "These are the current VERA return and exchange arrangements. Your statutory rights remain unaffected."
          : "Our detailed business policy is awaiting owner and Egyptian consumer-protection review. Contact VERA for the applicable arrangements before ordering. This page describes the request process and does not limit your statutory rights.",
      ],
      [
        "Return and exchange eligibility",
        policies.returnWindowDays === null
          ? "Eligibility depends on the item, its condition, the reason for your request and applicable consumer rights. No store-specific return deadline has been approved for publication."
          : `The store return request window is ${policies.returnWindowDays} days, subject to the applicable conditions and statutory rights.`,
      ],
      ["Product condition", policies.condition],
      [
        "Defective, incorrect or damaged items",
        "Contact VERA with your order number and a description of the issue. Photos of the item and packaging, if available, help us understand what happened. Keep the item and packaging while we assess the appropriate resolution.",
      ],
      [
        "Size exchanges",
        "Tell us the received size and the size you need. We will check availability and explain the exchange process. If VERA sent a size different from your confirmed order, tell us so the issue can be assessed as an incorrect item.",
      ],
      ["Requesting help", policies.returns],
      [
        "Refund arrangements",
        policies.refundProcessingDays === null
          ? policies.refund
          : `Approved refunds are processed within ${policies.refundProcessingDays} days, subject to the confirmed payment arrangement and applicable rights.`,
      ],
      ["Shipping responsibility", policies.shippingResponsibility],
    ],
  },
  terms: {
    title: "Terms & conditions.",
    intro: "Please read these before requesting an order.",
    sections: [
      [
        "General store conditions",
        "VERA is an online-only Egyptian fashion store. Prices are displayed in Egyptian pounds. These terms describe the ordering process; applicable consumer rights remain unaffected. Business policy details are subject to owner review.",
      ],
      [
        "Orders and confirmation",
        "Creating an invoice or sending it through WhatsApp is an order request. VERA confirms availability, payment and delivery directly with you before fulfilment. No message is sent automatically. A pending order may expire if it is not confirmed.",
      ],
      [
        "Product information and availability",
        "Product photographs show the supplied items; screen settings may affect how colours appear. Check the selected size and colour before ordering. Availability is rechecked at checkout and by VERA before confirmation.",
      ],
      [
        "Pricing",
        "Selling prices shown at checkout determine item totals. Shipping is excluded until agreed with VERA. A crossed-out price is displayed only when approved as a genuine reference price. If a pricing error is identified, VERA will explain it before confirming your order.",
      ],
      [
        "Coupons",
        "Private codes apply to one line item each and cannot be stacked. Different codes can apply to different items. Each code is redeemed once globally on owner confirmation. Reservations expire after 30 minutes if unconfirmed. Coupon eligibility is checked by the server.",
      ],
      [
        "Payment arrangements",
        "No payment is processed on the website. VERA will discuss available methods through WhatsApp. An order request is never automatically marked as paid.",
      ],
      ["Delivery coordination", policies.shipping],
      [
        "Order changes and cancellation",
        "Contact VERA promptly with your order number to request changes or cancellation. The available options depend on the order’s progress and applicable rights. Cancelling a pending order releases reserved coupons; coupons already redeemed on a confirmed order are not automatically restored.",
      ],
      ["Returns and exchanges", policies.returns],
      [
        "Website content",
        "VERA branding and website content are provided for browsing and shopping. Do not misuse the site, attempt unauthorised access, interfere with services or distribute private promotional codes without permission.",
      ],
      [
        "Customer responsibilities",
        "Provide accurate information when coordinating your order, review item choices and totals, and keep your order number for support. Do not share passwords or payment credentials through the website.",
      ],
      [
        "Contact",
        `Reach VERA through the official WhatsApp number ${brand.whatsappDisplay} or @vera.egbrand on Instagram.`,
      ],
    ],
  },
  privacy: {
    title: "Your privacy.",
    intro: "What is stored, and why.",
    sections: [
      [
        "Your shopping bag",
        "Your browser stores selected product codes, sizes, quantities and any coupon codes in localStorage to keep your bag between visits. Session storage remembers the intro and checkout retry key. You can remove bag items or clear browser site data at any time.",
      ],
      [
        "Order records",
        "When you request an invoice, we store its order number, selected product information, prices, discounts, order status and timestamps in our PostgreSQL database. Coupon codes are verified using keyed hashes; order records use masked coupon labels. Checkout also stores your name, phone, governorate, city/area, full address, optional payment preference and notes. No card or bank account credentials are collected. These details are visible only through protected owner access.",
      ],
      [
        "WhatsApp and Instagram",
        "When checkout opens WhatsApp, your order summary and contact/delivery details are included in the link. The message is sent to VERA only when you press Send. Your checkout draft and prepared summary are kept in this browser tab�s session storage so you can return or retry. For long messages, copy the complete summary and paste it in the chat. Delivery, contact and payment details you share there are processed through WhatsApp and VERA’s communications. WhatsApp and Instagram have their own privacy practices.",
      ],
      [
        "Owner authentication",
        "Supabase Auth manages owner sign-in. Secure session cookies are used for authenticated administration. Customer accounts are not required.",
      ],
      [
        "Security and service providers",
        "The site is prepared for Cloudflare Workers hosting and Supabase database/authentication. Hosting providers may process technical logs. Sensitive requests use short-lived hashed network identifiers for rate limiting; raw IP addresses are not stored in the store’s rate-limit table.",
      ],
      [
        "Analytics",
        "No marketing analytics, advertising pixels or tracking integrations are installed in this release.",
      ],
      ["Retention and your requests", policies.retention],
      [
        "Contact",
        `Contact VERA through ${brand.whatsappDisplay} on WhatsApp for privacy questions. The final retention schedule and business privacy details require owner review before production launch.`,
      ],
    ],
  },
};
