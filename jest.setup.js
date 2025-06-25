import '@testing-library/jest-dom'

// Polyfill for Next.js Edge Runtime APIs
if (!globalThis.Request) {
  globalThis.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body;
    }
  };
}

if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    
    async json() {
      return JSON.parse(this.body);
    }
  };
}

if (!globalThis.FormData) {
  globalThis.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value) {
      this.data.set(key, value);
    }
    
    get(key) {
      return this.data.get(key);
    }
  };
}