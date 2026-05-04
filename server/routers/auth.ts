import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";
import {
  createInstitutionalVerificationToken,
  verifyInstitutionalVerificationToken,
} from "@/lib/auth/institutional-token";
import {
  buildInstitutionalVerificationEmail,
  buildInstitutionalVerificationUrl,
} from "@/lib/email/institutional-verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailDomain, institutionalEmailSchema } from "@/lib/validators/email";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc";

type ProfileRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified";

const submitInstitutionalEmailInputSchema = z.object({
  email: institutionalEmailSchema,
});

const verifyInstitutionalEmailInputSchema = z.object({
  token: z.string().trim().min(1, "Missing verification token."),
});

function resolveAppUrl(requestUrl: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return new URL(requestUrl).origin;
}

function determineInitialRole(institutionalEmail: string): Exclude<ProfileRole, "unverified"> {
  const domain = getEmailDomain(institutionalEmail);

  if (domain === "terpmail.umd.edu") {
    return "student";
  }

  if (
    domain === "cs.umd.edu" ||
    domain === "umiacs.umd.edu" ||
    domain === "math.umd.edu" ||
    domain === "physics.umd.edu"
  ) {
    return "researcher";
  }

  return "student";
}

async function sendVerificationEmail({ email, verifyUrl }: { email: string; verifyUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Email provider is not configured.",
    });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: "Verify your Researcher affiliation",
    html: buildInstitutionalVerificationEmail({
      verifyUrl,
      institutionalEmail: email,
    }),
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send institutional verification email.",
    });
  }
}

export const authRouter = createTRPCRouter({
  submitInstitutionalEmail: protectedProcedure
    .input(submitInstitutionalEmailInputSchema)
    .mutation(async ({ ctx, input }) => {
      const institutionalEmail = input.email;

      const { error: upsertError } = await ctx.supabase.from("profiles").upsert(
        {
          id: ctx.user.id,
          institutional_email: institutionalEmail,
          institutional_verified: false,
          role: "unverified" as ProfileRole,
        },
        { onConflict: "id" },
      );

      if (upsertError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save institutional email.",
        });
      }

      const token = createInstitutionalVerificationToken(ctx.user.id, institutionalEmail);
      const appUrl = resolveAppUrl(ctx.req.url);
      const verifyUrl = buildInstitutionalVerificationUrl(appUrl, token);

      await sendVerificationEmail({ email: institutionalEmail, verifyUrl });

      return {
        success: true,
        institutionalEmail,
      };
    }),

  verifyInstitutionalEmail: publicProcedure
    .input(verifyInstitutionalEmailInputSchema)
    .mutation(async ({ input }) => {
      const payload = verifyInstitutionalVerificationToken(input.token);

      if (!payload) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verification token is invalid or expired.",
        });
      }

      const initialRole = determineInitialRole(payload.institutionalEmail);
      const adminClient = createAdminClient();

      const { error: updateProfileError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: payload.userId,
            institutional_email: payload.institutionalEmail,
            institutional_verified: true,
            role: initialRole,
          },
          { onConflict: "id" },
        );

      if (updateProfileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not verify institutional email.",
        });
      }

      const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(payload.userId);

      if (getUserError || !userData.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Verified email, but failed to load auth user.",
        });
      }

      const nextAppMetadata = {
        ...(userData.user.app_metadata ?? {}),
        institutional_verified: true,
        institutional_email: payload.institutionalEmail,
        role: initialRole,
      };

      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(payload.userId, {
        app_metadata: nextAppMetadata,
      });

      if (updateUserError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Institutional verification succeeded, but auth metadata update failed.",
        });
      }

      return {
        success: true,
        institutionalEmail: payload.institutionalEmail,
        role: initialRole,
        redirectTo: "/auth/login?verified=1",
      };
    }),
});
