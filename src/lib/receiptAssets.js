import QRCode from "qrcode";

// App + brand assets used by the thermal receipt. Centralised so the print
// page is fully self-contained and never depends on the invoice modal.
export const IOS_APP_URL = "https://apps.apple.com/pk/app/bean-pakistan/id6758788396";
export const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app";
export const LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

// Generate every asset the thermal receipt needs as base64 data URLs.
// Params mirror the values the invoice modal used, so output is byte-identical.
export async function generateReceiptAssets(bill) {
  const [qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl] = await Promise.all([
    bill?.qrCodeId ? QRCode.toDataURL(bill.qrCodeId, { width: 200, margin: 1 }).catch(() => "") : Promise.resolve(""),
    QRCode.toDataURL(IOS_APP_URL, { width: 160, margin: 1 }).catch(() => ""),
    QRCode.toDataURL(ANDROID_APP_URL, { width: 160, margin: 1 }).catch(() => ""),
    fetchLogoDataUrl(),
  ]);
  return { qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl };
}

async function fetchLogoDataUrl() {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
}