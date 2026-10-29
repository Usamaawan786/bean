import { useState } from "react";
import GoogleLocationPicker from "@/components/delivery/GoogleLocationPicker";
import { LeafletLocationPicker } from "@/components/delivery/DeliveryLocationPicker";

/**
 * Uses Google Maps + Places when an API key is configured and accepted.
 * Falls back to the free OpenStreetMap picker if there's no key, or Google rejects it
 * (for example on a website address that isn't on the key's allowed list).
 */
export default function LocationPicker({ apiKey, ...props }) {
  const [failed, setFailed] = useState(false);
  if (apiKey && !failed) {
    return <GoogleLocationPicker apiKey={apiKey} {...props} onFail={() => setFailed(true)} />;
  }
  return <LeafletLocationPicker {...props} />;
}
