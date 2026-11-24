import { escapeHtml as esc } from "./finance.js";
export const slashCommands = [
  { id: "heading", label: "Heading", text: "## Heading\n" },
  { id: "checklist", label: "Checklist", text: "- [ ] Task\n" },
  { id: "code", label: "Code", text: "```csharp\n// Code\n```\n" },
  { id: "quote", label: "Quote", text: "> Quote\n" },
  { id: "toggle", label: "Collapsible section", text: ":::toggle Title\nContent\n:::\n" },
];
export function insertNoteBlock(body, start, end, command, text) {
  const item = slashCommands.find(c => c.id === command);
  if (!item) throw Error("Unknown note block.");
  const prefix = start > 0 && body[start - 1] !== "\n" ? "\n" : "";
  const inserted = prefix + (text || item.text);
  return { body: body.slice(0, start) + inserted + body.slice(end), cursor: start + inserted.length };
}
// Deliberately small Markdown subset. All content is escaped; raw HTML is never rendered.
export function renderNoteBlocks(body, offset = 0) {
  const lines = String(body || "").split("\n"), result = [];
  let code = null, quote = [], toggle = null;
  const flushQuote = () => { if (quote.length) { result.push(`<blockquote>${quote.map(esc).join("<br>")}</blockquote>`); quote = []; } };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (code) {
      if (/^```\s*$/.test(line)) { result.push(`<pre dir="ltr"><code>${esc(code.lines.join("\n"))}</code></pre>`); code = null; }
      else code.lines.push(line);
      continue;
    }
    if (toggle) {
      if (line === ":::") { result.push(`<details><summary>${esc(toggle.title)}</summary>${renderNoteBlocks(toggle.lines.join("\n"), toggle.offset)}</details>`); toggle = null; }
      else toggle.lines.push(line);
      continue;
    }
    if (line.startsWith("> ")) { quote.push(line.slice(2)); continue; }
    flushQuote();
    if (/^```/.test(line)) { code = { lines: [] }; continue; }
    if (line.startsWith(":::toggle ")) { toggle = { title: line.slice(10), lines: [], offset: offset + index + 1 }; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line), check = /^- \[([ xX])\]\s*(.*)$/.exec(line);
    if (heading) result.push(`<h${heading[1].length}>${esc(heading[2])}</h${heading[1].length}>`);
    else if (check) result.push(`<label class="note-block-check"><input type="checkbox" data-note-line="${offset + index}" ${check[1] !== " " ? "checked" : ""}><span>${esc(check[2])}</span></label>`);
    else result.push(line ? `<p>${esc(line)}</p>` : "<br>");
  }
  flushQuote();
  if (code) result.push(`<pre dir="ltr"><code>${esc(code.lines.join("\n"))}</code></pre>`);
  if (toggle) result.push(`<details><summary>${esc(toggle.title)}</summary>${renderNoteBlocks(toggle.lines.join("\n"), toggle.offset)}</details>`);
  return result.join("");
}
