import type { EmailKind } from "./rules";
import type { ForwardedEmail } from "./schema";

/**
 * Emails transférés réalistes, pour les tests de classification (factice et en direct).
 * Les deux premiers viennent de Tabit : une table, puis une livraison.
 */
export type ExampleEmail = { key: string; email: ForwardedEmail; kind: EmailKind; place: string | null; platform: string | null };

export const EXAMPLE_EMAILS: readonly ExampleEmail[] = [
  {
    key: "tabit-table",
    kind: "table",
    place: "Fantastic",
    platform: "Tabit",
    email: {
      subject: "Fwd: ההזמנה שלך ב-Fantastic אושרה",
      text: `---------- Forwarded message ---------
From: Tabit <no-reply@tabit.cloud>
Date: Mon, Sep 8, 2026 at 10:02 AM
Subject: ההזמנה שלך ב-Fantastic אושרה

שלום רפאל,
ההזמנה שלך ב-Fantastic אושרה!
תאריך: יום שישי 12.9.2026
שעה: 20:30
מספר סועדים: 2
כתובת: רחוב הרצל 16, תל אביב
ניתן לבטל או לשנות עד 3 שעות לפני מועד ההזמנה.
נתראה בקרוב!
Powered by Tabit`,
    },
  },
  {
    key: "tabit-delivery",
    kind: "delivery",
    place: "Pizza Lola",
    platform: "Tabit",
    email: {
      subject: "Fwd: Tabit Order - תודה על ההזמנה מ-Pizza Lola",
      text: `---------- Forwarded message ---------
From: Tabit Order <orders@tabit.cloud>
Date: Thu, Oct 2, 2026 at 8:14 PM
Subject: Tabit Order - תודה על ההזמנה מ-Pizza Lola

תודה על ההזמנה מ-Pizza Lola!
סוג הזמנה: משלוח
כתובת למשלוח: דיזנגוף 120, תל אביב
מרגריטה x2 — ₪96
קולה זירו x1 — ₪14
סה״כ ששולם: ₪110
זמן משלוח משוער: 45 דקות
Powered by Tabit`,
    },
  },
  {
    key: "tabit-reservation-en",
    kind: "table",
    place: "MILA",
    platform: "Tabit",
    email: {
      subject: "Fwd: Your reservation at MILA is confirmed",
      text: `---------- Forwarded message ---------
From: Tabit <no-reply@tabit.cloud>
Date: Jul 15, 2026

Your reservation at MILA is confirmed.
Sunday, 19.7.2026 at 21:00 · party of 4 guests
Savyon
Please let us know if you are running late. Cancellation is free up to 4 hours before.`,
    },
  },
  {
    key: "tabit-pickup",
    kind: "delivery",
    place: "Miznon",
    platform: "Tabit",
    email: {
      subject: "Fwd: Your order from Miznon is ready for pickup",
      text: `---------- Forwarded message ---------
From: Tabit Order <orders@tabit.cloud>
Date: Sep 20, 2026

Your order from Miznon (takeaway) is ready for pickup.
1 x Whole roasted cauliflower — ₪39
1 x Lamb kebab pita — ₪52
Total paid: ₪91`,
    },
  },
  {
    key: "tabit-cancellation",
    kind: "cancellation",
    place: "HaMigdal",
    platform: "Tabit",
    email: {
      subject: "Fwd: Your reservation at HaMigdal has been cancelled",
      text: `---------- Forwarded message ---------
From: Tabit <no-reply@tabit.cloud>
Date: Jul 30, 2026

Your reservation at HaMigdal, Jerusalem has been cancelled.
Monday, 3.8.2026 at 19:00 · party of 4 guests
We hope to see you another time.`,
    },
  },
  {
    key: "booking-hotel",
    kind: "hotel",
    place: "The Norman",
    platform: "Booking",
    email: {
      subject: "Fwd: Your booking at The Norman is confirmed",
      text: `---------- Forwarded message ---------
From: Booking.com <noreply@booking.com>
Date: Mar 2, 2026

Thanks! Your booking at The Norman, Tel Aviv is confirmed.
Check-in: Thursday 2026-04-16 from 15:00
Check-out: Saturday 2026-04-18 until 11:00
1 room, 2 adults`,
    },
  },
  {
    key: "activity",
    kind: "activity",
    place: "Barby",
    platform: null,
    email: {
      subject: "Fwd: Tes billets pour le concert à Barby",
      text: `---------- Forwarded message ---------
Date: 2 déc. 2025

Tes billets pour le concert à Barby, Tel Aviv.
Samedi 2026-01-10, ouverture des portes à 21 h.
2 places debout. Présente ce QR code à l'entrée.`,
    },
  },
  {
    key: "newsletter",
    kind: "other",
    place: null,
    platform: "Wolt",
    email: {
      subject: "Fwd: -20 % ce week-end",
      text: `---------- Forwarded message ---------
From: Wolt <info@wolt.com>

-20 % ce week-end sur tes restaurants préférés. Code : WEEKEND20.`,
    },
  },
];
