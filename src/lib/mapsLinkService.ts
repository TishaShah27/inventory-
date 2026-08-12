import { createServerFn } from "@tanstack/react-start";

export type MapsCoords = { lat: string; lng: string };

function extractCoords(text: string): MapsCoords | null {
  const precise = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (precise) return { lat: precise[1], lng: precise[2] };

  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: at[1], lng: at[2] };

  const q = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: q[1], lng: q[2] };

  const search = text.match(/\/maps\/search\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/);
  if (search) return { lat: search[1], lng: search[2] };

  return null;
}

// Google Maps share links (maps.app.goo.gl) are short redirect links with no
// coordinates in the URL itself — the redirect has to be followed server-side
// (the browser can't do this cross-origin) to reach the full /maps/@lat,lng URL.
export const resolveMapsLink = createServerFn({ method: "POST" })
  .inputValidator((url: string) => url)
  .handler(async ({ data: url }): Promise<MapsCoords | null> => {
    const direct = extractCoords(url);
    if (direct) return direct;

    try {
      const res = await fetch(url, { redirect: "follow" });
      const fromFinalUrl = extractCoords(res.url);
      if (fromFinalUrl) return fromFinalUrl;

      const body = await res.text();
      return extractCoords(body);
    } catch {
      return null;
    }
  });
