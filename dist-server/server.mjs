var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@hono/node-server/dist/index.mjs
import { createServer as createServerHTTP } from "http";
import { Http2ServerRequest as Http2ServerRequest2 } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto2 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request2(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      ;
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(
          cache[2] || { "content-type": "text/plain; charset=UTF-8" }
        );
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = crypto2;
}
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header) {
    header = { "content-type": "text/plain; charset=UTF-8" };
  } else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else {
    for (const key in header) {
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
    }
  }
  if (!hasContentLength) {
    if (typeof body === "string") {
      header["Content-Length"] = Buffer.byteLength(body);
    } else if (body instanceof Uint8Array) {
      header["Content-Length"] = body.byteLength;
    } else if (body instanceof Blob) {
      header["Content-Length"] = body.size;
    }
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve2) => setTimeout(resolve2));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    incoming.destroy();
                    outgoing.destroy();
                  });
                }
              });
            }
          };
        }
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                incoming.destroy();
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer = options.createServer || createServerHTTP;
  const server = createServer(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

// node_modules/hono/dist/utils/mime.js
var getMimeType = (filename, mimes = baseMimes) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match2 = filename.match(regexp);
  if (!match2) {
    return;
  }
  let mimeType = mimes[match2[1]];
  if (mimeType && mimeType.startsWith("text")) {
    mimeType += "; charset=utf-8";
  }
  return mimeType;
};
var _baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css",
  csv: "text/csv",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webmanifest: "application/manifest+json",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xml: "application/xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};
var baseMimes = _baseMimes;

// node_modules/@hono/node-server/dist/serve-static.mjs
import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { versions } from "process";
import { Readable as Readable2 } from "stream";
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var pr54206Applied = () => {
  const [major, minor] = versions.node.split(".").map((component) => parseInt(component));
  return major >= 23 || major === 22 && minor >= 7 || major === 20 && minor >= 18;
};
var useReadableToWeb = pr54206Applied();
var createStreamBody = (stream) => {
  if (useReadableToWeb) {
    return Readable2.toWeb(stream);
  }
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on("error", (err) => {
        controller.error(err);
      });
      stream.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream.destroy();
    }
  });
  return body;
};
var getStats = (path) => {
  let stats;
  try {
    stats = statSync(path);
  } catch {
  }
  return stats;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var serveStatic = (options = { root: "" }) => {
  const root = options.root || "";
  const optionPath = options.path;
  if (root !== "" && !existsSync(root)) {
    console.error(`serveStatic: root path '${root}' is not found, are you sure it's correct?`);
  }
  return async (c, next) => {
    if (c.finalized) {
      return next();
    }
    let filename;
    if (optionPath) {
      filename = optionPath;
    } else {
      try {
        filename = tryDecodeURI(c.req.path);
        if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
          throw new Error();
        }
      } catch {
        await options.onNotFound?.(c.req.path, c);
        return next();
      }
    }
    let path = join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename, c) : filename
    );
    let stats = getStats(path);
    if (stats && stats.isDirectory()) {
      const indexFile = options.index ?? "index.html";
      path = join(path, indexFile);
      stats = getStats(path);
    }
    if (!stats) {
      await options.onNotFound?.(path, c);
      return next();
    }
    const mimeType = getMimeType(path);
    c.header("Content-Type", mimeType || "application/octet-stream");
    if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
      const acceptEncodingSet = new Set(
        c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim())
      );
      for (const encoding of ENCODINGS_ORDERED_KEYS) {
        if (!acceptEncodingSet.has(encoding)) {
          continue;
        }
        const precompressedStats = getStats(path + ENCODINGS[encoding]);
        if (precompressedStats) {
          c.header("Content-Encoding", encoding);
          c.header("Vary", "Accept-Encoding", { append: true });
          stats = precompressedStats;
          path = path + ENCODINGS[encoding];
          break;
        }
      }
    }
    let result;
    const size = stats.size;
    const range = c.req.header("range") || "";
    if (c.req.method == "HEAD" || c.req.method == "OPTIONS") {
      c.header("Content-Length", size.toString());
      c.status(200);
      result = c.body(null);
    } else if (!range) {
      c.header("Content-Length", size.toString());
      result = c.body(createStreamBody(createReadStream(path)), 200);
    } else {
      c.header("Accept-Ranges", "bytes");
      c.header("Date", stats.birthtime.toUTCString());
      const parts = range.replace(/bytes=/, "").split("-", 2);
      const start = parseInt(parts[0], 10) || 0;
      let end = parseInt(parts[1], 10) || size - 1;
      if (size < end - start + 1) {
        end = size - 1;
      }
      const chunksize = end - start + 1;
      const stream = createReadStream(path, { start, end });
      c.header("Content-Length", chunksize.toString());
      c.header("Content-Range", `bytes ${start}-${end}/${stats.size}`);
      result = c.body(createStreamBody(stream), 206);
    }
    await options.onFound?.(path, c);
    return result;
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) {
        patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey2, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey2] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode2 = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI2 = (str) => tryDecode2(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI2(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode2(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode2(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process: process2, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process2 !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process2?.env
  ) : false;
  return !isNoColor;
}
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
};
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// src/server.ts
import { readFileSync, existsSync as existsSync3, mkdirSync as mkdirSync2 } from "node:fs";
import { join as join2, resolve } from "node:path";
import bcrypt from "bcryptjs";

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/types/index.ts
var UserRole = /* @__PURE__ */ ((UserRole2) => {
  UserRole2[UserRole2["SUPER_ADMIN"] = 1] = "SUPER_ADMIN";
  UserRole2[UserRole2["ADMIN_DOCUMENTOS"] = 2] = "ADMIN_DOCUMENTOS";
  UserRole2[UserRole2["AUDITOR"] = 3] = "AUDITOR";
  UserRole2[UserRole2["VERIFICADOR"] = 4] = "VERIFICADOR";
  UserRole2[UserRole2["USUARIO_ESTANDAR"] = 5] = "USUARIO_ESTANDAR";
  return UserRole2;
})(UserRole || {});

// src/config/superuser.ts
var SUPERUSER_CONFIG = {
  email: "rauldiazespejo@gmail.com",
  // En producción: configurar via secret en Cloudflare Pages
  // wrangler pages secret put SUPERUSER_PASSWORD --project-name docusentinel-pro
  get password() {
    return "DocuSentinel@2024!Admin";
  },
  name: "Raul Diaz Espejo",
  role: 1,
  isActive: true,
  permissions: {
    canManageUsers: true,
    canManageDocuments: true,
    canManageAudit: true,
    canManageSystem: true,
    canAccessAllDocuments: true
  }
};

// src/auth/service.ts
var AuthService = class {
  // ─── TOTP ────────────────────────────────────────────────────────
  async generateTOTPSecret(email) {
    const secret = this.generateBase32Secret();
    const issuer = "DocuSentinel PRO";
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
    return { secret, qrCode };
  }
  async verifyTOTP(token, secret) {
    if (!token || !secret) return false;
    token = token.replace(/\s/g, "");
    if (!/^\d{6}$/.test(token)) return false;
    const currentStep = Math.floor(Date.now() / 1e3 / 30);
    for (let i = -1; i <= 1; i++) {
      const expected = await this.generateTOTPToken(secret, currentStep + i);
      if (this.safeCompare(token, expected)) return true;
    }
    return false;
  }
  async generateTOTPToken(secret, timeStep) {
    const keyBytes = this.base32Decode(secret);
    const counter = new Uint8Array(8);
    const view = new DataView(counter.buffer);
    view.setUint32(0, Math.floor(timeStep / 2 ** 32), false);
    view.setUint32(4, timeStep >>> 0, false);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, counter);
    const hash = new Uint8Array(sig);
    const offset = hash[hash.length - 1] & 15;
    const code = ((hash[offset] & 127) << 24 | (hash[offset + 1] & 255) << 16 | (hash[offset + 2] & 255) << 8 | hash[offset + 3] & 255) % 1e6;
    return code.toString().padStart(6, "0");
  }
  generateBase32Secret() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let result = "";
    for (const b of bytes) result += chars[b % 32];
    return result;
  }
  base32Decode(base32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = base32.toUpperCase().replace(/=+$/, "");
    let bits = 0, value = 0;
    const output = [];
    for (const char of clean) {
      const idx = chars.indexOf(char);
      if (idx === -1) continue;
      value = value << 5 | idx;
      bits += 5;
      if (bits >= 8) {
        output.push(value >>> bits - 8 & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(output);
  }
  // ─── PASSWORD ────────────────────────────────────────────────────
  /**
   * Hash de contraseña con PBKDF2-SHA256 (Web Crypto API nativa)
   * Formato: pbkdf2:salt_hex:iterations:hash_hex
   */
  async hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 1e5;
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const saltHex = this.bufToHex(salt);
    const hashHex = this.bufToHex(new Uint8Array(bits));
    return `pbkdf2:${saltHex}:${iterations}:${hashHex}`;
  }
  async verifyPassword(password, storedHash) {
    try {
      if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
        return false;
      }
      if (!storedHash.startsWith("pbkdf2:")) return false;
      const parts = storedHash.split(":");
      if (parts.length !== 4) return false;
      const [, saltHex, iterStr, hashHex] = parts;
      const iterations = parseInt(iterStr);
      const salt = this.hexToBuf(saltHex);
      const expectedHash = this.hexToBuf(hashHex);
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        keyMaterial,
        256
      );
      const computedHash = new Uint8Array(bits);
      return this.safeCompare(
        this.bufToHex(computedHash),
        this.bufToHex(expectedHash)
      );
    } catch {
      return false;
    }
  }
  // ─── JWT ─────────────────────────────────────────────────────────
  async generateJWT(payload, secret, expiresIn = 86400) {
    const header = this.b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1e3);
    const body = this.b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
    const sig = await this.hmacSign(`${header}.${body}`, secret);
    return `${header}.${body}.${sig}`;
  }
  async verifyJWT(token, secret) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Token inv\xE1lido");
    const [header, body, sig] = parts;
    const expectedSig = await this.hmacSign(`${header}.${body}`, secret);
    if (!this.safeCompare(sig, expectedSig)) throw new Error("Firma inv\xE1lida");
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      throw new Error("Token expirado");
    }
    return payload;
  }
  async hmacSign(data, secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    return this.b64url(new Uint8Array(sig));
  }
  // ─── HASH ────────────────────────────────────────────────────────
  async hashData(data) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return this.bufToHex(new Uint8Array(buf));
  }
  async hashBuffer(buffer) {
    const buf = await crypto.subtle.digest("SHA-256", buffer);
    return this.bufToHex(new Uint8Array(buf));
  }
  // ─── SUPERUSER ───────────────────────────────────────────────────
  async authenticateSuperuser(email, password) {
    const defaultPass = "DocuSentinel@2024!Admin";
    return this.authenticateSuperuserWithPassword(
      email,
      password,
      defaultPass,
      "docusentinel-dev-secret-change-in-production-minimum-32-chars"
    );
  }
  async authenticateSuperuserWithPassword(email, password, expectedPassword, jwtSecret) {
    if (email !== SUPERUSER_CONFIG.email || password !== expectedPassword) return null;
    const token = await this.generateJWT(
      { userId: "superuser", email, role: 1, name: SUPERUSER_CONFIG.name, isSuperuser: true },
      jwtSecret
    );
    return {
      user: { id: "superuser", email, name: SUPERUSER_CONFIG.name, role: 1, mfaEnabled: false },
      token
    };
  }
  // ─── UTILS ───────────────────────────────────────────────────────
  b64url(data) {
    const str = data instanceof Uint8Array ? String.fromCharCode(...data) : data;
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  bufToHex(buf) {
    return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }
  safeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return result === 0;
  }
};

