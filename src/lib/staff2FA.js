// Tracks whether the current staff member has completed the 2FA challenge for
// this browser session. Stored in sessionStorage so it clears on logout (we
// also clear it explicitly) and when the tab closes — i.e. 2FA is re-required
// "once logged out" or after the session ends.

const key = (email) => `staff_2fa_verified_${(email || "").toLowerCase()}`;

export function isStaff2FAVerified(email) {
  try {
    return sessionStorage.getItem(key(email)) === "1";
  } catch {
    return false;
  }
}

export function setStaff2FAVerified(email) {
  try {
    sessionStorage.setItem(key(email), "1");
  } catch {
    /* ignore */
  }
}

export function clearStaff2FA(email) {
  try {
    sessionStorage.removeItem(key(email));
  } catch {
    /* ignore */
  }
}