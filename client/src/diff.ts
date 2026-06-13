/** Compute minimal insert/delete ops from old → new text. */
export function computeOps(
  oldText: string,
  newText: string
): Array<
  | { type: "insert"; pos: number; text: string }
  | { type: "delete"; pos: number; length: number }
> {
  const ops: Array<
    | { type: "insert"; pos: number; text: string }
    | { type: "delete"; pos: number; length: number }
  > = [];

  let prefix = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefix < minLen && oldText[prefix] === newText[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldText[oldText.length - 1 - suffix] ===
      newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldMid = oldText.slice(prefix, oldText.length - suffix);
  const newMid = newText.slice(prefix, newText.length - suffix);

  if (oldMid.length > 0) {
    ops.push({ type: "delete", pos: prefix, length: oldMid.length });
  }
  if (newMid.length > 0) {
    ops.push({ type: "insert", pos: prefix, text: newMid });
  }

  return ops;
}

/** Apply remote insert, adjusting local cursor if needed. */
export function applyRemoteInsert(
  content: string,
  pos: number,
  text: string,
  cursor: number,
  selStart: number,
  selEnd: number
): { content: string; cursor: number; selStart: number; selEnd: number } {
  const len = text.length;
  const adjust = (index: number) => {
    if (index > pos) return index + len;
    if (index === pos) return index + len;
    return index;
  };
  return {
    content: content.slice(0, pos) + text + content.slice(pos),
    cursor: adjust(cursor),
    selStart: adjust(selStart),
    selEnd: adjust(selEnd),
  };
}

export function applyRemoteDelete(
  content: string,
  pos: number,
  length: number,
  cursor: number,
  selStart: number,
  selEnd: number
): { content: string; cursor: number; selStart: number; selEnd: number } {
  const adjust = (index: number) => {
    if (index <= pos) return Math.min(index, pos);
    if (index >= pos + length) return index - length;
    return pos;
  };
  return {
    content: content.slice(0, pos) + content.slice(pos + length),
    cursor: adjust(cursor),
    selStart: adjust(selStart),
    selEnd: adjust(selEnd),
  };
}