// src/encryption/service.ts
var EncryptionService = class {
  ALGO = "AES-GCM";
  KEY_BITS = 256;
  IV_BYTES = 12;
  // 96-bit IV para AES-GCM
  // ─── AES KEY ─────────────────────────────────────────────────────
  async generateAESKey() {
    return crypto.subtle.generateKey({ name: this.ALGO, length: this.KEY_BITS }, true, ["encrypt", "decrypt"]);
  }
  async keyFromHex(hex) {
    const raw2 = this.hexToBytes(hex);
    return crypto.subtle.importKey("raw", raw2, { name: this.ALGO, length: this.KEY_BITS }, false, ["decrypt"]);
  }
  // ─── ENCRYPT BUFFER (producción) ─────────────────────────────────
  /**
   * Cifra un ArrayBuffer con AES-256-GCM.
   * Devuelve ciphertext (ArrayBuffer), IV (hex) y clave (hex).
   * En producción, la clave debería cifrarse con un KEK antes de almacenarse.
   */
  async encryptBuffer(plaintext) {
    const key = await this.generateAESKey();
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_BYTES));
    const ciphertext = await crypto.subtle.encrypt({ name: this.ALGO, iv }, key, plaintext);
    const rawKey = await crypto.subtle.exportKey("raw", key);
    return {
      ciphertext,
      iv: this.bytesToHex(iv),
      keyHex: this.bytesToHex(new Uint8Array(rawKey))
    };
  }
  /**
   * Descifra un ArrayBuffer cifrado con AES-256-GCM.
   */
  async decryptBuffer(ciphertext, keyHex, ivHex) {
    const key = await this.keyFromHex(keyHex);
    const iv = this.hexToBytes(ivHex);
    return crypto.subtle.decrypt({ name: this.ALGO, iv }, key, ciphertext);
  }
  // ─── ENCRYPT STRING (legacy / compatibilidad) ─────────────────────
  async encryptData(data, keyId) {
    const encoder = new TextEncoder();
    const { ciphertext, iv, keyHex } = await this.encryptBuffer(encoder.encode(data).buffer);
    return {
      encryptedData: this.bytesToBase64(new Uint8Array(ciphertext)),
      keyId: keyHex,
      iv,
      algorithm: this.ALGO
    };
  }
  async decryptData(encryptedData, keyId, iv) {
    const cipherBytes = this.base64ToBytes(encryptedData).buffer;
    const plain = await this.decryptBuffer(cipherBytes, keyId, iv);
    return {
      data: new TextDecoder().decode(plain),
      keyId,
      algorithm: this.ALGO
    };
  }
  // ─── HASH ─────────────────────────────────────────────────────────
  async hashData(data) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return this.bytesToHex(new Uint8Array(buf));
  }
  async hashBuffer(buffer) {
    const buf = await crypto.subtle.digest("SHA-256", buffer);
    return this.bytesToHex(new Uint8Array(buf));
  }
  /** HMAC-SHA256 para verificar integridad */
  async verifyIntegrity(data, signature, key) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(key),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      return crypto.subtle.verify("HMAC", cryptoKey, this.base64ToBytes(signature), new TextEncoder().encode(data));
    } catch {
      return false;
    }
  }
  // ─── RSA KEY PAIR (para futures KMS) ─────────────────────────────
  async generateRSAKeyPair() {
    return crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"]
    );
  }
  // ─── HELPERS ──────────────────────────────────────────────────────
  bytesToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    return out;
  }
  bytesToBase64(bytes) {
    let str = "";
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str);
  }
  base64ToBytes(b64) {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
};

// src/audit/service.ts
var AuditService = class {
  encryptionService;
  constructor() {
    this.encryptionService = new EncryptionService();
  }
  /**
   * Registra un evento de auditoría con hash encadenado
   */
  async logEvent(userId, action, resourceType, resourceId, details, ipAddress, userAgent, db, actorEmail) {
    try {
      const previousLog = await this.getLastLog(db);
      const previousHash = previousLog ? previousLog.currentHash : "GENESIS";
      const logId = this.generateUUID();
      const timestamp = /* @__PURE__ */ new Date();
      const logData = {
        id: logId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: timestamp.toISOString(),
        previousHash
      };
      const currentHash = await this.generateLogHash(logData);
      const auditLog = {
        id: logId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp,
        previousHash,
        currentHash
      };
      await this.insertLog(auditLog, db);
      return auditLog;
    } catch (error) {
      console.error("Error al registrar evento de auditor\xEDa:", error);
      throw new Error(`Error al registrar evento: ${error.message}`);
    }
  }
  /**
   * Obtiene el último log registrado
   */
  async getLastLog(db) {
    try {
      const result = await db.prepare(`
        SELECT * FROM audit_logs 
        ORDER BY timestamp DESC 
        LIMIT 1
      `).first();
      if (!result) return null;
      return {
        id: result.id,
        userId: result.user_id,
        action: result.action,
        resourceType: result.resource_type,
        resourceId: result.resource_id,
        details: JSON.parse(result.details || "{}"),
        ipAddress: result.ip_address,
        userAgent: result.user_agent,
        timestamp: new Date(result.timestamp),
        previousHash: result.previous_hash,
        currentHash: result.current_hash
      };
    } catch (error) {
      console.error("Error al obtener \xFAltimo log:", error);
      return null;
    }
  }
  /**
   * Inserta un log en la base de datos
   */
  async insertLog(log2, db) {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, timestamp, previous_hash, current_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log2.id,
      log2.userId,
      log2.action,
      log2.resourceType,
      log2.resourceId,
      JSON.stringify(log2.details),
      log2.ipAddress,
      log2.userAgent,
      log2.timestamp.toISOString(),
      log2.previousHash,
      log2.currentHash
    ).run();
  }
  /**
   * Genera hash criptográfico de un log
   */
  async generateLogHash(logData) {
    const logString = JSON.stringify(logData, Object.keys(logData).sort());
    return await this.encryptionService.hashData(logString);
  }
  /**
   * Verifica la integridad de la cadena de logs
   */
  async verifyChainIntegrity(db) {
    const errors = [];
    try {
      const logs = await db.prepare(`
        SELECT * FROM audit_logs 
        ORDER BY timestamp ASC
      `).all();
      if (!logs.results || logs.results.length === 0) {
        return { isValid: true, errors };
      }
      let previousHash = "GENESIS";
      for (let i = 0; i < logs.results.length; i++) {
        const log2 = logs.results[i];
        const logData = {
          id: log2.id,
          userId: log2.user_id,
          action: log2.action,
          resourceType: log2.resource_type,
          resourceId: log2.resource_id,
          details: JSON.parse(log2.details || "{}"),
          ipAddress: log2.ip_address,
          userAgent: log2.user_agent,
          timestamp: log2.timestamp,
          previousHash: log2.previous_hash
        };
        if (log2.previous_hash !== previousHash) {
          errors.push(`Log ${log2.id}: previous_hash no coincide. Esperado: ${previousHash}, Actual: ${log2.previous_hash}`);
        }
        const expectedHash = await this.generateLogHash(logData);
        if (log2.current_hash !== expectedHash) {
          errors.push(`Log ${log2.id}: current_hash inv\xE1lido. Esperado: ${expectedHash}, Actual: ${log2.current_hash}`);
        }
        previousHash = log2.current_hash;
      }
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Error al verificar cadena: ${error.message}`);
      return { isValid: false, errors };
    }
  }
  /**
   * Busca logs con información de usuario (JOIN con tabla users)
   */
  async searchLogsWithUsers(db, filters, limit = 100, offset = 0) {
    try {
      const conditions = ["1=1"];
      const filterParams = [];
      if (filters.userId) {
        conditions.push("al.user_id = ?");
        filterParams.push(filters.userId);
      }
      if (filters.action) {
        conditions.push("al.action = ?");
        filterParams.push(filters.action);
      }
      if (filters.resourceType) {
        conditions.push("al.resource_type = ?");
        filterParams.push(filters.resourceType);
      }
      if (filters.resourceId) {
        conditions.push("al.resource_id = ?");
        filterParams.push(filters.resourceId);
      }
      if (filters.startDate) {
        conditions.push("al.timestamp >= ?");
        filterParams.push(filters.startDate.toISOString());
      }
      if (filters.endDate) {
        conditions.push("al.timestamp <= ?");
        filterParams.push(filters.endDate.toISOString());
      }
      if (filters.ipAddress) {
        conditions.push("al.ip_address = ?");
        filterParams.push(filters.ipAddress);
      }
      const whereClause = "WHERE " + conditions.join(" AND ");
      const countParams = [...filterParams];
      const queryParams = [...filterParams, limit, offset];
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`);
      const countResult = countParams.length > 0 ? await countStmt.bind(...countParams).first() : await countStmt.first();
      const total = countResult?.count || 0;
      const mainQuery = `
        SELECT al.*,
               u.email as actor_email,
               u.name as actor_name,
               u.role as actor_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.timestamp DESC
        LIMIT ? OFFSET ?`;
      const queryResults = await db.prepare(mainQuery).bind(...queryParams).all();
      const logs = queryResults.results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        actorEmail: row.actor_email || (row.user_id === "superuser" ? "rauldiazespejo@gmail.com" : row.user_id),
        actorName: row.actor_name || (row.user_id === "superuser" ? "Raul Diaz Espejo" : "Sistema"),
        actorRole: row.actor_role,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: (() => {
          try {
            return JSON.parse(row.details || "{}");
          } catch {
            return {};
          }
        })(),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: new Date(row.timestamp),
        previousHash: row.previous_hash,
        currentHash: row.current_hash
      }));
      return { logs, total };
    } catch (error) {
      console.error("Error al buscar logs con usuarios:", error);
      return { logs: [], total: 0 };
    }
  }
  /**
   * Busca logs con filtros
   */
  async searchLogs(db, filters, limit = 100, offset = 0) {
    try {
      let query = "SELECT * FROM audit_logs WHERE 1=1";
      const params = [];
      if (filters.userId) {
        query += " AND user_id = ?";
        params.push(filters.userId);
      }
      if (filters.action) {
        query += " AND action = ?";
        params.push(filters.action);
      }
      if (filters.resourceType) {
        query += " AND resource_type = ?";
        params.push(filters.resourceType);
      }
      if (filters.resourceId) {
        query += " AND resource_id = ?";
        params.push(filters.resourceId);
      }
      if (filters.startDate) {
        query += " AND timestamp >= ?";
        params.push(filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query += " AND timestamp <= ?";
        params.push(filters.endDate.toISOString());
      }
      if (filters.ipAddress) {
        query += " AND ip_address = ?";
        params.push(filters.ipAddress);
      }
      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
      const countResult = params.length > 0 ? await db.prepare(countQuery).bind(...params).first() : await db.prepare(countQuery).first();
      const total = countResult?.count || 0;
      query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
      const allParams = [...params, limit, offset];
      const results = await db.prepare(query).bind(...allParams).all();
      const logs = results.results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: JSON.parse(row.details || "{}"),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: new Date(row.timestamp),
        previousHash: row.previous_hash,
        currentHash: row.current_hash
      }));
      return { logs, total };
    } catch (error) {
      console.error("Error al buscar logs:", error);
      return { logs: [], total: 0 };
    }
  }
  /**
   * Obtiene estadísticas de auditoría
   */
  async getAuditStats(db, startDate, endDate) {
    try {
      let dateFilter = "";
      const params = [];
      if (startDate || endDate) {
        dateFilter = " WHERE 1=1";
        if (startDate) {
          dateFilter += " AND timestamp >= ?";
          params.push(startDate.toISOString());
        }
        if (endDate) {
          dateFilter += " AND timestamp <= ?";
          params.push(endDate.toISOString());
        }
      }
      const totalResult = params.length > 0 ? await db.prepare(`SELECT COUNT(*) as total FROM audit_logs${dateFilter}`).bind(...params).first() : await db.prepare(`SELECT COUNT(*) as total FROM audit_logs${dateFilter}`).first();
      const totalEvents = totalResult?.total || 0;
      const actionResults = params.length > 0 ? await db.prepare(`SELECT action, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY action ORDER BY count DESC`).bind(...params).all() : await db.prepare(`SELECT action, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY action ORDER BY count DESC`).all();
      const eventsByAction = {};
      actionResults.results.forEach((row) => {
        eventsByAction[row.action] = row.count;
      });
      const resourceResults = params.length > 0 ? await db.prepare(`SELECT resource_type, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY resource_type ORDER BY count DESC`).bind(...params).all() : await db.prepare(`SELECT resource_type, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY resource_type ORDER BY count DESC`).all();
      const eventsByResource = {};
      resourceResults.results.forEach((row) => {
        eventsByResource[row.resource_type] = row.count;
      });
      const uniqueResult = params.length > 0 ? await db.prepare(`SELECT COUNT(DISTINCT user_id) as unique_users FROM audit_logs${dateFilter}`).bind(...params).first() : await db.prepare(`SELECT COUNT(DISTINCT user_id) as unique_users FROM audit_logs${dateFilter}`).first();
      const uniqueUsers = uniqueResult?.unique_users || 0;
      const integrityStatus = await this.verifyChainIntegrity(db);
      return {
        totalEvents,
        eventsByAction,
        eventsByResource,
        uniqueUsers,
        integrityStatus
      };
    } catch (error) {
      console.error("Error al obtener estad\xEDsticas:", error);
      return {
        totalEvents: 0,
        eventsByAction: {},
        eventsByResource: {},
        uniqueUsers: 0,
        integrityStatus: { isValid: false, errors: [error.message] }
      };
    }
  }
  /**
   * Genera un UUID v4
   */
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
};

