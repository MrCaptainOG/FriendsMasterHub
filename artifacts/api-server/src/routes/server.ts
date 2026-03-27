import { Router, type IRouter } from "express";
import axios from "axios";

const router: IRouter = Router();

router.get("/server/status", async (_req, res) => {
  try {
    const resp = await axios.get(
      "https://api.mcstatus.io/v2/status/java/FriendsMasterHub.aternos.me:19276",
      { timeout: 8000 }
    );
    const data = resp.data;
    res.json({
      online: data.online === true,
      players: {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
      },
      version: data.version?.name_clean ?? data.version?.name ?? "Unknown",
      motd: data.motd?.clean ?? "",
      address: "FriendsMasterHub.aternos.me",
      port: 19276,
    });
  } catch (err) {
    res.json({
      online: false,
      players: { online: 0, max: 0 },
      version: "Unknown",
      motd: "",
      address: "FriendsMasterHub.aternos.me",
      port: 19276,
    });
  }
});

export default router;
