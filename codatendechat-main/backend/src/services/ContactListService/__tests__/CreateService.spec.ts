import AppError from "../../../errors/AppError";
import CreateService from "../CreateService";
import ContactList from "../../../models/ContactList";

// Mock ContactList model
jest.mock("../../../models/ContactList");

describe("CreateService", () => {
  it("should be able to create a new contact list", async () => {
    const data = {
      name: "My Contact List",
      companyId: 1
    };

    const createdContactList = {
      id: 1,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (ContactList.create as jest.Mock).mockResolvedValue(createdContactList);

    const result = await CreateService(data);

    expect(result).toHaveProperty("id");
    expect(result.name).toBe(data.name);
    expect(ContactList.create).toHaveBeenCalledWith(data);
  });

  it("should not be able to create a contact list with invalid name", async () => {
    const data = {
      name: "ab", // Too short
      companyId: 1
    };

    await expect(CreateService(data)).rejects.toBeInstanceOf(AppError);
    await expect(CreateService(data)).rejects.toHaveProperty("message", "ERR_CONTACTLIST_INVALID_NAME");
    expect(ContactList.create).not.toHaveBeenCalled();
  });

  it("should not be able to create a contact list without name", async () => {
    const data = {
      name: undefined as unknown as string,
      companyId: 1
    };

    await expect(CreateService(data)).rejects.toBeInstanceOf(AppError);
    await expect(CreateService(data)).rejects.toHaveProperty("message", "ERR_CONTACTLIST_REQUIRED");
    expect(ContactList.create).not.toHaveBeenCalled();
  });
});
