import { TicketsAttendance } from "../TicketsAttendance";
import sequelize from "../../../database/index";

jest.mock("../../../database/index", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn().mockImplementation((sql, options) => {
        if (sql && sql.includes && sql.includes('select u.name from "Users"')) {
            return Promise.resolve([{ name: "User1" }]);
        }
        return Promise.resolve([]);
      }),
      addModels: jest.fn(),
    },
  };
});

describe("TicketsAttendance", () => {
  it("should use parameterized query for main query", async () => {
    const initialDate = "2023-01-01";
    const finalDate = "2023-01-31";
    const companyId = 1;

    await TicketsAttendance({ initialDate, finalDate, companyId });

    // Verify sequelize.query was called with replacements
    // The second call to query is the main query
    expect(sequelize.query).toHaveBeenCalledTimes(2);

    const mainQueryCall = (sequelize.query as jest.Mock).mock.calls[1];
    const [sql, options] = mainQueryCall;

    expect(sql).toContain(":companyId");
    expect(sql).toContain(":initialDate");
    expect(sql).toContain(":finalDate");
    expect(options).toHaveProperty("replacements");
    expect(options.replacements).toHaveProperty("companyId", companyId);
    expect(options.replacements).toHaveProperty("initialDate", `${initialDate} 00:00:00`);
    expect(options.replacements).toHaveProperty("finalDate", `${finalDate} 23:59:59`);
  });

   it("should use parameterized query for users query", async () => {
    const initialDate = "2023-01-01";
    const finalDate = "2023-01-31";
    const companyId = 1;

    await TicketsAttendance({ initialDate, finalDate, companyId });

    // Verify sequelize.query was called with replacements
    // The first call to query is the users query
    expect(sequelize.query).toHaveBeenCalledTimes(2);

    const userQueryCall = (sequelize.query as jest.Mock).mock.calls[0];
    const [sql, options] = userQueryCall;

    expect(sql).toContain(":companyId");
    expect(options).toHaveProperty("replacements");
    expect(options.replacements).toHaveProperty("companyId", companyId);
  });
});
