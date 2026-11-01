import { LEGAL_CONTACT, type LegalTexts } from "./types";

const PUBLISHER = "[PUBLISHER]";

export const en: LegalTexts = {
  updated: "Last updated: November 1, 2026",
  terms: {
    title: "Terms of use",
    metaTitle: "Terms of use",
    intro:
      "These terms govern your use of WH3RE. They are short and written to be read. By creating an account, you accept them.",
    sections: [
      {
        heading: "1. The service",
        body: [
          "WH3RE is a chat that helps you find a place (restaurant, bar, hotel, activity) from your own memory and the recommendations of people you know.",
          `WH3RE is published by ${PUBLISHER}. Contact: ${LEGAL_CONTACT}.`,
        ],
      },
      {
        heading: "2. A private, free beta",
        body: [
          "WH3RE is in beta. Access is by invitation, or through the private link a member sent you. The service is free during the beta.",
          "A beta moves: features may change, be removed or not work well. The service may also stop. If it does, you will be told by email at least 30 days in advance, with a way to get your data back.",
        ],
      },
      {
        heading: "3. Your account",
        body: [
          "You sign in with a link sent to your email address, without a password. Your account is therefore only as safe as your inbox: protect it.",
          "You must be at least 16. An account is personal: don’t share it.",
        ],
      },
      {
        heading: "4. What you put into WH3RE",
        body: [
          "Your recommendations, post-visit feedback, notes and the emails you forward remain yours. You only allow us to store and process them to run the service for you, and for the people you choose to share with.",
          "You are responsible for what you add. No illegal, abusive or defamatory content, and nothing that infringes someone else’s rights.",
        ],
      },
      {
        heading: "5. Your circle",
        body: [
          "When you ask your network for a recommendation, you send the message yourself (WhatsApp, copied link…). WH3RE never sends anything to the people you know without your confirmation.",
          "Only add people you know to your circle, and only write to them with real requests. Your circle is visible to you alone.",
        ],
      },
      {
        heading: "6. WH3RE’s answers",
        body: [
          "Answers are generated automatically, partly by artificial intelligence. They are suggestions: they may be incomplete or wrong (opening hours, prices, availability, a place that has closed…). Check before you go or book.",
          "WH3RE doesn’t book anything for you. If you book on a third-party site, its own terms apply.",
        ],
      },
      {
        heading: "7. Fair use",
        body: [
          "To keep the service usable for everyone, you may not:",
          "- get around the daily usage limits, or automate requests;",
          "- try to access other people’s data or the inner workings of the service;",
          "- use WH3RE for solicitation, spam or to harass anyone;",
          "- copy the service or extract its content at scale.",
          "In case of abuse, your access may be suspended. Except in an emergency, you will be told beforehand, with the reason.",
        ],
      },
      {
        heading: "8. Liability",
        body: [
          "During the beta, WH3RE is provided “as is”, with no guarantee of availability or results. To the extent permitted by law, the publisher is not liable for indirect damages, nor for choices made based on a suggestion.",
          "Nothing in these terms limits the rights the law of your country of residence grants you as a consumer.",
        ],
      },
      {
        heading: "9. Deleting your account",
        body: [
          "You can delete your account at any time from Profile › Privacy. Your data is then erased, as described in the privacy policy.",
        ],
      },
      {
        heading: "10. Personal data",
        body: [
          "How WH3RE handles your data is described in the privacy policy, which is part of these terms.",
        ],
      },
      {
        heading: "11. Changes",
        body: [
          "These terms may change. For any significant change, you will be told by email at least 15 days in advance. If you disagree, you can delete your account.",
        ],
      },
      {
        heading: "12. Governing law",
        body: [
          "These terms are governed by the laws of Israel. In case of a dispute, we first look for an amicable solution: write to us. Failing that, the competent courts of Israel have jurisdiction, without prejudice to the protective rules of your country of residence if you are a consumer in the European Union.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    metaTitle: "Privacy policy",
    intro:
      "WH3RE is private by default. This page says, plainly, what data is processed, why, by whom, for how long, and how you stay in control. It covers the WH3RE app and the wh3re.com waitlist.",
    sections: [
      {
        heading: "1. Who is responsible",
        body: [
          `The data controller is ${PUBLISHER}. For any question or request about your data: ${LEGAL_CONTACT}.`,
          "WH3RE applies the European Union’s General Data Protection Regulation (GDPR) and the Israeli Privacy Protection Law.",
        ],
      },
      {
        heading: "2. What is collected",
        body: [
          "- Your account: your email address and, if you provide them, your first name and city.",
          "- What you add: places, recommendations, post-visit feedback, notes.",
          "- Your circle: the names of the people you add, their contact details if you provide them (phone, email), and the areas where you trust them.",
          "- Your conversations: the questions you ask WH3RE and its answers.",
          "- The emails you forward: only those you send yourself to your WH3RE address (sender, subject, text). WH3RE never has access to your inbox.",
          "- Requests to your network, and the replies of the people you asked.",
          "- Technical data: session and language cookies, daily usage counters, the host’s technical logs (IP address, date).",
          "- On wh3re.com (waitlist): your email, your language, your question if you write one, and who invited you. Anonymous, cookie-free visit statistics measure the page’s audience.",
        ],
      },
      {
        heading: "3. Why, and on what basis",
        body: [
          "- Providing the service (signing you in, keeping your memory, answering your questions): performance of the contract, i.e. the terms of use.",
          "- Reading the booking emails you forward: your explicit request. You can remove this source at any time.",
          "- Security, abuse prevention, usage limits: legitimate interest in keeping the service safe and available.",
          "- Service emails (sign-in link, your beta spot): performance of the contract. The waitlist: your consent, which you can withdraw with the unsubscribe link.",
        ],
      },
      {
        heading: "4. What WH3RE doesn’t do",
        body: [
          "- No selling or renting of your data.",
          "- No advertising, no ad profiling, no third-party trackers.",
          "- No public posting: nothing you add is visible outside your account without your action.",
          "- No training of AI models on your data.",
        ],
      },
      {
        heading: "5. Artificial intelligence",
        body: [
          "To understand your questions and sort the emails you forward, their content is sent to Anthropic’s API (Claude model). Anthropic acts as a processor: by default, it does not use this data to train its models and keeps it only for a limited time, under its commercial terms.",
        ],
      },
      {
        heading: "6. The people you ask",
        body: [
          "When someone replies through your private link, without an account, WH3RE stores their reply and the first name they give. Before sending, they see who their reply is for, and choose whether it may be reused for you later. If they decline, their reply only serves that question.",
          "The people you know never see that they are in your circle. They only see the questions you send them. Anyone can ask for their replies to be erased by writing to the address above.",
        ],
      },
      {
        heading: "7. Where your data lives",
        body: [
          "WH3RE relies on a few providers, bound by data processing agreements:",
          "- Supabase: database and sign-in;",
          "- Vercel: hosting of the site and the app;",
          "- Anthropic: understanding questions and sorting emails;",
          "- Resend: sending emails and receiving forwarded emails;",
          "- Google (Places): public information about places. Only search criteria (type of place, city) are sent, never your identity.",
          "Some are based in the United States. These transfers are covered by the European Commission’s standard contractual clauses or by the Data Privacy Framework. Israel benefits from a European Union adequacy decision.",
        ],
      },
      {
        heading: "8. How long",
        body: [
          "- Your account data and memory: as long as your account exists.",
          "- A source or item you delete: erased right away.",
          "- A deleted account: all your data is erased from the database immediately. Technical backups expire as they rotate, within 30 days at most.",
          "- Waitlist: until you join the beta or unsubscribe.",
          "- Technical logs: a few weeks at most, depending on the host.",
        ],
      },
      {
        heading: "9. Your rights",
        body: [
          "At any time, you can access your data, correct it, erase it, receive a copy in a readable format, object to or restrict its processing, and withdraw your consent.",
          `Most of this is done directly in Profile › Privacy. For anything else, write to ${LEGAL_CONTACT}: you will get an answer within a month.`,
          "You can also contact a data protection authority: the authority of your country in the European Union, or the Israeli Privacy Protection Authority.",
        ],
      },
      {
        heading: "10. Security",
        body: [
          "Traffic is encrypted (HTTPS). Every piece of data is tied to its owner, and the database refuses any access to other people’s data. Passwordless sign-in, with a single-use link. If a data breach affects you, you and the competent authority will be told within the legal deadlines.",
        ],
      },
      {
        heading: "11. Cookies",
        body: [
          "WH3RE only uses strictly necessary cookies: your session, your language, the page to return to after signing in, and the fact that you already accepted these terms on this device. No advertising or analytics cookies, so no banner.",
        ],
      },
      {
        heading: "12. Changes",
        body: [
          "If this policy changes significantly, you will be told by email before it takes effect. The date at the top of the page shows the latest version.",
        ],
      },
    ],
  },
};
