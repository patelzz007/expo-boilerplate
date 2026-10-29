import { createTestRuntime, TEST_RAW_ENV, testRuntimeInputs } from "../../../test/app-harness";
import { DEFAULT_JSON_PLACEHOLDER_URL, MOBILE_ENV_EXAMPLES } from "../../lib/env";
import { createAppRuntime } from "../app-runtime";

describe("createAppRuntime", () => {
  it("stops at a configuration error, naming the variable and an example", () => {
    const runtime = createAppRuntime(testRuntimeInputs({ rawEnv: { ...TEST_RAW_ENV, showDemoAccount: "yes" } }));

    expect(runtime).toEqual({
      kind: "configError",
      issue: {
        subject: "EXPO_PUBLIC_SHOW_DEMO_ACCOUNT",
        message: "must be true or false, or left unset",
        example: MOBILE_ENV_EXAMPLES.EXPO_PUBLIC_SHOW_DEMO_ACCOUNT,
      },
    });
  });

  it("is ready with the validated environment: no API, and the demo API's address", () => {
    const runtime = createTestRuntime();

    expect(runtime.kind).toBe("ready");
    expect(runtime.env).toMatchObject({ apiBaseUrl: null, jsonPlaceholderUrl: DEFAULT_JSON_PLACEHOLDER_URL });
    expect(runtime.appName).toBe("hello-world");
  });
});
