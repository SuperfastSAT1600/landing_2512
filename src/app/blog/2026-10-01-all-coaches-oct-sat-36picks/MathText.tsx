'use client';

import { MathRenderer } from '../../diagnosis/components/MathRenderer';

interface Props {
  text: string;
  className?: string;
  block?: boolean;
}

type Segment =
  | { type: 'text'; content: string; display: false }
  | { type: 'math'; content: string; display: boolean };

function parseMath(text: string): Segment[] {
  const result: Segment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      result.push({ type: 'text', content: text.slice(last, m.index), display: false });
    }
    if (m[1] !== undefined) {
      result.push({ type: 'math', content: m[1], display: true });
    } else {
      result.push({ type: 'math', content: m[2], display: false });
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    result.push({ type: 'text', content: text.slice(last), display: false });
  }
  return result;
}

export function MathText({ text, className = '', block = false }: Props) {
  const Tag = block ? 'div' : 'span';
  return (
    <Tag className={className}>
      {parseMath(text).map((seg, i) =>
        seg.type === 'math' ? (
          <MathRenderer key={i} displayMode={seg.display}>
            {seg.content}
          </MathRenderer>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: seg.content }} />
        )
      )}
    </Tag>
  );
}
