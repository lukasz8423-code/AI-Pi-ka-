var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
function calculateOdds(gole1, gole2) {
  let kurs1 = 2.15;
  let kurs_x = 3.25;
  let kurs2 = 3.1;
  const scoreDiff = gole1 - gole2;
  if (scoreDiff > 0) {
    kurs1 = Number(Math.max(1.05, 1.45 - scoreDiff * 0.1).toFixed(2));
    kurs_x = Number(Math.max(2.5, 3.5 + scoreDiff * 0.5).toFixed(2));
    kurs2 = Number(Math.min(50, 4 + scoreDiff * 3).toFixed(2));
  } else if (scoreDiff < 0) {
    const absDiff = Math.abs(scoreDiff);
    kurs1 = Number(Math.min(50, 4 + absDiff * 3).toFixed(2));
    kurs_x = Number(Math.max(2.5, 3.5 + absDiff * 0.5).toFixed(2));
    kurs2 = Number(Math.max(1.05, 1.45 - absDiff * 0.1).toFixed(2));
  }
  return { kurs1, kurs_x, kurs2 };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.set("trust proxy", 1);
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });
  }
  app.use(import_express.default.json({ limit: "50kb" }));
  const analyzeLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zbyt wiele zapyta\u0144 do analizy AI. Spr\xF3buj ponownie za minut\u0119." }
  });
  const realMatchesLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zbyt wiele zapyta\u0144 o mecze live. Spr\xF3buj ponownie za minut\u0119." }
  });
  app.post("/api/analyze", analyzeLimiter, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (typeof prompt !== "string" || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Brak promptu do analizy lub podana warto\u015B\u0107 jest pusta." });
      }
      if (prompt.length > 8e3) {
        return res.status(400).json({ error: "Prompt jest zbyt d\u0142ugi (maksymalna dozwolona d\u0142ugo\u015B\u0107 to 8000 znak\xF3w)." });
      }
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({
          error: "Klucz API 'GEMINI_API_KEY' nie jest skonfigurowany. Dodaj go w panelu Settings > Secrets w AI Studio."
        });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      const analysisText = response.text;
      res.json({ analysis: analysisText });
    } catch (error) {
      console.error("B\u0142\u0105d serwera Gemini API:", error);
      res.status(500).json({
        error: error.message || "Wyst\u0105pi\u0142 nieoczekiwany b\u0142\u0105d podczas komunikacji z modelem AI."
      });
    }
  });
  app.get("/api/real-matches", realMatchesLimiter, async (req, res) => {
    try {
      const userHeaderKey = req.headers["x-api-key"] || req.headers["x-auth-token"];
      let key = "";
      if (userHeaderKey && typeof userHeaderKey === "string" && userHeaderKey.trim() !== "") {
        key = userHeaderKey.trim();
      } else {
        key = (process.env.FOOTBALL_API_KEY || "").trim();
      }
      key = key.replace(/^["']|["']$/g, "");
      const isPlaceholder = (k) => {
        const lower = k.toLowerCase();
        return lower.length < 10 || lower.includes("placeholder") || lower.includes("your") || lower.includes("my_") || lower.includes("api_key") || lower.includes("token") || lower === "null" || lower === "undefined";
      };
      if (!key || isPlaceholder(key)) {
        key = "";
      }
      const demoMatches = [
        {
          id: "real-demo-1",
          gospodarz: "Real Madryt",
          gosc: "FC Barcelona",
          gole1: 2,
          gole2: 1,
          minuta: 78,
          kurs1: 1.45,
          kurs_x: 4.2,
          kurs2: 6.5,
          strzaly1: 14,
          strzaly2: 9,
          status: "niesprawdzony",
          dataDodania: (/* @__PURE__ */ new Date()).toISOString(),
          notatki: "Rozgrywki: La Liga (El Cl\xE1sico) \u2022 Tryb Demo"
        },
        {
          id: "real-demo-2",
          gospodarz: "Manchester City",
          gosc: "Liverpool FC",
          gole1: 1,
          gole2: 1,
          minuta: 62,
          kurs1: 2.1,
          kurs_x: 2.9,
          kurs2: 3.4,
          strzaly1: 11,
          strzaly2: 10,
          status: "niesprawdzony",
          dataDodania: (/* @__PURE__ */ new Date()).toISOString(),
          notatki: "Rozgrywki: Premier League \u2022 Tryb Demo"
        },
        {
          id: "real-demo-3",
          gospodarz: "Bayern Monachium",
          gosc: "Borussia Dortmund",
          gole1: 3,
          gole2: 0,
          minuta: 90,
          kurs1: 1.02,
          kurs_x: 18,
          kurs2: 65,
          strzaly1: 21,
          strzaly2: 5,
          status: "wygrany",
          dataDodania: (/* @__PURE__ */ new Date()).toISOString(),
          notatki: "Rozgrywki: Bundesliga \u2022 Tryb Demo \u2022 Zako\u0144czony"
        },
        {
          id: "real-demo-4",
          gospodarz: "Inter Mediolan",
          gosc: "AC Milan",
          gole1: 0,
          gole2: 0,
          minuta: 15,
          kurs1: 2.3,
          kurs_x: 3.1,
          kurs2: 3.2,
          strzaly1: 3,
          strzaly2: 2,
          status: "niesprawdzony",
          dataDodania: (/* @__PURE__ */ new Date()).toISOString(),
          notatki: "Rozgrywki: Serie A (Derby della Madonnina) \u2022 Tryb Demo"
        }
      ];
      if (!key) {
        console.log("FOOTBALL_API_KEY nie zosta\u0142 skonfigurowany. Zwracam mecze demonstracyjne.");
        return res.json({ matches: demoMatches, isDemo: true });
      }
      let footballDataError = null;
      let footballDataSuccess = false;
      let matchesResult = [];
      try {
        console.log("Pr\xF3ba pobrania mecz\xF3w z Football-Data.org...");
        const response = await fetch("https://api.football-data.org/v4/matches?competitions=WC,CL,BL1,DED,BSA,PD,FL1,ELC,PPL,EC,SA,PL", {
          headers: {
            "X-Auth-Token": key
          }
        });
        if (response.ok) {
          const data = await response.json();
          const mapped = (data.matches || []).map((m) => {
            let minuta = 0;
            if (m.status === "LIVE" || m.status === "IN_PLAY") {
              minuta = 45;
              try {
                const startedAt = new Date(m.lastUpdated || m.utcDate).getTime();
                const diffMin = Math.floor((Date.now() - startedAt) / 6e4);
                if (diffMin > 0 && diffMin <= 110) {
                  minuta = diffMin > 45 && diffMin < 60 ? 45 : diffMin >= 60 ? Math.min(90, diffMin - 15) : diffMin;
                }
              } catch (e) {
              }
            } else if (m.status === "FINISHED") {
              minuta = 90;
            } else {
              minuta = 0;
            }
            const gole1 = m.score?.fullTime?.home ?? 0;
            const gole2 = m.score?.fullTime?.away ?? 0;
            const { kurs1, kurs_x, kurs2 } = calculateOdds(gole1, gole2);
            const status = m.status === "FINISHED" ? "wygrany" : "niesprawdzony";
            return {
              id: `real-${m.id}`,
              gospodarz: m.homeTeam?.name || "Gospodarze",
              gosc: m.awayTeam?.name || "Go\u015Bcie",
              gole1,
              gole2,
              minuta,
              kurs1,
              kurs_x,
              kurs2,
              strzaly1: m.status === "FINISHED" ? Math.round(gole1 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.12),
              strzaly2: m.status === "FINISHED" ? Math.round(gole2 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.1),
              status,
              daneSzacunkowe: true,
              dataDodania: m.utcDate || (/* @__PURE__ */ new Date()).toISOString(),
              notatki: `Rozgrywki: ${m.competition?.name || "Liga"}, Status: ${m.status} (Football-Data.org)`
            };
          });
          matchesResult = mapped;
          footballDataSuccess = true;
          console.log(`Pomy\u015Blnie pobrano ${mapped.length} mecz\xF3w z Football-Data.org!`);
        } else {
          const errText = await response.text();
          try {
            const parsed = JSON.parse(errText);
            footballDataError = parsed.message || `Status ${response.status}`;
          } catch {
            footballDataError = errText || `Status ${response.status}`;
          }
        }
      } catch (err) {
        footballDataError = err.message || err;
      }
      if (footballDataSuccess) {
        return res.json({ matches: matchesResult });
      }
      console.log(`Football-Data.org nie powiod\u0142o si\u0119: ${footballDataError}. Pr\xF3ba z API-Football (api-sports.io)...`);
      let apiSportsError = null;
      let apiSportsSuccess = false;
      try {
        const today = /* @__PURE__ */ new Date();
        const pad = (n) => n.toString().padStart(2, "0");
        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${todayStr}`, {
          headers: {
            "x-apisports-key": key
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.errors && Object.keys(data.errors).length > 0) {
            const firstErrKey = Object.keys(data.errors)[0];
            apiSportsError = data.errors[firstErrKey];
          } else {
            const list = data.response || [];
            const majorLeagueIds = [39, 140, 135, 78, 61, 2, 3, 88, 94, 106];
            const filteredList = list.filter((item) => majorLeagueIds.includes(item.league?.id));
            const finalItems = filteredList.length > 0 ? filteredList : list;
            const mapped = finalItems.map((item) => {
              const m = item;
              const fixtureId = m.fixture?.id || Math.random();
              const statusLong = m.fixture?.status?.long || "Mecz";
              const statusShort = m.fixture?.status?.short || "NS";
              const elapsed = m.fixture?.status?.elapsed || 0;
              let minuta = elapsed;
              if (statusShort === "FT") {
                minuta = 90;
              } else if (statusShort === "HT") {
                minuta = 45;
              }
              const gole1 = m.goals?.home ?? 0;
              const gole2 = m.goals?.away ?? 0;
              const { kurs1, kurs_x, kurs2 } = calculateOdds(gole1, gole2);
              const status = statusShort === "FT" ? "wygrany" : "niesprawdzony";
              return {
                id: `real-${fixtureId}`,
                gospodarz: m.teams?.home?.name || "Gospodarze",
                gosc: m.teams?.away?.name || "Go\u015Bcie",
                gole1,
                gole2,
                minuta,
                kurs1,
                kurs_x,
                kurs2,
                strzaly1: statusShort === "FT" ? Math.round(gole1 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.12),
                strzaly2: statusShort === "FT" ? Math.round(gole2 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.13),
                status,
                daneSzacunkowe: true,
                dataDodania: m.fixture?.date || (/* @__PURE__ */ new Date()).toISOString(),
                notatki: `Rozgrywki: ${m.league?.name || "Liga"} (${m.league?.country || "Kraj"}), Status: ${statusLong} (API-Football)`
              };
            });
            matchesResult = mapped;
            apiSportsSuccess = true;
            console.log(`Pomy\u015Blnie pobrano ${mapped.length} mecz\xF3w z API-Football!`);
          }
        } else {
          apiSportsError = `Status HTTP ${response.status}`;
        }
      } catch (err) {
        apiSportsError = err.message || err;
      }
      if (apiSportsSuccess) {
        return res.json({ matches: matchesResult });
      }
      console.error("Obie integracje (Football-Data i API-Football) zako\u0144czy\u0142y si\u0119 niepowodzeniem.");
      return res.json({
        matches: demoMatches,
        isDemo: true,
        error: `Football-Data.org: "${footballDataError}" | API-Football.com: "${apiSportsError || "Niew\u0142a\u015Bciwy format klucza lub brak uprawnie\u0144"}"`
      });
    } catch (error) {
      console.error("Og\xF3lny b\u0142\u0105d endpointu pobierania mecz\xF3w:", error);
      res.status(500).json({ error: error.message || "Wyst\u0105pi\u0142 b\u0142\u0105d podczas pobierania danych meczowych." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Serving static build from dist folder.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