// src/middleware/auth.ts
var AuthMiddleware = class {
  authService;
  auditService;
  constructor() {
    this.authService = new AuthService();
    this.auditService = new AuditService();
  }
  /**
   * Middleware principal de autenticación
   */
  async authenticate(c, next) {
    try {
      const token = this.extractToken(c);
      if (!token) {
        return c.json({
          success: false,
          error: "Token de autenticaci\xF3n requerido"
        }, 401);
      }
      const jwtSecret = c.env.JWT_SECRET || "docusentinel-dev-secret-change-in-production-minimum-32-chars";
      const payload = await this.authService.verifyJWT(token, jwtSecret);
      if (payload.isSuperuser || payload.userId === "superuser") {
        const superUser = {
          id: "superuser",
          email: payload.email,
          name: payload.name || "Super Admin",
          role: 1,
          mfaEnabled: false,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        c.set("user", superUser);
        c.set("userId", "superuser");
        await next();
        return;
      }
      const user = await this.getUserById(payload.userId, c.env.DB);
      if (!user || !user.isActive) {
        return c.json({
          success: false,
          error: "Usuario no encontrado o inactivo"
        }, 401);
      }
      const sessionValid = await this.validateSession(token, user.id, c.env.DB);
      if (!sessionValid) {
        return c.json({
          success: false,
          error: "Sesi\xF3n expirada o inv\xE1lida"
        }, 401);
      }
      c.set("user", user);
      c.set("userId", user.id);
      await next();
    } catch (error) {
      console.error("Error de autenticaci\xF3n:", error);
      return c.json({
        success: false,
        error: "Token inv\xE1lido o expirado"
      }, 401);
    }
  }
  /**
   * Middleware de autorización basado en roles
   */
  requireRole(minRoleLevel) {
    return async (c, next) => {
      try {
        const user = c.get("user");
        if (!user) {
          return c.json({
            success: false,
            error: "Usuario no autenticado"
          }, 401);
        }
        if (user.role > minRoleLevel) {
          const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
          await this.auditService.logEvent(
            user.id,
            "UNAUTHORIZED_ACCESS_ATTEMPT",
            "permission",
            user.id,
            {
              requiredRole: minRoleLevel,
              userRole: user.role,
              resource: c.req.path,
              method: c.req.method
            },
            clientIP,
            c.req.header("User-Agent") || "unknown",
            c.env.DB
          );
          return c.json({
            success: false,
            error: "Permisos insuficientes"
          }, 403);
        }
        await next();
      } catch (error) {
        console.error("Error de autorizaci\xF3n:", error);
        return c.json({
          success: false,
          error: "Error de autorizaci\xF3n"
        }, 500);
      }
    };
  }
  /**
   * Middleware de autorización para acciones específicas
   */
  requirePermission(action, resourceType) {
    return async (c, next) => {
      try {
        const user = c.get("user");
        const resourceId = c.req.param("id") || c.req.param("documentId");
        if (!user) {
          return c.json({
            success: false,
            error: "Usuario no autenticado"
          }, 401);
        }
        if (user.role === 1 /* SUPER_ADMIN */) {
          await next();
          return;
        }
        const hasPermission = await this.checkPermission(
          user.id,
          action,
          resourceType,
          resourceId,
          c.env.DB
        );
        if (!hasPermission) {
          const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
          await this.auditService.logEvent(
            user.id,
            "PERMISSION_DENIED",
            "permission",
            resourceId || "unknown",
            {
              action,
              resourceType,
              resourceId,
              userRole: user.role
            },
            clientIP,
            c.req.header("User-Agent") || "unknown",
            c.env.DB
          );
          return c.json({
            success: false,
            error: "No tiene permisos para realizar esta acci\xF3n"
          }, 403);
        }
        await next();
      } catch (error) {
        console.error("Error de permisos:", error);
        return c.json({
          success: false,
          error: "Error al verificar permisos"
        }, 500);
      }
    };
  }
  /**
   * Middleware para verificar MFA
   */
  requireMFA() {
    return async (c, next) => {
      try {
        const user = c.get("user");
        if (!user) {
          return c.json({
            success: false,
            error: "Usuario no autenticado"
          }, 401);
        }
        if (user.id === "superuser") {
          await next();
          return;
        }
        if (!user.mfaEnabled) {
          await next();
          return;
        }
        const token = this.extractToken(c);
        const jwtSecret = c.env.JWT_SECRET || "docusentinel-dev-secret-change-in-production-minimum-32-chars";
        const payload = await this.authService.verifyJWT(token, jwtSecret);
        if (!payload.mfaVerified) {
          return c.json({
            success: false,
            error: "Se requiere verificaci\xF3n MFA"
          }, 403);
        }
        await next();
      } catch (error) {
        console.error("Error de MFA:", error);
        return c.json({
          success: false,
          error: "Error al verificar MFA"
        }, 500);
      }
    };
  }
  /**
   * Middleware de rate limiting
   */
  rateLimit(maxRequests = 100, windowMs = 6e4) {
    return async (c, next) => {
      try {
        const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
        const key = `rate_limit:${clientIP}`;
        const current = await c.env.KV.get(key);
        const count = current ? parseInt(current) : 0;
        if (count >= maxRequests) {
          await this.auditService.logEvent(
            "anonymous",
            "RATE_LIMIT_EXCEEDED",
            "security",
            clientIP,
            {
              clientIP,
              requests: count,
              maxRequests,
              windowMs
            },
            clientIP,
            c.req.header("User-Agent") || "unknown",
            c.env.DB
          );
          return c.json({
            success: false,
            error: "L\xEDmite de solicitudes excedido"
          }, 429);
        }
        await c.env.KV.put(key, (count + 1).toString(), { expirationTtl: Math.ceil(windowMs / 1e3) });
        await next();
      } catch (error) {
        console.error("Error de rate limit:", error);
        await next();
      }
    };
  }
  /**
   * Extrae el token JWT del header (público para uso en routes)
   */
  extractToken(c) {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  }
  /**
   * Obtiene usuario por ID
   */
  async getUserById(userId, db) {
    try {
      const result = await db.prepare(`
        SELECT * FROM users WHERE id = ? AND is_active = 1
      `).bind(userId).first();
      if (!result) return null;
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        mfaEnabled: Boolean(result.mfa_enabled),
        mfaSecret: result.mfa_secret,
        isActive: Boolean(result.is_active),
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      };
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      return null;
    }
  }
  /**
   * Valida sesión activa
   */
  async validateSession(token, userId, db) {
    try {
      const tokenHash = await this.authService.hashData(token);
      const result = await db.prepare(`
        SELECT * FROM sessions 
        WHERE user_id = ? AND token_hash = ? AND expires_at > ?
      `).bind(userId, tokenHash, (/* @__PURE__ */ new Date()).toISOString()).first();
      return !!result;
    } catch (error) {
      console.error("Error al validar sesi\xF3n:", error);
      return false;
    }
  }
  /**
   * Verifica permisos específicos
   */
  async checkPermission(userId, action, resourceType, resourceId, db) {
    try {
      if (!resourceId) {
        return await this.checkGeneralPermission(userId, action, resourceType, db);
      }
      const permission = await db.prepare(`
        SELECT * FROM permissions 
        WHERE user_id = ? AND document_id = ? AND action = ?
        AND (expires_at IS NULL OR expires_at > ?)
      `).bind(userId, resourceId, action, (/* @__PURE__ */ new Date()).toISOString()).first();
      return !!permission;
    } catch (error) {
      console.error("Error al verificar permisos:", error);
      return false;
    }
  }
  /**
   * Verifica permisos generales por rol
   */
  async checkGeneralPermission(userId, action, resourceType, db) {
    try {
      const user = await this.getUserById(userId, db);
      if (!user) return false;
      const rolePermissions = {
        [1 /* SUPER_ADMIN */]: ["view", "edit", "delete", "share", "verify"],
        [2 /* ADMIN_DOCUMENTOS */]: ["view", "edit", "share", "verify"],
        [3 /* AUDITOR */]: ["view"],
        [4 /* VERIFICADOR */]: ["view", "verify"],
        [5 /* USUARIO_ESTANDAR */]: ["view"]
      };
      const userPermissions = rolePermissions[user.role] || [];
      return userPermissions.includes(action);
    } catch (error) {
      console.error("Error al verificar permisos generales:", error);
      return false;
    }
  }
};

