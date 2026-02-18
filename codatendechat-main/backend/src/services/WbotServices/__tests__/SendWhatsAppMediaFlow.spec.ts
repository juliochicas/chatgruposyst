import { execFile } from "child_process";
import SendWhatsAppMediaFlow from "../SendWhatsAppMediaFlow";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import GetTicketWbot from "../../../helpers/GetTicketWbot";
import fs from "fs";

// Mock child_process
jest.mock("child_process", () => ({
  execFile: jest.fn((cmd, args, callback) => callback(null, "", "")),
}));

// Mock other dependencies
jest.mock("../../../models/Ticket");
jest.mock("../../../models/Contact");
jest.mock("../../../helpers/GetTicketWbot");
jest.mock("../../../libs/wbot", () => ({
  getWbot: jest.fn(),
}));
jest.mock("fs");
jest.mock("@ffmpeg-installer/ffmpeg", () => ({
  path: "ffmpeg",
}));

describe("SendWhatsAppMediaFlow Command Injection", () => {
  it("should use execFile and pass arguments safely", async () => {
    // Setup mocks
    (GetTicketWbot as jest.Mock).mockResolvedValue({
      sendMessage: jest.fn(),
    });
    (Ticket.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      contactId: 1,
      isGroup: false,
      update: jest.fn(),
    } as any);
    (Contact.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      number: "1234567890",
    } as any);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from("dummy"));

    // Payload designed to execute 'touch HACKED'
    // Appending .mp3 allows it to pass mime.lookup check
    const maliciousMedia = "audio.mp3; touch HACKED; .mp3";

    try {
      await SendWhatsAppMediaFlow({
        media: maliciousMedia,
        ticket: { id: 1, contactId: 1 } as any,
        isRecord: true // Triggers processAudio
      });
    } catch (e) {
      // Ignore errors related to file not found etc.
    }

    // Verify execFile was called with the malicious command as an argument
    const execFileMock = execFile as unknown as jest.Mock;
    const lastCall = execFileMock.mock.calls[execFileMock.mock.calls.length - 1];
    const args = lastCall[1];

    console.log("Executed args:", args);

    // Assert that the malicious payload is passed as a single argument
    expect(args).toContain(maliciousMedia);
    // And verify it's passed as the input file
    const inputIndex = args.indexOf("-i");
    expect(args[inputIndex + 1]).toBe(maliciousMedia);
  });
});
