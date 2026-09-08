const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return WEB_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch (cause) {
    if (cause instanceof TypeError) return null;
    throw cause;
  }
}
