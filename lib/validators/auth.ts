import { z } from "zod";

export const institutionalEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid institutional email address.");
