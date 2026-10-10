// A hand-written sample scenario (fictional company and people).
// Used for "Try the sample shift": it skips the generation call, which
// makes demos faster and lets the UI load even when the API is slow.
// "{name}" is replaced with the graduate's first name at runtime.

import type { Scenario } from "./types";

export const SAMPLE_SCENARIO: Scenario = {
  company: {
    name: "TezTokri",
    industry: "Quick-commerce grocery delivery",
    city: "Lahore",
    about:
      "A 3-year-old startup delivering groceries in under 30 minutes across 6 Lahore neighbourhoods. About 120 employees and 400 riders.",
  },
  graduateTitle: "Junior Data Analyst",
  managerId: "sana",
  task: {
    title: "Did 'Free Delivery Weekends' work?",
    brief:
      "We ran Free Delivery Weekends in Johar Town for the last 3 weeks. Look at the attached numbers and tell me if it worked and whether we should extend it to more areas.",
    deliverable:
      "A short written summary for Sana (150-300 words): what happened, whether the promo worked, a clear recommendation, and any caveats.",
    deadline: "Today, 5:00 PM",
  },
  personas: [
    {
      id: "faisal",
      name: "Faisal Qureshi",
      title: "CEO & Co-founder",
      level: 1,
      reportsTo: null,
      department: "Leadership",
      isExternal: false,
      personality:
        "Very busy, replies in one short line, polite but direct. Uses 'Thanks' and the occasional 🙏. Dislikes long messages.",
      goals: "Preparing for the board call. Wants every team to show profitable growth, not growth at any cost.",
      canApprove: ["spending above PKR 500,000", "launching promos in new cities or areas"],
      privateFacts: [
        {
          id: "f1",
          fact: "The board now judges every promo on contribution margin per order, not on order count. Growth that loses money per order will be rejected.",
          whyItMatters: "The recommendation must look at profit per order, not just whether orders went up.",
        },
      ],
    },
    {
      id: "sana",
      name: "Sana Malik",
      title: "Head of Growth",
      level: 2,
      reportsTo: "faisal",
      department: "Growth",
      isExternal: false,
      personality:
        "Supportive but stretched thin. Clear, friendly, 2-3 sentences. Appreciates proactive updates. Says 'theek hai' and 'great' a lot.",
      goals: "Wants a crisp answer she can take to Faisal. Hopes the promo can be extended because it was her idea.",
      canApprove: ["deadline changes", "what goes into the analysis", "sharing numbers with the client"],
      privateFacts: [
        {
          id: "f2",
          fact: "The free-delivery cost is co-funded 50/50 with our partner Crunchwala Snacks, so TezTokri only paid half of the extra delivery cost.",
          whyItMatters: "The real cost to TezTokri is half the delivery subsidy, which changes the margin maths.",
        },
      ],
    },
    {
      id: "bilal",
      name: "Bilal Ahmed",
      title: "Senior Data Analyst",
      level: 3,
      reportsTo: "sana",
      department: "Growth",
      isExternal: false,
      personality:
        "Helpful, nerdy, very busy with a dashboard migration. Short replies, sometimes 'bhai' or 'yaar'. Likes when people ask precise questions.",
      goals: "Wants analyses done properly with a comparison group. Annoyed by people who only look at totals.",
      canApprove: ["data definitions", "which tables are trusted"],
      privateFacts: [
        {
          id: "f3",
          fact: "Week 3 Johar Town was loaded twice because of a pipeline bug, so that row is duplicated in the export.",
          whyItMatters: "Counting the duplicate inflates Johar Town's promo-period orders.",
        },
        {
          id: "f4",
          fact: "DHA had no promo and is similar in size, so it's the right control area. Compare Johar Town's growth against DHA's, not against zero.",
          whyItMatters: "Without a control, seasonal or citywide growth gets credited to the promo.",
        },
      ],
    },
    {
      id: "hira",
      name: "Hira Khan",
      title: "Data Analyst",
      level: 4,
      reportsTo: "sana",
      department: "Growth",
      isExternal: false,
      personality:
        "Friendly, chatty, lots of emoji, mixes Roman Urdu and English ('yaar', 'scene on hai'). Confident, sometimes too quick to conclude.",
      goals: "Thinks the promo was obviously a huge success because orders went up. Wants to be seen as helpful to the new hire.",
      canApprove: [],
      privateFacts: [
        {
          id: "f5",
          fact: "The Sunday of week 3 had a big cricket final, and orders spiked across ALL areas that day, not just Johar Town.",
          whyItMatters: "Part of the week-3 jump is a citywide event, not the promo.",
        },
      ],
    },
    {
      id: "usman",
      name: "Usman Tariq",
      title: "Operations Lead",
      level: 3,
      reportsTo: "faisal",
      department: "Operations",
      isExternal: false,
      personality:
        "Practical and blunt, protective of his riders. Formal-ish English with 'jee'. Replies only when asked something concrete.",
      goals: "Wants nobody to promise riders capacity he doesn't have.",
      canApprove: ["rider allocation", "delivery-time targets"],
      privateFacts: [
        {
          id: "f6",
          fact: "On promo weekends in Johar Town, late deliveries rose from 6% to 19% and we had to pay riders overtime of about PKR 40 extra per order.",
          whyItMatters: "Extra rider cost and worse service are hidden costs of the promo, and extending it needs more riders.",
        },
      ],
    },
    {
      id: "kamran",
      name: "Kamran Sheikh",
      title: "Trade Marketing Manager, Crunchwala Snacks",
      level: 0,
      reportsTo: null,
      department: "Partner",
      isExternal: true,
      personality:
        "Polite, a bit pushy, formal ('Dear', 'Kindly'). Always steers the conversation to his brand's numbers.",
      goals: "Wants proof his co-funding is paying off and wants the promo extended at TezTokri's expense.",
      canApprove: ["Crunchwala's share of promo funding"],
      privateFacts: [
        {
          id: "f7",
          fact: "Crunchwala will only keep co-funding if their snack sales in Johar Town grow at least 10%. So far they grew about 4%.",
          whyItMatters: "If the partner pulls out, TezTokri pays the full delivery subsidy and the economics get worse.",
        },
      ],
    },
  ],
  attachments: [
    {
      id: "a1",
      name: "promo_orders_weekly.csv",
      kind: "table",
      content: [
        "week,area,promo_active,orders,avg_basket_pkr,delivery_cost_per_order_pkr",
        "W0 (before),Johar Town,No,1180,2650,165",
        "W0 (before),DHA,No,1420,3100,160",
        "W1,Johar Town,Yes,1510,2420,210",
        "W1,DHA,No,1460,31.2,158",
        "W2,Johar Town,Yes,1620,2380,225",
        "W2,DHA,No,1490,3060,162",
        "W3,Johar Town,Yes,1890,2350,240",
        "W3,Johar Town,Yes,1890,2350,240",
        "W3,DHA,No,1720,3120,170",
      ].join("\n"),
    },
  ],
  attachmentIssues: [
    "The W3 Johar Town row appears twice (duplicate load), inflating promo-period orders.",
    "W1 DHA avg_basket_pkr is 31.2 instead of about 3,120: a unit/decimal error.",
  ],
  kickoff: [
    {
      id: "k1",
      from: "faisal",
      channel: "general",
      text: "Everyone please welcome {name}, who joins the Growth team today as a Junior Data Analyst. Welcome aboard! 🙏",
    },
    {
      id: "k2",
      from: "sana",
      channel: "team",
      text: "Hi {name}, welcome! First task: we ran Free Delivery Weekends in Johar Town for 3 weeks. The numbers are in promo_orders_weekly.csv. Can you tell me if it worked and whether we should extend it to more areas? Short summary by 5 PM please. Bilal and Hira can help.",
    },
    {
      id: "k3",
      from: "hira",
      channel: "dm:hira",
      text: "Welcome {name}!! 🎉 Lunch is at 1, join us. Btw easy task yaar, orders went from 1180 to 1890 in Johar Town, the promo clearly worked 😄",
    },
  ],
  curveballs: [
    {
      id: "c1",
      from: "faisal",
      channel: "general",
      afterMessages: 4,
      text: "Team, the board call has moved to 3 PM today. Leads, please send me your key numbers before then. Thanks 🙏",
    },
    {
      id: "c2",
      from: "sana",
      channel: "team",
      afterMessages: 4,
      text: "@{name} heads-up: because of the board call I need your summary by 2:30 PM now, not 5. Keep it to the key points and one clear recommendation.",
    },
    {
      id: "c3",
      from: "kamran",
      channel: "client",
      afterMessages: 8,
      text: "Dear {name}, kindly also include Crunchwala's snack sales in your analysis and confirm today that the promo will be extended to DHA and Gulberg. We are expecting this.",
    },
  ],
};
