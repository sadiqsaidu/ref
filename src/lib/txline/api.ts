const origin = () => process.env.TXLINE_API_ORIGIN ?? "https://txline.txodds.com";

let jwt: Promise<string> | null = null;

function fetchJwt(): Promise<string> {
  const p = fetch(`${origin()}/auth/guest/start`, { method: "POST" })
    .then((r) => {
      if (!r.ok) throw new Error(`guest auth ${r.status}`);
      return r.json();
    })
    .then((d: { token: string }) => d.token);
  p.catch(() => {
    if (jwt === p) jwt = null;
  });
  return p;
}

function getJwt(fresh = false): Promise<string> {
  if (fresh || !jwt) jwt = fetchJwt();
  return jwt;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const req = async (token: string) =>
    fetch(`${origin()}/api${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        ...(process.env.TXLINE_API_TOKEN
          ? { "X-Api-Token": process.env.TXLINE_API_TOKEN }
          : {}),
      },
    });
  let res = await req(await getJwt());
  if (res.status === 401 || res.status === 403) res = await req(await getJwt(true));
  if (!res.ok) throw new Error(`txline ${res.status} ${path}`);
  return res;
}

export type SseMessage = { id?: string; event?: string; data: string };

export async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseMessage> {
  const dec = new TextDecoder();
  const reader = body.getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    for (;;) {
      const lf = buf.indexOf("\n\n");
      const crlf = buf.indexOf("\r\n\r\n");
      const at = lf === -1 ? crlf : crlf === -1 ? lf : Math.min(lf, crlf);
      if (at === -1) break;
      const block = buf.slice(0, at);
      buf = buf.slice(at + (at === crlf ? 4 : 2));
      const msg: SseMessage = { data: "" };
      for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(":")) continue;
        const sep = line.indexOf(":");
        const field = sep === -1 ? line : line.slice(0, sep);
        let value = sep === -1 ? "" : line.slice(sep + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "id") msg.id = value;
        else if (field === "event") msg.event = value;
        else if (field === "data") msg.data += msg.data ? `\n${value}` : value;
      }
      if (msg.id !== undefined || msg.event !== undefined || msg.data) yield msg;
    }
  }
}
