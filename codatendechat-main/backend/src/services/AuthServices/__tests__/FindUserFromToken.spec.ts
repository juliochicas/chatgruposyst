import { verify } from "jsonwebtoken";
import FindUserFromToken from "../FindUserFromToken";
import ShowUserService from "../../UserServices/ShowUserService";
import User from "../../../models/User";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../../UserServices/ShowUserService");

describe("FindUserFromToken", () => {
  const mockVerify = verify as jest.Mock;
  const mockShowUserService = ShowUserService as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a user when token is valid", async () => {
    // Arrange
    const token = "valid-token";
    const decodedToken = { id: "user-id", tokenVersion: 1, companyId: 1 };
    const mockUser = { id: "user-id", name: "Test User" } as unknown as User;

    mockVerify.mockReturnValue(decodedToken);
    mockShowUserService.mockResolvedValue(mockUser);

    // Act
    const result = await FindUserFromToken(token);

    // Assert
    expect(mockVerify).toHaveBeenCalledWith(token, expect.any(String));
    expect(mockShowUserService).toHaveBeenCalledWith(decodedToken.id);
    expect(result).toEqual(mockUser);
  });

  it("should throw an error if verify fails", async () => {
    // Arrange
    const token = "invalid-token";
    mockVerify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    // Act & Assert
    await expect(FindUserFromToken(token)).rejects.toThrow("Invalid token");
    expect(mockShowUserService).not.toHaveBeenCalled();
  });

  it("should throw an error if ShowUserService fails", async () => {
    // Arrange
    const token = "valid-token";
    const decodedToken = { id: "user-id", tokenVersion: 1, companyId: 1 };

    mockVerify.mockReturnValue(decodedToken);
    mockShowUserService.mockRejectedValue(new Error("User not found"));

    // Act & Assert
    await expect(FindUserFromToken(token)).rejects.toThrow("User not found");
  });
});
