import { scannedTextOf } from "../scanned-text";

describe("scannedTextOf", () => {
  it("offers an https link", () => {
    expect(scannedTextOf("https://example.com/menu?table=4")).toStrictEqual({
      kind: "link",
      url: "https://example.com/menu?table=4",
    });
  });

  it("offers an http link, ignoring surrounding whitespace", () => {
    expect(scannedTextOf("  http://example.com  ")).toStrictEqual({ kind: "link", url: "http://example.com" });
  });

  it("treats other schemes as text, never as a link to open", () => {
    expect(scannedTextOf("javascript:alert(1)")).toStrictEqual({ kind: "text", text: "javascript:alert(1)" });
    expect(scannedTextOf("WIFI:T:WPA;S:Home;P:secret;;")).toStrictEqual({
      kind: "text",
      text: "WIFI:T:WPA;S:Home;P:secret;;",
    });
  });

  it("keeps plain text exactly as scanned", () => {
    expect(scannedTextOf("RWD-4821-KLCC")).toStrictEqual({ kind: "text", text: "RWD-4821-KLCC" });
  });
});
