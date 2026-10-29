import {
  OWN_PROFILE_EDITABLE_FIELDS,
  OwnProfileEditableFieldsSchema,
  USER_FULL_NAME_MAX_LENGTH,
  USER_FULL_NAME_MIN_LENGTH,
  UserFullNameSchema,
} from "../profile";

describe("UserFullNameSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(UserFullNameSchema.parse("  Jane Doe  ")).toBe("Jane Doe");
  });

  it("accepts names in any script", () => {
    expect(UserFullNameSchema.parse("Zoë Ñúñez-李")).toBe("Zoë Ñúñez-李");
  });

  it("rejects a name that is shorter than the minimum once trimmed", () => {
    expect(UserFullNameSchema.safeParse(` ${"J".repeat(USER_FULL_NAME_MIN_LENGTH - 1)} `).success).toBe(false);
    expect(UserFullNameSchema.safeParse("   ").success).toBe(false);
  });

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(UserFullNameSchema.safeParse("a".repeat(USER_FULL_NAME_MAX_LENGTH)).success).toBe(true);
    expect(UserFullNameSchema.safeParse("a".repeat(USER_FULL_NAME_MAX_LENGTH + 1)).success).toBe(false);
  });

  it("rejects control characters inside the name", () => {
    expect(UserFullNameSchema.safeParse("Jane\nDoe").success).toBe(false);
    expect(UserFullNameSchema.safeParse("Jane\u0000Doe").success).toBe(false);
  });
});

describe("OwnProfileEditableFieldsSchema", () => {
  it("lists exactly the editable fields", () => {
    expect(OWN_PROFILE_EDITABLE_FIELDS).toEqual(["fullName"]);
  });

  it("requires every editable field (the form edits the whole set)", () => {
    expect(OwnProfileEditableFieldsSchema.safeParse({}).success).toBe(false);
    expect(OwnProfileEditableFieldsSchema.parse({ fullName: " Jane " })).toEqual({ fullName: "Jane" });
  });
});
