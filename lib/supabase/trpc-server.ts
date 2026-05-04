import { createServerClient, type CookieOptions } from "@supabase/ssr";

type SupabaseServerClientOptions = {
  req: Request;
  resHeaders: Headers;
};

function parseRequestCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return [] as Array<{ name: string; value: string }>;
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separator = cookie.indexOf("=");

      if (separator === -1) {
        return { name: cookie, value: "" };
      }

      const name = cookie.slice(0, separator).trim();
      const value = cookie.slice(separator + 1).trim();

      return { name, value };
    });
}

function toSetCookieString(name: string, value: string, options?: CookieOptions) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options?.maxAge !== undefined) {
    segments.push(`Max-Age=${options.maxAge}`);
  }

  if (options?.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  if (options?.path) {
    segments.push(`Path=${options.path}`);
  } else {
    segments.push("Path=/");
  }

  if (options?.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options?.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options?.secure) {
    segments.push("Secure");
  }

  if (options?.sameSite) {
    const sameSiteValue =
      typeof options.sameSite === "string"
        ? options.sameSite
        : options.sameSite === true
          ? "Strict"
          : "Lax";

    segments.push(`SameSite=${sameSiteValue}`);
  }

  return segments.join("; ");
}

export function createTRPCServerClient({ req, resHeaders }: SupabaseServerClientOptions) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseRequestCookies(req.headers.get("cookie"));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            resHeaders.append("set-cookie", toSetCookieString(name, value, options));
          });
        },
      },
    },
  );
}
