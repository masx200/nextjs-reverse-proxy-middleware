// import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { NextMiddleWare } from "./NextMiddleWare";

// This function can be marked `async` if using `await` inside
// export function middleware(request: NextRequest) {
//   return NextResponse.redirect(new URL("/home", request.url));
// }

// See "Matching Paths" below to learn more
// export const config = {
//   matcher: "/about/:path*",
// };
/**
 * 主要中间件函数，用于处理请求并根据路径进行反向代理。
 *
 * @param request NextRequest对象，包含请求信息。
 * @param event NextFetchEvent对象，包含触发请求的事件信息。
 * @returns 返回一个Promise，解析为NextResponse对象，该对象包含处理后的响应数据。
 */
export async function middlewareMain(
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
        `by=${request.headers.get("x-forwarded-host")}; for=${
            request.headers.get("x-forwarded-for")
        }; host=${request.headers.get("x-forwarded-host")}; proto=${
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
                request.nextUrl.pathname.slice(
                    6 + 1 + ("/token/" + token).length,
                ),
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
export async function middleware(
    request: NextRequest,
    event: NextFetchEvent,
): Promise<NextResponse<unknown>> {
    return await middlewareLogger(
        request,
        event,
        async () => {
            return await Strict_Transport_Security(request, event, async () => {
                return await middlewareMain(request, event);
            });
        },
    );
}
export const config = {
    matcher: "/:path*",
};
export async function reverse_proxy(
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
            /* 可以设定请求头中的字段"x-proxy-redirect"为"error" | "follow" |
"manual"来设定代理行为的重定向方式. */
            redirect: (requestHeaders.get("x-proxy-redirect") ??
                "manual") as RequestRedirect,
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
export async function middlewareLogger(
    ...[request, _info, next]: Parameters<NextMiddleWare>
): Promise<NextResponse> {
    console.log(
        JSON.stringify(
            {
                // ...info,
                request: {
                    method: request.method,
                    url: request.url,
                    headers: Object.fromEntries(request.headers),
                },
            },
            null,
            4,
        ),
    );
    const resp = await next();
    console.log(
        JSON.stringify(
            {
                response: {
                    headers: Object.fromEntries(resp.headers),
                    status: resp.status,
                },
                request: {
                    method: request.method,
                    url: request.url,
                    headers: Object.fromEntries(request.headers),
                },
            },
            null,
            4,
        ),
    );
    return resp;
}
export async function Strict_Transport_Security(
    ...[_request, _info, next]: Parameters<NextMiddleWare>
): Promise<NextResponse> {
    // console.log(2);
    const response = await next();
    const headers = new Headers(response.headers);

    headers.append("Strict-Transport-Security", "max-age=31536000");
    // console.log(ctx.response.body);
    // 必须把响应的主体转换为Uint8Array才行
    const body = response.body && (await bodyToBuffer(response.body));
    // headers.delete("content-length");
    const res = new NextResponse(body, {
        status: response.status,
        headers,
    });
    return res;
}
export async function bodyToBuffer(
    body?: BodyInit | null,
): Promise<Uint8Array> {
    return new Uint8Array(await new Response(body).arrayBuffer());
}
