import { createServerFn } from "@tanstack/react-start";

type PostOffice = { District?: string; State?: string };
type PincodeApiResponse = { Status: string; PostOffice?: PostOffice[] }[];

export type PincodeLookup = { city: string; state: string };

// api.postalpincode.in doesn't send CORS headers, so this has to be resolved
// server-side — a browser fetch straight to it gets blocked.
export const lookupPincode = createServerFn({ method: "POST" })
  .inputValidator((pincode: string) => pincode)
  .handler(async ({ data: pincode }): Promise<PincodeLookup | null> => {
    if (!/^\d{6}$/.test(pincode)) return null;

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = (await res.json()) as PincodeApiResponse;
      const postOffice = data?.[0]?.PostOffice?.[0];
      if (!postOffice?.District) return null;
      return { city: postOffice.District, state: postOffice.State ?? "" };
    } catch {
      return null;
    }
  });
