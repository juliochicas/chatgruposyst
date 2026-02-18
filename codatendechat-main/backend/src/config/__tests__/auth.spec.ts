/* eslint-disable global-require, @typescript-eslint/no-var-requires */
describe("Auth Config", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it("should throw error if JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    // We don't care about REFRESH_SECRET here as SECRET check comes first

    expect(() => require("../auth")).toThrow(
      "JWT_SECRET must be defined in .env file"
    );
  });

  it("should throw error if JWT_REFRESH_SECRET is missing", () => {
    process.env.JWT_SECRET = "test_secret";
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => require("../auth")).toThrow(
      "JWT_REFRESH_SECRET must be defined in .env file"
    );
  });

  it("should use env vars if provided", () => {
    process.env.JWT_SECRET = "test_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";

    const auth = require("../auth").default;

    expect(auth.secret).toBe("test_secret");
    expect(auth.refreshSecret).toBe("test_refresh_secret");
  });
});
