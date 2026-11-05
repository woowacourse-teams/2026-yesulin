const IMAGE_TAG = /<img((?:\s+[^\s"'>/=]+(?:="[^"]*")?)*)\s*\/?>/gi;
const ATTRIBUTE = /\s+([^\s"'>/=]+)(?:="([^"]*)")?/g;
const HTML_ENTITY = /&(amp|quot|#39|lt|gt|nbsp);/g;
const ENTITY_TEXT: Readonly<Record<string, string>> = { amp: "&", quot: "\"", "#39": "'", lt: "<", gt: ">", nbsp: " " };

/** 서버가 정리한 공고 본문에서 원문 사진 주소를 문서 순서대로 꺼낸다. 서버 렌더링에서도 같은 결과를 낸다. */
export function bodyImageUrls(bodyHtml: string): readonly string[] {
  return [...bodyHtml.matchAll(IMAGE_TAG)]
    .map(([, attributes]) => imageSource(attributes))
    .filter((source) => source.length > 0);
}

function imageSource(attributes: string): string {
  const source = [...attributes.matchAll(ATTRIBUTE)].find(([, name]) => name.toLowerCase() === "src");
  return decodeEntities(source?.[2] ?? "");
}

function decodeEntities(value: string): string {
  return value.replace(HTML_ENTITY, (_, name: string) => ENTITY_TEXT[name]);
}
