import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

type VerificationTokenPayload = {
  userId: string;
  institutionalEmail: string;
  exp: number;
};

function getTokenSecret() {
  const secret = process.env.INSTITUTIONAL_EMAIL_TOKEN_SECRET;

  if (!secret) {
    throw new Error("Missing INSTITUTIONAL_EMAIL_TOKEN_SECRET environment variable.");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  const secret = getTokenSecret();
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createInstitutionalVerificationToken(userId: string, institutionalEmail: string) {
  const payload: VerificationTokenPayload = {
    userId,
    institutionalEmail,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyInstitutionalVerificationToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: VerificationTokenPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as VerificationTokenPayload;
  } catch {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < nowInSeconds) {
    return null;
  }

  return payload;
}
