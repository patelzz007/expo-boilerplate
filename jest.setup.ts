// Runs before every test file (jest.config.js → setupFilesAfterEnv). Only BOUNDARIES are replaced
// here — native modules with no JavaScript implementation under Jest (rules/11): the OS secret store
// becomes an in-memory map each test can inspect and reset, Uniwind (compiled by Metro) renders
// unstyled, the native blur view is a plain view, the keyboard is keyboard-controller's own Jest
// stand-in, and Reanimated's native worklet runtime runs on the JS thread. Files (expo-file-system),
// the file picker (expo-document-picker) and the share sheet (expo-sharing) are fakes each test can
// fill, and random UUIDs come from Node (expo-crypto). The camera is mocked per suite by the QR
// scanner's tests (test/expo-camera-mock.tsx). Every query client a test creates is disposed after
// the test, so no cache timer keeps the worker alive.

import "@testing-library/react-native/matchers";
import { cleanup } from "@testing-library/react-native";
import type * as KeyboardController from "react-native-keyboard-controller";
import type * as Worklets from "react-native-worklets";

// `mock…` names are the only outer variables a hoisted jest.mock factory may use.
import * as mockBlur from "./test/expo-blur-mock";
import * as mockCrypto from "./test/expo-crypto-mock";
import * as mockDocumentPicker from "./test/expo-document-picker-fake";
import * as mockFileSystem from "./test/expo-file-system-fake";
import * as mockSharing from "./test/expo-sharing-fake";
import { disposeTrackedQueryClients } from "./test/query-clients";
import { memorySecureStore as mockSecureStore } from "./test/secure-store-memory";
import * as mockUniwind from "./test/uniwind-mock";

jest.mock("expo-secure-store", () => mockSecureStore);
jest.mock("uniwind", () => mockUniwind);
jest.mock("expo-blur", () => mockBlur);
jest.mock("expo-crypto", () => mockCrypto);
jest.mock("expo-file-system", () => mockFileSystem);
jest.mock("expo-document-picker", () => mockDocumentPicker);
jest.mock("expo-sharing", () => mockSharing);
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual<typeof KeyboardController>("react-native-keyboard-controller/jest")
);
jest.mock("react-native-worklets", () => jest.requireActual<typeof Worklets>("react-native-worklets/src/mock"));

beforeEach(() => {
  mockSecureStore.reset();
  mockFileSystem.reset();
  mockDocumentPicker.reset();
  mockSharing.reset();
});

// Unmounting destroys query observers, which schedules their timers, so the rendered trees are
// unmounted FIRST (Testing Library's cleanup is idempotent), then the clients are disposed.
afterEach(async () => {
  await cleanup();
  disposeTrackedQueryClients();
});
