# Asystent Live Bet AI ⚽🤖

Aplikacja wspomagająca analizę meczów piłkarskich na żywo oparta o modele probabilistyczne, szacowanie wartości oczekiwanej (Expected Value – EV), zarządzanie kapitałem (Bankroll Management: Flat, Percent, Kelly Criterion) oraz integrację z Gemini AI do generowania pogłębionych raportów taktyczno-analitycznych.

---

## 🛠️ Zmienne środowiskowe (.env.example)

Skopiuj plik `.env.example` do pliku `.env` i uzupełnij potrzebne klucze:

- `GEMINI_API_KEY`: Klucz API Google Gemini (wymagany do automatycznych analiz AI w `/api/analyze`).
- `FOOTBALL_API_KEY`: Opcjonalny bezpłatny klucz API z serwisu [football-data.org](https://www.football-data.org/) lub api-sports.io do zasilania aplikacji prawdziwymi meczami z całego świata. W przypadku braku klucza aplikacja działa w trybie demonstracyjnym (demo).
- `VITE_API_BASE_URL`: Adres URL zewnętrznego backendu (np. `https://twoj-serwer-backendu.app`), jeśli frontend jest hostowany statycznie (np. na GitHub Pages). Domyślnie pusty dla lokalnego serwera deweloperskiego i monolitu.
- `ALLOWED_ORIGIN`: Opcjonalny dozwolony origin dla nagłówków CORS na serwerze (np. `https://twoj-uzytkownik.github.io`). Jeśli nie jest ustawiony, ograniczenia CORS nie są aktywowane.
- `PORT`: Port serwera Express (domyślnie `3000`).

---

## 🚀 Uruchomienie lokalne

### Tryb deweloperski
Uruchamia serwer Express oraz Vite w trybie HMR na porcie 3000:
```bash
npm run dev
```

### Tryb produkcyjny (Full-stack)
Buduje statyczny frontend oraz kompiluje backend za pomocą esbuild, a następnie uruchamia produkcyjny serwer Node.js:
```bash
npm run build
npm start
```

---

## 🌐 Wdrożenie na GitHub Pages z osobnym backendem

GitHub Pages serwuje wyłącznie statyczne pliki frontendu (HTML/JS/CSS). Aby funkcje backendu (`/api/analyze` oraz `/api/real-matches`) działały w wersji na Pages:

1. **Hostowanie backendu:** Wdróż aplikację z plikiem `server.ts` na platformie obsługującej kontenery / Node.js (np. Google Cloud Run, Render, Railway).
2. **Konfiguracja CORS w backendzie:** W zmiennych środowiskowych backendu ustaw:
   ```env
   ALLOWED_ORIGIN=https://lukasz8423-code.github.io
   ```
3. **Konfiguracja frontendu (GitHub Pages):**
   W repozytorium na GitHubie (Settings > Secrets and variables > Actions > Variables) dodaj zmienną:
   ```
   VITE_API_BASE_URL = https://adres-twojego-backendu.app
   ```
   Plik workflow `.github/workflows/deploy.yml` automatycznie przekaże tę zmienną do procesu budowania `npx vite build`.
