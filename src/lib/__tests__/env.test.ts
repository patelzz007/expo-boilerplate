import { MOBILE_DEMO_ACCOUNTS } from "../demo-account-list";
import {
  canReplayOnboarding,
  DEFAULT_DEV_API_PORT,
  DEFAULT_JSON_PLACEHOLDER_URL,
  isPrivateLanHost,
  loadBundledDemoAccounts,
  MOBILE_ENV_EXAMPLES,
  readRawMobileEnv,
  resolveMobileEnv,
  type RawMobileEnv,
} from "../env";

/**
 * The public variables as a bundle reads them. Outside a production build Expo rewrites every
 * `process.env.EXPO_PUBLIC_…` into a read from `expo/virtual/env`, so the tests set them here.
 */
jest.mock("expo/virtual/env", () => ({ env: {} }));
const { env: mockPublicEnv } = jest.requireMock<{ readonly env: Record<string, string | undefined> }>(
  "expo/virtual/env"
);

const DEV: RawMobileEnv = {
  isDevelopment: true,
  apiUrl: undefined,
  apiPort: undefined,
  iosStoreUrl: undefined,
  androidStoreUrl: undefined,
  showDemoAccount: undefined,
  allowLanHttpApi: undefined,
  jsonPlaceholderUrl: undefined,
};
const RELEASE: RawMobileEnv = { ...DEV, isDevelopment: false };

