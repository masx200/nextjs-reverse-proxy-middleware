// import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// This function can be marked `async` if using `await` inside
// export function middleware(request: NextRequest) {
//   return NextResponse.redirect(new URL("/home", request.url));
// }

// See "Matching Paths" below to learn more
// export const config = {
//   matcher: "/about/:path*",
// };

export function middleware(request: NextRequest): NextResponse<unknown> {
  console.log(request.nextUrl.href);
  const token = process.env.token;

  console.log(Object.fromEntries(request.headers));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.append(
    "x-Forwarded-nextjs",
    `by=${request.nextUrl.host}; for=${
      request.headers.get("x-forwarded-for")
    }; host=${request.nextUrl.host}; proto=${
      request.nextUrl.href.startsWith("https://") ? "https" : "http"
    }`,
  );
  if (request.nextUrl.pathname.startsWith("/token/" + token + "/http/")) {
    // const hostname = "dash.deno.com"; // or 'eu.posthog.com'
    let url = new URL(
      "http://" +
        request.nextUrl.pathname.slice(6 + ("/token/" + token).length),
    );
    console.log(url.href);
    // const requestHeaders = new Headers(request.headers);
    requestHeaders.set("host", url.hostname);

    // url.protocol = "https";
    // url.hostname = hostname;
    // url.port = String(443);
    //   url.pathname = url.pathname; //.replace(/^\//, '');

    return NextResponse.rewrite(url, {
      headers: requestHeaders,
    });
  }
  if (request.nextUrl.pathname.startsWith("/token/" + token + "/https/")) {
    let url = new URL(
      "https://" +
        request.nextUrl.pathname.slice(6 + 1 + ("/token/" + token).length),
    );
    console.log(url.href);

    requestHeaders.set("host", url.hostname);

    // url.protocol = "https";
    // url.hostname = hostname;
    // url.port = String(443);
    //   url.pathname = url.pathname; //.replace(/^\//, '');

    return NextResponse.rewrite(url, {
      headers: requestHeaders,
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
