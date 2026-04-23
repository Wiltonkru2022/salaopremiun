import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
const appRootDomain = process.env.APP_ROOT_DOMAIN || "salaopremiun.com.br";
const loginHost = process.env.APP_LOGIN_HOST || `login.${appRootDomain}`;
const managedHosts = [
  appRootDomain,
  `www.${appRootDomain}`,
  loginHost,
  process.env.APP_MAIN_HOST || appRootDomain,
  process.env.APP_PAINEL_HOST || `painel.${appRootDomain}`,
  process.env.APP_PROFISSIONAL_HOST || `app.${appRootDomain}`,
  process.env.APP_ASSINATURA_HOST || `assinatura.${appRootDomain}`,
  process.env.APP_CADASTRO_HOST || `cadastro.${appRootDomain}`,
]
  .map((host) =>
    String(host || "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
  )
  .filter(Boolean);

function buildCsp() {
  const connectSrc = [
    "'self'",
    ...managedHosts.map((host) => `https://${host}`),
    ...(supabaseHostname
      ? [`https://${supabaseHostname}`, `wss://${supabaseHostname}`]
      : []),
    "https://vitals.vercel-insights.com",
    "https://*.vercel-insights.com",
    "https://va.vercel-scripts.com",
  ];
  const manifestSrc = ["'self'", ...managedHosts.map((host) => `https://${host}`)];
  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...(supabaseHostname ? [`https://${supabaseHostname}`] : []),
  ];
  const frameAncestors = ["'self'"];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `form-action 'self' https://${loginHost}`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${Array.from(new Set(connectSrc)).join(" ")}`,
    "frame-src 'self'",
    "worker-src 'self' blob:",
    `manifest-src ${Array.from(new Set(manifestSrc)).join(" ")}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildCsp(),
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.trycloudflare.com",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/app-profissional/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        source: "/admin-master/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        source: "/login/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
