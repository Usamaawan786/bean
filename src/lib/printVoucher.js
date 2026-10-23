import { printThermalDocument } from "@/lib/printReceipt";

// Prints the staged #voucher card at 80mm — near credit-card width, so the
// customer can keep it in a wallet. One copy, no customer duplicate.
export function printVoucher() {
  return printThermalDocument("voucher", 80, 1);
}