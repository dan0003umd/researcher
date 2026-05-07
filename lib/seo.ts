import type { Metadata } from "next";

const baseUrl = "https://researcher-one-sigma.vercel.app";

export function buildMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  return {
    title: `${title} | Researcher`,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: `${title} | Researcher`,
      description,
      url: `${baseUrl}${path}`,
      siteName: "Researcher",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Researcher - UMD Research Matchmaking Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Researcher`,
      description,
      images: ["/og-image.png"],
    },
  };
}
