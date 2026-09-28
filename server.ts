import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Funkcja pomocnicza do dynamicznego wyliczania kursów w zależności od aktualnego wyniku live
function calculateOdds(gole1: number, gole2: number) {
  let kurs1 = 2.15;
  let kurs_x = 3.25;
  let kurs2 = 3.10;

  const scoreDiff = gole1 - gole2;
  if (scoreDiff > 0) {
    kurs1 = Number(Math.max(1.05, 1.45 - scoreDiff * 0.1).toFixed(2));
    kurs_x = Number(Math.max(2.5, 3.5 + scoreDiff * 0.5).toFixed(2));
    kurs2 = Number(Math.min(50, 4.0 + scoreDiff * 3.0).toFixed(2));
  } else if (scoreDiff < 0) {
    const absDiff = Math.abs(scoreDiff);
    kurs1 = Number(Math.min(50, 4.0 + absDiff * 3.0).toFixed(2));
    kurs_x = Number(Math.max(2.5, 3.5 + absDiff * 0.5).toFixed(2));
    kurs2 = Number(Math.max(1.05, 1.45 - absDiff * 0.1).toFixed(2));
  }
  return { kurs1, kurs_x, kurs2 };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Obsługa JSON w żądaniach
  app.use(express.json());

  // API do analizy meczu przy użyciu Gemini AI
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Brak promptu do analizy." });
      }

      // Bezpieczna, leniwa inicjalizacja klucza API (lazy initialization)
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({
          error: "Klucz API 'GEMINI_API_KEY' nie jest skonfigurowany. Dodaj go w panelu Settings > Secrets w AI Studio."
        });
      }

      // Import dynamiczny @google/genai na potrzeby serwerowe
      const { GoogleGenAI } = await import("@google/genai");
      
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Używamy zalecanego modelu gemini-3.6-flash do zadań tekstowych
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      // Odczytujemy wygenerowany tekst
      const analysisText = response.text;
      
      res.json({ analysis: analysisText });
    } catch (error: any) {
      console.error("Błąd serwera Gemini API:", error);
      res.status(500).json({ 
        error: error.message || "Wystąpił nieoczekiwany błąd podczas komunikacji z modelem AI." 
      });
    }
  });

  // API do pobierania realnych meczów z dzisiejszego dnia (Football-Data.org lub API-Football / api-sports.io)
  app.get("/api/real-matches", async (req, res) => {
    try {
      const userHeaderKey = req.headers["x-api-key"] || req.headers["x-auth-token"];
      let key = "";
      if (userHeaderKey && typeof userHeaderKey === "string" && userHeaderKey.trim() !== "") {
        key = userHeaderKey.trim();
      } else {
        key = (process.env.FOOTBALL_API_KEY || "").trim();
      }

      // Clean up quotes if user accidentally pasted them
      key = key.replace(/^["']|["']$/g, '');

      // Check if key is a placeholder or invalid
      const isPlaceholder = (k: string) => {
        const lower = k.toLowerCase();
        return (
          lower.length < 10 ||
          lower.includes("placeholder") ||
          lower.includes("your") ||
          lower.includes("my_") ||
          lower.includes("api_key") ||
          lower.includes("token") ||
          lower === "null" ||
          lower === "undefined"
        );
      };

      if (!key || isPlaceholder(key)) {
        key = ""; // Treat as empty to trigger demo mode fallback
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
          kurs_x: 4.20,
          kurs2: 6.50,
          strzaly1: 14,
          strzaly2: 9,
          status: "niesprawdzony",
          dataDodania: new Date().toISOString(),
          notatki: "Rozgrywki: La Liga (El Clásico) • Tryb Demo"
        },
        {
          id: "real-demo-2",
          gospodarz: "Manchester City",
          gosc: "Liverpool FC",
          gole1: 1,
          gole2: 1,
          minuta: 62,
          kurs1: 2.10,
          kurs_x: 2.90,
          kurs2: 3.40,
          strzaly1: 11,
          strzaly2: 10,
          status: "niesprawdzony",
          dataDodania: new Date().toISOString(),
          notatki: "Rozgrywki: Premier League • Tryb Demo"
        },
        {
          id: "real-demo-3",
          gospodarz: "Bayern Monachium",
          gosc: "Borussia Dortmund",
          gole1: 3,
          gole2: 0,
          minuta: 90,
          kurs1: 1.02,
          kurs_x: 18.00,
          kurs2: 65.00,
          strzaly1: 21,
          strzaly2: 5,
          status: "wygrany",
          dataDodania: new Date().toISOString(),
          notatki: "Rozgrywki: Bundesliga • Tryb Demo • Zakończony"
        },
        {
          id: "real-demo-4",
          gospodarz: "Inter Mediolan",
          gosc: "AC Milan",
          gole1: 0,
          gole2: 0,
          minuta: 15,
          kurs1: 2.30,
          kurs_x: 3.10,
          kurs2: 3.20,
          strzaly1: 3,
          strzaly2: 2,
          status: "niesprawdzony",
          dataDodania: new Date().toISOString(),
          notatki: "Rozgrywki: Serie A (Derby della Madonnina) • Tryb Demo"
        }
      ];

      if (!key) {
        console.log("FOOTBALL_API_KEY nie został skonfigurowany. Zwracam mecze demonstracyjne.");
        return res.json({ matches: demoMatches, isDemo: true });
      }

      // 1. NAJPIERW SPRÓBUJMY FOOTBALL-DATA.ORG
      let footballDataError = null;
      let footballDataSuccess = false;
      let matchesResult: any[] = [];

      try {
        console.log("Próba pobrania meczów z Football-Data.org...");
        const response = await fetch("https://api.football-data.org/v4/matches?competitions=WC,CL,BL1,DED,BSA,PD,FL1,ELC,PPL,EC,SA,PL", {
          headers: {
            "X-Auth-Token": key
          }
        });

        if (response.ok) {
          const data = await response.json();
          const mapped = (data.matches || []).map((m: any) => {
            let minuta = 0;
            if (m.status === "LIVE" || m.status === "IN_PLAY") {
              minuta = 45;
              try {
                const startedAt = new Date(m.lastUpdated || m.utcDate).getTime();
                const diffMin = Math.floor((Date.now() - startedAt) / 60000);
                if (diffMin > 0 && diffMin <= 110) {
                  minuta = diffMin > 45 && diffMin < 60 ? 45 : (diffMin >= 60 ? Math.min(90, diffMin - 15) : diffMin);
                }
              } catch (e) {}
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
              gosc: m.awayTeam?.name || "Goście",
              gole1,
              gole2,
              minuta,
              kurs1,
              kurs_x,
              kurs2,
              strzaly1: m.status === "FINISHED" ? Math.round(gole1 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.12),
              strzaly2: m.status === "FINISHED" ? Math.round(gole2 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.1),
              status,
              dataDodania: m.utcDate || new Date().toISOString(),
              notatki: `Rozgrywki: ${m.competition?.name || "Liga"}, Status: ${m.status} (Football-Data.org)`
            };
          });

          matchesResult = mapped;
          footballDataSuccess = true;
          console.log(`Pomyślnie pobrano ${mapped.length} meczów z Football-Data.org!`);
        } else {
          const errText = await response.text();
          try {
            const parsed = JSON.parse(errText);
            footballDataError = parsed.message || `Status ${response.status}`;
          } catch {
            footballDataError = errText || `Status ${response.status}`;
          }
        }
      } catch (err: any) {
        footballDataError = err.message || err;
      }

      if (footballDataSuccess) {
        return res.json({ matches: matchesResult });
      }

      // 2. JEŚLI FOOTBALL-DATA ZWRÓCIŁ BŁĄD, PRÓBUJEMY API-FOOTBALL (API-SPORTS.IO)
      console.log(`Football-Data.org nie powiodło się: ${footballDataError}. Próba z API-Football (api-sports.io)...`);

      let apiSportsError = null;
      let apiSportsSuccess = false;

      try {
        const today = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
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
            
            // Filtrujemy mecze z najpopularniejszych lig europejskich i Ekstraklasy (106)
            const majorLeagueIds = [39, 140, 135, 78, 61, 2, 3, 88, 94, 106];
            const filteredList = list.filter((item: any) => majorLeagueIds.includes(item.league?.id));
            const finalItems = filteredList.length > 0 ? filteredList : list;

            const mapped = finalItems.map((item: any) => {
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
                gosc: m.teams?.away?.name || "Goście",
                gole1,
                gole2,
                minuta,
                kurs1,
                kurs_x,
                kurs2,
                strzaly1: statusShort === "FT" ? Math.round(gole1 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.12),
                strzaly2: statusShort === "FT" ? Math.round(gole2 * 3.5 + Math.random() * 5) : Math.round(minuta * 0.13),
                status,
                dataDodania: m.fixture?.date || new Date().toISOString(),
                notatki: `Rozgrywki: ${m.league?.name || "Liga"} (${m.league?.country || "Kraj"}), Status: ${statusLong} (API-Football)`
              };
            });

            matchesResult = mapped;
            apiSportsSuccess = true;
            console.log(`Pomyślnie pobrano ${mapped.length} meczów z API-Football!`);
          }
        } else {
          apiSportsError = `Status HTTP ${response.status}`;
        }
      } catch (err: any) {
        apiSportsError = err.message || err;
      }

      if (apiSportsSuccess) {
        return res.json({ matches: matchesResult });
      }

      // 3. JEŚLI OBYDWA SYSTEMY ZWRÓCIŁY BŁĄD, WRACAMY DO MECHÓW DEMO Z CZYTELNYM RAPORTEM BŁĘDÓW
      console.error("Obie integracje (Football-Data i API-Football) zakończyły się niepowodzeniem.");
      
      return res.json({
        matches: demoMatches,
        isDemo: true,
        error: `Football-Data.org: "${footballDataError}" | API-Football.com: "${apiSportsError || "Niewłaściwy format klucza lub brak uprawnień"}"`
      });

    } catch (error: any) {
      console.error("Ogólny błąd endpointu pobierania meczów:", error);
      res.status(500).json({ error: error.message || "Wystąpił błąd podczas pobierania danych meczowych." });
    }
  });

  // Konfiguracja serwera deweloperskiego Vite lub statycznych plików produkcyjnych
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
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
