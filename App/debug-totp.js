// @ts-nocheck
const otplib = require("otplib");

const TOTP_OPTIONS = {
  digits: 6,
  period: 30,
  window: 1,
};

// 1. Generate Secret
const secret = otplib.generateSecret();
console.log("Secret:", secret);

const validToken = otplib.generateSync({
  secret,
  digits: TOTP_OPTIONS.digits,
  period: TOTP_OPTIONS.period,
});
console.log("Valid Token:", validToken);

// 3. Verify Valid Token
try {
  const resultValid = otplib.verifySync({
    token: validToken,
    secret,
    digits: TOTP_OPTIONS.digits,
    period: TOTP_OPTIONS.period,
    window: TOTP_OPTIONS.window,
  });
  console.log("Verify Valid (Expect true):", JSON.stringify(resultValid));
} catch (e) {
  console.error("Error verifying valid:", e);
}

// 4. Verify INVALID Token
const invalidToken = "000000";
try {
  const resultInvalid = otplib.verifySync({
    token: invalidToken,
    secret,
    digits: TOTP_OPTIONS.digits,
    period: TOTP_OPTIONS.period,
    window: TOTP_OPTIONS.window,
  });
  console.log("Verify '000000' (Expect false):", JSON.stringify(resultInvalid));
} catch (e) {
  console.error("Error verifying invalid:", e);
}
