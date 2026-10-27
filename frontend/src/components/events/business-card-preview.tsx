"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { BusinessCardContent } from "@/features/events/business-card-preview";

const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif';
const PAPER = "#EEE8DE";
const INK = "#3A2E28";
const INK_SOFT = "#6B5D53";
/** 끌어서 이만큼(도) 넘기면 반대 면으로 넘어간다. */
const FLIP_THRESHOLD = 60;
const MAX_TILT = 10;

/**
 * 실제 제작 명함(86×52mm)과 같은 디자인을 3D로 보여 준다. 마우스를 올리면 기울고, 끌거나 누르면 뒤집힌다.
 * 움직임 줄이기 설정을 켠 사용자에게는 기울기와 흔들림 없이 뒤집기만 보여 준다.
 */
export function BusinessCardPreview({ content, photoUrl }: { readonly content: BusinessCardContent; readonly photoUrl: string | null }) {
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const start = useRef<{ x: number; moved: boolean } | null>(null);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current) {
      const delta = (event.clientX - start.current.x) * 0.6;
      if (Math.abs(delta) > 3) start.current.moved = true;
      setDrag(delta);
      return;
    }
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * MAX_TILT * 2, y: x * MAX_TILT * 2 });
  };

  const onPointerUp = () => {
    const moved = start.current?.moved ?? false;
    start.current = null;
    if (!moved || (drag !== null && Math.abs(drag) > FLIP_THRESHOLD)) setFlipped((value) => !value);
    setDrag(null);
  };

  const rotateY = (flipped ? 180 : 0) + (drag ?? 0) + tilt.y;
  const cardStyle: CSSProperties = {
    transform: `rotateX(${tilt.x}deg) rotateY(${rotateY}deg)`,
    transition: drag !== null ? "none" : hovering ? "transform 160ms ease-out" : "transform 700ms cubic-bezier(.2,.8,.2,1)",
    transformStyle: "preserve-3d",
  };
  const floating = !reducedMotion && !hovering && drag === null;

  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[420px] [perspective:1400px]">
        <div className={floating ? "business-card-float" : undefined} style={{ transformStyle: "preserve-3d" }}>
          <div
            role="button"
            tabIndex={0}
            aria-label={`명함 미리보기, 지금 ${flipped ? "뒷면" : "앞면"}. 눌러서 뒤집기`}
            className="relative aspect-[86/52] w-full cursor-grab touch-pan-y select-none rounded-[3%] outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"
            style={cardStyle}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); if (start.current) onPointerUp(); }}
            onPointerDown={(event) => { start.current = { x: event.clientX, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFlipped((value) => !value); } }}
          >
            <Face><FrontFace content={content} photoUrl={photoUrl} /></Face>
            <Face back><BackFace content={content} /></Face>
          </div>
        </div>
      </div>
      <figcaption className="flex max-w-[420px] flex-col items-center gap-2 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span>끌거나 눌러서 {flipped ? "앞면" : "뒷면"}을 볼 수 있습니다.</span>
          <button type="button" className="min-h-9 rounded-control border border-border bg-card px-3 font-semibold text-muted-strong hover:border-brand-line" onClick={() => setFlipped((value) => !value)}>
            {flipped ? "앞면 보기" : "뒷면 보기"}
          </button>
        </span>
        <span className="text-center leading-relaxed">
          이 이미지는 이해를 돕기 위한 예시이며, 실제 명함 디자인은 조금 달라질 수 있습니다. 사진 배치는 담당자가 더 자연스럽게 맞춰 드립니다.
        </span>
      </figcaption>
    </figure>
  );
}

/** 명함 한 면. 종이 그림자와 살짝 비치는 광택을 얹는다. 글자 크기는 명함 너비(cqw)에 맞춘다. */
function Face({ back = false, children }: { readonly back?: boolean; readonly children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[3%] shadow-[0_18px_40px_-18px_rgba(58,46,40,.55),0_2px_6px_rgba(58,46,40,.12)] [backface-visibility:hidden] [container-type:inline-size]"
      style={{ background: PAPER, color: INK, transform: back ? "rotateY(180deg)" : undefined }}
    >
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.35)_0%,rgba(255,255,255,0)_38%,rgba(255,255,255,0)_70%,rgba(255,255,255,.18)_100%)]" />
    </div>
  );
}

