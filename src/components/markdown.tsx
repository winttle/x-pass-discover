import { Fragment, type ReactNode } from 'react';

/**
 * Minimal markdown renderer for first-party scenario content.
 *
 * Scenario resources are authored in this repository, not supplied by users,
 * so a small renderer is enough and avoids pulling in a parser plus a sanitiser.
 * It renders text as React nodes — it never uses `dangerouslySetInnerHTML`, so
 * there is no HTML injection path even if content later becomes editable.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${index++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const isTableRow = (line: string) => line.trimStart().startsWith('|');
const isTableDivider = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    blocks.push(<p key={`p${key++}`}>{renderInline(text, `p${key}`)}</p>);
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Fenced code
    if (line.trimStart().startsWith('```')) {
      flushParagraph();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push(
        <pre key={`code${key++}`}>
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Table
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushParagraph();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <table key={`t${key++}`}>
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th key={index}>{renderInline(cell, `th${index}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderInline(cell, `td${rowIndex}-${cellIndex}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    // Headings
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      blocks.push(
        level === 2 ? (
          <h2 key={`h${key++}`}>{content}</h2>
        ) : (
          <h3 key={`h${key++}`}>{content}</h3>
        ),
      );
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      flushParagraph();
      const body: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        body.push(lines[i].trimStart().slice(2));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <blockquote key={`q${key++}`}>
          {renderInline(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Lists
    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (unordered || ordered) {
      flushParagraph();
      const items: string[] = [];
      const matcher = unordered ? /^\s*[-*]\s+(.*)$/ : /^\s*\d+\.\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i].match(matcher);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      i -= 1;
      const content = items.map((item, index) => (
        <li key={index}>{renderInline(item, `li${index}`)}</li>
      ));
      blocks.push(
        unordered ? (
          <ul key={`l${key++}`}>{content}</ul>
        ) : (
          <ol key={`l${key++}`}>{content}</ol>
        ),
      );
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();

  return <div className="prose-xp">{blocks.map((block, index) => (
    <Fragment key={index}>{block}</Fragment>
  ))}</div>;
}
