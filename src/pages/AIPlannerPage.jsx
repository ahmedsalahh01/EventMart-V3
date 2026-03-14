import { motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useState } from "react";
import { loadProducts } from "../lib/products";
import "./../styles/ai-planner.css";

const EVENT_TYPES = ["Wedding", "Conference", "Concert", "Birthday", "Corporate", "Festival", "Exhibition"];
const VENUE_TYPES = ["Indoor", "Outdoor", "Hybrid", "Rooftop", "Banquet Hall", "Stadium"];
const WELCOME_MESSAGE = [
  "Welcome to the AI Event Planner!",
  "",
  "I'll help you build the perfect event setup. You can either:",
  "- Use the quick planner to get instant recommendations",
  "- Chat to describe your event in detail",
  "",
  "Let's create something amazing!"
].join("\n");

function formatMoney(value, currency = "USD") {
  if (!Number.isFinite(Number(value))) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value));
}

function getModeLabel(product) {
  if (product.buy_enabled && product.rent_enabled) return "Buy / Rent";
  if (product.buy_enabled) return "Buy";
  if (product.rent_enabled) return "Rent";
  return "Unavailable";
}

function getDisplayPrice(product) {
  if (product.buy_enabled && Number.isFinite(Number(product.buy_price))) {
    return formatMoney(product.buy_price, product.currency);
  }
  if (product.rent_enabled && Number.isFinite(Number(product.rent_price_per_day))) {
    return `${formatMoney(product.rent_price_per_day, product.currency)}/day`;
  }
  return "Price unavailable";
}

function pickProductsByEventType(eventType, products) {
  const categoryByType = {
    wedding: ["Woodworks", "Sound Systems", "Stages"],
    conference: ["Sound Systems", "Merchandise", "Woodworks"],
    concert: ["Stages", "Sound Systems", "Lighting"],
    birthday: ["Merchandise", "Sound Systems", "Woodworks"],
    corporate: ["Sound Systems", "Woodworks", "Stages"],
    festival: ["Stages", "Lighting", "Sound Systems"],
    exhibition: ["Woodworks", "Merchandise", "Stages"]
  };

  const targets = categoryByType[String(eventType || "").toLowerCase()] || [];
  const ranked = products.filter((product) => {
    if (!targets.length) return true;
    return targets.some((target) => String(product.category || "").toLowerCase().includes(target.toLowerCase()));
  });

  return ranked.slice(0, 5);
}

function buildLocalPlannerReply(prompt, context, products) {
  const eventType = context?.eventType || "Event";
  const attendees = Number(context?.attendees || 0) || 100;
  const budget = Number(context?.budget || 0) || 5000;
  const venue = context?.venue || "Indoor";
  const picked = pickProductsByEventType(eventType, products);

  const lines = [
    `### Your ${eventType} Plan`,
    `- **Attendees:** ${attendees}`,
    `- **Venue:** ${venue}`,
    `- **Budget:** ${formatMoney(budget)}`,
    "",
    "### Recommended Products"
  ];

  if (!picked.length) {
    lines.push("- Add products in Admin to get exact recommendations from your catalog.");
  } else {
    picked.forEach((product) => {
      lines.push(`- **${product.name}** (${getModeLabel(product)}) - ${getDisplayPrice(product)}`);
    });
  }

  lines.push(
    "",
    "### Suggested Timeline",
    "- 8 weeks before: confirm venue and major equipment",
    "- 4 weeks before: lock product quantities and delivery",
    "- 1 week before: final checklist and setup team confirmation",
    "- Event day: setup starts 4-6 hours before opening",
    "",
    `I can refine this plan further. Tell me changes for: "${prompt}".`
  );

  return lines.join("\n");
}

function renderInlineText(text) {
  const parts = String(text).split(/(\*\*.*?\*\*)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function renderMessageContent(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineText(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<p key={`empty-${blocks.length}`} />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={`heading-${blocks.length}`}>{trimmed.slice(4)}</h3>);
      return;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInlineText(trimmed)}</p>);
  });

  flushList();
  return blocks;
}

