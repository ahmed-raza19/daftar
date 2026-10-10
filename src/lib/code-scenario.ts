// Code Shift: a hand-written scenario for an AI/ML Engineer (fictional company and people).
// The graduate implements classify_ticket() in Python. Hidden tests really run in the
// browser. Each teammate's private fact maps to a hidden test, so asking the right
// people the right questions is how you get the tests green.
// "{name}" is replaced with the graduate's first name at runtime.

import type { Scenario } from "./types";

const TICKET_STORE = `# ticket_store.py  (backend module, written by Zainab)
# Calls classify_ticket(text) from classifier.py (your module).

def create_ticket(db, text):
    result = classify_ticket(text)
    ticket = {
        "id": len(db) + 1,
        "text": text,
        "category": result["category"],
        "priority": result.get("priority", "medium"),
    }
    db.append(ticket)
    return ticket

def get_tickets(db, priority=None):
    if priority is None:
        return list(db)
    return [t for t in db if t["priority"] == priority]
`;

const CONTRACT = `CONTRACT v1: ticket triage (owner: Saad, Tech Lead)

classifier.py  (owner: new AI/ML engineer)
  classify_ticket(text: str) -> dict
  returns {"category": "billing" | "bug" | "account",
           "priority": "low" | "med" | "high"}

ticket_store.py  (owner: Zainab)
  create_ticket(db: list, text: str) -> dict   # calls classify_ticket
  get_tickets(db: list, priority: str | None = None) -> list

Tests: Hamza (QA) runs the hidden suite on every change.
Nothing ships to Kapra Kart with a red test.`;

const STARTER = `def classify_ticket(text):
    """Triage one customer support ticket.

    Returns a dict:
        {"category": "billing" | "bug" | "account",
         "priority": "low" | "med" | "high"}
    """
    # TODO: replace this placeholder with your logic
    return {"category": "bug", "priority": "low"}
`;

