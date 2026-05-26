# Claude_Haussteuerung — Kontext-Ordner

## Zweck
Dieser Ordner ist der stabile Kontext fuer alle Claude Sessions
zum Thema Haussteuerung Raubling (Stefan Glas).

Prinzip: "Files over Tools" — alles was Claude wissen muss liegt hier.
Bei jeder neuen Session relevante Dateien hochladen, Claude hat sofort vollen Kontext.

## Struktur

### context/
- **haussteuerung_todo.md** — Projektliste, offene Aufgaben, Anlage-Uebersicht
- **ids_keys.md** — alle Device-IDs, API Keys, Netzwerkadressen
- **notes.md** — Erkenntnisse, Entscheidungen, wichtige Hinweise

### scripts/
- **wetterstation.js** — Weather Company API, alle 10 Min + Forecast taeglich
- **eta_pellets_logik.js** — Pellets Steuerung + Telegram Bot (komplett)
- **solarmanager.js** — Solarmanager API, alle 1 Min
- **eta.js** — ETA REST API, alle 5 Min

### docs/
- **erler_wind_TH_rosenheim.pdf** — TH Rosenheim Studie 2022 (hier manuell ablegen)

## Workflow
1. Session starten -> relevante Dateien aus context/ hochladen
2. Mit Claude arbeiten
3. Aktualisierte Dateien herunterladen und im Ordner ersetzen
4. Scripts aus scripts/ direkt in ioBroker einfuegen

## Stand
Erstellt: 26.05.2026
Letzte Aktualisierung: 26.05.2026 (Optimierungen via ChatGPT integriert)