function AIPlannerPage() {
  const [planner, setPlanner] = useState({
    eventType: "",
    attendees: "",
    budget: "",
    venue: ""
  });
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME_MESSAGE }]);
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    loadProducts().then((rows) => {
      if (!cancelled) setProducts(rows);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const isQuickFormComplete = useMemo(
    () =>
      Boolean(
        planner.eventType &&
          Number(planner.attendees) > 0 &&
          Number(planner.budget) > 0 &&
          planner.venue
      ),
    [planner]
  );

  function addMessage(role, content) {
    setMessages((current) => [...current, { role, content: String(content || "") }]);
  }

  async function requestPlanner(prompt, context) {
    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: context || {},
          products: products.slice(0, 40)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data?.message === "string" && data.message.trim()) {
          return data.message.trim();
        }
      }
    } catch (_error) {
      // Fall back to the local planner reply below.
    }

    return buildLocalPlannerReply(prompt, context, products);
  }

  async function submitPlannerPrompt(prompt, context) {
    setIsTyping(true);
    try {
      const reply = await requestPlanner(prompt, context);
      addMessage("assistant", reply);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleQuickPlannerSubmit(event) {
    event.preventDefault();
    if (!isQuickFormComplete || isTyping) return;

    const context = {
      eventType: planner.eventType,
      attendees: Number(planner.attendees),
      budget: Number(planner.budget),
      venue: planner.venue
    };

    const prompt = `Plan a ${context.eventType} for ${context.attendees} attendees, budget ${context.budget}, venue type ${context.venue}.`;
    addMessage("user", prompt);
    await submitPlannerPrompt(prompt, context);
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const text = String(chatInput || "").trim();
    if (!text || isTyping) return;

    setChatInput("");
    addMessage("user", text);

    const context = {
      eventType: planner.eventType || "",
      attendees: Number(planner.attendees || 0),
      budget: Number(planner.budget || 0),
      venue: planner.venue || ""
    };

    await submitPlannerPrompt(text, context);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="planner-page" data-theme-scope="planner">
        <header className="planner-header">
          <div className="planner-header-content">
            <p className="planner-kicker">Powered by real AI planning</p>
            <h1>AI Event Planner</h1>
            <p>Get personalized equipment recommendations, fast equipment bundles, and event timelines built around your setup.</p>
            <div className="planner-hero-meta" aria-label="Planner capabilities">
              <span>Catalog-aware recommendations</span>
              <span>Budget-smart suggestions</span>
              <span>Instant event timelines</span>
            </div>
          </div>
        </header>

        <section className="planner-layout" aria-label="AI planner workspace">
        <aside className="quick-planner" aria-label="Quick planner form">
          <div className="panel-head">
            <p className="panel-kicker">Instant Setup</p>
            <h2>Quick Planner</h2>
            <p className="panel-copy">Drop in the basics and get a first-pass plan tailored to your event size, venue, and budget.</p>
          </div>

          <form id="quickPlannerForm" className="quick-planner-form" onSubmit={handleQuickPlannerSubmit}>
            <label htmlFor="eventTypeSelect">Event Type</label>
            <select
              id="eventTypeSelect"
              required
              value={planner.eventType}
              onChange={(event) => setPlanner((current) => ({ ...current, eventType: event.target.value }))}
            >
              <option value="">Choose event type</option>
              {EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <label htmlFor="attendeesInput">Number of attendees</label>
            <input
              id="attendeesInput"
              type="number"
              min="1"
              placeholder="Number of attendees"
              required
              value={planner.attendees}
              onChange={(event) => setPlanner((current) => ({ ...current, attendees: event.target.value }))}
            />

            <label htmlFor="budgetInput">Budget ($)</label>
            <input
              id="budgetInput"
              type="number"
              min="100"
              step="50"
              placeholder="Budget ($)"
              required
              value={planner.budget}
              onChange={(event) => setPlanner((current) => ({ ...current, budget: event.target.value }))}
            />

            <label htmlFor="venueTypeSelect">Venue Type</label>
            <select
              id="venueTypeSelect"
              required
              value={planner.venue}
              onChange={(event) => setPlanner((current) => ({ ...current, venue: event.target.value }))}
            >
              <option value="">Choose venue type</option>
              {VENUE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <button id="generatePlanBtn" type="submit" disabled={isTyping || !isQuickFormComplete}>
              Generate Plan
            </button>
          </form>
        </aside>

        <section className="chat-panel" aria-label="Planner chat">
          <div className="chat-panel-head">
            <div className="panel-head">
              <p className="panel-kicker">AI Workspace</p>
              <h2>Planner Chat</h2>
              <p className="panel-copy">Describe your event in your own words and let the planner refine the setup step by step.</p>
            </div>
            <span className="planner-status">AI online</span>
          </div>

          <div id="chatHistory" className="chat-history">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message-row ${message.role === "user" ? "user" : "assistant"}`}>
                <span className="message-avatar" aria-hidden="true">
                  {message.role === "user" ? "U" : "AI"}
                </span>
                <article className="message-bubble">{renderMessageContent(message.content)}</article>
              </div>
            ))}

            {isTyping ? (
              <div className="message-row">
                <span className="message-avatar" aria-hidden="true">
                  AI
                </span>
                <article className="message-bubble" aria-label="AI is typing">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              </div>
            ) : null}
          </div>

          <form id="chatForm" className="chat-input-row" onSubmit={handleChatSubmit}>
            <input
              id="chatInput"
              type="text"
              placeholder="Describe your event or ask a question..."
              autoComplete="off"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button id="sendBtn" type="submit" aria-label="Send message" disabled={isTyping}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 3 10 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="m21 3-7 18-4-7-7-4 18-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>
        </section>
      </main>
    </motion.div>
  );
}

export default AIPlannerPage;
