type JsonLdProps = {
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
};

export function serializeJsonLd(data: JsonLdProps["data"]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ id, data }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
