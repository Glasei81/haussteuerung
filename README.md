# Haussteuerung Raubling — Kontext-Ordner

## Prinzip: Files over Tools
Alles was Claude wissen muss liegt in Dateien — nicht im Gedächtnis.
Bei jeder neuen Session relevante Dateien als Kontext übergeben.
Erkenntnisse, Entscheidungen, Ideen → sofort in context/ ablegen.

## Struktur

### context/
- **haussteuerung_todo.md** — Projektliste, offene Aufgaben, Anlage-Übersicht, Erledigtes
- **ids_keys.md** — Device-IDs, API Keys, Netzwerkadressen, alle ETA URIs (gitignored)
- **notes.md** — Technische Erkenntnisse, Entscheidungen, Hinweise

### scripts/
Alle ioBroker-Scripts. Werden via `/deploy` Telegram-Befehl auf hauspi eingespielt.

| Script | Aufgabe |
|---|---|
| deploy_listener.js | Deploy-System (selbst NICHT via /deploy aktualisierbar) |
| wetterstation.js | Weather Company API, alle 10 Min + Forecast täglich |
| solarmanager.js | Solarmanager API, alle 1 Min |
| eta.js | ETA REST API, alle 5 Min, 50+ Datenpunkte |
| eta_pellets_logik.js | Pellets Hinweis-Logik + Telegram |
| eta_puffer2.js | Puffer2 erweiterte Datenpunkte |
| eta_solar.js | Solarthermie erweiterte Datenpunkte |
| eta_zirkulation.js | Zirkulation + WW Ladepumpe |
| eta_scheitholz.js | Scheitholz erweiterte Datenpunkte |
| eta_puffer2_rueckspeisung.js | P2→P1 Wärmerückspeisung (Sofort laden) |
| influxdb_setup.js | InfluxDB Logging für alle 66 Datenpunkte |
| klima_logik.js | Klimaanlage Schlafzimmer (Midea) |
| telegram.js | Alle Telegram-Befehle |
| zirkulation_monitor.js | Zirkulationspumpe Überwachung |
| eta_uri_scan.js | ETA URI Diagnose (nur bei Bedarf ausführen) |

### docs/
- **erler_wind_TH_rosenheim.pdf** — TH Rosenheim Studie 2022 (manuell ablegen)

## Workflow (Stand: 13.06.2026)

### Entwicklung
1. Session starten → context/ Dateien als Kontext übergeben
2. Scripts in scripts/ bearbeiten (Claude Code)
3. Commit + Push auf Branch `claude/haussteuerung-setup-jm9NM`
4. Auf hauspi: `sudo -u iobroker git -C /home/pi/haussteuerung pull`
5. `/deploy` per Telegram → alle Scripts in ioBroker aktualisiert

### deploy_listener.js manuell aktualisieren
Wenn neue Scripts in SCRIPTS_MAP hinzukommen:
- ioBroker Admin → Skripte → deploy_listener → bearbeiten
- Zeile in SCRIPTS_MAP ergänzen, speichern
- `/deploy` per Telegram

### git pull Besonderheit
Repo gehört iobroker (wegen chown bei der Einrichtung).
Als pi eingeloggt → git pull schlägt fehl → immer als iobroker:
```bash
sudo -u iobroker git -C /home/pi/haussteuerung pull
```

## Infrastruktur

| Gerät | Rolle | Adresse |
|---|---|---|
| ETA eSH 27 | Heizung (Pellets + Scheitholz) | 192.168.178.5:8080 |
| hauspi | Raspberry Pi — ioBroker | hauspi.local:8081 |
| Dell Latitude 5320 | InfluxDB + Grafana (Docker) | 192.168.178.130 |
| Solarmanager v1 | PV-Überschusssteuerung | 192.168.178.36 |

## Stand
Erstellt: 26.05.2026
Letzte Aktualisierung: 13.06.2026
