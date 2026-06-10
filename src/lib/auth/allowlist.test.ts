import { normalizeEmail, roleForEmail, isAllowed } from "./allowlist";

/**
 * These tests guard the front-door lock. A regression here could lock out the
 * real user or let an unauthorized account in — so the cases deliberately cover
 * Gmail's dot/case quirks and the fail-closed behavior on missing config.
 */

const ADMIN = "JacksonRichards.dev@gmail.com";
const USER = "ForBusinessOnly8032@gmail.com";
const TEST = "a.j.j.a.x.x.o.n@gmail.com";

describe("normalizeEmail", () => {
  it("lowercases the address", () => {
    expect(normalizeEmail("Foo@Bar.COM")).toBe("foo@bar.com");
  });

  it("strips dots from the local part for gmail (Gmail treats them as identical)", () => {
    expect(normalizeEmail("j.a.c.k@gmail.com")).toBe("jack@gmail.com");
  });

  it("does NOT strip dots for non-gmail domains", () => {
    expect(normalizeEmail("first.last@company.com")).toBe("first.last@company.com");
  });

  it("treats googlemail.com like gmail.com", () => {
    expect(normalizeEmail("a.b@googlemail.com")).toBe("ab@googlemail.com");
  });

  it("strips a '+tag' from the local part for gmail (plus-addressing)", () => {
    expect(normalizeEmail("jack+ledger@gmail.com")).toBe("jack@gmail.com");
    expect(normalizeEmail("ja.ck+promo@gmail.com")).toBe("jack@gmail.com");
  });

  it("does NOT strip '+tag' for non-gmail domains", () => {
    expect(normalizeEmail("first+tag@company.com")).toBe("first+tag@company.com");
  });
});

describe("roleForEmail (with env configured)", () => {
  const ORIGINAL = { ...process.env };
  beforeEach(() => {
    process.env.LEDGER_ADMIN_EMAIL = ADMIN;
    process.env.LEDGER_USER_EMAIL = USER;
    process.env.LEDGER_TEST_EMAIL = TEST;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("maps the admin email to 'admin'", () => {
    expect(roleForEmail(ADMIN)).toBe("admin");
  });

  it("maps the user email to 'user'", () => {
    expect(roleForEmail(USER)).toBe("user");
  });

  it("maps the test email to 'test'", () => {
    expect(roleForEmail(TEST)).toBe("test");
  });

  it("matches regardless of dots/case (Gmail equivalence)", () => {
    expect(roleForEmail("jacksonrichardsdev@GMAIL.com")).toBe("admin");
    expect(roleForEmail("ajjaxxon@gmail.com")).toBe("test");
  });

  it("denies an unlisted Google account", () => {
    expect(roleForEmail("randomstranger@gmail.com")).toBeNull();
    expect(isAllowed("randomstranger@gmail.com")).toBe(false);
  });

  it("denies null / empty / garbage input", () => {
    expect(roleForEmail(null)).toBeNull();
    expect(roleForEmail(undefined)).toBeNull();
    expect(roleForEmail("")).toBeNull();
    expect(isAllowed("not-an-email")).toBe(false);
  });
});

describe("fail-closed when env is missing", () => {
  const ORIGINAL = { ...process.env };
  beforeEach(() => {
    delete process.env.LEDGER_ADMIN_EMAIL;
    delete process.env.LEDGER_USER_EMAIL;
    delete process.env.LEDGER_TEST_EMAIL;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("denies EVERYONE when no allowlist is configured (never fail open)", () => {
    expect(isAllowed(ADMIN)).toBe(false);
    expect(isAllowed(USER)).toBe(false);
    expect(roleForEmail(TEST)).toBeNull();
  });
});