// src/routes/auth.ts
var auth = new Hono2();
var authService = new AuthService();
var auditService = new AuditService();
var authMiddleware = new AuthMiddleware();
var loginSchema = external_exports.object({
  email: external_exports.string().email(),
  password: external_exports.string().min(6),
  mfaToken: external_exports.string().optional()
});
var registerSchema = external_exports.object({
  email: external_exports.string().email(),
  name: external_exports.string().min(2).max(100),
  password: external_exports.string().min(8),
  role: external_exports.nativeEnum(UserRole).optional()
});
var mfaSchema = external_exports.object({
  token: external_exports.string().length(6).regex(/^\d{6}$/)
});
function getIP(c) {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}
function getUA(c) {
  return c.req.header("User-Agent") || "unknown";
}
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, mfaToken } = loginSchema.parse(body);
    const ip = getIP(c);
    const ua = getUA(c);
    const jwtSecret = c.env.JWT_SECRET || "docusentinel-dev-secret-change-in-production-minimum-32-chars";
    if (email === SUPERUSER_CONFIG.email) {
      const superPassword = c.env.SUPERUSER_PASSWORD || SUPERUSER_CONFIG.password;
      const result = await authService.authenticateSuperuserWithPassword(email, password, superPassword, jwtSecret);
      if (!result) {
        await auditService.logEvent("superuser", "LOGIN_FAILED", "user", email, { reason: "bad_password" }, ip, ua, c.env.DB);
        return c.json({ success: false, error: "Credenciales inv\xE1lidas" }, 401);
      }
      await auditService.logEvent("superuser", "LOGIN_SUCCESS", "session", "superuser", { method: "superuser" }, ip, ua, c.env.DB);
      return c.json({ success: true, data: { token: result.token, user: result.user } });
    }
    const user = await c.env.DB.prepare(
      `SELECT * FROM users WHERE email = ? AND is_active = 1`
    ).bind(email).first();
    if (!user) {
      await auditService.logEvent("anonymous", "LOGIN_FAILED", "user", email, { reason: "user_not_found" }, ip, ua, c.env.DB);
      return c.json({ success: false, error: "Credenciales inv\xE1lidas" }, 401);
    }
    const pwOk = await authService.verifyPassword(password, user.password_hash);
    if (!pwOk) {
      await auditService.logEvent(user.id, "LOGIN_FAILED", "user", user.id, { reason: "bad_password" }, ip, ua, c.env.DB);
      return c.json({ success: false, error: "Credenciales inv\xE1lidas" }, 401);
    }
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return c.json({ success: false, error: "Se requiere token MFA", requiresMFA: true }, 400);
      }
      const mfaOk = await authService.verifyTOTP(mfaToken, user.mfa_secret);
      if (!mfaOk) {
        await auditService.logEvent(user.id, "MFA_FAILED", "user", user.id, { reason: "bad_token" }, ip, ua, c.env.DB);
        return c.json({ success: false, error: "Token MFA inv\xE1lido" }, 401);
      }
    }
    const token = await authService.generateJWT(
      { userId: user.id, email: user.email, role: user.role, mfaVerified: Boolean(user.mfa_enabled) },
      jwtSecret
    );
    const sessId = crypto.randomUUID();
    const tokenHash = await authService.hashData(token);
    const expires = new Date(Date.now() + 24 * 3600 * 1e3);
    await c.env.DB.prepare(
      `INSERT INTO sessions (id,user_id,token_hash,expires_at,ip_address,user_agent) VALUES (?,?,?,?,?,?)`
    ).bind(sessId, user.id, tokenHash, expires.toISOString(), ip, ua).run();
    await c.env.DB.prepare(`UPDATE users SET last_login_at=? WHERE id=?`).bind((/* @__PURE__ */ new Date()).toISOString(), user.id).run();
    await auditService.logEvent(user.id, "LOGIN_SUCCESS", "session", sessId, { method: "password", mfa: Boolean(user.mfa_enabled) }, ip, ua, c.env.DB);
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: Boolean(user.mfa_enabled)
        }
      }
    });
  } catch (err) {
    if (err?.issues) return c.json({ success: false, error: "Datos inv\xE1lidos" }, 400);
    console.error("Login error:", err);
    return c.json({ success: false, error: "Error interno" }, 500);
  }
});
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password, role = 5 /* USUARIO_ESTANDAR */ } = registerSchema.parse(body);
    const ip = getIP(c);
    const ua = getUA(c);
    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
    if (existing) return c.json({ success: false, error: "El usuario ya existe" }, 400);
    const passwordHash = await authService.hashPassword(password);
    const userId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(
      `INSERT INTO users (id,email,name,role,password_hash,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)`
    ).bind(userId, email, name, role, passwordHash, now, now).run();
    await auditService.logEvent(userId, "USER_CREATED", "user", userId, { email, name, role }, ip, ua, c.env.DB);
    return c.json({ success: true, message: "Usuario creado exitosamente", data: { userId, email, name } });
  } catch (err) {
    if (err?.issues) return c.json({ success: false, error: "Datos inv\xE1lidos" }, 400);
    console.error("Register error:", err);
    return c.json({ success: false, error: "Error al registrar usuario" }, 500);
  }
});
auth.get("/profile", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return c.json({ success: false, error: "Error al obtener perfil" }, 500);
  }
});
auth.post("/mfa/setup", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP(c);
    const ua = getUA(c);
    const { secret, qrCode } = await authService.generateTOTPSecret(user.email);
    await c.env.DB.prepare(`UPDATE users SET mfa_secret=?, mfa_type='totp', mfa_enabled=0 WHERE id=?`).bind(secret, user.id).run();
    await auditService.logEvent(user.id, "MFA_SETUP_INITIATED", "user", user.id, { type: "totp" }, ip, ua, c.env.DB);
    return c.json({ success: true, data: { secret, qrCode } });
  } catch (err) {
    console.error("MFA setup error:", err);
    return c.json({ success: false, error: "Error al configurar MFA" }, 500);
  }
});
auth.post("/mfa/verify", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP(c);
    const ua = getUA(c);
    const { token } = mfaSchema.parse(await c.req.json());
    const dbUser = await c.env.DB.prepare(`SELECT mfa_secret FROM users WHERE id=?`).bind(user.id).first();
    const secret = dbUser?.mfa_secret;
    const isValid2 = await authService.verifyTOTP(token, secret);
    if (!isValid2) {
      await auditService.logEvent(user.id, "MFA_VERIFICATION_FAILED", "user", user.id, {}, ip, ua, c.env.DB);
      return c.json({ success: false, error: "Token MFA inv\xE1lido" }, 400);
    }
    await c.env.DB.prepare(`UPDATE users SET mfa_enabled=1 WHERE id=?`).bind(user.id).run();
    await auditService.logEvent(user.id, "MFA_VERIFIED", "user", user.id, {}, ip, ua, c.env.DB);
    return c.json({ success: true, message: "MFA activado exitosamente" });
  } catch (err) {
    if (err?.issues) return c.json({ success: false, error: "Token inv\xE1lido" }, 400);
    return c.json({ success: false, error: "Error al verificar MFA" }, 500);
  }
});
auth.post("/logout", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP(c);
    const ua = getUA(c);
    const token = authMiddleware.extractToken(c);
    if (token) {
      const tokenHash = await authService.hashData(token);
      await c.env.DB.prepare(`DELETE FROM sessions WHERE user_id=? AND token_hash=?`).bind(user.id, tokenHash).run();
    }
    await auditService.logEvent(user.id, "LOGOUT", "session", user.id, {}, ip, ua, c.env.DB);
    return c.json({ success: true, message: "Sesi\xF3n cerrada exitosamente" });
  } catch (err) {
    return c.json({ success: false, error: "Error al cerrar sesi\xF3n" }, 500);
  }
});
auth.post("/change-password", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP(c);
    const ua = getUA(c);
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return c.json({ success: false, error: "Datos inv\xE1lidos" }, 400);
    }
    const dbUser = await c.env.DB.prepare(`SELECT password_hash FROM users WHERE id=?`).bind(user.id).first();
    const valid = await authService.verifyPassword(currentPassword, dbUser?.password_hash);
    if (!valid) return c.json({ success: false, error: "Contrase\xF1a actual incorrecta" }, 401);
    const newHash = await authService.hashPassword(newPassword);
    await c.env.DB.prepare(`UPDATE users SET password_hash=?, updated_at=? WHERE id=?`).bind(newHash, (/* @__PURE__ */ new Date()).toISOString(), user.id).run();
    await auditService.logEvent(user.id, "PASSWORD_CHANGED", "user", user.id, {}, ip, ua, c.env.DB);
    return c.json({ success: true, message: "Contrase\xF1a actualizada exitosamente" });
  } catch (err) {
    return c.json({ success: false, error: "Error al cambiar contrase\xF1a" }, 500);
  }
});
auth.get("/users", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get("user");
    if (user.role > 2) return c.json({ success: false, error: "Permisos insuficientes" }, 403);
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const pageSize = Math.min(50, parseInt(c.req.query("pageSize") || "20"));
    const search = c.req.query("search") || "";
    const offset = (page - 1) * pageSize;
    let where = "1=1";
    const params = [];
    if (search) {
      where += " AND (email LIKE ? OR name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    const results = await c.env.DB.prepare(
      `SELECT id, email, name, role, mfa_enabled, is_active, last_login_at, created_at
       FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all();
    const countRow = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users WHERE ${where}`
    ).bind(...params).first();
    return c.json({ success: true, data: {
      users: results.results.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        mfaEnabled: Boolean(u.mfa_enabled),
        isActive: Boolean(u.is_active),
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at
      })),
      total: countRow?.total || 0,
      page,
      pageSize
    } });
  } catch (err) {
    console.error("List users error:", err);
    return c.json({ success: false, error: "Error al listar usuarios" }, 500);
  }
});
auth.patch("/users/:id", authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const actor = c.get("user");
    if (actor.role > 2) return c.json({ success: false, error: "Permisos insuficientes" }, 403);
    const userId = c.req.param("id");
    const body = await c.req.json();
    const ip = getIP(c);
    const ua = getUA(c);
    const allowedFields = ["role", "is_active", "name"];
    const updates = [];
    const params = [];
    for (const f of allowedFields) {
      if (body[f] !== void 0) {
        updates.push(`${f} = ?`);
        params.push(body[f]);
      }
    }
    if (updates.length === 0) return c.json({ success: false, error: "Nada que actualizar" }, 400);
    updates.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString(), userId);
    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await auditService.logEvent(
      actor.id,
      "USER_UPDATED",
      "user",
      userId,
      { changes: body },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, message: "Usuario actualizado" });
  } catch (err) {
    return c.json({ success: false, error: "Error al actualizar usuario" }, 500);
  }
});
var auth_default = auth;

