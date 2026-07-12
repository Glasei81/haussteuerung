# Haussteuerung Raubling — Projektliste

## Anlage Übersicht

### Puffersystem
- **Puffer 1a:** 1500L (Hauptgebäude, aktiv geladen von Pellets/Heizstäbe)
- **Puffer 1b:** 1500L (Hauptgebäude, passiv in Reihe mit 1a, wird über Rücklauf von Puffer 2 geladen)
- **Puffer 2:** 600L (Keller, neu in ca. 12 Tagen) <- Solarthermie + Heizstab 4.5kW
- **Gesamt:** 3600L aktiv nutzbar

### Hydraulik Puffer (geklärt)
- Puffer 1a und 1b sind in Reihe geschaltet
- Entnahme oben bei Puffer 1a (heiss), Rücklauf unten bei Puffer 1b (kalt)
- Wenig Zirkulation zwischen 1a und 1b durch bauartbedingte Anschlüsse
- Fernwärmeleitung verbindet Puffer 1a mit Puffer 2 (Keller)
- Pumpe von ETA dynamisch angesteuert (nicht von uns steuern!)
- Puffer 2 versorgt: Brauchwasser + Heizkreis 1 + Heizkreis 2
- Puffer 1a heizt im Heizbetrieb über Fernwärmeleitung den Puffer 2
- Puffer 2 zu warm -> schiebt über Rücklauf zurück -> lädt Puffer 1b
- Langsame Pumpenzirkulation -> nach Zeit X alle Puffer gleichmaessig warm

### Ladelogik Puffer (Zukunft)
- Solarthermie -> Puffer 2 (ETA entscheidet selbst ob WW oder Puffer)
- Heizstab Puffer 2 max. 65 Grad (Solarthermie kann danach noch auf 80 Grad laden)
- Bei 3m2 Solarthermie dauert es ca. 70h um 3600L von 65 auf 80 Grad zu heizen -> kein Problem
- Heizstäbe aus ab Temperaturschwelle X -> nur noch Solarthermie
- ETA Pumpe steuert Wärmeausgleich zwischen Puffern selbst

### Kein Kreislaufproblem!
- Wärme fliesst nur von heiss nach kalt (Physik)
- Wenn alle Puffer gleich warm -> Pumpe steht automatisch
- Eigentliche Aufgabe: Heizstäbe rechtzeitig abschalten, ETA Pumpenlogik nicht stören

### Heizung
- **ETA eSH 27:** Pellets + Scheitholz Kombiheizung
- **Scheitholz:** Startet bei ca. 10% Pufferladung, ETA fragt nach Türöffnung ob Holz eingelegt
- **Scheitholz:** unkontrollierbar sobald brennend, nur Empfehlung möglich
- **Pellets:** ca. 1h Nachlaufzeit nach Sperrung
- **ETA steuert:** Pumpen, Solarthermie Verteilung, Scheitholzprogramm -> wir greifen nicht ein!

### Heizstäbe
- myPV Puffer (3-3.5kW): 672f524463329ad0323012bd
- myPV Warmwasser (3kW): 672f519e00c1de1963ec63db
- Puffer 2 (4.5kW, Shelly Pro3, 3 Relais à 1500W):
  - Relais 1: 672cd496e4b1e4feca2e4b4c
  - Relais 2: 672dccfdc008a5373eadad23
  - Relais 3: 672e09ecbf2027621d498c3c
  - State: solar.puffer2.watt (Summe, in solarmanager.js eingebunden ✓)

### Solar
- **PV:** ca. 17 kWp (Erweiterung auf ca. 30 kWp geplant 2029)
- **Solarthermie:** 3m2, Wärmemengenzähler kommt, lesbar via ETA REST API
- **Batterie:** Victron LiFePO4
- **Solarmanager:** Version 1, IP 192.168.178.36

### Sensoren (nach Umbau)
- Puffer 1a/1b: 5 Temperatursensoren (Schichtung sichtbar)
- Puffer 2: 3 Temperatursensoren
- Ladepumpen: Status via ETA (wird von ETA gesteuert)
- Solarthermie: Wärmemengenzähler via ETA

### Infrastruktur
- **ETA:** IP 192.168.178.5:8080
- **hauspi:** Raspberry Pi, ioBroker (hauspi.local)
- **Dell Latitude 5320:** Ollama + InfluxDB Docker + Grafana Docker (IP 192.168.178.130)
- **InfluxDB:** http://192.168.178.130:8086 (Bucket: wetter, Org: iobroker)
- **Grafana:** http://192.168.178.130:3001
- **Mac Mini M4 (geplant):** Ollama + openclaw → Dell wird damit frei für ioBroker-Umzug

---

## Erledigt
- Solarmanager Script (alle 1 Min, solar.* Datenpunkte)
- ETA Script (alle 5 Min, eta.* Datenpunkte)
- ETA Pellets Logik (Temperatur + PV + Mindestlaufzeit 30 Min)
- Wetterstation Script (Weather Company API, Station IRAUBL19)
- windGust (Windboeen) ins Wetterstation Script ergaenzt (25.05.2026)
- InfluxDB Datenaufzeichnung laeuft (seit 21.05.2026)
- windGust wird in InfluxDB aufgezeichnet (seit 25.05.2026)
- Grafana Dashboard (10 Panels, Wind + Windböe kombiniert ergänzt)
- Weatherunderground Adapter geloescht
- Hydraulik Puffer vollstaendig verstanden und dokumentiert
- ETA Script komplett neu auf Basis eta_menu.xml (05.06.2026)
  - Puffer 1a/b: alle 5 Fühler aktiv (fuehler1-5)
  - Puffer 2 (600L): alle 3 Fühler + Ladung aktiv (oben/mitte/unten)
  - Solar: Vorlauf, Rücklauf, Ertrag heute/gestern, Wärmemenge gesamt
  - Heizkreis HK + FBH: Vorlauf, Rücklauf, Zustand
  - Warmwasser: oben, unten, Soll, Zustand
  - Pellets + Scheitholz: je Rücklauf, Leistung, Energie gesamt, Ertrag gestern, Kesseldruck, Heizbetriebe, Zündungen
  - 50 Datenpunkte aktiv (bestätigt im Log 07.06.2026), Zustand-Felder als String gespeichert
- ETA URI-Korrekturen (07.06.2026, per eta_uri_scan.js bestätigt)
  - Puffer 1 Fühler 2/3/4: node-basierte URIs (/272/10601/0/11328|29|30/0)
  - Puffer 2 mitte: /121/10601/0/11328/0 → 62°C ✓
  - Puffer 2 unten: /121/10601/0/11329/0 → 32°C ✓
  - Alle 50 Datenpunkte liefern plausible Werte
