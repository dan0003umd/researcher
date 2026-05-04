import { z } from "zod";

export const UMD_ALLOWED_DOMAINS = [
  "umd.edu",
  "cs.umd.edu",
  "umiacs.umd.edu",
  "terpmail.umd.edu",
  "math.umd.edu",
  "physics.umd.edu",
  "bsos.umd.edu",
  "rhsmith.umd.edu",
] as const;

const KNOWN_ALLOWED_DOMAINS = new Set<string>(UMD_ALLOWED_DOMAINS);

function normalizeDomain(email: string) {
  const domain = email.split("@")[1];
  return domain ? domain.toLowerCase() : "";
}

function isInstitutionalDomain(domain: string) {
  if (!domain) {
    return false;
  }

  if (KNOWN_ALLOWED_DOMAINS.has(domain)) {
    return true;
  }

  return domain.endsWith(".edu");
}

export const institutionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid institutional email address.")
  .refine((email) => isInstitutionalDomain(normalizeDomain(email)), {
    message: "Use a valid .edu or approved institutional domain.",
  });

export function getEmailDomain(email: string) {
  return normalizeDomain(email);
}

export function isKnownUmdDomain(domain: string) {
  return KNOWN_ALLOWED_DOMAINS.has(domain.toLowerCase());
}
