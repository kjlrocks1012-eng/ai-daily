// Fetches the past week's AI news with the Claude API (web search restricted to
// trusted outlets) and merges it into news.json. Run by GitHub Actions.
import { readFile, writeFile } from "node:fs/promises";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("Missing ANTHROPIC_API_KEY secret."); process.exit(1); }

const MODEL = "claude-sonnet-5-5";
const NEWS_FILE = new URL("../news.json", import.meta.url);
const KEEP_DAYS = 60;      // drop stories older than this
const MAX_STORIES = 200;

// Only stories from these outlets (and their subdomains) are allowed.
// Add or remove domains here to change what counts as "credible".
const TRUSTED = [
  "bloomberg.com", "cnbc.com", "axios.com", "techcrunch.com",
  "technologyreview.com", "spectrum.ieee.org", "venturebeat.com", "nature.com",
  "utilitydive.com", "datacenterdynamics.com", "datacenterknowledge.com",
  "iea.org", "energy.gov", "news.un.org",
  "openai.com", "anthropic.com", "blog.google", "deepmind.google",
  "ai.meta.com", "nvidianews.nvidia.com", "blogs.microsoft.com", "mistral.ai"
];

const CATEGORIES = {
  models: "new AI models, products, features and company announcements",
  money: "funding rounds, acquisitions, IPOs and major AI investment",
  power: "AI data centers, chips, electricity demand, grid and energy infrastructure",
  policy: "regulation, government action, legal cases, safety and security",
  research: "studies, surveys, scientific results and benchmarks"
};

const today = new Date().toISOString().slice(0, 10);
const prompt = `Today is ${today}. Find the most important artificial intelligence news from the past 7 days.
Search several times to cover each category:
${Object.entries(CATEGORIES).map(([k, v]) => `- "${k}": ${v}`).join("\n")}

Pick 15 to 25 stories, at least 2 per category. Only use stories you actually found in search results, with the exact article URL from the results. Never invent a URL.

Reply with ONLY a JSON array, no other text and no code fences. Each item:
{"title": "short headline in your own words",
 "summary": "1-2 plain-English sentences in your own words explaining what happened and why it matters",
 "category": one of ${Object.keys(CATEGORIES).map(k => `"${k}"`).join(", ")},
 "source": "publication name, e.g. Reuters",
 "url": "article URL",
 "published": "YYYY-MM-DD"}`;

async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 12, allowed_domains: TRUSTED }],
      messages
    })
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function isTrusted(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return TRUSTED.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

// Run the conversation; server tools can pause long turns, so continue if asked.
const messages = [{ role: "user", content: prompt }];
let data;
for (let i = 0; i < 5; i++) {
  data = await callClaude(messages);
  if (data.stop_reason !== "pause_turn") break;
  messages.push({ role: "assistant", content: data.content });
}

const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
const jsonText = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
let fresh;
try { fresh = JSON.parse(jsonText); }
catch { console.error("Could not read Claude's reply as JSON:\n", text); process.exit(1); }

const addedAt = new Date().toISOString();
const valid = fresh.filter(s =>
  s && s.title && s.summary && s.url && CATEGORIES[s.category] &&
  /^\d{4}-\d{2}-\d{2}$/.test(s.published || "") && isTrusted(s.url)
).map(s => ({ ...s, id: s.url, addedAt }));
console.log(`Claude returned ${fresh.length} stories; ${valid.length} passed checks.`);

let existing = { stories: [] };
try { existing = JSON.parse(await readFile(NEWS_FILE, "utf8")); } catch {}

const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
const seen = new Set();
const merged = [...existing.stories, ...valid]
  .filter(s => !seen.has(s.url) && seen.add(s.url))
  .filter(s => s.published >= cutoff)
  .sort((a, b) => b.published.localeCompare(a.published))
  .slice(0, MAX_STORIES);

await writeFile(NEWS_FILE, JSON.stringify({ updatedAt: addedAt, stories: merged }, null, 2) + "\n");
console.log(`news.json now holds ${merged.length} stories.`);