- Solarmanager Script: komplett überarbeitet (07.06.2026)
  - Kritischer Bug behoben: API liefert kein .point Objekt → Script las nie Daten
  - Alle API-Feldnamen korrigiert (pW, pWh, cW, soc, bcW, bdW, devices[])
  - Puffer 2 Heizstab (Shelly Pro3, 3 Relais) eingebunden: solar.puffer2.watt
- InfluxDB ETA Datenpunkte aktiviert via influxdb_setup_eta.js (07.06.2026)
  - 31 States aktiviert (0 Fehler): Tier 1 + Tier 2 + solar.puffer2.watt
  - changesOnly: false → jeden 5-Min-Polling-Wert aufzeichnen
- Telegram Script in eigenes telegram.js ausgelagert (07.06.2026)
  - Vorher: Telegram-Handler war in eta_pellets_logik.js eingebettet
  - Jetzt: 9 unabhängige Scripts, jedes mit eigener Aufgabe:
    1. wetterstation.js — Wetterdaten + Forecast (API-Key jetzt in ioBroker-States)
    2. solarmanager.js — PV, Batterie, Heizstäbe
    3. eta.js — ETA REST API polling (50 Datenpunkte, Haupt-ETA-Script)
    4. eta_pellets_logik.js — Pellets-Steuerungslogik
    5. telegram.js — alle Telegram-Befehle
    6. klima_logik.js — Klimaanlage Schlafzimmer (Midea, noch nicht aktiv)
    7. eta_solar.js — Solarthermie erweiterte Datenpunkte
    8. eta_zirkulation.js — Zirkulation + Warmwasser Ladepumpe
    9. eta_puffer2.js — Puffer2 erweiterte Datenpunkte
   10. eta_scheitholz.js — Scheitholz erweiterte Datenpunkte
   11. puffer2_heizstab_schutz.js — Heizstab Puffer2 Schutzlogik
  - Befehle: /status, /klima, /pellets_ein, /pellets_aus, /pellets_auto, /forecast, /hilfe
  - /status zeigt: Pellets, Puffer 1+2, WW, Außen, PV, Batterie, Heizstab P2, Forecast
  - /klima zeigt: Klimaanlage-Status (aktiv/pause/aus), Raumtemperatur, Laufzeit
  - /forecast zeigt: Morgen + Übermorgen Wetter, PV-Prognose
  - /hilfe und /start: Übersicht aller Befehle
- klima_logik.js komplett neu für Midea umgeschrieben (08.06.2026)
  - Midea-Adapter Device-ID 153931628437826 bestätigt (Screenshots)
  - States: klima.schlafzimmer.aktiv / start_zeit / pause_start / grund
  - Befehle: operationalMode=2 (Cool), targetTemperature=22, powerState
  - NOCH NICHT AKTIV — Midea-Adapter muss erst lauffähig sein
- wetterstation.js: API-Key aus Code entfernt (08.06.2026)
  - API-Key war sichtbar im GitHub → Sicherheitsproblem
  - Jetzt in ioBroker-States: javascript.0.config.wetter.api_key / .pws_id
  - createState() setzt nur Defaultwert wenn State nicht existiert
  - Einmalig im ioBroker-Admin eintragen!
- Pellets-Automatik auf Hinweis-Modus umgestellt (10.06.2026)
  - Entscheidung: Automatik greift NICHT mehr in den ETA ein (kein POST mehr)
  - Stattdessen Telegram-Empfehlung bei Wechsel (sperren/freigeben), Cooldown 30 Min
  - Manuell bleibt: /pellets_ein und /pellets_aus schreiben weiterhin in den Kessel
  - Sicherheit: im Auto-Modus wird eine bestehende Sperre einmalig aufgehoben
    -> keine "vergessene" Dauersperre mehr möglich wenn ioBroker ausfällt
  - Neue States: eta.pellets.empfehlung / empfehlung_zeit
  - /status zeigt jetzt auch die aktuelle Empfehlung
- ETA Sub-Scripts erstellt (08.06.2026) — 4 neue unabhängige Scripts:
  - eta_solar.js: Solar Vorlauf/Rücklauf/Leistung/Ertrag/Kollektorpumpe (6 DP)
  - eta_zirkulation.js: Zirkulation Status/Laufzeit/Pause/Freigabe + WW Ladepumpe (5 DP)
  - eta_puffer2.js: Puffer2 oben/mitte/unten + Ladepumpe + Ladezustand (5 DP)
  - eta_scheitholz.js: Zustand/Isoliertüre/Wärmemenge/Leistung (4 DP)
  - Alle nach gleichem Muster wie eta.js, schedule alle 5 Min
  - HINWEIS: eta.solar.leistung URI (/121/10221/14877/0/2287) noch prüfen!
- InfluxDB komplett auf 66 Datenpunkte erweitert (13.06.2026)
  - Alle 10 Zigbee-Geräte aufgenommen (TH02Z, ZTH05_1, TH01, BHT-002, ZHT-002)
  - 6 Temperatursensoren + 5 Feuchtigkeitssensoren + 2 Thermostat-Temperaturen + 2 Gang-Thermostate
  - influxdb_setup.js ersetzt influxdb_setup_eta.js vollständig
  - Log: "InfluxDB Setup abgeschlossen: 66 aktiviert, 0 Fehler" ✓
- Deploy-System vollständig in Betrieb (13.06.2026)
  - HTTPS Clone (kein SSH-Key nötig), iobroker als Owner
  - deploy_listener.js kann neue Scripts anlegen (setObject mit vollem Script-Objekt)
  - 14 Scripts via /deploy aktualisiert: "Deploy: 14 OK, 0 Fehler" ✓
  - Aktueller SCRIPTS_MAP Stand: wetterstation, solarmanager, eta, eta_pellets_logik,
    telegram, influxdb_setup, eta_uri_scan, eta_zirkulation, eta_puffer2, eta_solar,
    eta_scheitholz, zirkulation_monitor, klima_logik, eta_puffer2_rueckspeisung
- telegram.js /status erweitert (13.06.2026)
  - P1/P2 Temperaturdifferenz (Δ) direkt sichtbar
  - Rückspeisung-Status: wann zuletzt + Grund
  - /p2rueck in /hilfe eingetragen
- puffer2_heizstab_schutz.js entfernt (13.06.2026) — siehe Heizstab Puffer 2 Abschnitt

---

## Einmalige Einrichtung — Deploy (erledigt 13.06.2026)
- [x] Repo auf hauspi geklont: HTTPS (nicht SSH) weil kein SSH-Key für iobroker-User
      git clone https://github.com/glasei81/haussteuerung.git /home/pi/haussteuerung
      sudo chown -R iobroker:iobroker /home/pi/haussteuerung
      sudo chmod o+x /home/pi  (damit iobroker-User /home/pi traversieren darf)
