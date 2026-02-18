import SendWhatsAppMediaFlow from "../SendWhatsAppMediaFlow";
import GetTicketWbot from "../../../helpers/GetTicketWbot";
import Contact from "../../../models/Contact";
import fs from "fs";

// Mock dependencies
jest.mock("../../../helpers/GetTicketWbot");
jest.mock("../../../models/Contact");
jest.mock("../../../libs/wbot", () => ({
  getWbot: jest.fn(),
  initWASocket: jest.fn(),
  removeWbot: jest.fn(),
}));

// Mock fs
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
  existsSync: jest.fn(() => true),
}));

// Mock mime-types
jest.mock("mime-types", () => ({
  lookup: jest.fn(),
}));

// Mock ffmpeg
jest.mock("@ffmpeg-installer/ffmpeg", () => ({
  path: "ffmpeg-mock-path",
}));

// Mock baileys
jest.mock("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [1, 2, 3], isLatest: true }),
  makeInMemoryStore: jest.fn().mockReturnValue({ bind: jest.fn() }),
  useMultiFileAuthState: jest.fn(),
  DisconnectReason: {},
  Browsers: { appropriate: jest.fn() },
  isJidBroadcast: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
}));

import mime from "mime-types";

describe("SendWhatsAppMediaFlow", () => {
  const mockWbot = {
    sendMessage: jest.fn(),
    sendPresenceUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (GetTicketWbot as jest.Mock).mockResolvedValue(mockWbot);
    (Contact.findOne as jest.Mock).mockResolvedValue({
      number: "123456789",
    });
  });

  it("should use fs.promises.readFile for video (optimized behavior)", async () => {
    const ticket = { contactId: 1, isGroup: false, update: jest.fn() } as any;
    const mediaPath = "/path/to/video.mp4";
    const body = "Video caption";

    (mime.lookup as jest.Mock).mockReturnValue("video/mp4");
    (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from("video content"));

    await SendWhatsAppMediaFlow({ media: mediaPath, ticket, body });

    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(fs.promises.readFile).toHaveBeenCalledWith(mediaPath);
    expect(mockWbot.sendMessage).toHaveBeenCalledWith(
      "123456789@s.whatsapp.net",
      expect.objectContaining({
        video: expect.anything(),
        caption: body,
      })
    );
  });

  it("should use fs.promises.readFile for image (optimized behavior)", async () => {
    const ticket = { contactId: 1, isGroup: false, update: jest.fn() } as any;
    const mediaPath = "/path/to/image.jpg";
    const body = "Image caption";

    // For image path (else block), mime.lookup needs to return false/undefined
    (mime.lookup as jest.Mock).mockReturnValue(false);
    (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from("image content"));

    await SendWhatsAppMediaFlow({ media: mediaPath, ticket, body });

    expect(fs.promises.readFile).toHaveBeenCalledWith(mediaPath);
    expect(mockWbot.sendMessage).toHaveBeenCalledWith(
      "123456789@s.whatsapp.net",
      expect.objectContaining({
        image: expect.anything(),
        caption: body,
      })
    );
  });
});
