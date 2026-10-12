"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { AUDITION_POST_IMAGE_TYPES, checkAuditionPostFile } from "@/features/audition-posts/editing";
import { BodyEditorLoading } from "./body-editor-loading";

type Props = {
  /** 편집 영역 id. 바깥 label·설명과 연결한다. */
  readonly id: string;
  readonly labelledBy: string;
  readonly describedBy?: string;
  readonly initialHtml: string;
  /** 사용자가 본문을 고칠 때마다 부른다. 처음 채운 내용으로는 부르지 않는다. */
  readonly onChange: (html: string) => void;
  /** 사진을 올리고 본문에 넣을 공개 주소를 돌려준다. 없으면 사진 추가 도구를 보여 주지 않는다. */
  readonly onUploadImage?: (file: File) => Promise<string>;
  readonly onUploadStateChange?: (uploading: boolean) => void;
  readonly disabled?: boolean;
};

type Tool = {
  readonly label: string;
  readonly isActive: (editor: Editor) => boolean;
  readonly run: (editor: Editor) => void;
};

const TOOLS: readonly Tool[] = [
  { label: "굵게", isActive: (editor) => editor.isActive("bold"), run: (editor) => editor.chain().focus().toggleBold().run() },
  { label: "기울임", isActive: (editor) => editor.isActive("italic"), run: (editor) => editor.chain().focus().toggleItalic().run() },
  { label: "밑줄", isActive: (editor) => editor.isActive("underline"), run: (editor) => editor.chain().focus().toggleUnderline().run() },
  { label: "취소선", isActive: (editor) => editor.isActive("strike"), run: (editor) => editor.chain().focus().toggleStrike().run() },
  {
    label: "제목",
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  { label: "목록", isActive: (editor) => editor.isActive("bulletList"), run: (editor) => editor.chain().focus().toggleBulletList().run() },
  {
    label: "번호 목록",
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  { label: "인용", isActive: (editor) => editor.isActive("blockquote"), run: (editor) => editor.chain().focus().toggleBlockquote().run() },
];

const LINK_PROTOCOL = /^(https?:\/\/|mailto:)/i;

const TOOL_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 text-sm font-semibold text-muted-strong transition-colors hover:bg-card hover:text-foreground aria-pressed:bg-brand-soft aria-pressed:text-brand disabled:text-muted-soft";

/**
 * 공고 본문 편집기. 공개 상세와 같은 `.post-body` 스타일로 보여 준다. 저장할 때 서버가 허용 태그만 남기고 이 공고의 사진이 아닌
 * 이미지는 지우므로, 사진은 붙여 넣기가 아니라 사진 도구로 올린 것만 남는다. 표는 원문 표를 잃지 않도록 읽고 고칠 수만 있게 한다.
 */
export function AuditionPostBodyEditor({ id, labelledBy, describedBy, initialHtml, onChange, onUploadImage, onUploadStateChange, disabled = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image.configure({ inline: true }),
      TableKit,
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "post-body min-h-80 px-4 py-4 outline-none sm:px-5",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      active: TOOLS.map((tool) => tool.isActive(current)),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    } : null,
  });

  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);

  // 편집기는 화면에 붙은 뒤 만들어지므로 첫 입력 전에는 서식 상태가 비어 있을 수 있다.
  if (!editor) return <BodyEditorLoading />;

  return (
    <div className="overflow-hidden rounded-control border border-border bg-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
      <div role="group" aria-label="본문 서식" className="flex flex-wrap gap-1 border-b border-border-soft bg-surface p-1.5">
        {TOOLS.map((tool, index) => (
          <button
            key={tool.label}
            type="button"
            aria-pressed={state?.active[index] ?? false}
            onClick={() => tool.run(editor)}
            className={TOOL_CLASS}
          >
            {tool.label}
          </button>
        ))}
        <LinkTool editor={editor} active={state?.link ?? false} inputId={`${id}-link`} />
        {onUploadImage ? <ImageTool editor={editor} upload={onUploadImage} onUploadStateChange={onUploadStateChange} errorId={`${id}-image-error`} /> : null}
        <span aria-hidden="true" className="mx-1 my-2 w-px bg-border" />
        <button type="button" disabled={!state?.canUndo} onClick={() => editor.chain().focus().undo().run()} className={TOOL_CLASS}>
          되돌리기
        </button>
        <button type="button" disabled={!state?.canRedo} onClick={() => editor.chain().focus().redo().run()} className={TOOL_CLASS}>
          다시 하기
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/** 사진을 골라 저장소에 올린 뒤 커서 자리에 넣는다. 올리는 동안에는 다시 누를 수 없다. */
function ImageTool({ editor, upload, onUploadStateChange, errorId }: {
  readonly editor: Editor;
  readonly upload: (file: File) => Promise<string>;
  readonly errorId: string;
  readonly onUploadStateChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkAuditionPostFile("IMAGE", file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    onUploadStateChange?.(true);
    setError(null);
    try {
      const src = await upload(file);
      editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        className={TOOL_CLASS}
      >
        {uploading ? "사진 올리는 중…" : "사진"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={AUDITION_POST_IMAGE_TYPES.join(",")}
        onChange={(event) => void choose(event)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {error ? <p id={errorId} role="alert" className="w-full px-2 pb-1 text-xs text-fail">{error}</p> : null}
    </>
  );
}

/** 링크는 선택한 글자에 건다. 안쪽 폼을 바깥 저장 폼과 겹치지 않게 Enter로 직접 적용한다. */
function LinkTool({ editor, active, inputId }: {
  readonly editor: Editor;
  readonly active: boolean;
  readonly inputId: string;
}) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openForm = () => {
    setHref(String(editor.getAttributes("link").href ?? ""));
    setError(null);
    setOpen(true);
  };

  const apply = () => {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setOpen(false);
      return;
    }
    if (!LINK_PROTOCOL.test(value)) {
      setError("https://로 시작하는 주소나 mailto: 주소를 넣어 주세요.");
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      setError("링크를 걸 글자를 먼저 선택해 주세요.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      editor.commands.focus();
    }
  };

  return (
    <>
      <button type="button" aria-pressed={active} aria-expanded={open} onClick={() => (open ? setOpen(false) : openForm())} className={TOOL_CLASS}>
        링크
      </button>
      {open ? (
        <div className="flex w-full flex-col gap-1.5 px-1 pb-1 pt-0.5">
          <label htmlFor={inputId} className="text-xs font-semibold text-muted-strong">링크 주소 (비우고 적용하면 링크를 지워요)</label>
          <div className="flex gap-1.5">
            <input
              id={inputId}
              value={href}
              onChange={(event) => { setHref(event.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
            <button type="button" onClick={apply} className={`${TOOL_CLASS} border border-border bg-card`}>적용</button>
          </div>
          {error ? <p id={`${inputId}-error`} role="alert" className="text-xs text-fail">{error}</p> : null}
        </div>
      ) : null}
    </>
  );
}