- [x] deploy_listener.js manuell in ioBroker eingespielt ✓
- [x] ioBroker javascript.0 Einstellungen: "Enable Exec" + "setObject erlaubt" aktiviert ✓
- [x] Deploy-System läuft: /deploy per Telegram → git pull + alle 14 Scripts aktualisiert ✓
- [x] Script-IDs in SCRIPTS_MAP geprüft und korrigiert ✓
- HINWEIS: git pull auf hauspi muss als iobroker laufen (Repo gehört iobroker):
      sudo -u iobroker git -C /home/pi/haussteuerung pull
  (nicht als pi — gibt "Keine Berechtigung" Fehler wegen Ownership)

---

## Kurzfristig (naechste Session am PC)
- [x] Grafana Panel Wind + Windböe kombiniert ergänzt ✓
- [x] Tailscale auf hauspi einrichten ✓ (07.06.2026)
      ioBroker erreichbar als http://hauspi:8081 von überall
- [x] Telegram Script überarbeitet ✓ (07.06.2026)
      /hilfe, /klima (Klimaanlage-Status), Forecast-Anzeige robuster
- [ ] Klimaanlage Schlafzimmer aktivieren
  -> Option A: Midea-Adapter (ioBroker.midea-air-conditioner) zum Laufen bringen
  -> Option B: Treppenhaus-Tuya mit eigenem Zigbee-Thermometer ausstatten
  -> klima_logik.js ist fertig, nur Gerät/Sensor-Zuordnung anpassen

---

## Nach Heizungsumbau (Umbau abgeschlossen 07.06.2026)

### ETA Script einspielen + prüfen
- [x] eta.js eingespielt, alle 50 Datenpunkte liefern plausible Werte ✓ (07.06.2026)
- [x] Prüfen ob alle Datenpunkte Werte liefern: 50 Datenpunkte aktiv ✓
- [x] Puffer 1 Fühler 2-4 URI-Korrekturen: node-basierte URIs bestätigt ✓
- [x] Puffer 2 mitte + unten URI-Korrekturen: 62°C / 32°C bestätigt ✓

### Heizstab Puffer 2 (4.5kW)
- [x] Device-ID in Solarmanager identifiziert: 3 Relais (Shelly Pro3) ✓
- [x] In Solarmanager Script eingebunden: solar.puffer2.watt ✓
- [x] puffer2_heizstab_schutz.js ENTFERNT (13.06.2026)
      GRUND: Shelly Pro3 hat keine Leistungsmessung → solar.puffer2.watt las falschen Wert
      (vermutlich PV-Gesamtleistung statt Heizstab) → Fehlalarme + falsche Relais-Abschaltungen
      ENTSCHEIDUNG: ETA und Heizstab haben eigene Hardware-Sicherheitsmechanismen → kein Script nötig
      Heizstab Drehschalter physisch auf 80°C (Hardware-Grenze reicht aus)
- [ ] solar.puffer2.watt Quelle klären: Shelly Pro3 hat keine Messung → Wert kommt woher?
      Evtl. Solarmanager summiert PV-Überschuss als "Heizstab" ohne echte Messung

### Puffer2 → Puffer1 Wärmerückspeisung (13.06.2026 analysiert)
- [x] eta_puffer2_rueckspeisung.js erstellt ✓
      Trigger: puffer2.oben > puffer.fuehler1 + 10°C UND p2 >= 45°C
      Zeitfenster 9-19 Uhr, 2h Cooldown, /p2rueck Telegram manuell
- [x] ETA REST API "Sofort laden" URI analysiert:
      GET /user/var/121/10601/0/0/13025 → scaleFactor=1, Enum: 1802=Aus, 1803=Ein
      POST value=1803&at=0 → ETA antwortet <success> ✓
- [x] GRUNDPROBLEM ERKANNT: "Sofort laden" lädt P2 AUS P1 (nicht umgekehrt!)
      ETA startet Pumpe nur wenn P2 Wärmebedarf hat (P2 < P1) → bei P2 > P1 keine Reaktion
      Direkte Pump-Ausgänge (2130=Ausgang %, 2133=Drehzahlsteuerung) sind read-only / nicht überschreibbar
- [ ] LÖSUNG: Shelly 1PM direkt an der Pumpe zwischen P1 und P2
      → volle Kontrolle unabhängig von ETA-Logik
      → echte Wattmessung (löst solar.puffer2.watt Problem)
      → /p2ein / /p2aus Telegram Befehle
      → Koordination mit Heizungsbauer (hat manuellen Schalter erwähnt)
- Auto-Trigger in eta_puffer2_rueckspeisung.js deaktiviert (15.06.2026)
  Script hat Telegram-Spam verursacht (alle 10 Min bei Δ=34°C) ohne Wirkung
  Reaktivieren wenn Shelly 1PM installiert — schedule-Zeilen nur einkommentieren
- HYDRAULIK KONTEXT: Pumpe zwischen P1 und P2 ist "Pufferladeventil/-pumpe" (/121/10601/0/11157)
  Normale Richtung: P1 → P2 (P2 laden wenn leer)
  Gewünschte Richtung: P2 → P1 (Wärme zurückgeben wenn P2 solar/Heizstab-heiß)
  Physikalisch durch Zirkulation + Thermik möglich, ETA erlaubt es nicht via API

### Ladelogik Erweiterung (nach Datensammlung)
- [ ] Temperaturschwelle definieren ab der alle Heizstäbe abschalten
- [ ] Nur Solarthermie wenn alle Puffer über Schwelltemperatur
- [ ] ETA Pumpenlogik nicht stören

### Scheitholz
- [ ] holz_zustand Werte beobachten: was liefert ETA wenn Holz brennt vs. Bereitschaft?
- [ ] Telegram Kommando /holz_ein dokumentieren

### Pellets
- [ ] Nachlaufzeit ca. 1h beim Sperren berücksichtigen (bereits bekannt)

### Warmwasser-Pumpe (neu, 13.06.2026)
- [ ] Verdacht: Zirkulationspumpe WW verkalkt
      Symptom/Beobachtung: noch unklar — Stefan hat Hinweis gegeben, Details ausstehend
      Mögliche Diagnose via ETA: eta.warmwasser.* Werte beobachten, Pumpen-Zustand prüfen
      Mögliche Diagnose via ioBroker: Zirkulationslog aus eta_zirkulation.js auswerten
      TODO: Stefan beschreibt genauer was er beobachtet hat (Geräusche? Unregelmäßig? ETA-Meldung?)

