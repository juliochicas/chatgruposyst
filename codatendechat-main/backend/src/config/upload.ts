import path from "path";
import multer from "multer";
import fs from "fs";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {

      const { typeArch, fileId } = req.body;      

      // Sanitization
      const safeRegex = /^[a-zA-Z0-9_-]+$/;
      if (typeArch && !safeRegex.test(typeArch)) {
        return cb(new Error("Invalid typeArch"), "");
      }
      if (fileId && !safeRegex.test(fileId)) {
        return cb(new Error("Invalid fileId"), "");
      }

      let folder;

      if (typeArch && typeArch !== "announcements") {
        folder =  path.resolve(publicFolder , typeArch, fileId ? fileId : "") 
      } else if (typeArch && typeArch === "announcements") {
        folder =  path.resolve(publicFolder , typeArch) 
      }
      else
      {
        folder =  path.resolve(publicFolder) 
      }

      const relative = path.relative(publicFolder, folder);
      if ((relative.startsWith('..') && !path.isAbsolute(relative)) || path.isAbsolute(relative)) {
         return cb(new Error("Invalid path"), "");
      }

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder,  { recursive: true })
        fs.chmodSync(folder, 0o777)
      }
      return cb(null, folder);
    },
    filename(req, file, cb) {
      const { typeArch } = req.body;

      const fileName = typeArch && typeArch !== "announcements" ? file.originalname.replace('/','-').replace(/ /g, "_") : new Date().getTime() + '_' + file.originalname.replace('/','-').replace(/ /g, "_");
      return cb(null, fileName);
    }
  })
};
