import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("escapes HTML opening characters while preserving the JSON value", () => {
    const data = { name: "</script><script>alert('xss')</script>" };

    const serialized = serializeJsonLd(data);

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