### Warmwasser Nachtverlust / Schwerkraftbremse (01.07.2026)
- Beobachtung Stefan: WW verliert nachts viel Temperatur (Grafana ~60°C abends → ~46°C morgens).
  Zirkulation ist 22–05 Uhr auf AUS → trotzdem starker Abfall.
- Verdacht: defekte Schwerkraftbremse / Rückschlagklappe → Thermosiphon durch die
  Zirkulationsleitung trotz stehender Pumpe (heiß raus oben, kalt zurück unten).
- [x] zirkulation_monitor.js umgebaut zur Diagnose (01.07.2026, Zeiten korrigiert 03.07.):
      Zirkulation real aus 21:00–05:45 → Snapshot WW oben+unten 21:10 → 05:40 (8,5 h),
      Abkühlrate °C/h + Bewertung. Telegram-Warnung nur wenn Rate > 0,8 °C/h.
      Schwellen: <0,5 normal | 0,5–0,8 erhöht | >0,8 verdächtig.
      Richtwert reiner Dämmverlust ~0,2–0,4 °C/h.
- [x] /wwnacht Telegram-Befehl: letzte Messung auf Abruf.
- [x] rate_nacht + delta_nacht in InfluxDB (Trend in Grafana).
- [ ] Ein paar Nächte Daten sammeln → wenn Rate bestätigt hoch: Schwerkraftbremse in der
      Zirkulationsleitung + Rückschlagklappe an der WW-Ladeleitung mechanisch prüfen
      (verklemmt/verkalkt/fehlt). Heizungsbauer ansprechen.
- [ ] Gegenprobe möglich: eta.warmwasser.unten mit ansehen — wenn unten mitfällt/mitsteigt
      während oben stark fällt = Umwälzung (Thermosiphon), nicht nur Dämmung.

### ETA / myPV Koordination (WW Optimierung)
- [ ] WW Soll URI bestätigt: /121/10111/0/0/12132 (warmwasser.soll bereits geloggt)
- [ ] Logik: wenn PV > X kW UND Batterie > 95%
        -> Telegram-Hinweis: "WW-Soll auf 65°C lohnt sich, myPV übernimmt mit PV-Strom"
        -> KEIN automatischer POST (Entscheidung 10.06.2026: nur Hinweise, kein Eingriff)
  HINWEIS: Beobachtet 28.05.2026 (PV 9613W, Bat 99%, ETA lud trotzdem per Puffer)

---

## Nach Datensammlung (Herbst 2026)

### Wärmebedarf des Hauses ermitteln — Methodik (Konzept 03.07.2026)
GRUNDGLEICHUNG (Energiebilanz um den Puffer, über einen Zeitraum):
    Wärmebedarf(Haus + WW) = Wärme REIN − Änderung Pufferinhalt
  - Wärme REIN = ETA-Kessel (Pellets + Holz) + Solarthermie + Heizstäbe (elektrisch)
  - Pufferinhalt: 3600 L ≈ 4,2 kWh pro 1 K mittlere Puffertemperatur (V × 1,163 Wh/L·K)
  - TRICK: über einen ganzen Tag mit gleicher Puffertemperatur morgens/abends fällt
    der Speicherterm weg → Wärmebedarf ≈ Summe der Zuführungen.

SCHON VORHANDEN (geloggt):
  - eta.pellets.ertrag_heute + eta.holz.ertrag_heute (kWh/Tag, ETA-Wärmemengenzähler)
  - eta.solar.ertrag_heute + eta.solar.waermemenge (kWh, Solar-WMZ)
  - 8 Puffertemperaturen + eta.puffer.ladung (%) → Speicherinhalt
  - wetter.aktuell.temperatur_korrigiert → Ø-Außentemperatur/Tag
LÜCKE:
  - Heizstäbe elektrisch (myPV Puffer/WW, Puffer2 4,5 kW) NICHT sauber gemessen
    → schließt sich mit "Heizstab-Leistungsmessung nachrüsten" (Shelly PM Mini/1PM)
    → in reinen ETA/Solar-Phasen (Kernwinter) stimmt die Bilanz schon jetzt.

BESTE METHODE — Energie-Signatur / Gebäudekennlinie:
  - Tages-Wärmemenge [kWh] gegen Ø-Außentemperatur [°C] auftragen → Gerade
  - Steigung = Wärmeverlust Haus in W/K (reines Heizen)
  - Achsenabschnitt = Warmwasser + konstante Verluste (Regression trennt WW automatisch)
  - Hochrechnung auf Norm-Außentemp (~ −14 °C Raubling/Inntal) → Spitzenlast kW
  - über Gradtage integriert → Jahresheizbedarf kWh (Input für Wind-/PV-Autarkie)
GEGENPROBE (schnell, ungenauer): Puffer-Abkühlung in Phasen ohne Zufuhr = Hausbedarf
  + Puffer-Dämmverlust; nur belastbar wenn HK/FBH-Pumpe fördert.
- [ ] Wenn Heizstab-Messung steht: kleines Script "tägliche Wärmebilanz" → Q_in je Tag
      + Speicheränderung → tägliche Q_verbrauch in eigenen State/InfluxDB, dann Regression.
- [ ] Belastbare Daten erst ab Heizsaison Herbst 2026 (Sommer: keine Wärmeanforderung).

### Brauchwasser-Verbrauch erfassen (Konzept 03.07.2026)
Stefan: aktuell kein Überblick über Kalt- noch Warmwasserbezug.
WICHTIG: für die Heizkennlinie NICHT nötig (WW = Achsenabschnitt der Regression).
Nur wenn WW separat beziffert werden soll:
  a) Kaltwasser gesamt: Impuls-/Optokopf auf vorhandenen Hauswasserzähler (~15–30€) → Liter/ioBroker
  b) WW-Anteil: eigener Impuls-Wasserzähler am Kaltwasser-Zulauf des WW-Speichers
     → WW-Energie = Liter × 1,163 Wh/(L·K) × (T_WW − T_kalt)
     Bsp: 1000 L von 12→50°C = 44 kWh; Haushalt ~30–50 L warm/Person/Tag
  c) Zero-Hardware-Schätzung: aus eta.warmwasser.oben/unten (schon geloggt) die
     Nachladungen aufsummieren → grobe kWh/Tag. Braucht WW-Speichervolumen von Stefan.
     WW-Verbrauch = Nachladung − Standby-Verlust (Standby aus Schwerkraftbremsen-Monitor).
- WW-Speicher bekannt (05.07.2026): Sieger WM 406 Sky, 385 L, Datenblatt-Standbyverlust
  2,5 kWh/24h, Zul. 95°C, NL nach DIN 11/3.