describe("resolveMobileEnv", () => {
  it("has no API while EXPO_PUBLIC_API_URL is empty, in development and in a release build alike", () => {
    for (const raw of [DEV, RELEASE, { ...RELEASE, apiUrl: "  " }]) {
      expect(resolveMobileEnv(raw)).toEqual({
        ok: true,
        env: {
          isDevelopment: raw.isDevelopment,
          apiBaseUrl: null,
          iosStoreUrl: null,
          androidStoreUrl: null,
          showDemoAccounts: false,
          jsonPlaceholderUrl: DEFAULT_JSON_PLACEHOLDER_URL,
        },
      });
    }
  });

  it.each(["0", "70000", "abc", "80.5"])("rejects the port %s next to an http URL without a port", (apiPort) => {
    expect(resolveMobileEnv({ ...DEV, apiUrl: "http://10.0.0.9", apiPort })).toEqual({
      ok: false,
      issue: {
        variable: "EXPO_PUBLIC_API_PORT",
        message: "must be a whole number between 1 and 65535",
        example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_API_PORT,
      },
    });
  });

  it("lets an explicit http URL through in development (an API on another machine)", () => {
    expect(resolveMobileEnv({ ...DEV, apiUrl: "http://10.0.0.9:8080/" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: "http://10.0.0.9:8080" },
    });
  });

  it.each([
    ["http://10.62.47.236", undefined, `http://10.62.47.236:${String(DEFAULT_DEV_API_PORT)}`],
    ["http://10.62.47.236", "8080", "http://10.62.47.236:8080"],
    ["http://10.62.47.236/", " 3333 ", "http://10.62.47.236:3333"],
    ["http://my-mac.local/api", "8080", "http://my-mac.local:8080/api"],
    ["http://[fe80::1]", "8080", "http://[fe80::1]:8080"],
  ])(
    "adds EXPO_PUBLIC_API_PORT to the explicit http URL %s without a port (port %s)",
    (apiUrl, apiPort, apiBaseUrl) => {
      expect(resolveMobileEnv({ ...DEV, apiUrl, apiPort })).toMatchObject({ ok: true, env: { apiBaseUrl } });
    }
  );

  it.each([
    ["http://10.62.47.236:8080", "http://10.62.47.236:8080"],
    ["http://[fe80::1]:8080/api/", "http://[fe80::1]:8080/api"],
  ])("keeps the port written in the explicit http URL %s, over EXPO_PUBLIC_API_PORT", (apiUrl, apiBaseUrl) => {
    expect(resolveMobileEnv({ ...DEV, apiUrl, apiPort: "3333" })).toMatchObject({ ok: true, env: { apiBaseUrl } });
  });

  it("never adds the port to an https URL outside development", () => {
    expect(resolveMobileEnv({ ...RELEASE, apiUrl: "https://api.example.com", apiPort: "8080" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: "https://api.example.com" },
    });
  });

  it("requires https outside development", () => {
    expect(resolveMobileEnv({ ...RELEASE, apiUrl: "http://api.example.com" })).toMatchObject({
      ok: false,
      issue: { variable: "EXPO_PUBLIC_API_URL", message: "must be an https:// URL" },
    });
  });

  it("rejects a value that is not a URL", () => {
    expect(resolveMobileEnv({ ...RELEASE, apiUrl: "api.example.com" })).toMatchObject({
      ok: false,
      issue: { variable: "EXPO_PUBLIC_API_URL" },
    });
  });

  it("accepts an https URL outside development and strips trailing slashes", () => {
    expect(resolveMobileEnv({ ...RELEASE, apiUrl: "https://api.example.com//" })).toMatchObject({
      ok: true,
      env: { isDevelopment: false, apiBaseUrl: "https://api.example.com" },
    });
  });

  it("reads the optional store URLs (https only)", () => {
    const env = resolveMobileEnv({ ...RELEASE, iosStoreUrl: "https://apps.apple.com/app/id1", androidStoreUrl: " " });
    expect(env).toMatchObject({
      ok: true,
      env: { iosStoreUrl: "https://apps.apple.com/app/id1", androidStoreUrl: null },
    });
    expect(resolveMobileEnv({ ...RELEASE, iosStoreUrl: "http://apps.apple.com" })).toMatchObject({
      ok: false,
      issue: { variable: "EXPO_PUBLIC_IOS_STORE_URL" },
    });
    expect(resolveMobileEnv({ ...RELEASE, androidStoreUrl: "nope" })).toMatchObject({
      ok: false,
      issue: { variable: "EXPO_PUBLIC_ANDROID_STORE_URL" },
    });
  });

  it("never puts the configured value in the issue", () => {
    const result = resolveMobileEnv({ ...RELEASE, apiUrl: "http://secret-host.internal" });
    expect(JSON.stringify(result)).not.toContain("secret-host");
  });

  it("reads EXPO_PUBLIC_SHOW_DEMO_ACCOUNT=true as offering the demo logins (whitespace around it is fine)", () => {
    for (const showDemoAccount of ["true", " true "]) {
      expect(resolveMobileEnv({ ...DEV, showDemoAccount })).toMatchObject({
        ok: true,
        env: { showDemoAccounts: true },
      });
    }
  });

  it("reads EXPO_PUBLIC_SHOW_DEMO_ACCOUNT false, unset or blank as not offering them", () => {
    for (const showDemoAccount of ["false", undefined, "", "  "]) {
      expect(resolveMobileEnv({ ...DEV, showDemoAccount })).toMatchObject({
        ok: true,
        env: { showDemoAccounts: false },
      });
    }
  });

  it("rejects any other EXPO_PUBLIC_SHOW_DEMO_ACCOUNT, naming the variable, what it accepts and an example", () => {
    for (const showDemoAccount of ["1", "yes", "TRUE"]) {
      expect(resolveMobileEnv({ ...DEV, showDemoAccount })).toEqual({
        ok: false,
        issue: {
          variable: "EXPO_PUBLIC_SHOW_DEMO_ACCOUNT",
          message: "must be true or false, or left unset",
          example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT,
        },
      });
    }
  });

  it("reads EXPO_PUBLIC_API_JSON_PLACEHOLDER as the demo API's address, JSONPlaceholder when unset or blank", () => {
    expect(resolveMobileEnv({ ...RELEASE, jsonPlaceholderUrl: "https://demo.example.com/" })).toMatchObject({
      ok: true,
      env: { jsonPlaceholderUrl: "https://demo.example.com" },
    });
    for (const jsonPlaceholderUrl of [undefined, "", "  "]) {
      expect(resolveMobileEnv({ ...RELEASE, jsonPlaceholderUrl })).toMatchObject({
        ok: true,
        env: { jsonPlaceholderUrl: DEFAULT_JSON_PLACEHOLDER_URL },
      });
    }
  });

  it("rejects an EXPO_PUBLIC_API_JSON_PLACEHOLDER that is not an https:// URL, in every build", () => {
    for (const raw of [DEV, RELEASE]) {
      for (const jsonPlaceholderUrl of ["http://jsonplaceholder.typicode.com", "jsonplaceholder.typicode.com"]) {
        expect(resolveMobileEnv({ ...raw, jsonPlaceholderUrl })).toEqual({
          ok: false,
          issue: {
            variable: "EXPO_PUBLIC_API_JSON_PLACEHOLDER",
            message: "must be an https:// URL, or left unset",
            example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_API_JSON_PLACEHOLDER,
          },
        });
      }
    }
  });
});

