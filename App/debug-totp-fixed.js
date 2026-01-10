// @ts-nocheck
const otplib = require("otplib");

const TOTP_OPTIONS = {
  digits: 6,
  period: 30,
  window: 1,
};

function verifyTotpToken(token, secret) {
  try {
    const result = otplib.verifySync({
      token,
      secret,
      digits: TOTP_OPTIONS.digits,
      period: TOTP_OPTIONS.period,
      window: TOTP_OPTIONS.window,
    });

    console.log(`Raw Result for ${token}:`, JSON.stringify(result));

    // Handle both boolean (true) and object ({ valid: true }) return types
    if (typeof result === "boolean") {
      return result;
    }
    if (typeof result === "object" && result !== null && "valid" in result) {
      return result.valid === true;
    }

    return false;
  } catch (e) {
    console.error("TOTP Verification error:", e);
    return false;
  }
}

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
console.log("Is Valid Token Accepted?", verifyTotpToken(validToken, secret));

// 4. Verify INVALID Token
console.log("Is INVALID Token Accepted?", verifyTotpToken("000000", secret));
