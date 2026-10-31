export type ContactPhone =
  | { readonly status: "FOUND"; readonly phone: string }
  | { readonly status: "MISSING" | "MULTIPLE"; readonly phone: null };

/** PDF에 명시된 국내 번호만 읽는다. 여러 번호 중 본인 번호를 추측하지 않는다. */
export function contactPhone(text: string): ContactPhone {
  const source = text.normalize("NFKC").replace(/https?:\/\/\S+|www\.\S+|\S+@\S+/gi, " ");
  const numbers = new Set<string>();
  const pattern = /(?<![\dA-Za-z])(?:0|\+82[ \t.-]*(?:\(0\)[ \t.-]*)?)(1[016789]|2|[3-6][1-5]|70)[ \t.‐‑–—-]*(\d{3,4})[ \t.‐‑–—-]*(\d{4})(?!\d)/g;
  for (const match of source.matchAll(pattern)) {
    const prefix = `0${match[1]}`;
    if (prefix === "010" && match[2].length !== 4) continue;
    numbers.add(`${prefix}-${match[2]}-${match[3]}`);
  }
  if (numbers.size === 1) return { status: "FOUND", phone: [...numbers][0] };
  return { status: numbers.size > 1 ? "MULTIPLE" : "MISSING", phone: null };
}