describe("a test APK on the dev machine's Wi-Fi (EXPO_PUBLIC_ALLOW_LAN_HTTP_API)", () => {
  const LAN_BUILD: RawMobileEnv = { ...RELEASE, allowLanHttpApi: "true" };

  it("takes an http:// address on a private LAN in a release build made with the flag, with the dev port rules", () => {
    expect(resolveMobileEnv({ ...LAN_BUILD, apiUrl: "http://192.168.1.20:8080" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: "http://192.168.1.20:8080" },
    });
    expect(resolveMobileEnv({ ...LAN_BUILD, apiUrl: "http://10.0.0.9" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: `http://10.0.0.9:${String(DEFAULT_DEV_API_PORT)}` },
    });
    expect(resolveMobileEnv({ ...LAN_BUILD, apiUrl: "http://172.20.0.4", apiPort: "3333" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: "http://172.20.0.4:3333" },
    });
  });

  it("still takes https:// as written", () => {
    expect(resolveMobileEnv({ ...LAN_BUILD, apiUrl: "https://api.example.com" })).toMatchObject({
      ok: true,
      env: { apiBaseUrl: "https://api.example.com" },
    });
  });

  it("refuses http:// to anything that is not a private LAN address, saying what it accepts", () => {
    for (const apiUrl of ["http://api.example.com", "http://8.8.8.8:8080", "http://172.32.0.1"]) {
      expect(resolveMobileEnv({ ...LAN_BUILD, apiUrl })).toEqual({
        ok: false,
        issue: {
          variable: "EXPO_PUBLIC_API_URL",
          message: "must be an https:// URL, or an http:// URL to a private LAN address (10.x, 172.16-31.x, 192.168.x)",
          example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_API_URL,
        },
      });
    }
  });

  it("keeps a release build without the flag on https only, LAN or not", () => {
    for (const allowLanHttpApi of [undefined, "false"]) {
      expect(resolveMobileEnv({ ...RELEASE, allowLanHttpApi, apiUrl: "http://192.168.1.20:8080" })).toMatchObject({
        ok: false,
        issue: { variable: "EXPO_PUBLIC_API_URL", message: "must be an https:// URL" },
      });
    }
  });

  it("rejects any other value of the flag, naming it", () => {
    expect(resolveMobileEnv({ ...LAN_BUILD, allowLanHttpApi: "yes" })).toEqual({
      ok: false,
      issue: {
        variable: "EXPO_PUBLIC_ALLOW_LAN_HTTP_API",
        message: "must be true or false, or left unset",
        example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_ALLOW_LAN_HTTP_API,
      },
    });
  });
});

describe("isPrivateLanHost", () => {
  it.each(["10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.254", "192.168.0.1", "192.168.100.30"])(
    "takes %s (a private LAN address)",
    (host) => {
      expect(isPrivateLanHost(host)).toBe(true);
    }
  );

  it.each([
    "172.15.0.1",
    "172.32.0.1",
    "192.169.0.1",
    "8.8.8.8",
    "127.0.0.1",
    "10.0.0.256",
    "api.example.com",
    "localhost",
    "192.168.1",
  ])("refuses %s", (host) => {
    expect(isPrivateLanHost(host)).toBe(false);
  });
});