function FrontFace({ content, photoUrl }: { readonly content: BusinessCardContent; readonly photoUrl: string | null }) {
  const fade = "linear-gradient(to right, #000 60%, transparent 100%), linear-gradient(to top, transparent 0%, #000 24%)";
  return (
    <>
      <div
        className="absolute inset-y-0 left-0 w-[52%] bg-cover bg-[position:40%_15%]"
        style={photoUrl
          ? { backgroundImage: `url(${photoUrl})`, maskImage: fade, WebkitMaskImage: fade, maskComposite: "intersect", WebkitMaskComposite: "source-in" }
          : undefined}
      >
        {photoUrl ? null : <PhotoPlaceholder />}
      </div>
      <div className="absolute left-[56%] right-[5%] top-[44%] -translate-y-1/2">
        <p className="truncate leading-none tracking-[0.12em]" style={{ fontFamily: SERIF, fontSize: "7.2cqw" }}>{content.name || "이름"}</p>
        <div className="my-[3.2cqw] h-px w-[6cqw]" style={{ background: INK }} />
        <div className="space-y-[1.1cqw] text-[3.15cqw] leading-tight">
          <p className="truncate">{content.roleLine}</p>
          <Line value={content.birthDate} placeholder="생년월일" />
          <Line value={content.email} placeholder="이메일" />
          {content.snsHandle ? (
            <p className="flex items-center gap-[1.2cqw] truncate"><InstagramIcon />{content.snsHandle}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function BackFace({ content }: { readonly content: BusinessCardContent }) {
  if (content.backLayout === "centered") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[3cqw] px-[8cqw] text-center">
        {content.intro ? <p className="text-[4.4cqw] leading-snug" style={{ fontFamily: SERIF }}>{content.intro}</p> : null}
        <p className={content.intro ? "text-[3.6cqw] tracking-[0.1em]" : "text-[7cqw] tracking-[0.12em]"} style={{ fontFamily: SERIF, color: content.intro ? INK_SOFT : INK }}>
          {content.name || "이름"}
        </p>
        {content.intro ? null : <p className="text-[3cqw]" style={{ color: INK_SOFT }}>{content.roleLine}</p>}
      </div>
    );
  }
  return (
    <div className="relative h-full px-[7cqw] py-[7cqw]">
      {content.intro ? (
        <>
          <p className="text-[4.4cqw] leading-snug" style={{ fontFamily: SERIF }}>{content.intro}</p>
          <div className="my-[3.4cqw] h-px w-[6cqw]" style={{ background: INK }} />
        </>
      ) : null}
      <p className="mb-[1.8cqw] text-[2.7cqw] tracking-[0.3em]" style={{ color: INK_SOFT }}>CAREER</p>
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-[4cqw] gap-y-[1.4cqw] text-[3.05cqw] leading-tight">
        {content.careers.map((career) => (
          <div key={`${career.when}-${career.title}`} className="contents">
            <span className="tabular-nums">{career.when}</span>
            <span className="truncate">{career.title}</span>
            <span className="text-right" style={{ color: INK_SOFT }}>{career.role}</span>
          </div>
        ))}
      </div>
      <p className="absolute bottom-[6cqw] right-[7cqw] text-[3.6cqw] tracking-[0.1em]" style={{ fontFamily: SERIF }}>{content.name || "이름"}</p>
    </div>
  );
}

/** 아직 적지 않은 칸은 흐리게 자리만 보여 준다. */
function Line({ value, placeholder }: { readonly value: string | null; readonly placeholder: string }) {
  return <p className="truncate" style={value ? undefined : { color: "#B5AAA0" }}>{value ?? placeholder}</p>;
}

function PhotoPlaceholder() {
  return (
    <div className="flex h-full items-end justify-center pb-[2cqw]" style={{ color: "#CFC5BA" }}>
      <svg viewBox="0 0 100 100" className="h-[85%]" fill="currentColor" aria-hidden="true">
        <circle cx="50" cy="34" r="18" />
        <path d="M14 100c0-22 16-38 36-38s36 16 36 38z" />
      </svg>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[3.4cqw] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