const TESTS = String.raw`
classify = candidate.get("classify_ticket")
CATS = {"billing", "bug", "account"}
PRIOS = {"low", "med", "high"}

TICKETS = [
    ("I was charged twice for my order #4471, please refund", "billing", "high"),
    ("COD payment not reflecting in my order status", "billing", "med"),
    ("Invoice for last month shows the wrong amount", "billing", "med"),
    ("Chargeback filed by a customer, need transaction details asap", "billing", "high"),
    ("Can I get a GST invoice copy for my purchase?", "billing", "low"),
    ("App crashes when I open the cart page", "bug", "med"),
    ("Checkout button not working on Android", "bug", "med"),
    ("Images not loading on the product page", "bug", "med"),
    ("Search shows wrong results for lawn suits", "bug", "med"),
    ("Feature request: please add dark mode", "bug", "low"),
    ("I am locked out of my account after the OTP failed", "account", "high"),
    ("My account was hacked, someone changed my email", "account", "high"),
    ("How do I change my password?", "account", "low"),
    ("Please delete my account and data", "account", "low"),
    ("Fraud alert: unknown orders placed from my account", "account", "high"),
    ("MY CARD WAS CHARGED TWICE FOR ONE ORDER", "billing", "high"),
    ("mera account band ho gaya hai, login nahi ho raha", "account", "high"),
    ("paisay wapas karo, order cancel kiya tha", "billing", "high"),
    ("do dafa paisay kat gaye card se", "billing", "high"),
    ("app bar bar band ho rahi hai", "bug", "med"),
    ("COD ka payment abhi tak show nahi ho raha", "billing", "med"),
    ("password kaise change karun?", "account", "low"),
    ("checkout pe error aa raha hai", "bug", "med"),
    ("kisi ne mera account hack kar liya", "account", "high"),
]
ENGLISH = TICKETS[:16]
ROMAN = TICKETS[16:]
URGENT_WORDS = ("fraud", "hacked", "chargeback", "charged twice", "locked out")
URGENT = [t for t in ENGLISH if any(w in t[0].lower() for w in URGENT_WORDS)]

def run(text):
    r = classify(text)
    assert isinstance(r, dict), f"classify_ticket({text!r}) returned {type(r).__name__}, expected a dict"
    return r

def t_contract():
    assert callable(classify), "classify_ticket is not defined"
    r = run("App crashes on login")
    assert "category" in r and "priority" in r, f"missing keys, got {sorted(r)}"
check("Returns a dict with 'category' and 'priority'", t_contract)

def t_labels():
    bad = []
    for text, _, _ in TICKETS:
        r = run(text)
        if r.get("category") not in CATS or r.get("priority") not in PRIOS:
            bad.append(f"{text[:32]!r} -> {r}")
    assert not bad, f"{len(bad)} tickets got labels outside the contract, e.g. {bad[0]}"
check("Uses only the contract labels (billing|bug|account, low|med|high)", t_labels)

def t_empty():
    for value in (None, "", "   "):
        r = run(value)
        assert r.get("category") in CATS and r.get("priority") in PRIOS, f"input {value!r} returned {r}"
check("Handles None and empty text without crashing", t_empty)

def t_caps():
    r = run("MY CARD WAS CHARGED TWICE FOR ONE ORDER")
    assert r.get("category") == "billing", f"an ALL CAPS billing ticket was classified as {r.get('category')!r}"
check("Works on ALL CAPS text", t_caps)

def accuracy(rows):
    hits = sum(1 for text, cat, _ in rows if run(text).get("category") == cat)
    return hits, len(rows)

def t_accuracy():
    hits, n = accuracy(TICKETS)
    assert hits / n >= 0.75, f"category accuracy {hits}/{n} ({hits * 100 // n}%), need 75%"
check("Category accuracy of at least 75% on 24 real tickets", t_accuracy)

def t_roman():
    hits, n = accuracy(ROMAN)
    assert hits >= 5, f"Roman Urdu category accuracy {hits}/{n}, need at least 5"
check("Understands Roman Urdu tickets (at least 5 of 8)", t_roman)

def t_urgent():
    missed = [text for text, _, _ in URGENT if run(text).get("priority") != "high"]
    assert not missed, f"{len(missed)} urgent tickets not marked high, e.g. {missed[0]!r}"
check("Fraud, hacked, chargeback, charged twice, locked out are always high", t_urgent)

def t_no_low_urgent():
    wrong = [text for text, _, p in TICKETS if p == "high" and run(text).get("priority") == "low"]
    assert len(wrong) <= 1, f"{len(wrong)} high-priority tickets were marked low, e.g. {wrong[0]!r}"
check("Never marks urgent tickets as low (at most 1 miss)", t_no_low_urgent)

STORE = '''${TICKET_STORE}'''

def t_integration():
    ns = {"classify_ticket": classify}
    exec(STORE, ns)
    db = []
    for text, _, _ in ENGLISH:
        ns["create_ticket"](db, text)
    high = [t["text"] for t in ns["get_tickets"](db, priority="high")]
    assert "My account was hacked, someone changed my email" in high, "the hacked-account ticket is missing from get_tickets(priority='high')"
    assert all(t["priority"] in PRIOS for t in db), "a stored ticket has a priority outside low|med|high"
check("Integrates with Zainab's ticket_store (create_ticket / get_tickets)", t_integration)

if flags.get("refund_rule"):
    def t_refund():
        for text in ("Please refund my order, it never arrived", "paisay wapas karo, order cancel kiya tha"):
            p = run(text).get("priority")
            assert p == "high", f"{text!r} has priority {p!r}; Kapra Kart now requires high"
    check("Refund tickets are high priority (new Kapra Kart request)", t_refund)
`;