// src/routes/documents.ts
var documents = new Hono2();
var authMiddleware2 = new AuthMiddleware();
var encryptionService = new EncryptionService();
var auditService2 = new AuditService();
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff"];
var permissionSchema = external_exports.object({
  userId: external_exports.string().uuid().optional(),
  userEmail: external_exports.string().email().optional(),
  action: external_exports.enum(["view", "download", "edit", "delete", "share", "verify"]),
  expiresAt: external_exports.string().datetime().optional()
});
function getIP2(c) {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}
function getUA2(c) {
  return c.req.header("User-Agent") || "unknown";
}
documents.get("/", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("pageSize") || "10")));
    const search = c.req.query("search") || "";
    const offset = (page - 1) * pageSize;
    let whereClause = "(d.created_by = ? OR p.user_id = ?)";
    const params = [user.id, user.id];
    if (search) {
      whereClause += " AND (d.name LIKE ? OR d.type LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    const query = `
      SELECT d.id, d.name, d.type, d.size, d.hash, d.security_level, d.created_by, d.created_at,
             GROUP_CONCAT(DISTINCT p.action) as permissions,
             COUNT(DISTINCT v.id) as verification_count
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      LEFT JOIN verifications v ON d.id = v.document_id
      WHERE ${whereClause}
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const allParams = [user.id, now, ...params, pageSize, offset];
    const results = await c.env.DB.prepare(query).bind(...allParams).all();
    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      WHERE ${whereClause}`;
    const countParams = [user.id, now, ...params.slice(0, search ? 4 : 2)];
    const countRow = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = countRow?.total || 0;
    const docs = results.results.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      size: d.size,
      hash: d.hash,
      securityLevel: d.security_level,
      permissions: d.permissions ? d.permissions.split(",") : [],
      verificationCount: d.verification_count || 0,
      createdBy: d.created_by,
      createdAt: d.created_at
    }));
    return c.json({ success: true, data: { documents: docs, total, page, pageSize, hasNext: docs.length === pageSize, hasPrev: page > 1 } });
  } catch (err) {
    console.error("List docs error:", err);
    return c.json({ success: false, error: "Error al obtener documentos" }, 500);
  }
});
documents.post("/upload", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP2(c);
    const ua = getUA2(c);
    const formData = await c.req.formData();
    const file = formData.get("file");
    const securityLevel = formData.get("securityLevel") || "internal";
    const description = formData.get("description") || "";
    if (!file) return c.json({ success: false, error: "Archivo requerido" }, 400);
    if (file.size > MAX_FILE_SIZE) return c.json({ success: false, error: "El archivo excede 10 MB" }, 400);
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ success: false, error: "Tipo no permitido. Use PDF, JPG, PNG o TIFF" }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const hashHex = await encryptionService.hashBuffer(arrayBuffer);
    const { ciphertext, iv, keyHex } = await encryptionService.encryptBuffer(arrayBuffer);
    const documentId = crypto.randomUUID();
    const r2Key = `documents/${documentId}`;
    await c.env.R2.put(r2Key, ciphertext, {
      httpMetadata: { contentType: "application/octet-stream" },
      customMetadata: { originalName: file.name, originalType: file.type, iv }
    });
    const metadata = JSON.stringify({ description, securityLevel, originalType: file.type });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      documentId,
      file.name,
      file.type,
      file.size,
      hashHex,
      iv,
      // encrypted_data = IV (datos están en R2)
      keyHex,
      // encryption_key_id = clave AES cifrada/dev (en prod, se guardaría en KMS)
      metadata,
      securityLevel,
      user.id,
      now,
      now
    ).run();
    await auditService2.logEvent(
      user.id,
      "DOCUMENT_UPLOADED",
      "document",
      documentId,
      { name: file.name, type: file.type, size: file.size, hash: hashHex, encrypted: true },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, data: { id: documentId, name: file.name, type: file.type, size: file.size, hash: hashHex, createdAt: now } });
  } catch (err) {
    console.error("Upload error:", err);
    return c.json({ success: false, error: "Error al subir documento" }, 500);
  }
});
documents.get("/stats", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const totalDocs = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM documents WHERE created_by = ?`
    ).bind(user.id).first();
    const totalVerifs = await c.env.DB.prepare(
      `SELECT COUNT(*) as total, AVG(confidence_score) as avg_score FROM verifications`
    ).first();
    const authentic = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='authentic'`
    ).first();
    const fraudulent = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='fraudulent'`
    ).first();
    const suspicious = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='suspicious'`
    ).first();
    const totalAudit = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM audit_logs`
    ).first();
    const recentDocs = await c.env.DB.prepare(
      `SELECT id, name, type, size, created_at FROM documents ORDER BY created_at DESC LIMIT 5`
    ).all();
    const recentVerifs = await c.env.DB.prepare(
      `SELECT v.id, v.status, v.confidence_score, v.analyzed_at, d.name as doc_name
       FROM verifications v LEFT JOIN documents d ON v.document_id = d.id
       ORDER BY v.analyzed_at DESC LIMIT 5`
    ).all();
    return c.json({ success: true, data: {
      totalDocuments: totalDocs?.total || 0,
      totalVerifications: totalVerifs?.total || 0,
      avgConfidenceScore: Math.round((totalVerifs?.avg_score || 0) * 100) / 100,
      verificationsByStatus: {
        authentic: authentic?.c || 0,
        fraudulent: fraudulent?.c || 0,
        suspicious: suspicious?.c || 0
      },
      totalAuditEvents: totalAudit?.total || 0,
      recentDocuments: recentDocs.results,
      recentVerifications: recentVerifs.results
    } });
  } catch (err) {
    console.error("Stats error:", err);
    return c.json({ success: false, error: "Error al obtener estad\xEDsticas" }, 500);
  }
});
documents.get("/:id", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const documentId = c.req.param("id");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = await c.env.DB.prepare(`
      SELECT d.*, GROUP_CONCAT(DISTINCT p.action) as permissions,
             COUNT(DISTINCT v.id) as verification_count
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      WHERE d.id = ? AND (d.created_by = ? OR p.user_id = ?)
      GROUP BY d.id
    `).bind(user.id, now, documentId, user.id, user.id).first();
    if (!doc) return c.json({ success: false, error: "Documento no encontrado o sin permisos" }, 404);
    return c.json({ success: true, data: {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      hash: doc.hash,
      securityLevel: doc.security_level,
      permissions: doc.permissions ? doc.permissions.split(",") : [],
      verificationCount: doc.verification_count || 0,
      createdBy: doc.created_by,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    } });
  } catch (err) {
    console.error("Get doc error:", err);
    return c.json({ success: false, error: "Error al obtener documento" }, 500);
  }
});
documents.get("/:id/download", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const documentId = c.req.param("id");
    const ip = getIP2(c);
    const ua = getUA2(c);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents
      WHERE id = ? AND (
        created_by = ?
        OR id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action = 'download' AND (expires_at IS NULL OR expires_at > ?))
      )
    `).bind(documentId, user.id, user.id, now).first();
    if (!doc) return c.json({ success: false, error: "Sin permisos de descarga" }, 403);
    const r2Key = `documents/${documentId}`;
    const r2Object = await c.env.R2.get(r2Key);
    if (!r2Object) return c.json({ success: false, error: "Archivo no encontrado en almacenamiento" }, 404);
    const ciphertext = await r2Object.arrayBuffer();
    const iv = doc.encrypted_data;
    const keyHex = doc.encryption_key_id;
    const plaintext = await encryptionService.decryptBuffer(ciphertext, keyHex, iv);
    await auditService2.logEvent(
      user.id,
      "DOCUMENT_DOWNLOADED",
      "document",
      documentId,
      { name: doc.name, size: doc.size },
      ip,
      ua,
      c.env.DB
    );
    return new Response(plaintext, {
      headers: {
        "Content-Type": doc.type,
        "Content-Disposition": `attachment; filename="${doc.name}"`,
        "Content-Length": String(plaintext.byteLength)
      }
    });
  } catch (err) {
    console.error("Download error:", err);
    return c.json({ success: false, error: "Error al descargar documento" }, 500);
  }
});
documents.post("/:id/permissions", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const documentId = c.req.param("id");
    const ip = getIP2(c);
    const ua = getUA2(c);
    const body = await c.req.json();
    const validated = permissionSchema.parse(body);
    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? AND (created_by = ? OR ? <= 2)`
    ).bind(documentId, user.id, user.role).first();
    if (!doc) return c.json({ success: false, error: "Documento no encontrado o sin permisos" }, 404);
    let targetUserId = validated.userId;
    if (!targetUserId && validated.userEmail) {
      const target = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(validated.userEmail).first();
      if (!target) return c.json({ success: false, error: "Usuario no encontrado" }, 404);
      targetUserId = target.id;
    }
    if (!targetUserId) return c.json({ success: false, error: "Especifica userId o userEmail" }, 400);
    const permId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt).toISOString() : null;
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO permissions (id, user_id, document_id, action, granted_by, granted_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(permId, targetUserId, documentId, validated.action, user.id, now, expiresAt).run();
    await auditService2.logEvent(
      user.id,
      "PERMISSION_GRANTED",
      "permission",
      permId,
      { documentId, targetUserId, action: validated.action },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, data: { id: permId, userId: targetUserId, documentId, action: validated.action, grantedAt: now, expiresAt } });
  } catch (err) {
    if (err?.issues) return c.json({ success: false, error: "Datos inv\xE1lidos" }, 400);
    console.error("Permissions error:", err);
    return c.json({ success: false, error: "Error al asignar permisos" }, 500);
  }
});
documents.delete("/:id/permissions/:permId", authMiddleware2.authenticate.bind(authMiddleware2), async (c) => {
  try {
    const user = c.get("user");
    const { id: documentId, permId } = c.req.param();
    const ip = getIP2(c);
    const ua = getUA2(c);
    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? AND (created_by = ? OR ? <= 2)`
    ).bind(documentId, user.id, user.role).first();
    if (!doc) return c.json({ success: false, error: "Sin permisos" }, 403);
    await c.env.DB.prepare(`DELETE FROM permissions WHERE id = ? AND document_id = ?`).bind(permId, documentId).run();
    await auditService2.logEvent(
      user.id,
      "PERMISSION_REVOKED",
      "permission",
      permId,
      { documentId },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, message: "Permiso revocado" });
  } catch (err) {
    return c.json({ success: false, error: "Error al revocar permiso" }, 500);
  }
});
var documents_default = documents;

// src/routes/verification.ts
var verification = new Hono2();
var authMiddleware3 = new AuthMiddleware();
var auditService3 = new AuditService();
var encryptionService2 = new EncryptionService();
var verifySchema = external_exports.object({
  documentId: external_exports.string().uuid(),
  analysisType: external_exports.enum(["full", "image", "typography", "metadata"]).optional()
});
function getIP3(c) {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}
function getUA3(c) {
  return c.req.header("User-Agent") || "unknown";
}
async function analyzeDocument(buffer, fileName, fileType, analysisType, existingHash) {
  const findings = [];
  let score = 100;
  let status = "authentic";
  const bytes = new Uint8Array(buffer);
  const hashSha256 = await encryptionService2.hashBuffer(buffer);
  if (existingHash) {
    if (hashSha256 === existingHash) {
      findings.push({
        type: "hash_integrity",
        severity: "low",
        description: "Hash SHA-256 coincide con el registro original",
        evidence: `SHA-256: ${hashSha256.substring(0, 32)}\u2026`
      });
    } else {
      score -= 60;
      findings.push({
        type: "hash_mismatch",
        severity: "critical",
        description: "ALERTA: El hash del archivo no coincide con el registro original",
        evidence: `Registrado: ${existingHash.substring(0, 32)}\u2026 | Actual: ${hashSha256.substring(0, 32)}\u2026`
      });
    }
  } else {
    findings.push({
      type: "hash_computed",
      severity: "low",
      description: "Hash SHA-256 calculado (no hay registro previo para comparar)",
      evidence: `SHA-256: ${hashSha256.substring(0, 32)}\u2026`
    });
  }
  if (analysisType === "full" || analysisType === "image" || analysisType === "metadata") {
    const magicCheck = checkFileMagicBytes(bytes, fileType);
    if (!magicCheck.valid) {
      score -= 25;
      findings.push({
        type: "file_signature",
        severity: "high",
        description: magicCheck.message,
        evidence: `Cabecera: ${bytesToHex(bytes.slice(0, 8))} | Tipo declarado: ${fileType}`
      });
    } else {
      findings.push({
        type: "file_signature",
        severity: "low",
        description: "Cabecera del archivo es consistente con el tipo declarado",
        evidence: `Cabecera: ${bytesToHex(bytes.slice(0, 8))} \u2713`
      });
    }
  }
  if (analysisType === "full" || analysisType === "metadata") {
    const metaCheck = analyzeMetadata(bytes, fileType, fileName);
    findings.push(...metaCheck.findings);
    score -= metaCheck.penalty;
  }
  if (analysisType === "full" || analysisType === "image") {
    const entropy = computeEntropy(bytes.slice(0, Math.min(4096, bytes.length)));
    if (entropy > 7.8) {
      score -= 10;
      findings.push({
        type: "high_entropy",
        severity: "medium",
        description: "Alta entrop\xEDa detectada en el archivo \u2013 posible contenido cifrado o comprimido anidado",
        evidence: `Entrop\xEDa calculada: ${entropy.toFixed(3)} bits/byte (umbral: 7.8)`
      });
    } else {
      findings.push({
        type: "entropy_normal",
        severity: "low",
        description: "Entrop\xEDa del archivo dentro de rangos normales",
        evidence: `Entrop\xEDa: ${entropy.toFixed(3)} bits/byte`
      });
    }
  }
  if ((analysisType === "full" || analysisType === "typography") && fileType === "application/pdf") {
    const typoCheck = analyzePDFTypography(bytes);
    findings.push(...typoCheck.findings);
    score -= typoCheck.penalty;
  }
  if (analysisType === "full" || analysisType === "metadata") {
    const extCheck = checkFileExtension(fileName, fileType);
    if (!extCheck.valid) {
      score -= 5;
      findings.push({
        type: "extension_mismatch",
        severity: "medium",
        description: extCheck.message,
        evidence: `Nombre: ${fileName} | MIME: ${fileType}`
      });
    }
  }
  score = Math.max(0, Math.min(100, score));
  if (score >= 90) status = "authentic";
  else if (score >= 70) status = "suspicious";
  else if (score >= 40) status = "suspicious";
  else status = "fraudulent";
  if (findings.some((f) => f.type === "hash_mismatch")) status = "fraudulent";
  return {
    status,
    confidenceScore: score,
    findings,
    hashSha256,
    analysisType,
    analysisEngine: "DocuSentinel Forensic Engine v2.0"
  };
}
function checkFileMagicBytes(bytes, mimeType) {
  const hex = bytesToHex(bytes.slice(0, 8));
  if (mimeType === "application/pdf") {
    if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70) {
      return { valid: true, message: "" };
    }
    return { valid: false, message: "El archivo no tiene cabecera PDF v\xE1lida (%PDF)" };
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    if (bytes[0] === 255 && bytes[1] === 216) {
      return { valid: true, message: "" };
    }
    return { valid: false, message: "El archivo no tiene cabecera JPEG v\xE1lida (FFD8)" };
  }
  if (mimeType === "image/png") {
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
      return { valid: true, message: "" };
    }
    return { valid: false, message: "El archivo no tiene cabecera PNG v\xE1lida" };
  }
  if (mimeType === "image/tiff") {
    const isTiff = bytes[0] === 73 && bytes[1] === 73 || bytes[0] === 77 && bytes[1] === 77;
    return isTiff ? { valid: true, message: "" } : { valid: false, message: "Cabecera TIFF inv\xE1lida" };
  }
  return { valid: true, message: "" };
}
function analyzeMetadata(bytes, fileType, fileName) {
  const findings = [];
  let penalty = 0;
  if (fileType === "application/pdf") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 2048));
    if (text.includes("/Creator") || text.includes("/Producer") || text.includes("/Author")) {
      findings.push({
        type: "pdf_metadata",
        severity: "low",
        description: "Metadatos del documento PDF presentes",
        evidence: "Se encontraron campos de metadatos est\xE1ndar (Creator/Producer/Author)"
      });
    } else {
      penalty += 5;
      findings.push({
        type: "pdf_metadata_missing",
        severity: "medium",
        description: "Metadatos del PDF ausentes o eliminados",
        evidence: "No se encontraron metadatos est\xE1ndar en el encabezado del PDF"
      });
    }
    if (text.includes("/JavaScript") || text.includes("/JS")) {
      penalty += 15;
      findings.push({
        type: "pdf_javascript",
        severity: "high",
        description: "Se detect\xF3 JavaScript embebido en el PDF",
        evidence: "Presencia de /JavaScript o /JS en la estructura del documento"
      });
    }
  }
  if (fileType === "image/jpeg" || fileType === "image/jpg") {
    const hasExif = bytes.length > 12 && bytes[2] === 255 && bytes[3] === 225;
    if (hasExif) {
      findings.push({
        type: "exif_present",
        severity: "low",
        description: "Datos EXIF presentes en la imagen",
        evidence: "Marcador APP1 (EXIF) encontrado en el archivo JPEG"
      });
    } else {
      findings.push({
        type: "exif_absent",
        severity: "low",
        description: "Sin datos EXIF (imagen sin metadatos de c\xE1mara)",
        evidence: "No se encontr\xF3 marcador APP1 en el archivo JPEG"
      });
    }
  }
  return { findings, penalty };
}
function analyzePDFTypography(bytes) {
  const findings = [];
  let penalty = 0;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 8192)));
  const fontCount = (text.match(/\/Font/g) || []).length;
  if (fontCount === 0) {
    penalty += 8;
    findings.push({
      type: "pdf_no_fonts",
      severity: "medium",
      description: "Sin fuentes embebidas en el PDF",
      evidence: "Documentos oficiales generalmente incluyen fuentes embebidas"
    });
  } else {
    findings.push({
      type: "pdf_fonts_ok",
      severity: "low",
      description: `${fontCount} referencia(s) de fuente encontradas en el PDF`,
      evidence: `Se encontraron ${fontCount} objetos /Font en la estructura del documento`
    });
  }
  const hasXRef = text.includes("xref") || text.includes("%%EOF");
  if (!hasXRef) {
    penalty += 10;
    findings.push({
      type: "pdf_structure",
      severity: "high",
      description: "Estructura interna del PDF incompleta o corrupta",
      evidence: "No se encontraron marcadores xref o %%EOF est\xE1ndar"
    });
  } else {
    findings.push({
      type: "pdf_structure_ok",
      severity: "low",
      description: "Estructura interna del PDF v\xE1lida",
      evidence: "Marcadores xref y %%EOF encontrados correctamente"
    });
  }
  return { findings, penalty };
}
function computeEntropy(bytes) {
  const freq = new Array(256).fill(0);
  for (const b of bytes) freq[b]++;
  const n = bytes.length;
  let entropy = 0;
  for (const f of freq) {
    if (f > 0) {
      const p = f / n;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}
function checkFileExtension(name, mimeType) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mimeExtMap = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/jpg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/tiff": ["tif", "tiff"]
  };
  const valid = mimeExtMap[mimeType]?.includes(ext) ?? true;
  return {
    valid,
    message: valid ? "" : `Extensi\xF3n ".${ext}" no corresponde al tipo MIME "${mimeType}"`
  };
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
verification.get("/stats", authMiddleware3.authenticate.bind(authMiddleware3), async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "30");
    const since = new Date(Date.now() - days * 24 * 3600 * 1e3).toISOString();
    const byStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, AVG(confidence_score) as avg_score
      FROM verifications WHERE analyzed_at >= ? GROUP BY status
    `).bind(since).all();
    const total = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM verifications`).first();
    const authentic = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='authentic'`).first();
    const fraudulent = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='fraudulent'`).first();
    const suspicious = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='suspicious'`).first();
    return c.json({ success: true, data: {
      byStatus: byStatus.results.map((r) => ({ status: r.status, count: r.count, avgScore: Math.round(r.avg_score * 100) / 100 })),
      summary: {
        total: total?.total || 0,
        authentic: authentic?.c || 0,
        fraudulent: fraudulent?.c || 0,
        suspicious: suspicious?.c || 0
      },
      timeRange: { days, since, until: (/* @__PURE__ */ new Date()).toISOString() }
    } });
  } catch (err) {
    console.error("Stats error:", err);
    return c.json({ success: false, error: "Error al obtener estad\xEDsticas" }, 500);
  }
});
verification.post("/upload-verify", authMiddleware3.authenticate.bind(authMiddleware3), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP3(c);
    const ua = getUA3(c);
    const formData = await c.req.formData();
    const file = formData.get("file");
    const analysisType = formData.get("analysisType") || "full";
    if (!file) return c.json({ success: false, error: "Archivo requerido" }, 400);
    if (!["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff"].includes(file.type)) {
      return c.json({ success: false, error: "Tipo de archivo no permitido" }, 400);
    }
    if (file.size > 10 * 1024 * 1024) return c.json({ success: false, error: "Archivo demasiado grande (m\xE1x 10 MB)" }, 400);
    const buffer = await file.arrayBuffer();
    const result = await analyzeDocument(buffer, file.name, file.type, analysisType);
    const docId = crypto.randomUUID();
    const verifId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const hashHex = result.hashSha256;
    await c.env.DB.prepare(`
      INSERT INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      docId,
      file.name,
      file.type,
      file.size,
      hashHex,
      "",
      "",
      JSON.stringify({ description: "Documento de verificaci\xF3n externa", analysisType }),
      "internal",
      user.id,
      now,
      now
    ).run();
    await c.env.DB.prepare(`
      INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(verifId, docId, result.status, result.confidenceScore, JSON.stringify(result.findings), user.id, now).run();
    await auditService3.logEvent(
      user.id,
      "DOCUMENT_UPLOAD_VERIFIED",
      "verification",
      verifId,
      { documentId: docId, fileName: file.name, status: result.status, score: result.confidenceScore, analysisType },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, data: {
      verificationId: verifId,
      documentId: docId,
      status: result.status,
      confidenceScore: result.confidenceScore,
      findings: result.findings,
      hashSha256: result.hashSha256,
      analysisEngine: result.analysisEngine,
      analyzedBy: user.id,
      analyzedAt: now
    } });
  } catch (err) {
    console.error("Upload-verify error:", err);
    return c.json({ success: false, error: "Error al verificar documento" }, 500);
  }
});
verification.post("/verify", authMiddleware3.authenticate.bind(authMiddleware3), async (c) => {
  try {
    const user = c.get("user");
    const ip = getIP3(c);
    const ua = getUA3(c);
    const { documentId, analysisType = "full" } = verifySchema.parse(await c.req.json());
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents
      WHERE id = ? AND (
        created_by = ?
        OR id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify' AND (expires_at IS NULL OR expires_at > ?))
      )
    `).bind(documentId, user.id, user.id, now).first();
    if (!doc) return c.json({ success: false, error: "Documento no encontrado o sin permisos" }, 404);
    let analysisResult;
    const r2Key = `documents/${documentId}`;
    const r2Obj = await c.env.R2.get(r2Key);
    if (r2Obj) {
      const ciphertext = await r2Obj.arrayBuffer();
      try {
        const encSvc = new EncryptionService();
        const buffer = await encSvc.decryptBuffer(ciphertext, doc.encryption_key_id, doc.encrypted_data);
        analysisResult = await analyzeDocument(buffer, doc.name, doc.type, analysisType, doc.hash);
      } catch {
        analysisResult = {
          status: "inconclusive",
          confidenceScore: 75,
          findings: [{
            type: "decryption_failed",
            severity: "medium",
            description: "No se pudo descifrar el archivo para an\xE1lisis completo",
            evidence: "An\xE1lisis basado en metadatos registrados"
          }],
          hashSha256: doc.hash,
          analysisType,
          analysisEngine: "DocuSentinel Forensic Engine v2.0"
        };
      }
    } else {
      analysisResult = {
        status: "inconclusive",
        confidenceScore: 70,
        findings: [{
          type: "file_not_in_storage",
          severity: "medium",
          description: "Archivo no encontrado en almacenamiento seguro",
          evidence: "El archivo fue registrado pero no est\xE1 disponible para an\xE1lisis profundo"
        }],
        hashSha256: doc.hash,
        analysisType,
        analysisEngine: "DocuSentinel Forensic Engine v2.0"
      };
    }
    const verifId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      verifId,
      documentId,
      analysisResult.status,
      analysisResult.confidenceScore,
      JSON.stringify(analysisResult.findings),
      user.id,
      (/* @__PURE__ */ new Date()).toISOString()
    ).run();
    await auditService3.logEvent(
      user.id,
      "DOCUMENT_VERIFIED",
      "verification",
      verifId,
      { documentId, status: analysisResult.status, score: analysisResult.confidenceScore, analysisType },
      ip,
      ua,
      c.env.DB
    );
    return c.json({ success: true, data: {
      verificationId: verifId,
      documentId,
      status: analysisResult.status,
      confidenceScore: analysisResult.confidenceScore,
      findings: analysisResult.findings,
      hashSha256: analysisResult.hashSha256,
      analysisEngine: analysisResult.analysisEngine,
      analyzedBy: user.id,
      analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
    } });
  } catch (err) {
    if (err?.issues) return c.json({ success: false, error: "Datos inv\xE1lidos" }, 400);
    console.error("Verify error:", err);
    return c.json({ success: false, error: "Error al verificar documento" }, 500);
  }
});
verification.get("/:id", authMiddleware3.authenticate.bind(authMiddleware3), async (c) => {
  try {
    const user = c.get("user");
    const verifId = c.req.param("id");
    const v = await c.env.DB.prepare(`
      SELECT v.*, d.name as document_name, d.type as document_type
      FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE v.id = ? AND (
        v.analyzed_by = ? OR d.created_by = ?
        OR d.id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action='verify')
      )
    `).bind(verifId, user.id, user.id, user.id).first();
    if (!v) return c.json({ success: false, error: "Verificaci\xF3n no encontrada" }, 404);
    return c.json({ success: true, data: {
      id: v.id,
      documentId: v.document_id,
      documentName: v.document_name,
      documentType: v.document_type,
      status: v.status,
      confidenceScore: v.confidence_score,
      findings: JSON.parse(v.findings || "[]"),
      analyzedBy: v.analyzed_by,
      analyzedAt: v.analyzed_at
    } });
  } catch (err) {
    return c.json({ success: false, error: "Error al obtener verificaci\xF3n" }, 500);
  }
});
verification.get("/", authMiddleware3.authenticate.bind(authMiddleware3), async (c) => {
  try {
    const user = c.get("user");
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "10"));
    const documentId = c.req.query("documentId");
    let where = "(v.analyzed_by = ? OR d.created_by = ? OR d.id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action='verify'))";
    const params = [user.id, user.id, user.id];
    if (documentId) {
      where += " AND v.document_id = ?";
      params.push(documentId);
    }
    const results = await c.env.DB.prepare(`
      SELECT v.*, d.name as document_name, d.type as document_type
      FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE ${where}
      ORDER BY v.analyzed_at DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, (page - 1) * pageSize).all();
    const countRow = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE ${where}
    `).bind(...params).first();
    const total = countRow?.total || 0;
    const verifications = results.results.map((v) => ({
      id: v.id,
      documentId: v.document_id,
      documentName: v.document_name,
      documentType: v.document_type,
      status: v.status,
      confidenceScore: v.confidence_score,
      findings: JSON.parse(v.findings || "[]"),
      analyzedBy: v.analyzed_by,
      analyzedAt: v.analyzed_at
    }));
    return c.json({ success: true, data: { verifications, total, page, pageSize, hasNext: verifications.length === pageSize, hasPrev: page > 1 } });
  } catch (err) {
    return c.json({ success: false, error: "Error al obtener verificaciones" }, 500);
  }
});
var verification_default = verification;

// src/routes/audit.ts
var audit = new Hono2();
var authMiddleware4 = new AuthMiddleware();
var auditService4 = new AuditService();
var searchSchema = external_exports.object({
  userId: external_exports.string().min(1).optional(),
  // Acepta UUIDs Y 'superuser'
  action: external_exports.string().optional(),
  resourceType: external_exports.string().optional(),
  resourceId: external_exports.string().optional(),
  startDate: external_exports.string().optional(),
  // Flexible: acepta dates sin timezone estricto
  endDate: external_exports.string().optional(),
  ipAddress: external_exports.string().optional(),
  page: external_exports.coerce.number().min(1).default(1),
  pageSize: external_exports.coerce.number().min(1).max(100).default(20)
});
audit.get(
  "/logs",
  authMiddleware4.authenticate.bind(authMiddleware4),
  async (c) => {
    try {
      const rawQuery = c.req.query();
      const query = typeof rawQuery === "object" ? rawQuery : {};
      const validatedData = searchSchema.parse(query);
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        ipAddress,
        page,
        pageSize
      } = validatedData;
      const filters = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (resourceType) filters.resourceType = resourceType;
      if (resourceId) filters.resourceId = resourceId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (ipAddress) filters.ipAddress = ipAddress;
      const user = c.get("user");
      if (user.role > 3 && !filters.userId) {
        filters.userId = user.id;
      }
      const { logs, total } = await auditService4.searchLogsWithUsers(
        c.env.DB,
        filters,
        pageSize,
        (page - 1) * pageSize
      );
      const normalizedLogs = logs.map((l) => {
        const ts = l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp;
        return {
          id: l.id,
          action: l.action,
          actor_email: l.actorEmail || l.userId || "sistema",
          actor_name: l.actorName || l.userId || "Sistema",
          actor_role: l.actorRole || "",
          actor_ip: l.ipAddress || "\u2014",
          resource_type: l.resourceType || "\u2014",
          resource_id: l.resourceId || "\u2014",
          log_hash: l.currentHash || "",
          created_at: ts,
          outcome: "success",
          details: l.details
        };
      });
      return c.json({
        success: true,
        data: {
          logs: normalizedLogs,
          total,
          page,
          pageSize,
          hasNext: logs.length === pageSize,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error al obtener logs:", error?.message || error, error?.stack || "");
      return c.json({
        success: false,
        error: "Error al obtener logs de auditor\xEDa"
      }, 500);
    }
  }
);
audit.get(
  "/stats",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const startDate = c.req.query("startDate") ? new Date(c.req.query("startDate")) : void 0;
      const endDate = c.req.query("endDate") ? new Date(c.req.query("endDate")) : void 0;
      const stats = await auditService4.getAuditStats(c.env.DB, startDate, endDate);
      return c.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error al obtener estad\xEDsticas:", error);
      return c.json({
        success: false,
        error: "Error al obtener estad\xEDsticas de auditor\xEDa"
      }, 500);
    }
  }
);
audit.get(
  "/integrity",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(1 /* SUPER_ADMIN */),
  async (c) => {
    try {
      const integrityStatus = await auditService4.verifyChainIntegrity(c.env.DB);
      return c.json({
        success: true,
        data: integrityStatus
      });
    } catch (error) {
      console.error("Error al verificar integridad:", error);
      return c.json({
        success: false,
        error: "Error al verificar integridad de logs"
      }, 500);
    }
  }
);
audit.get(
  "/export",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const format = c.req.query("format") || "json";
      const startDate = c.req.query("startDate") ? new Date(c.req.query("startDate")) : void 0;
      const endDate = c.req.query("endDate") ? new Date(c.req.query("endDate")) : void 0;
      const { logs } = await auditService4.searchLogs(
        c.env.DB,
        { startDate, endDate },
        1e4,
        // Máximo 10,000 registros para exportación
        0
      );
      if (format === "csv") {
        const csv = [
          "ID,Usuario,Acci\xF3n,Tipo de Recurso,ID del Recurso,IP,Direcci\xF3n,Agente de Usuario,Fecha y Hora,Hash Anterior,Hash Actual"
        ];
        logs.forEach((log2) => {
          csv.push([
            log2.id,
            log2.userId,
            log2.action,
            log2.resourceType,
            log2.resourceId,
            log2.ipAddress,
            log2.userAgent,
            log2.timestamp.toISOString(),
            log2.previousHash,
            log2.currentHash
          ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));
        });
        const csvContent = csv.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        return new Response(blob, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="audit_logs_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`
          }
        });
      } else {
        return c.json({
          success: true,
          data: {
            logs,
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            count: logs.length
          }
        });
      }
    } catch (error) {
      console.error("Error al exportar logs:", error);
      return c.json({
        success: false,
        error: "Error al exportar logs de auditor\xEDa"
      }, 500);
    }
  }
);
audit.get(
  "/actions",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const results = await c.env.DB.prepare(`
        SELECT DISTINCT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
      `).all();
      const actions = results.results.map((row) => ({
        action: row.action,
        count: row.count
      }));
      return c.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error("Error al obtener acciones:", error);
      return c.json({
        success: false,
        error: "Error al obtener tipos de acciones"
      }, 500);
    }
  }
);
audit.get(
  "/resource-types",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const results = await c.env.DB.prepare(`
        SELECT DISTINCT resource_type, COUNT(*) as count
        FROM audit_logs
        GROUP BY resource_type
        ORDER BY count DESC
      `).all();
      const resourceTypes = results.results.map((row) => ({
        resourceType: row.resource_type,
        count: row.count
      }));
      return c.json({
        success: true,
        data: resourceTypes
      });
    } catch (error) {
      console.error("Error al obtener tipos de recursos:", error);
      return c.json({
        success: false,
        error: "Error al obtener tipos de recursos"
      }, 500);
    }
  }
);
audit.get(
  "/recent",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const limit = parseInt(c.req.query("limit") || "50");
      const hours = parseInt(c.req.query("hours") || "24");
      const since = new Date(Date.now() - hours * 60 * 60 * 1e3);
      const results = await c.env.DB.prepare(`
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.timestamp >= ?
        ORDER BY al.timestamp DESC
        LIMIT ?
      `).bind(since.toISOString(), limit).all();
      const recentActivity = results.results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: JSON.parse(row.details || "{}"),
        ipAddress: row.ip_address,
        timestamp: row.timestamp
      }));
      return c.json({
        success: true,
        data: {
          recentActivity,
          timeRange: {
            start: since.toISOString(),
            end: (/* @__PURE__ */ new Date()).toISOString()
          },
          count: recentActivity.length
        }
      });
    } catch (error) {
      console.error("Error al obtener actividad reciente:", error);
      return c.json({
        success: false,
        error: "Error al obtener actividad reciente"
      }, 500);
    }
  }
);
audit.get(
  "/security-stats",
  authMiddleware4.authenticate.bind(authMiddleware4),
  authMiddleware4.requireRole(3 /* AUDITOR */),
  async (c) => {
    try {
      const hours = parseInt(c.req.query("hours") || "24");
      const since = new Date(Date.now() - hours * 60 * 60 * 1e3);
      const securityEvents = await c.env.DB.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ? AND action IN ('LOGIN_FAILED', 'MFA_FAILED', 'AUTH_FAILED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'PERMISSION_DENIED', 'RATE_LIMIT_EXCEEDED')
        GROUP BY action
      `).bind(since.toISOString()).all();
      const ipAttempts = await c.env.DB.prepare(`
        SELECT ip_address, COUNT(*) as attempts
        FROM audit_logs
        WHERE timestamp >= ? AND action IN ('LOGIN_FAILED', 'AUTH_FAILED')
        GROUP BY ip_address
        HAVING attempts >= 3
        ORDER BY attempts DESC
        LIMIT 10
      `).bind(since.toISOString()).all();
      const blockedUsers = await c.env.DB.prepare(`
        SELECT user_id, COUNT(*) as failed_attempts
        FROM audit_logs
        WHERE timestamp >= ? AND action = 'LOGIN_FAILED'
        GROUP BY user_id
        HAVING failed_attempts >= 3
        ORDER BY failed_attempts DESC
        LIMIT 10
      `).bind(since.toISOString()).all();
      const securityStats = {
        events: securityEvents.results.map((row) => ({
          action: row.action,
          count: row.count
        })),
        suspiciousIPs: ipAttempts.results.map((row) => ({
          ipAddress: row.ip_address,
          attempts: row.attempts
        })),
        blockedUsers: blockedUsers.results.map((row) => ({
          userId: row.user_id,
          failedAttempts: row.failed_attempts
        })),
        timeRange: {
          hours,
          since: since.toISOString(),
          until: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
      return c.json({
        success: true,
        data: securityStats
      });
    } catch (error) {
      console.error("Error al obtener estad\xEDsticas de seguridad:", error);
      return c.json({
        success: false,
        error: "Error al obtener estad\xEDsticas de seguridad"
      }, 500);
    }
  }
);
var audit_default = audit;

// src/adapters/database.ts
import Database from "better-sqlite3";
import { existsSync as existsSync2, mkdirSync } from "node:fs";
import { dirname } from "node:path";
var SQLiteAdapter = class {
  db;
  constructor(dbPath) {
    const dir = dirname(dbPath);
    if (!existsSync2(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }
  prepare(sql) {
    return new SQLitePreparedStatement(this.db, sql);
  }
  exec(sql) {
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        this.db.exec(stmt);
      } catch (e) {
        if (!e.message?.includes("already exists") && !e.message?.includes("duplicate column")) {
          console.error("SQL exec error:", e.message?.substring(0, 100));
        }
      }
    }
  }
  async batch(statements) {
    const results = [];
    const batchFn = this.db.transaction(() => {
      for (const stmt of statements) {
        results.push(stmt.runSync());
      }
    });
    batchFn();
    return results;
  }
};
var SQLitePreparedStatement = class _SQLitePreparedStatement {
  db;
  sql;
  params = [];
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }
  bind(...values) {
    const stmt = new _SQLitePreparedStatement(this.db, this.sql);
    stmt.params = values;
    return stmt;
  }
  async first(column) {
    try {
      const stmt = this.db.prepare(this.sql);
      const row = stmt.get(...this.params);
      if (!row) return null;
      if (column) return row[column] ?? null;
      return row;
    } catch (e) {
      console.error("SQLite first() error:", e.message?.substring(0, 100));
      return null;
    }
  }
  runSync() {
    try {
      const stmt = this.db.prepare(this.sql);
      const info = stmt.run(...this.params);
      return {
        success: true,
        results: [],
        meta: {
          last_row_id: Number(info.lastInsertRowid),
          changes: info.changes,
          duration: 0
        }
      };
    } catch (e) {
      console.error("SQLite runSync() error:", e.message?.substring(0, 100));
      throw e;
    }
  }
  async run() {
    return this.runSync();
  }
  async all() {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...this.params);
      return {
        results: rows,
        success: true,
        meta: { duration: 0 }
      };
    } catch (e) {
      console.error("SQLite all() error:", e.message?.substring(0, 100));
      return { results: [], success: false, meta: {} };
    }
  }
};

// src/adapters/kv.ts
var KVAdapter = class {
  store = /* @__PURE__ */ new Map();
  async get(key, options) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    if (options?.type === "json") {
      try {
        return JSON.parse(entry.value);
      } catch {
        return entry.value;
      }
    }
    return entry.value;
  }
  async put(key, value, options) {
    let expires;
    if (options?.expirationTtl) {
      expires = Date.now() + options.expirationTtl * 1e3;
    } else if (options?.expiration) {
      expires = options.expiration * 1e3;
    }
    this.store.set(key, { value: typeof value === "string" ? value : JSON.stringify(value), expires });
  }
  async delete(key) {
    this.store.delete(key);
  }
  async list(options) {
    const keys = [];
    for (const key of this.store.keys()) {
      if (!options?.prefix || key.startsWith(options.prefix)) {
        keys.push({ name: key });
      }
      if (options?.limit && keys.length >= options.limit) break;
    }
    return { keys };
  }
};
var globalKV = new KVAdapter();

// src/adapters/r2.ts
var R2Adapter = class {
  store = /* @__PURE__ */ new Map();
  async put(key, body, options) {
    let buffer;
    if (typeof body === "string") {
      buffer = new TextEncoder().encode(body).buffer;
    } else if (body instanceof ArrayBuffer) {
      buffer = body;
    } else {
      const reader = body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      buffer = result.buffer;
    }
    this.store.set(key, {
      body: buffer,
      metadata: options?.httpMetadata || {}
    });
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    const buffer = entry.body;
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        }
      }),
      arrayBuffer: async () => buffer,
      httpMetadata: entry.metadata
    };
  }
  async delete(key) {
    this.store.delete(key);
  }
  async list(options) {
    const objects = [];
    for (const key of this.store.keys()) {
      if (!options?.prefix || key.startsWith(options.prefix)) {
        objects.push({ key });
      }
      if (options?.limit && objects.length >= options.limit) break;
    }
    return { objects };
  }
  async head(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return { key, httpMetadata: entry.metadata };
  }
};
var globalR2 = new R2Adapter();

// src/server.ts
var DATA_DIR = process.env.DATA_DIR || resolve(process.cwd(), "data");
var DB_PATH = process.env.DB_PATH || join2(DATA_DIR, "docusentinel.db");
if (!existsSync3(DATA_DIR)) {
  mkdirSync2(DATA_DIR, { recursive: true });
}
var DB = new SQLiteAdapter(DB_PATH);
async function initializeDatabase() {
  try {
    const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || resolve(process.cwd(), "migrations");
    const migrations = ["0001_initial_schema.sql", "0002_add_actor_fields.sql"];
    for (const migration of migrations) {
      const migPath = join2(MIGRATIONS_DIR, migration);
      if (existsSync3(migPath)) {
        const sql = readFileSync(migPath, "utf-8");
        DB.exec(sql);
        console.log(`\u2705 Migration applied: ${migration}`);
      }
    }
    const existing = await DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind("rauldiazespejo@gmail.com").first();
    if (!existing) {
      const passwordHash = await bcrypt.hash(
        process.env.SUPERUSER_PASSWORD || "DocuSentinel@2024!Admin",
        10
      );
      await DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, role, password_hash, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind("superuser", "rauldiazespejo@gmail.com", "Raul Diaz Espejo", 1, passwordHash).run();
      console.log("\u2705 Superusuario creado");
    }
    console.log("\u2705 Base de datos inicializada correctamente en:", DB_PATH);
  } catch (e) {
    console.error("\u274C Error inicializando DB:", e.message);
  }
}
var app = new Hono2();
app.use("*", async (c, next) => {
  const env = c.env || {};
  c.env = env;
  env.DB = DB;
  env.KV = globalKV;
  env.R2 = globalR2;
  env.JWT_SECRET = process.env.JWT_SECRET || "docusentinel-jwt-secret-change-in-production-minimum-32-chars";
  env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "docusentinel-encryption-key-change-in-production-32b";
  env.SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD || "DocuSentinel@2024!Admin";
  await next();
});
app.use("*", logger());
app.use("*", cors({
  origin: ["*"],
  credentials: true,
  maxAge: 86400
}));
var PUBLIC_DIR = process.env.PUBLIC_DIR || resolve(process.cwd(), "public");
app.use("/static/*", serveStatic({ root: PUBLIC_DIR }));
app.route("/api/auth", auth_default);
app.route("/api/documents", documents_default);
app.route("/api/verification", verification_default);
app.route("/api/audit", audit_default);
app.get("/health", (c) => {
  return c.json({
    success: true,
    status: "operational",
    service: "DocuSentinel PRO API",
    version: "2.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: "production"
  });
});
app.get("*", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocuSentinel PRO \u2014 Seguridad Documental Empresarial</title>
  <meta name="description" content="Plataforma empresarial de gesti\xF3n documental con cifrado AES-256, control de accesos y verificaci\xF3n forense de autenticidad.">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\u{1F6E1}\uFE0F</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link href="/static/styles.css" rel="stylesheet">
</head>
<body>
  <div id="app">
    <div id="loading-screen" class="loading-screen">
      <div class="loading-content">
        <div class="loading-logo"><i class="fas fa-shield-halved"></i></div>
        <div class="loading-text">DocuSentinel <span class="text-cyan">PRO</span></div>
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        <div class="loading-status">Inicializando sistema seguro...</div>
      </div>
    </div>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>`);
});
var PORT = parseInt(process.env.PORT || "3000", 10);
initializeDatabase().then(() => {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`\u{1F6E1}\uFE0F  DocuSentinel PRO \u2192 http://0.0.0.0:${info.port}`);
  });
});
var server_default = app;
export {
  server_default as default
};
