import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { RemoteCursor } from "./types";
import "./CollaborativeEditor.css";

interface Props {
  content: string;
  remoteCursors: Record<string, RemoteCursor>;
  myColor: string;
  onChange: (
    text: string,
    cursor: number,
    selStart: number,
    selEnd: number,
  ) => void;
  onSelectionChange: (cursor: number, selStart: number, selEnd: number) => void;
  registerCallback: (
    fn: (
      content: string,
      cursor: number,
      selStart: number,
      selEnd: number,
    ) => void,
  ) => void;
}

function measureCaretPosition(
  textarea: HTMLTextAreaElement,
  index: number,
): { top: number; left: number; height: number } {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  const props = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "padding",
    "border",
    "boxSizing",
    "width",
    "whiteSpace",
    "wordWrap",
    "overflowWrap",
  ] as const;

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  props.forEach((p) => {
    mirror.style[p] = style[p];
  });
  mirror.style.width = `${textarea.clientWidth}px`;

  const text = textarea.value.substring(0, index);
  mirror.textContent = text;
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(index) || ".";
  mirror.appendChild(span);

  document.body.appendChild(mirror);
  const spanRect = span.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  document.body.removeChild(mirror);

  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
  return {
    top:
      spanRect.top -
      mirrorRect.top -
      textarea.scrollTop +
      parseFloat(style.paddingTop),
    left:
      spanRect.left -
      mirrorRect.left -
      textarea.scrollLeft +
      parseFloat(style.paddingLeft),
    height: lineHeight,
  };
}

export default function CollaborativeEditor({
  content,
  remoteCursors,
  myColor,
  onChange,
  onSelectionChange,
  registerCallback,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipNextInput = useRef(false);

  const getSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return { cursor: 0, selStart: 0, selEnd: 0 };
    return {
      cursor: el.selectionStart,
      selStart: el.selectionStart,
      selEnd: el.selectionEnd,
    };
  }, []);

  useEffect(() => {
    registerCallback((newContent, cursor, selStart, selEnd) => {
      const el = textareaRef.current;
      if (!el) return;

      skipNextInput.current = true;
      if (cursor >= 0) {
        el.setSelectionRange(cursor, cursor);
      } else if (selStart >= 0 && selEnd >= 0) {
        const start = Math.min(selStart, newContent.length);
        const end = Math.min(selEnd, newContent.length);
        el.setSelectionRange(start, end);
      }

      requestAnimationFrame(() => {
        skipNextInput.current = false;
      });
    });
  }, [registerCallback]);

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (skipNextInput.current) return;
    const el = textareaRef.current;
    if (!el) return;

    const { cursor, selStart, selEnd } = getSelection();
    onChange(event.target.value, cursor, selStart, selEnd);
  };

  const handleSelect = () => {
    const { cursor, selStart, selEnd } = getSelection();
    onSelectionChange(cursor, selStart, selEnd);
  };

  const [, forceUpdate] = useReducerState();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onScroll = () => forceUpdate();
    el.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [forceUpdate]);

  const cursors = Object.values(remoteCursors);

  return (
    <div className="editor-shell">
      <div className="editor-frame">
        <div className="editor-overlay" ref={overlayRef} aria-hidden>
          {cursors.map((c) => {
            const el = textareaRef.current;
            if (!el) return null;
            const pos = measureCaretPosition(el, c.cursor);
            return (
              <div
                key={c.clientId}
                className="remote-caret"
                style={{
                  top: pos.top,
                  left: pos.left,
                  height: pos.height,
                  backgroundColor: c.color,
                }}
              >
                <span
                  className="remote-caret-label"
                  style={{ backgroundColor: c.color }}
                >
                  {c.name}
                </span>
              </div>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={content}
          onChange={handleInput}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          spellCheck
          placeholder="Start typing — changes sync live with everyone in this room…"
        />
      </div>
      <div className="editor-meta">
        <span className="you-indicator" style={{ backgroundColor: myColor }} />
        Your cursor color
      </div>
    </div>
  );
}

function useReducerState() {
  const [, set] = useState(0);
  return [null, () => set((n) => n + 1)] as const;
}