- BEFUND: gemessener Nachtverlust 1,18 °C/h → RATE ~12–13 kWh/Tag-äquivalent = ~5× des
  Datenblatt-Standbys (2,5 kWh/24h). Starker Beleg für defekte Schwerkraftbremse.
  ABER Vorsicht bei der Jahressumme: die hohe Rate gilt nur nachts (Zirkulation aus,
  8,5 h). Tatsächlicher Verlust im Nachtfenster ~3–4,5 kWh, davon Mehrverlust (über
  Normal-Standby) ~2,5–3,5 kWh/Nacht → grob 900–1300 kWh/Jahr Mehrverlust durch die
  Bremse. NICHT die 24h-Hochrechnung × 365 (das wäre zu viel — tagsüber läuft die
  Zirkulation ohnehin gewollt). Über mehrere Nächte bestätigen.
  Monitor zeigt kWh in /wwnacht + Warnung (24h-Hochrechnung als Raten-Vergleich).
- MASSNAHME 05.07.2026: Stefan hat die Rücklaufsicherung an der Zirkulationspumpe
  ausgebaut + entkalkt.
- ERGEBNIS 06.07.2026 (erste Nacht danach): ERFOLG.
  VORHER 05.07.: 59→49°C oben (Δ10), 1,18 °C/h, VERDÄCHTIG, ~12,6 kWh/Tag.
  NACHHER 06.07.: 58→54°C oben (Δ4) / 36→30 unten, 0,47 °C/h, „normal", ~6,3 kWh/Tag.
  → Rate mehr als halbiert, Speicher hält oben die Wärme → Thermosiphon gestoppt.
  RESTBEFUND: kWh (6,3) noch über Datenblatt (2,5), aber real-world-nah; über
  weitere Nächte beobachten ob es sich noch tiefer einpendelt.
