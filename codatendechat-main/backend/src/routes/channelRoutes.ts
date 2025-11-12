import { Router } from "express";

import isAuth from "../middleware/isAuth";
import {
  index,
  store,
  update,
  remove
} from "../controllers/ChannelController";

const channelRoutes = Router();

channelRoutes.get("/channels", isAuth, index);
channelRoutes.post("/channels", isAuth, store);
channelRoutes.put("/channels/:channelId", isAuth, update);
channelRoutes.delete("/channels/:channelId", isAuth, remove);

export default channelRoutes;

