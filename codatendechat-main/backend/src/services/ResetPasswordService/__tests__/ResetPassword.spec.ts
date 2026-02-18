import ResetPassword from "../ResetPassword";
import database from "../../../database";

jest.mock("sequelize", () => {
  return {
    QueryTypes: {
      SELECT: "SELECT",
      UPDATE: "UPDATE",
    },
  };
});

jest.mock("../../../database", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
}));

describe("ResetPassword Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if email not found", async () => {
    (database.query as jest.Mock).mockResolvedValueOnce([]); // filterUser returns empty array

    const result = await ResetPassword("test@example.com", "token", "password");

    expect(result).toEqual({ status: 404, message: "Email não encontrado" });
  });

  it("should return 404 if token not found", async () => {
    (database.query as jest.Mock)
      .mockResolvedValueOnce([{ id: 1 }]) // filterUser returns user (so hasResult is true)
      .mockResolvedValueOnce([]) // insertHasPassword: sqlValida result (empty)
      .mockResolvedValueOnce([]); // insertHasPassword: sqls (UPDATE) result

    const result = await ResetPassword("test@example.com", "token", "password");

    expect(result).toEqual({ status: 404, message: "Token não encontrado" });
  });

  it("should succeed if email and token are valid", async () => {
    (database.query as jest.Mock)
      .mockResolvedValueOnce([{ id: 1 }]) // filterUser
      .mockResolvedValueOnce([{ id: 1 }]) // insertHasPassword: sqlValida result (valid)
      .mockResolvedValueOnce([1]); // insertHasPassword: sqls (UPDATE) result

    const result = await ResetPassword("test@example.com", "token", "password");

    expect(result).toBeUndefined();
  });
});
