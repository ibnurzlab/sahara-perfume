/* ============================================================
   SAHARA — router mini (sama seperti versi Node)
   ============================================================ */

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const escaped = pattern
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");

    this.routes.push({
      method: method.toUpperCase(),
      regex: new RegExp("^" + escaped + "$"),
      keys,
      handler,
    });
    return this;
  }

  get(p, h) { return this.add("GET", p, h); }
  post(p, h) { return this.add("POST", p, h); }
  put(p, h) { return this.add("PUT", p, h); }
  patch(p, h) { return this.add("PATCH", p, h); }
  delete(p, h) { return this.add("DELETE", p, h); }

  resolve(method, pathname) {
    let pathExists = false;
    for (const route of this.routes) {
      const match = route.regex.exec(pathname);
      if (!match) continue;
      pathExists = true;
      if (route.method !== method.toUpperCase()) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = match[i + 1];
      });
      return { handler: route.handler, params };
    }
    if (pathExists) return { methodMismatch: true };
    return null;
  }
}
