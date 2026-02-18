
import path from "path";
import fs from "fs";
import uploadConfig from "../src/config/upload";

const publicFolder = path.resolve(__dirname, "..", "public");

describe("Upload Config", () => {
  it("should resolve correct path for valid typeArch", (done) => {
    const req = {
      body: {
        typeArch: "announcements"
      }
    };
    const file = { originalname: "test.txt" };

    // @ts-ignore
    uploadConfig.storage.getDestination(req, file, (err, folder) => {
      expect(err).toBeNull();
      expect(folder).toBe(path.resolve(publicFolder, "announcements"));
      done();
    });
  });

  it("should prevent path traversal in typeArch", (done) => {
    const req = {
      body: {
        typeArch: "../../etc"
      }
    };
    const file = { originalname: "test.txt" };

    // @ts-ignore
    uploadConfig.storage.getDestination(req, file, (err, folder) => {
      // It should either return error or sanitize the path to be inside publicFolder
      if (err) {
        expect(err).toBeTruthy();
      } else {
        const relative = path.relative(publicFolder, folder);
        const isOutside = relative.startsWith('..') && !path.isAbsolute(relative);
        expect(isOutside).toBe(false);
      }
      done();
    });
  });

  it("should prevent path traversal with fileId", (done) => {
    const req = {
      body: {
        typeArch: "test",
        fileId: "../../etc"
      }
    };
    const file = { originalname: "test.txt" };

    // @ts-ignore
    uploadConfig.storage.getDestination(req, file, (err, folder) => {
       if (err) {
        expect(err).toBeTruthy();
      } else {
        const relative = path.relative(publicFolder, folder);
        const isOutside = relative.startsWith('..') && !path.isAbsolute(relative);
        expect(isOutside).toBe(false);
      }
      done();
    });
  });
});
