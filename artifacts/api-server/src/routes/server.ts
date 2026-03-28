import { Router, type IRouter } from "express";
import axios from "axios";

const router: IRouter = Router();

router.get("/server/status", async (_req, res) => {
  try {
    const resp = await axios.get(
      "https://mcapi.us/query/server?ip=FriendsMasterHub.aternos.me&port=19276",
      { timeout: 10000 }
    );
    const data = resp.data;
    res.json({
      success: data.status === "success",
      online: data.online === true,
      players: {
        online: data.players?.now ?? 0,
        max: data.players?.max ?? 0,
      },
      motd: data.motd ?? "",
      version: data.server?.name ?? "Unknown",
      address: "FriendsMasterHub.aternos.me",
      port: 19276,
    });
  } catch {
    res.json({
      success: false,
      online: false,
      players: { online: 0, max: 0 },
      motd: "",
      version: "Unknown",
      address: "FriendsMasterHub.aternos.me",
      port: 19276,
    });
  }
});

export default router;
