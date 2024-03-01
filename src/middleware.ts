// import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// This function can be marked `async` if using `await` inside
// export function middleware(request: NextRequest) {
//   return NextResponse.redirect(new URL("/home", request.url));
// }

// See "Matching Paths" below to learn more
// export const config = {
//   matcher: "/about/:path*",
// };

export async function middleware(
  request: NextRequest,
  event: NextFetchEvent,
): Promise<NextResponse<unknown>> {
  const nextUrl = new URL(request.url);
  console.log({ url: request.nextUrl.href, method: request.method });
  const token = process.env.token;

  console.log({ headers: Object.fromEntries(request.headers) });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.append(
    "Forwarded",
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
    url.search = request.nextUrl.search;
    while (url.pathname.startsWith("/token/" + token + "/http/")) {
      url = new URL(
        "http://" +
          url.pathname.slice(6 + ("/token/" + token).length),
      );
      url.search = nextUrl.search;
    }
    console.log({ url: url.href, method: request.method });
    // const requestHeaders = new Headers(request.headers);
    requestHeaders.set("host", url.hostname);

    // url.protocol = "https";
    // url.hostname = hostname;
    // url.port = String(443);
    //   url.pathname = url.pathname; //.replace(/^\//, '');
    return await reverse_proxy(url, requestHeaders, request);
  }
  if (request.nextUrl.pathname.startsWith("/token/" + token + "/https/")) {
    let url = new URL(
      "https://" +
        request.nextUrl.pathname.slice(6 + 1 + ("/token/" + token).length),
    );
    /* 添加search */
    url.search = request.nextUrl.search;
    /* 循环处理多重前缀 */
    while (url.pathname.startsWith("/token/" + token + "/https/")) {
      url = new URL(
        "https://" +
          url.pathname.slice(
            6 + 1 + ("/token/" + token).length,
          ),
      );
      /* 添加search */
      url.search = nextUrl.search;
    }
    console.log({ url: url.href, method: request.method });

    requestHeaders.set("host", url.hostname);

    // url.protocol = "https";
    // url.hostname = hostname;
    // url.port = String(443);
    //   url.pathname = url.pathname; //.replace(/^\//, '');

    // return NextResponse.rewrite(url, {
    //   headers: requestHeaders,
    // });
    return await reverse_proxy(url, requestHeaders, request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
async function reverse_proxy(
  url: URL,
  requestHeaders: Headers,
  request: NextRequest,
): Promise<NextResponse<unknown>> {
  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      method: request.method,
      body: request.body,
      /* 关闭重定向 */
      redirect: "manual",
    });

    return new NextResponse(response.body, {
      headers: response.headers,
      status: response.status,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("bad gateway" + "\n" + String(error), {
      status: 502,
    });
  }
}