- INTERPRETATIONS-CAVEAT (Hinweis Stefan): der 2-Schnappschuss-Monitor kann eine
  nächtliche WW-Zapfung NICHT von Standby-Verlust unterscheiden → Zapfnächte sehen
  schlechter aus. Zapfung macht Verlust nur größer, nie kleiner → wahrer Standby =
  NIEDRIGSTE Nacht über mehrere Wochen (der „Boden"). Einzelnächte nicht überbewerten.
  (Signatur einer Zapfung: unten fällt mehr als oben, da Kaltwasser unten nachströmt.)
  Fenster bewusst NICHT auf tiefe Nacht verlegt — Stefan will es so lassen.
- WASSERSTATISTIK (Stand 05.07.2026, aus externer App-CSV):
  - 3 „Zähler" (Hausanschluss Alt / Wasser / Kaltwasser) = NACHEINANDER derselbe
    Hauptzähler (Zählerwechsel, alter Streit mit Wasserwerk), KEINE Unterzähler.
    → weiterhin nur Gesamt-Hauswasser, KEIN separater Warmwasser-Anteil messbar.
  - Aktueller Kaltwasser-Zähler (seit 12.02.2025): 01.07.2025 = 62,4 m³ →
    05.07.2026 = 239,9 m³ ⇒ ~177 m³ in 369 Tagen = ~480 L/Tag ⇒ ~175 m³/Jahr.
  - 7-Personen-Haushalt (inkl. Opa/Oma): ~69 L/Person/Tag = ~55 % des dt. Schnitts
    (~125 L) → sehr sparsam (Landhaushalt, evtl. Brunnen für Garten/WC).
  - Alter Zähler lag höher (~530 L/Tag), Verbrauch also leicht gesunken.
  - NUTZUNG: nur als grobe Obergrenze für WW (WW ~⅓ vom Gesamt → grob ~160 L/Tag warm).
- [ ] WW-Verbrauchsschätzung (Script c): aus warmwasser.oben/unten Nachladungen × 385 L
      → grober Tages-WW-Verbrauch, Standby (Datenblatt/Monitor) abziehen. /ww möglich.
      Gelegentliche manuelle Zählerablesung als Eichpunkt.
- NEU 07.07.2026: es GIBT doch Unterzähler! Familie 1.OG (Verena+Stefan+Kinder, 5 Pers.)
  hat eigenen KALT- und WARM-Wasserzähler. Damit ist WW echt MESSBAR (nicht nur schätzen).
  - Historie (22.02.25→31.01.26): Warm 26,7 m³ (~78 L/Tag), Kalt 52,9 m³ (~154 L/Tag),
    WW-Anteil ~34 %, ~46 L/Person/Tag → WW-Energie Familie ~3,4 kWh/Tag ≈ ~1250 kWh/Jahr.
  - EG (Eltern + Pool etc.) = Hauptzähler − Familie (kein Pro-Kopf, Pool inkl.).
- wasser_zaehler.js (NEU): /zaehler <Haupt> <Kalt> <Warm> speichert Stände, rechnet
  Verbrauch seit letzter Ablesung (Familie/EG/WW-kWh/Person), loggt in InfluxDB.
  Erinnerung 1. + 15. jeden Monats. Baseline 07.07.2026: Haupt 241,151 / Kalt 784,743 /
  Warm 455,608 m³. WW-Energie mit Annahme ΔT 38K (WW 50° − Kalt 12°).
- [ ] (optional) Impulskopf/Optokopf an den Zählern → automatisch statt manuell.
- WASCHMASCHINE-KORREKTUR (07.07.2026): WM (OG, 2×/Tag) hängt NICHT am Familien-
  Kaltzähler → läuft über Haupt und landet fälschlich im EG-Topf. Macht Familie zu
  niedrig (~46 L/P/Tag) und EG zu hoch. AEG-Handbuch: 45–85 L/Waschgang
  (Baumwolle ~80, Pflegeleicht 50, Fein 45, Wolle 65). AEG-App kann nur
  Betriebsstunden (nicht Liter). Grobe Korrektur ~150 L/Tag (2×75).
- ENTSCHEIDUNG Stefan: ZWEI ungeeichte Kaltwasserzähler (~27€/Stk, 25mm) —
  je einer für Waschmaschine UND Pool getrennt. WM ist das Wichtigste, Pool extra
  für Entscheidung Brunnenwasser(+Chemie) vs. Leitung(ohne Chemie).
  - [ ] wenn eingebaut: /zaehler auf 5 Werte (Haupt Kalt Warm WM Pool):
        Familie-Wohnung = Kalt+Warm (+WM = Familien-Waschwasser),
        Pool = eigener Topf (Leitungs-Anteil, für Kostenvergleich),
        EG-Wohnung = Haupt − Familie − WM − Pool (jetzt ehrlich).
        HINWEIS: Pool-Zähler erfasst nur LEITUNGS-Füllung, nicht Brunnen.

- [ ] Abkuehlkurve aus InfluxDB berechnen (Teil obiger Methodik)
  - Grad/h Abkuehlung pro Aussentemperaturbereich
  - Tabelle: 0-5 / 5-10 / 10-15 / 15-20 Grad Aussen
  - ACHTUNG: Sommer-Daten nicht belastbar (keine Waermeanforderung)
  - Belastbare Daten erst ab Heizsaison Herbst 2026
- [ ] Forecast in Hinweis-Logik einbauen
  - Empfehlungsschwelle dynamisch (40 vs 55 Grad je nach Morgen-Forecast)
  - Tagesplanung taeglich 06:00 Uhr per Telegram
- [ ] Scheitholz-Empfehlung per Telegram
  - Wenn 2 Tage schlechtes Wetter (UV < 4, Regen > 50%)
  - Morgens automatische Nachricht: Heute Scheitholz empfohlen

---

## Ganzes Haus — Sensorik & Raumklima

### Zigbee Raumthermostate — IST-Stand
- 1. OG Fußbodenheizung: 2 Zigbee-Thermostate bereits in ioBroker sichtbar und schaltbar ✓
- Einzelne Räume: Zigbee Temperatursensoren vorhanden (nur messen, nicht schalten)
- Temperatursensoren als Korrekturquelle nützlich (TRV-Sensor sitzt ungünstig direkt am Heizkörper)

### Raumtemperaturgeführte Heizkurvenkorrektur (mittlere Priorität)
- [ ] Zigbee Raumtemperaturen zur Korrektur des ETA Vorlauf-Sollwerts nutzen
  - Konzept: Raumtemp > Soll + X°C → FBH/HK Vorlauf-Soll um kleine Offsets absenken (±3°C)
  - Sonneneinstrahlung (wetter.aktuell.solar) als vorausschauender Indikator (>200 W/m² für 30+ Min)
  - FBH und HK separat (FBH träger, 30-60 Min Reaktionszeit → konservativere Korrekturen)
  - Nur absenken, nie aggressiv erhöhen — ETA's Witterungsführung bleibt Basis
  - Mindest-Vorlauf FBH: ~25°C (nicht unterschreiten)
- [ ] Voraussetzung: ETA URIs für HK-Vorlauf-Soll + FBH-Vorlauf-Soll identifizieren (curl/eta_uri_scan.js)
- [ ] Beobachtungsphase zuerst: wie stark überhitzen Räume an sonnigen Wintertagen?
  - Belastbare Daten erst ab Heizsaison Herbst 2026
  - Wenn Überhitzung regelmäßig >1-2°C über Soll → Script lohnt sich

### TRVs für EG Heizkörper (IN UMSETZUNG seit 03.07.2026)
- Sonoff TRVZB, insgesamt 4 Stück geplant, direkt am Zigbee-Adapter (kein z2m).
- Adapter erstellt States automatisch → KEIN eigenes Polling-Script nötig,
  nur enableHistory in influxdb_setup.js freischalten (wie andere Zigbee-Sensoren).
- Benennung: jedes Gerät im Zigbee-Adapter benennen wie die anderen (Klartext, kein Alias).
- IST-Stand 03.07.2026 (States per Screenshot bestätigt):
  - #1 angelernt: 0x983268fffe97aab4 → Raum "Gang EG"
  - #2–#4: folgen, gleiche Behandlung
- WICHTIG: TRVZB liefert KEINEN pi_heating_demand / keinen Live-Ventilwert!
  valve_opening_degree / valve_closing_degree (=100%) sind Konfig-Hubgrenzen, keine
  Momentanstellung. Einziger Live-Wärmebedarf = running_state (idle/heat, Text).
- Aufzeichnen — je TRV (erledigt für Gang EG, 03.07.2026):
  - local_temperature — Ist (OPT_NORMAL)
  - occupied_heating_setpoint — Soll (OPT_COUNTER, ändert selten)
  - battery — % (OPT_COUNTER)
  - javascript.0.trv.<raum>.heizt — 1/0 aus trv_heizkoerper.js (running_state gespiegelt)
    → über die Saison = Heizquote je Raum (% der Zeit geheizt), Wärmebedarf-Proxy
- trv_heizkoerper.js erstellt: spiegelt running_state (Text) auf numerisch 1/0.
  Neuen TRV ergänzen: eine Zeile in TRVS[] (id+raum+name) + 4 IDs in influxdb_setup.js.
- Ziel (später, nach Datensammlung): heizt-Quote aller 4 Räume als Wärmebedarf-Signal
  in die ETA-Vorlauflogik (siehe Abschnitt Heizkurvenkorrektur). AKTUELL: nur beobachten.
- HINWEIS TRVZB: Interview-Warnungen "customSonoffTrvzb ... Value is not a number" sind
  harmloses Firmware-Rauschen, solange die Kernwerte kommen.
- HINWEIS: ETA steuert Pumpen selbst -> TRV nur Ventil, nicht Pumpe!
- später: Ventil zu wenn Fenster offen (open_window vorhanden); Eco-Temp bei Abwesenheit

### Fußbodenheizung OG Logik (niedrige Priorität)
- [ ] Eco-Modus Logik für vorhandene Zigbee-Thermostate OG
  - Anwesenheitserkennung -> Thermostate auf Eco wenn niemand zuhause
  - Nacht-Absenkung automatisch (z.B. 22:00-06:00)

### Fensterkontakte
- [ ] Tür-/Fensterkontakte Zigbee (Aquara, Sonoff ~8€/Stück)
  - Datenpunkt: zigbee.fenster.wohnzimmer / schlafzimmer / etc.
  - Logik: TRV Ventil schließen wenn Fenster > 3 Min offen
  - Logik: Telegram Warnung wenn Fenster offen + Außentemp < 5°C

### Anwesenheitserkennung
- [ ] Presence Detection Konzept definieren
  - Option A: Handy-IP im WLAN (ioBroker Network-Checker Adapter)
  - Option B: Zigbee Bewegungsmelder Haupträume
  - Option C: Kombination für zuverlässige Erkennung
  - Logik: Niemand zuhause > 30 Min -> Eco Modus (TRVs auf 18°C)
  - Logik: Jemand kommt heim -> normale Solltemperatur + Telegram Hinweis

### CO2 / Luftqualität
- [ ] CO2 Sensor 1-2 Räume (Wohnzimmer, Schlafzimmer)
  - Zigbee CO2 Sensor (z.B. Sonoff SNZB-06P mit CO2) oder SCD40-basiert
  - Datenpunkt: zigbee.co2.wohnzimmer (ppm)
  - Schwellen: >1000ppm Warnung, >1500ppm Telegram Alert
  - Korrelation mit Heizung: CO2 hoch + Fenster zu = Lüftungsempfehlung

### Feuchte & Taupunkt
- [ ] Prüfen ob vorhandene Zigbee Thermometer Feuchte messen (viele haben sie!)
  - Falls ja: Datenpunkte bereits vorhanden, nur noch ioBroker Datenpunkt anlegen
  - Taupunkt berechnen: dp = T - ((100 - rH) / 5) [vereinfacht]
  - Datenpunkt: zigbee.taupunkt.wohnzimmer etc.
  - Alarm: Wandtemperatur < Taupunkt + 2°C -> Schimmelgefahr

### Steckdosen-Verbrauch (Lastverschiebung)
- [ ] Smarte Steckdosen für große Verbraucher (Zigbee oder Tasmota)
  - Waschmaschine / Trockner: Einschalten nur bei PV-Überschuss > 2kW
  - Datenpunkt: solar.pv.watt bereits vorhanden -> direkt nutzbar
  - Logik: solar.pv.watt > 2000 UND solar.batterie.soc > 80 -> Freigabe
  - HINWEIS: Klimaanlagen laufen bereits über Solarmanager

### ETA Heizkreis (erledigt im Script)
- [x] HK Vorlauf/Rücklauf/Zustand: eta.hk.vorlauf / ruecklauf / zustand ✓
- [x] FBH Vorlauf/Rücklauf/Zustand: eta.fbh.vorlauf / ruecklauf / zustand ✓
- [ ] Heizkreis-Pumpen Status beobachten wenn Heizperiode startet

### Gesamtes Regelkreis-Konzept (Ziel)
- [ ] Implementierungsreihenfolge festlegen wenn Komponenten bereit:
  1. Forecast (bereits vorhanden) -> PV-Prognose
  2. PV-Prognose + Batterie -> Puffer-Lade-Entscheidung (Pellets ja/nein)
  3. Raumtemperaturen (TRVs) -> Heizbedarfs-Erkennung
  4. Heizkreis-Vorlauf -> Abkühlkurve dynamisch anpassen
  5. Anwesenheit -> Eco-Modus automatisch
  6. Alle Daten -> tägliche Zusammenfassung 18:00 per Telegram

---

## Hardware Upgrade — ioBroker Umzug auf Dell (geplant)

**Ziel:** Mac Mini M4 übernimmt Ollama/openclaw → Dell Latitude 5320 wird frei → ioBroker von hauspi (Raspberry Pi) auf Dell umziehen.

**Vorteile:** Mehr RAM, x86 = stabiler, kein Speicherproblem mehr.

### Vorgehen
- [ ] Mac Mini M4 kaufen + Ollama/openclaw umziehen
- [ ] ioBroker frisch auf Dell installieren (NICHT 1:1 ARM→x86 Restore, native Module inkompatibel)
- [ ] Backup via backitup auf hauspi erstellen (läuft bereits)
- [ ] Adapter-Konfiguration aus Backup importieren
- [ ] Scripts kommen aus Git → kein Verlust

### Fallstricke
- **Zigbee USB-Dongle — zwei Optionen:**
  - **Option A (einfach):** Dongle physisch zum Dell mitnehmen. Persistenter Pfad:
    `/dev/serial/by-id/usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_...-if00-port0`
    (steht im ioBroker-Log beim Zigbee-Adapter-Start)
  - **Option B (besser für Signal):** Raspi bleibt als **ioBroker Multi-Host Slave** im 1. OG,
    Dongle bleibt am Raspi. Dell = Master, Raspi = Slave mit nur `zigbee.0`.
    Vorteil: Bessere LQI (Dongle näher an Thermostaten), Raspi bekommt neue Aufgabe.
    Einrichtung: Admin → System → Multi-Host → auf beiden aktivieren → Raspi als Host
    hinzufügen → zigbee.0 auf Raspi-Host verschieben.
    Alternative zu Multi-Host: zigbee2mqtt auf Raspi + MQTT-Adapter auf Dell (robuster,
    bessere Geräteunterstützung, aber Zigbee-Geräte müssen neu angelernt werden).
- **Shelly MQTT** — 7 Geräte total, noch nicht alle in MQTT eingebunden:
  Nur eingebundene Geräte müssen nach Umzug in der Shelly Web-UI auf neue IP zeigen.
  Einfachste Lösung: Dell bekommt gleiche statische IP wie hauspi → nichts ändern nötig.
- **InfluxDB wird localhost** — Adapter-Config: `192.168.178.130:8086` → `localhost:8086`
- **Hostname** — einfachste Lösung: Dell bekommt Hostname `hauspi` → `hauspi.local` bleibt gültig, Tailscale-Referenzen passen
- **systemd NTP-Override** (`After=time-sync.target`) — Dell hat Hardware-RTC, wahrscheinlich nicht nötig
- **Parallel betreiben** bis alles auf Dell bestätigt läuft, dann Pi abschalten

---

## Laengerfristig / Ideen
- [ ] Heizstab Leistungsmessung nachrüsten (niedrige Priorität, Kosten)
  - ANSATZ SCHALTZUSTAND (Idee Stefan 03.07.): ohmscher Stab = feste Leistung. Bei
    Relais-Schaltung reicht Schaltzustand × bekannte kW × Zeit = kWh (Pro3 meldet
    Relais-Zustände selbst → 0 € Hardware). Stäbe: einer 1 kW/Phase, einer 1,5 kW/Phase.
  - HAKEN (Stefan): stab-eigener Thermostat/STB kann bei Zieltemp auftrennen, während
    das Relais ZU bleibt → Zustandsmethode überzählt genau am Temperaturlimit.
    → Saubere Lösung: STROM messen (0 A wenn Thermostat auf) statt nur Zustand.
    → In der Praxis tritt der Fehler nur nahe Abschalttemp auf; beim PV-Laden nimmt die
      Steuerung das Relais meist vorher weg → Zustandsmethode als 1. Schritt oft ok.
  - myPV MODULIERT (0–100 %) → ein/aus sinnlos, ABER myPV misst selbst.
    PRÜFEN: liefert der Solarmanager die myPV-Leistung bereits? Dann für die myPV-Stäbe
    KEIN Shelly nötig → statt "6 Shellys" real nur Puffer 2 (3 Phasen).
  - OFFEN Stefan: welche Stäbe hängen an Relais (ein/aus) vs. myPV (moduliert)?
  - Puffer 2 (Shelly Pro3, 3 × 1500W): Pro3 bleibt für Schalten, 3× Shelly PM Mini Gen3 (~15€/Stück) für Messung je Phase
    ODER: Pro3 ersetzen durch 3× Shelly Plus 1PM (Schalten + Messen in einem)
  - Puffer 1 (myPV, 3-3.5kW): myPV schaltet selbst → 1× Shelly 1PM/EM nur für Monitoring
  - Nutzen: solar.puffer2.watt liefert dann echte Werte (aktuell falsch/Solarmanager-Summenwert)
  - Nutzen: puffer2_heizstab_schutz.js reaktivierbar (wurde wegen falscher Messung entfernt)
  - Nutzen: Grafana Heizstab-Leistung sauber trackbar
  - Zähler: Diehl Metering HYDRUS Type 173, SN 3124653, Baujahr 2024
  - IrDA-Fenster am Gehäuse bestätigt ✓
  - Hardware vorhanden: ESP32-CAM (kein USB-Host, aber UART-Pins verfügbar)
  - Bestellen: Optischer UART-Lesekopf TTL 3.3V SML (~15-20€, NICHT USB-Variante)
  - Setup: ESPHome auf ESP32-CAM flashen
    → sml-Komponente liest SML-Protokoll vom UART
    → Werte per MQTT an ioBroker (mqtt-Adapter bereits vorhanden?)
  - Liefert: Zählerstand m³, Momentanverbrauch m³/h
- [ ] Eigener ioBroker Adapter mit Installationsassistent
  - Wizard fuehrt einmalig durch alle benoetigten Werte
    (Device-IDs, IPs, API Keys, Temperaturschwellen)
  - Werte werden direkt in ioBroker Datenpunkte geschrieben
  - Kein manuelles Eintragen mehr in ids_keys.md noetig
  - Vorbild: klassischer Setup-Wizard, Schritt fuer Schritt
- [ ] ioBroker VIS-2 Dashboard (Drill-Down Konzept) — Stefan spielt sich ein (15.06.2026)
  - Statusleiste oben: Außentemperatur, Wind, PV-Leistung immer sichtbar
  - Hauptnavigation: Heizung | PV | Klima
  - Heizung-View: Puffer Temp/Ladung, WW, Pellets-Status, Thermostate OG
  - PV-View: Erzeugung heute, Aktuell, Batterie SOC, Heizstäbe
  - Klima-View: Außen/Innen Temperaturen, Forecast, Windstatistik
  - Alle Datenpunkte bereits in ioBroker vorhanden -> direkt lesbar
  - Läuft im Browser, mobiletauglich (kein eigener Server noetig)
- [ ] PWA Haussteuerung (Idee, nach VIS-2)
  - Eigene HTML/JS App auf hauspi wenn VIS-2 zu limitiert
  - Volle Kontrolle über Design und Logik
- [ ] Scheitholz Priorisierung (Scheitholz gratis vs Pellets Kosten)
  - Scheitholz + PV maximieren, Pellets nur wenn noetig
- [ ] Grafana erweitern
  - Alle Puffer Temperaturen (Schichtung visualisieren)
  - Solarthermie Ertrag
  - Heizkosten-Tracking (Pellets vs Scheitholz vs PV)
- [ ] OpenClaw/Sepp Zugang zur Haussteuerung via Telegram
- [ ] Klimaanlage Schlafzimmer (Midea/NetHome Plus) in ioBroker einbinden
  - Tuya-Gerät (Treppenhaus): bereits in ioBroker ✓, braucht noch eigenes Zigbee-Thermometer
  - Midea Schlafzimmer: ioBroker.midea-air-conditioner Adapter prüfen/installieren
    -> Repo: https://github.com/nbogojevic/midea-beautiful-air (geprüft, vielversprechend)
    -> Sobald Adapter läuft: klima_logik.js auf Midea-States umschreiben (einfach)
  - klima_logik.js ist fertig (Logik, Energiesperre, WW-Vorrang, 2h/1h Zyklus)
  - Solarmanager trackt bereits Verbrauch beider Geräte
  - Ziel: PV-Ueberschuss -> Klimaanlage automatisch ein
  - Ziel: Winter-Waermepumpen-Modus bei milden Temps (>5 Grad) effizienter als Pellets
- [ ] Victron SmartShunt/Multiplus 2 Integration
- [ ] Hoymiles HMS-1600 Integration (West-Wand Panels)
- [ ] PV Erweiterung 2029 (ca. 30 kWp) in Logik beruecksichtigen
- [ ] Windkraft SkyWind NG Autarkie-Analyse (ab Mai 2027 auswertbar)
  - ZIEL: Winterzukauf von ~1300 kWh auf unter 400 kWh reduzieren
    -> 100% Autarkie nicht realistisch (System zu traege)
    -> ~900 kWh Winterertrag aus Wind wuerde das Ziel erreichen
    -> Sommer (April-Oktober): PV Ueberschuss, Wind nicht noetig
    -> Winter (Oktober-April): Wind ergaenzt PV perfekt
  - TH Rosenheim Studie 2022 bereits vorhanden (docs/)
    -> Kleine Anlagen (<30kW): PV wirtschaftlicher (9 vs 11.7 ct/kWh)
    -> Aber: Wind liefert genau dann wenn PV schwach ist (Winter/Nacht)!
  - Auswertung ab Mai 2027 aus InfluxDB:
    -> Schritt 1: Wintermonate Oktober-April filtern
    -> Schritt 2: Weibull-Verteilung Wintermonate berechnen
    -> Schritt 3: Leistungskurve SkyWind NG x Windstunden = Winterertrag
    -> Schritt 4: Ergebnis > 900 kWh -> lohnt sich, < 900 kWh -> nicht
  - Erler Wind aus Richtung Erl/Kufstein (Suedost), ca. 1/3 des Jahres
    -> Windrichtung Suedost aus InfluxDB separat auswerten
    -> Rechtlich: Inntal-Sued Landschaftsschutzgebiet, Einzelfallpruefung bis 50m
- [ ] Klimastatistik Langzeit-Tracking (eigene Klimastation Raubling)
  - Ziel: Unabhaengige Langzeitdaten, gratis APIs speichern nur ~3 Monate
  - Jahresmitteltemperatur je Kalenderjahr (Trend ueber Jahre)
  - Monatsmittel Temperatur (saisonale Verschiebungen erkennbar)
  - Jahresniederschlag gesamt + Monatswerte
  - Starkregenereignisse zaehlen (precipRate > 10mm/h)
  - Windstatistik jaehrlich
  - Telegram /klima Befehl: Jahresmittel Temp, Niederschlag, Starkregen, Windmittel
- [ ] Jahresdurchschnitt Aussentemperatur (ab Mai 2027 aussagekraeftig)
