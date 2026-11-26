import { escapeHtml as esc } from "./finance.js";
function inline(source) {
  const tokens = [];
  let text = esc(source).replace(/`([^`]+)`/g, (_, code) => {
    tokens.push(`<code dir="ltr">${code}</code>`);
    return `\u0000${tokens.length - 1}\u0000`;
  });
  text = text.replace(/!?\[([^\]]+)\]\(([^\s)]+)\)/g, (all, label, href) => {
    if (all.startsWith("!")) return label;
    const raw = href
      .replaceAll("&amp;", "&")
      .replaceAll("&#39;", "'")
      .replaceAll("&quot;", '"');
    if (!/^(https?:\/\/|#[\w-])/i.test(raw)) return label;
    tokens.push(
      `<a href="${esc(raw)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );
    return `\u0000${tokens.length - 1}\u0000`;
  });
  text = text
    .replace(
      /\*\*(.+?)\*\*|__(.+?)__/g,
      (_, a, b) => `<strong>${a || b}</strong>`,
    )
    .replace(/\*([^*]+)\*|_([^_]+)_/g, (_, a, b) => `<em>${a || b}</em>`)
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
  return text.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)] || "");
}
export function renderMarkdown(source, depth = 0) {
  if (depth > 8) return `<p dir="auto">${esc(source)}</p>`;
  const lines = String(source)
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .split("\n"),
    out = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }
    const fence = /^\s*(```+|~~~+)\s*(.*)$/.exec(line);
    if (fence) {
      const code = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith(fence[1]))
        code.push(lines[index++]);
      index++;
      out.push(`<pre dir="ltr"><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);
    if (heading) {
      out.push(
        `<h${heading[1].length} dir="auto">${inline(heading[2])}</h${heading[1].length}>`,
      );
      index++;
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push("<hr>");
      index++;
      continue;
    }
    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
    ) {
      const cells = (s) =>
        s
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((x) => inline(x.trim()));
      const heads = cells(line);
      index += 2;
      const rows = [];
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      )
        rows.push(
          `<tr>${cells(lines[index++])
            .map((c) => `<td dir="auto">${c}</td>`)
            .join("")}</tr>`,
        );
      out.push(
        `<div class="language-table-wrap"><table dir="auto"><thead><tr>${heads.map((h) => `<th dir="auto">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index]))
        quote.push(lines[index++].replace(/^\s*> ?/, ""));
      out.push(
        `<blockquote>${renderMarkdown(quote.join("\n"), depth + 1)}</blockquote>`,
      );
      continue;
    }
    const list = /^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (list) {
      const ordered = !!list[2],
        items = [];
      while (index < lines.length) {
        const item = /^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/.exec(lines[index]);
        if (!item || !!item[2] !== ordered) break;
        index++;
        const task = /^\[([ xX])\]\s*(.*)$/.exec(item[3]);
        items.push(
          `<li dir="auto">${task ? `${task[1] === " " ? "☐" : "☑"} ${inline(task[2])}` : inline(item[3])}</li>`,
        );
      }
      out.push(
        `<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`,
      );
      continue;
    }
    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|\s*[-+*>]\s|\s*\d+\.\s|\s*```|\s*~~~)/.test(lines[index]) &&
      !(lines[index].includes("|") && /---/.test(lines[index + 1] || ""))
    )
      paragraph.push(lines[index++]);
    out.push(`<p dir="auto">${paragraph.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