describe("readRawMobileEnv", () => {
  afterEach(() => {
    delete mockPublicEnv.EXPO_PUBLIC_API_URL;
    delete mockPublicEnv.EXPO_PUBLIC_API_PORT;
    delete mockPublicEnv.EXPO_PUBLIC_IOS_STORE_URL;
    delete mockPublicEnv.EXPO_PUBLIC_ANDROID_STORE_URL;
    delete mockPublicEnv.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT;
    delete mockPublicEnv.EXPO_PUBLIC_ALLOW_LAN_HTTP_API;
    delete mockPublicEnv.EXPO_PUBLIC_API_JSON_PLACEHOLDER;
  });

  it("reads __DEV__ and every EXPO_PUBLIC_* variable as written, or undefined when unset", () => {
    expect(readRawMobileEnv()).toEqual(DEV);
    mockPublicEnv.EXPO_PUBLIC_API_URL = "https://api.example.com";
    mockPublicEnv.EXPO_PUBLIC_API_PORT = "8080";
    mockPublicEnv.EXPO_PUBLIC_IOS_STORE_URL = "https://apps.apple.com/app/id1";
    mockPublicEnv.EXPO_PUBLIC_ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=a.b";
    mockPublicEnv.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT = "true";
    mockPublicEnv.EXPO_PUBLIC_ALLOW_LAN_HTTP_API = "true";
    mockPublicEnv.EXPO_PUBLIC_API_JSON_PLACEHOLDER = "https://demo.example.com";

    expect(readRawMobileEnv()).toEqual({
      isDevelopment: true,
      apiUrl: "https://api.example.com",
      apiPort: "8080",
      iosStoreUrl: "https://apps.apple.com/app/id1",
      androidStoreUrl: "https://play.google.com/store/apps/details?id=a.b",
      showDemoAccount: "true",
      allowLanHttpApi: "true",
      jsonPlaceholderUrl: "https://demo.example.com",
    });
  });
});

describe("loadBundledDemoAccounts", () => {
  /** Jest runs as a development bundle; a test that needs a release one turns `__DEV__` off for itself. */
  function asReleaseBuild(): void {
    Object.defineProperty(globalThis, "__DEV__", { value: false, configurable: true, writable: true });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "__DEV__", { value: true, configurable: true, writable: true });
    delete mockPublicEnv.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT;
  });

  it("offers the seeded logins in a development build", async () => {
    await expect(loadBundledDemoAccounts()).resolves.toBe(MOBILE_DEMO_ACCOUNTS);
  });

  it("offers none in a release build made without the flag", async () => {
    asReleaseBuild();

    await expect(loadBundledDemoAccounts()).resolves.toEqual([]);
  });

  it("offers them in a release build made with EXPO_PUBLIC_SHOW_DEMO_ACCOUNT=true (an internal test build)", async () => {
    asReleaseBuild();
    mockPublicEnv.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT = "true";

    await expect(loadBundledDemoAccounts()).resolves.toBe(MOBILE_DEMO_ACCOUNTS);
  });

  it("takes only the exact word true as the flag", async () => {
    asReleaseBuild();
    mockPublicEnv.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT = "1";

    await expect(loadBundledDemoAccounts()).resolves.toEqual([]);
  });
});

describe("canReplayOnboarding", () => {
  it("offers the replay in a development build and in a test build, never in a store build", () => {
    expect(canReplayOnboarding({ isDevelopment: true, showDemoAccounts: false })).toBe(true);
    expect(canReplayOnboarding({ isDevelopment: false, showDemoAccounts: true })).toBe(true);
    expect(canReplayOnboarding({ isDevelopment: false, showDemoAccounts: false })).toBe(false);
  });
});