export const CODE_SCENARIO: Scenario = {
  company: {
    name: "Rabta",
    industry: "Customer-support software (SaaS)",
    city: "Islamabad",
    about:
      "A 40-person startup whose helpdesk software is used by Pakistani online stores. This week Rabta is piloting its first AI feature, automatic ticket triage, with the clothing store Kapra Kart.",
  },
  graduateTitle: "Associate AI/ML Engineer",
  managerId: "omer",
  task: {
    title: "Ship automatic ticket triage (classify_ticket)",
    brief:
      "Implement classify_ticket() in classifier.py so Zainab's ticket store can auto-triage incoming support tickets for Kapra Kart. Saad's contract is in contract.md. Hamza's hidden tests decide whether it ships.",
    deliverable:
      "Your code in the Code tab (run the tests), plus a short note to Omer (80-200 words): your approach, test results, and known limitations.",
    deadline: "Today, 5:00 PM",
  },
  personas: [
    {
      id: "nadia",
      name: "Nadia Hussain",
      title: "CEO & Co-founder",
      level: 1,
      reportsTo: null,
      department: "Leadership",
      isExternal: false,
      personality: "Busy, upbeat, replies in one line, uses 🚀. Friendly but formal English.",
      goals: "Win Kapra Kart as the first paying customer of the AI triage feature.",
      canApprove: ["pricing and contracts with clients", "shipping a feature to a client"],
      privateFacts: [
        {
          id: "f1",
          fact: "Kapra Kart will judge the pilot on one thing: urgent tickets must never be marked low. A missed urgent ticket costs far more than a false alarm.",
          whyItMatters: "When unsure, err towards higher priority; recall on urgent tickets matters more than precision.",
        },
      ],
    },
    {
      id: "omer",
      name: "Omer Farooq",
      title: "Engineering Manager",
      level: 2,
      reportsTo: "nadia",
      department: "Engineering",
      isExternal: false,
      personality: "Calm and structured, 2-3 sentences, likes clear status updates. Says 'theek hai' and 'sounds good'.",
      goals: "Ship a simple, reliable v1 on time. Dislikes over-engineering.",
      canApprove: ["deadline changes", "scope changes to client work", "what ships in v1"],
      privateFacts: [
        {
          id: "f2",
          fact: "For v1 a clear rule-based classifier is preferred over a trained ML model: it's explainable to the client and easy to fix. ML comes in v2, once we have about 5,000 labelled tickets.",
          whyItMatters: "A simple, explainable approach is what the manager actually wants for v1.",
        },
      ],
    },
    {
      id: "saad",
      name: "Saad Mirza",
      title: "Tech Lead",
      level: 3,
      reportsTo: "omer",
      department: "Engineering",
      isExternal: false,
      personality: "Precise and terse, writes like code-review comments. Occasionally says 'bhai'.",
      goals: "Keep interfaces stable; no surprises at integration time.",
      canApprove: ["interface and contract changes", "code merges"],
      privateFacts: [
        {
          id: "f3",
          fact: "Tickets that only contain an image arrive with text=None, and some arrive as empty strings. classify_ticket must never crash on those.",
          whyItMatters: "Guarding against None and empty input keeps the whole pipeline from crashing.",
        },
        {
          id: "f4",
          fact: "Zainab's create_ticket falls back to 'medium' if priority is missing, which breaks the low|med|high enum. Always return a priority so that fallback never triggers.",
          whyItMatters: "Returning a complete, valid dict every time avoids a hidden integration bug.",
        },
      ],
    },
    {
      id: "zainab",
      name: "Zainab Ali",
      title: "Backend Developer",
      level: 4,
      reportsTo: "omer",
      department: "Engineering",
      isExternal: false,
      personality: "Friendly and fast, lots of emoji, mixes Roman Urdu ('yaar', 'scene on hai'). Confident, sometimes cuts corners.",
      goals: "Wants integration done quickly so she can move to her next task. Thinks returning a 'billing-high' string would be simpler than a dict.",
      canApprove: [],
      privateFacts: [
        {
          id: "f5",
          fact: "Her ticket_store passes the ticket text exactly as the customer typed it: no lower-casing or cleanup, and lots of tickets are written in ALL CAPS.",
          whyItMatters: "The classifier has to normalise case itself.",
        },
      ],
    },
    {
      id: "hamza",
      name: "Hamza Qureshi",
      title: "QA Engineer",
      level: 4,
      reportsTo: "omer",
      department: "Engineering",
      isExternal: false,
      personality: "Methodical and polite. Files bugs with IDs like BUG-201 and never hands over the fix.",
      goals: "Nothing ships with a red test.",
      canApprove: ["test sign-off (green or red)"],
      privateFacts: [
        {
          id: "f6",
          fact: "About a third of the hidden test tickets are in Roman Urdu, e.g. 'paisay wapas karo' (refund), 'account band ho gaya' (locked out), 'do dafa paisay kat gaye' (charged twice).",
          whyItMatters: "Keyword rules need Roman Urdu terms too, or a third of real tickets will be misrouted.",
        },
      ],
    },
    {
      id: "farah",
      name: "Farah Javed",
      title: "Customer Support Lead",
      level: 3,
      reportsTo: "nadia",
      department: "Customer Support",
      isExternal: false,
      personality: "Warm and practical, speaks from the support floor's point of view, answers with concrete examples.",
      goals: "Her agents are drowning in tickets; she wants urgent ones surfaced first.",
      canApprove: ["what counts as urgent for support"],
      privateFacts: [
        {
          id: "f7",
          fact: "For support, these always mean urgent: fraud, hacked, chargeback, charged twice, locked out.",
          whyItMatters: "These words should force priority 'high'.",
        },
      ],
    },
    {
      id: "mehwish",
      name: "Mehwish Tariq",
      title: "HR Manager",
      level: 3,
      reportsTo: "nadia",
      department: "People & HR",
      isExternal: false,
      personality: "Friendly and organised, formal English, ends reminders with 🙂.",
      goals: "Smooth onboarding; everyone posts their standup on time.",
      canApprove: ["leave and timing exceptions"],
      privateFacts: [
        {
          id: "f8",
          fact: "Standup is at 4 PM: every engineer posts done / doing / blockers in #team. Managers look at standups during probation.",
          whyItMatters: "Posting a clear standup update is part of being a reliable new hire.",
        },
      ],
    },
    {
      id: "kashif",
      name: "Mr. Kashif Iqbal",
      title: "Head of Customer Care, Kapra Kart",
      level: 0,
      reportsTo: null,
      department: "Client",
      isExternal: true,
      personality: "Polite but pushy, formal ('Dear', 'Kindly'), treats everything as urgent.",
      goals: "Zero missed urgent tickets, and extra features without extra cost.",
      canApprove: ["Kapra Kart's acceptance of the pilot"],
      privateFacts: [
        {
          id: "f9",
          fact: "Most Kapra Kart complaints are about COD (cash on delivery): any 'COD' ticket is a billing issue, not an account issue.",
          whyItMatters: "'COD' should map to billing.",
        },
      ],
    },
  ],
  attachments: [
    { id: "a1", name: "contract.md", kind: "text", content: CONTRACT },
    { id: "a2", name: "ticket_store.py", kind: "code", content: TICKET_STORE.trimEnd() },
    {
      id: "a3",
      name: "sample_tickets.csv",
      kind: "table",
      content: [
        "text,category,priority",
        "Payment deducted but order shows unpaid,billing,med",
        "App freezes on the payment screen,bug,med",
        "Someone logged into my account from another city,account,high",
        "How can I download my invoice?,billing,low",
        "card se do dafa paisay kat gaye,billing,low",
        "Login OTP not arriving,account,med",
        "Product page shows wrong price,bug,med",
        "Please close my account,account,low",
      ].join("\n"),
    },
  ],
  attachmentIssues: [
    "sample_tickets.csv labels 'card se do dafa paisay kat gaye' (charged twice) as low priority; it should be high.",
    "ticket_store.py's create_ticket falls back to priority 'medium', which is not a valid label (low|med|high).",
  ],
  kickoff: [
    {
      id: "k1",
      from: "nadia",
      channel: "general",
      text: "Welcome {name} to Rabta! Our first AI feature goes to Kapra Kart this week, and you're building the brain of it 🚀",
    },
    {
      id: "k2",
      from: "omer",
      channel: "team",
      text: "Hi {name}! Your task: implement classify_ticket() in classifier.py (Code tab). Saad's contract is in contract.md, Zainab's ticket_store.py calls your function, and Hamza's hidden tests decide if it ships. Tests green and a short note to me by 5 PM please.",
    },
    {
      id: "k3",
      from: "saad",
      channel: "team",
      text: "Contract is in contract.md. Stick to the exact labels. Ask if anything is unclear, don't guess.",
    },
    {
      id: "k4",
      from: "zainab",
      channel: "dm:zainab",
      text: "Welcome {name}!! 😄 Honestly yaar, just return a string like 'billing-high', my store can split it. Dict is overkill 😅",
    },
  ],
  curveballs: [
    {
      id: "c1",
      from: "nadia",
      channel: "general",
      afterMessages: 4,
      text: "Team, Kapra Kart moved the pilot demo to tomorrow 10 AM. Let's make sure triage is solid today 🚀",
    },
    {
      id: "c2",
      from: "omer",
      channel: "team",
      afterMessages: 4,
      text: "@{name} because the demo moved up, I need tests green and your note by 3 PM instead of 5. Theek hai?",
    },
    {
      id: "c3",
      from: "mehwish",
      channel: "general",
      afterMessages: 6,
      text: "Gentle reminder: standup is at 4 PM today. Please post done / doing / blockers in #team 🙂",
    },
    {
      id: "c4",
      from: "kashif",
      channel: "client",
      afterMessages: 8,
      text: "Dear {name}, starting today kindly make any ticket that mentions a refund (or 'paisay wapas') HIGH priority. Our customers escalate these to chargebacks.",
    },
  ],
  codeTask: {
    language: "python",
    fileName: "classifier.py",
    functionName: "classify_ticket",
    starterCode: STARTER,
    tests: TESTS,
    qaId: "hamza",
    testFlags: { c4: "refund_rule" },
  },
};
