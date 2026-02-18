import { verify } from "jsonwebtoken";
import { Response } from "express";
import { RefreshTokenService } from "../RefreshTokenService";
import ShowUserService from "../../UserServices/ShowUserService";
import { createAccessToken, createRefreshToken } from "../../../helpers/CreateTokens";
import AppError from "../../../errors/AppError";

jest.mock("jsonwebtoken");
jest.mock("../../UserServices/ShowUserService");
jest.mock("../../../helpers/CreateTokens");

// Mock authConfig to ensure consistent secrets
jest.mock("../../../config/auth", () => ({
  refreshSecret: "test_refresh_secret",
  refreshExpiresIn: "7d"
}));

describe("RefreshTokenService", () => {
  let mockRes: Partial<Response>;
  const mockClearCookie = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      clearCookie: mockClearCookie
    };
  });

  it("should return new tokens when refresh token is valid", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      profile: "admin",
      tokenVersion: 1,
      companyId: 1
    };
    const mockDecoded = {
      id: "1",
      tokenVersion: 1,
      companyId: 1
    };

    (verify as jest.Mock).mockReturnValue(mockDecoded);
    (ShowUserService as jest.Mock).mockResolvedValue(mockUser);
    (createAccessToken as jest.Mock).mockReturnValue("new_access_token");
    (createRefreshToken as jest.Mock).mockReturnValue("new_refresh_token");

    const response = await RefreshTokenService(mockRes as Response, "valid_token");

    expect(verify).toHaveBeenCalledWith("valid_token", "test_refresh_secret");
    expect(ShowUserService).toHaveBeenCalledWith("1");
    expect(createAccessToken).toHaveBeenCalledWith(mockUser);
    expect(createRefreshToken).toHaveBeenCalledWith(mockUser);
    expect(response).toEqual({
      user: mockUser,
      newToken: "new_access_token",
      refreshToken: "new_refresh_token"
    });
    expect(mockClearCookie).not.toHaveBeenCalled();
  });

  it("should clear cookie and throw error when token verification fails", async () => {
    (verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await expect(RefreshTokenService(mockRes as Response, "invalid_token"))
      .rejects.toEqual(new AppError("ERR_SESSION_EXPIRED", 401));

    expect(mockClearCookie).toHaveBeenCalledWith("jrt");
  });

  it("should clear cookie and throw error when user is not found", async () => {
    const mockDecoded = {
        id: "1",
        tokenVersion: 1,
        companyId: 1
      };

    (verify as jest.Mock).mockReturnValue(mockDecoded);
    (ShowUserService as jest.Mock).mockRejectedValue(new Error("User not found"));

    await expect(RefreshTokenService(mockRes as Response, "valid_token"))
      .rejects.toEqual(new AppError("ERR_SESSION_EXPIRED", 401));

    expect(mockClearCookie).toHaveBeenCalledWith("jrt");
  });

  it("should clear cookie and throw error when token version mismatches", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      profile: "admin",
      tokenVersion: 2, // Mismatch
      companyId: 1
    };
    const mockDecoded = {
      id: "1",
      tokenVersion: 1,
      companyId: 1
    };

    (verify as jest.Mock).mockReturnValue(mockDecoded);
    (ShowUserService as jest.Mock).mockResolvedValue(mockUser);

    await expect(RefreshTokenService(mockRes as Response, "valid_token"))
      .rejects.toEqual(new AppError("ERR_SESSION_EXPIRED", 401));

    expect(mockClearCookie).toHaveBeenCalledWith("jrt");
  });
});
