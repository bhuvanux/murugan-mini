declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?: any;
};

declare module "npm:hono" {
  export type Context = any;
  export class Hono<T = any> {
    constructor(...args: any[]);
    use: any;
    route: any;
    get: any;
    post: any;
    put: any;
    patch: any;
    delete: any;
    fetch: any;
  }
}

declare module "npm:hono/cors" {
  export const cors: any;
}

declare module "npm:hono/logger" {
  export const logger: any;
}

declare module "npm:@supabase/supabase-js@2" {
  export const createClient: any;
}
