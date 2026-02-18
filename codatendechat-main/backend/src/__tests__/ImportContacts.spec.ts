
// Move mocks to the top
const mockCheckContactNumberFn = jest.fn();

jest.mock("xlsx", () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

jest.mock("lodash", () => ({
  ...jest.requireActual("lodash"),
  head: jest.fn(),
}));

jest.mock("../models/ContactListItem");
jest.mock("../services/WbotServices/CheckNumber", () => ({
  __esModule: true,
  default: mockCheckContactNumberFn,
}));
jest.mock("../utils/logger");

import { ImportContacts } from "../services/ContactListService/ImportContacts";
import ContactListItem from "../models/ContactListItem";
import XLSX from "xlsx";
import { head } from "lodash";
import CheckContactNumber from "../services/WbotServices/CheckNumber";

const mockFindOrCreate = ContactListItem.findOrCreate as jest.Mock;
const mockFindAll = ContactListItem.findAll as jest.Mock;
const mockBulkCreate = ContactListItem.bulkCreate as jest.Mock;
const mockCheckContactNumber = CheckContactNumber as jest.Mock;

describe("ImportContacts Performance Benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup basic mocks
    (XLSX.readFile as jest.Mock).mockReturnValue({
      Sheets: {
        Sheet1: {},
      },
    });
    (head as jest.Mock).mockReturnValue({});

    // Simulate latency
    const DB_LATENCY = 10;

    mockFindOrCreate.mockImplementation(async ({ defaults }) => {
      await new Promise((resolve) => setTimeout(resolve, DB_LATENCY));
      return [{ ...defaults, save: jest.fn() }, true];
    });

    mockFindAll.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, DB_LATENCY));
      return [];
    });

    mockBulkCreate.mockImplementation(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, DB_LATENCY));
      return data.map((d: any) => ({ ...d, save: jest.fn() }));
    });

    mockCheckContactNumber.mockResolvedValue({
      exists: true,
      jid: "123456789@s.whatsapp.net",
    });
  });

  it("should benchmark importing contacts", async () => {
    const contactCount = 100;
    const contacts = Array.from({ length: contactCount }, (_, i) => ({
      nome: `Contact ${i}`,
      numero: `123456789${i}`,
      email: `contact${i}@example.com`,
    }));

    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(contacts);

    const start = Date.now();
    await ImportContacts(1, 1, { path: "dummy.xlsx" } as any);
    const end = Date.now();
    const duration = end - start;

    console.log(`ImportContacts execution time for ${contactCount} contacts: ${duration}ms`);

    console.log(`findOrCreate calls: ${mockFindOrCreate.mock.calls.length}`);
    console.log(`findAll calls: ${mockFindAll.mock.calls.length}`);
    console.log(`bulkCreate calls: ${mockBulkCreate.mock.calls.length}`);
  });
});
