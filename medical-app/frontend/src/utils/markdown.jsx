/* Simple markdown → React JSX renderer (no external deps) */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text) {
  // Bold+Italic ***text*** or ___text___
  // Bold **text** or __text__
  // Italic *text* or _text_
  // Inline code `code`
  const parts = [];
  let remaining = text;
  let key = 0;

  const patterns = [
    { re: /\*\*\*(.+?)\*\*\*/,  render: (m) => <strong key={key++}><em>{parseInline(m[1])}</em></strong> },
    { re: /___(.+?)___/,         render: (m) => <strong key={key++}><em>{parseInline(m[1])}</em></strong> },
    { re: /\*\*(.+?)\*\*/,       render: (m) => <strong key={key++}>{parseInline(m[1])}</strong> },
    { re: /__(.+?)__/,            render: (m) => <strong key={key++}>{parseInline(m[1])}</strong> },
    { re: /\*(.+?)\*/,            render: (m) => <em key={key++}>{parseInline(m[1])}</em> },
    { re: /_([^_]+?)_/,           render: (m) => <em key={key++}>{parseInline(m[1])}</em> },
    { re: /`([^`]+?)`/,           render: (m) => <code key={key++}>{m[1]}</code> },
  ];

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIndex = Infinity;
    let matchResult = null;

    for (const p of patterns) {
      const m = p.re.exec(remaining);
      if (m && m.index < earliestIndex) {
        earliest = p;
        earliestIndex = m.index;
        matchResult = m;
      }
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    if (earliestIndex > 0) {
      parts.push(remaining.slice(0, earliestIndex));
    }
    parts.push(earliest.render(matchResult));
    remaining = remaining.slice(earliestIndex + matchResult[0].length);
  }

  return parts;
}

export function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === 'ol') {
      elements.push(<ol key={`list-${i}`}>{listItems.map((item, j) => <li key={j}>{item}</li>)}</ol>);
    } else {
      elements.push(<ul key={`list-${i}`}>{listItems.map((item, j) => <li key={j}>{item}</li>)}</ul>);
    }
    listItems = [];
    listType = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      flushList();
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<pre key={`pre-${i}`}><code className={lang ? `language-${lang}` : ''}>{codeLines.join('\n')}</code></pre>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={`hr-${i}`} />);
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1 || h2 || h3) {
      flushList();
      const level = h3 ? 3 : h2 ? 2 : 1;
      const content = (h3 || h2 || h1)[1];
      const Tag = `h${level}`;
      elements.push(<Tag key={`h-${i}`}>{parseInline(content)}</Tag>);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      elements.push(<blockquote key={`bq-${i}`}>{parseInline(line.slice(2))}</blockquote>);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(parseInline(olMatch[1]));
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+] (.+)/);
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(parseInline(ulMatch[1]));
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(<p key={`p-${i}`}>{parseInline(line)}</p>);
    i++;
  }

  flushList();
  return elements;
}

export default function Markdown({ content }) {
  return <>{renderMarkdown(content)}</>;
}
