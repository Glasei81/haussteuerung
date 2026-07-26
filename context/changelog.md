# Changelog — Haussteuerung Raubling

Chronologische Entwicklungshistorie. Jede Session mit Datum und Inhalt.

---

## 21.05.2026 — Projektstart
- InfluxDB Datenaufzeichnung gestartet (Bucket: wetter, Org: iobroker)
- Grundinfrastruktur: hauspi (ioBroker), Dell Laptop (InfluxDB + Grafana)

## 25.05.2026
- windGust (Windböen) ins Wetterstation Script ergänzt
- windGust wird in InfluxDB aufgezeichnet

## 26.05.2026 — Kontext-Ordner erstellt
- context/ Ordner mit Todo, Notes, IDs angelegt
- Prinzip "Files over Tools" definiert

## 28.05.2026
- Beobachtung: PV 9613W, Batterie 99%, ETA lud trotzdem über Puffer (nicht via myPV)
  → Erkenntnis: WW-Optimierung via ETA-POST wäre möglich, aber Entscheidung dagegen (nur Hinweise)
- Puffer 1 Schichtung dokumentiert:
  Fühler 1: 66°C / 2: 64°C / 3: 53°C (Thermokline) / 4: 47°C / 5: 46°C → 36% Ladung

## 05.06.2026
- ETA Script komplett neu auf Basis eta_menu.xml analysiert

## 07.06.2026 — Heizungsumbau abgeschlossen, großes Update
- eta.js neu: 50 Datenpunkte, alle Fühler aktiv, URI-Korrekturen (node-basierte URIs)
  - Puffer 1 Fühler 2/3/4: /272/10601/0/11328|29|30/0
  - Puffer 2 mitte + unten: /121/10601/0/11328|29/0
- Solarmanager Script kritischer Bug behoben: API-Feldnamen korrigiert, Script las nie Daten
- Puffer 2 Heizstab (Shelly Pro3, 3 Relais) eingebunden: solar.puffer2.watt
- InfluxDB: 31 ETA States aktiviert via influxdb_setup_eta.js
- Telegram Script in eigenes telegram.js ausgelagert (war in eta_pellets_logik.js)
- Weatherunderground Adapter gelöscht
- Tailscale auf hauspi eingerichtet (http://hauspi:8081 von überall)
- puffer2_heizstab_schutz.js erstellt (Schutzlogik 65°C)
- 4 ETA Sub-Scripts erstellt: eta_solar, eta_zirkulation, eta_puffer2, eta_scheitholz
- URI-Korrekturen per eta_uri_scan.js bestätigt, alle 50 DP liefern plausible Werte
- Abkühlkurve erster Datenpunkt: 43,8°C → 40,8°C in 13h bei 20–27°C Außen = 0,23°C/h

## 08.06.2026
- klima_logik.js komplett neu für Midea Schlafzimmer (153931628437826)
  States: klima.schlafzimmer.aktiv / start_zeit / pause_start / grund
  NOCH NICHT AKTIV — Midea-Adapter muss erst laufen
- wetterstation.js: API-Key aus Code entfernt → ioBroker-States

## 10.06.2026 — Pellets-Automatik Entscheidung
- Pellets-Automatik auf Hinweis-Modus umgestellt (kein automatischer ETA-POST mehr)
  Hintergrund: ETA steuert Heizung selbst, Automatik-Eingriff birgt Risiko
  Neue Logik: Telegram-Empfehlung bei Wechsel, /pellets_ein und /pellets_aus manuell
  Sicherheit: Auto-Modus hebt vergessene Sperre einmalig auf

## 13.06.2026 — Deploy-System + InfluxDB komplett + Puffer2 Analyse
- **Deploy-System vollständig in Betrieb**
  - HTTPS Clone (kein SSH-Key nötig für public repo)
  - sudo chown -R iobroker:iobroker /home/pi/haussteuerung
  - ioBroker javascript.0: "Enable Exec" + "setObject erlaubt" aktiviert
  - deploy_listener.js kann neue Scripts anlegen (setObject mit vollem Script-Objekt)
  - 14 Scripts via /deploy: "Deploy: 14 OK, 0 Fehler" ✓
  - git pull immer als iobroker: sudo -u iobroker git -C /home/pi/haussteuerung pull

- **InfluxDB auf 66 Datenpunkte erweitert**
  - Alle 10 Zigbee-Geräte aufgenommen (TH02Z, ZTH05_1, TH01, BHT-002, ZHT-002)
  - influxdb_setup.js ersetzt influxdb_setup_eta.js vollständig
  - Log: "InfluxDB Setup abgeschlossen: 66 aktiviert, 0 Fehler" ✓

- **ETA Puffer2 "Sofort laden" analysiert**
  - URI: /121/10601/0/0/13025, Enum: 1802=Aus, 1803=Ein
  - POST value=1803&at=0 → ETA antwortet <success>
  - ABER: ETA startet Pumpe nur wenn P2 Wärmebedarf hat (P2 < P1)
    → bei P2 > P1 (unserem Szenario) keine Reaktion → Pumpe bleibt aus
  - Ausgang (2130) und Anforderung (2130, 2133) sind read-only / ETA-intern gesteuert
  - LÖSUNG: Shelly 1PM direkt an der Pumpe (noch offen, Koordination Heizungsbauer)

- **eta_puffer2_rueckspeisung.js erstellt**
  Trigger automatisch (P2 > P1 + 10°C, nur 9–19 Uhr, 2h Cooldown) + /p2rueck manuell
  Solange ETA kooperiert — bei P2 > P1 keine Wirkung ohne Shelly

- **puffer2_heizstab_schutz.js entfernt**
  Shelly Pro3 hat keine Leistungsmessung → solar.puffer2.watt las falschen Wert
  → Fehlalarme und falsche Relais-Abschaltungen
  ETA + Heizstab-Hardware haben eigene Sicherheiten → Script redundant und fehlerhaft

- **telegram.js /status erweitert**
  P1/P2 Temperaturdifferenz (Δ) direkt sichtbar
  Rückspeisung-Status: wann zuletzt + Grund
  /p2rueck in /hilfe

## 01.07.2026 — Außentemperatur-Korrektur + WW-Nachtverlust-Diagnose
- **Korrigierte Außentemperatur** (wetterstation.js)
  Neuer State wetter.aktuell.temperatur_korrigiert = Median aus ETA / Fensterfront Nord /
  Fensterfront Süd / Wetterstation. Median wirft Ausreißer (Süd-Sonne, Betondach-Bias der WS)
  automatisch raus. Plausibilitätsgrenze -40..60°C gegen defekte Sensoren.
  Fensterfront Süd war defekt (~10°C), Sensor getauscht → wieder als 4. Quelle aktiv.
  /status "Außen" zeigt den korrigierten Wert. In InfluxDB aufgezeichnet.
- **Schwerkraftbremsen-Diagnose Warmwasser** (zirkulation_monitor.js neu aufgebaut)
  Beobachtung: WW fällt nachts ~60→46°C obwohl Zirkulation 22–05 aus ist.
  Verdacht: defekte Schwerkraftbremse → Thermosiphon durch Zirkulationsleitung.
  Monitor misst jetzt WW oben+unten 22:10→04:50 (pumpenloses Fenster), Rate °C/h + Bewertung.
  Telegram-Warnung nur wenn Rate > 0,8 °C/h (normal ~0,2–0,4). /wwnacht für Abruf.
  rate_nacht + delta_nacht in InfluxDB für Grafana-Trend.
- **Log-Analyse 03.07.2026**: alte Monitor-Version maß 01:00=54°C → 05:40=49°C = 5°C /
  4,67h ≈ 1,07 °C/h → bestätigt Schwerkraftbremsen-Verdacht (weit über Normal).

## 03.07.2026 — klima_logik robuster (Log-Analyse)
- **Midea offline abgefangen** (klima_logik.js)
  Log war voll mit "State midea.0.153931628437826.powerState not found" — Gerät nicht
  erreichbar, States fehlten. Automatik prüft jetzt existsState() und pausiert sauber,
  meldet einmalig per Telegram (offline + wieder-online), statt alle 5 Min zu spammen.
- **Anti-Takt** (klima_logik.js + klima_treppe.js)
  Netto-Leistung ist als 5-Min-Momentanwert extrem verrauscht (−7700 … +8137 W durch
  Lastspitzen). Alte Logik schaltete auf Einzelspitzen → EIN/AUS/EIN im 10-Min-Takt.
  Neu: Energie-Sperre entprellt (erst nach 2 Zyklen), Sperren greifen erst nach 20 Min
  Mindestlaufzeit, jede Nicht-Komfort-Abschaltung setzt 1h Pause → kein Kurztakten mehr.

## 03.07.2026 — TRV #1, Windrichtung, korrigierte Außentemp
- **TRV „Gang EG"** (Sonoff TRVZB) angelernt + geloggt: Ist/Soll/Batterie direkt,
  heizt (1/0) aus neuem trv_heizkoerper.js (running_state gespiegelt, da kein
  pi_heating_demand am TRVZB). Skaliert über TRVS[]-Array auf die 4 geplanten.
- **Korrigierte Außentemperatur**: Median aus ETA/Nord/Süd/Wetterstation
  (wetter.aktuell.temperatur_korrigiert), Süd-Sensor nach Tausch wieder dabei.
- **Windrichtung** ins InfluxDB-Logging (Basis für Windrad-Analyse, Erler Wind SO).

## 05.-07.07.2026 — Heizstäbe komplett, /status-Cockpit, Schwerkraftbremse, Wasserzähler
- **Elektrische Wärmezufuhr vollständig erfasst** (Wärmebilanz-Terme komplett):
  - myPV Puffer + WW: Leistung wattgenau aus Solarmanager-API ausgelesen
  - Puffer 2 (Pro3) + Puffer 1: Leistung aus Relais-Schaltzustand × 1500/1000 W
    (Relais-IDs per Einschalt-Test identifiziert; alte IDs waren Phasen-Messgeräte)
  - alle in InfluxDB
- **/status stark erweitert** zum vollen Cockpit (Puffer 1+2, WW, Heizkreise, Kessel,
  Solarthermie, PV/Batterie, alle Heizstäbe, WW-Nacht, Forecast).
- **/wind** Telegram-Windrose (8 Sektoren + Ø + stärkste Böe heute).
- **Schwerkraftbremse WW — diagnostiziert UND repariert**:
  - Nachtmonitor (21:10→05:40, 385L Sieger-Boiler) maß 1,18 °C/h ≈ 5× Datenblatt-Standby
  - Stefan hat Rücklaufsicherung an Zirkulationspumpe ausgebaut + entkalkt
  - ERGEBNIS: Rate auf 0,47 °C/h halbiert, Bewertung „normal" → Erfolg messbar belegt
    (~800–1300 kWh/Jahr Mehrverlust beseitigt). /wwnacht zeigt jetzt auch kWh.
- **Wasserzähler-Tool** (wasser_zaehler.js): /zaehler <Haupt> <Kalt> <Warm>, Erinnerung
  1./15., InfluxDB. Familie 1.OG hat echte Kalt+Warm-Unterzähler → WW messbar
  (~605 kWh Halbjahr 2026). Baseline 31.01.2026 geseedet → 2026 rückwirkend drin.

## 26.07.2026 — Hydraulischer Abgleich FBH OG durchgeführt
- Heizlast ganzes Haus (DIN EN 12831 vereinf.): EG 4713 W + OG inkl. Speicher
  12706 W = ~17,4 kW bei −12,5 °C. PDF context/docs/heizlast_haus_din12831_26072026.pdf.
- Soll-Durchflüsse je FBH-Kreis berechnet (ΔT 7 K, Mehrfachkreise nach Länge):
  3 Verteiler (V1 ~12,6 + V2 ~6,1 + Speicher ~7,3 l/min = ~26 l/min gesamt).
- Pumpe Grundfos ALPHA2 L 25-60 (3 Stufen). Auf Stufe III balanciert (konvergierte
  schnell), dann Stufen getestet: ENDSTAND Stufe II — hält alle Kreise, Stufe I zu
  schwach. Eingangs-Heizkörper bleibt voll offen (Radiator am FBH-Verteiler).
- Nachlauf: über Heizsaison via Zigbee-Raumtemp feinjustieren.

## 18.07.2026 — Norm-Heizlast EG (Eltern) dokumentiert
- Stefan lieferte Heizlast-Berechnung EG (DIN EN 12831 vereinf., Oventrop 5.1.4):
  **Summe 4713 W** bei −12,5 °C Normaußentemp, 103,18 m² (46 W/m²).
- Verlustkoeffizient EG ≈ 145 W/K → unabhängige Gegenprobe zur gemessenen
  Energie-Signatur-Steigung (kommt in der Heizsaison Herbst 2026).
- Raumtabelle + Nutzen in haussteuerung_todo.md, Quell-PDF unter context/docs/.
- Offen: gleiche Berechnung für 1.OG (Familie) → Gesamt-Norm-Heizlast Haus.

## 18.07.2026 — /wwnacht mit Wochen-/Monatsverlauf
- **/wwnacht erweitert**: zeigt zusätzlich zur aktuellen Nacht einen Verlauf aus
  InfluxDB (rate_nacht + verlust_kwh) — Ø °C/h über 7 und 30 Tage, Hochrechnung
  kWh/Woche, kWh/Monat, kWh/Jahr. Datenbasis war schon da (jede Nacht geloggt),
  jetzt auch ohne Grafana per Telegram abrufbar.

## 15.07.2026 — Wasserzähler auf 5 Werte (Waschmaschine + Pool/Werkstatt)
- **Zwei neue Unterzähler eingebaut** (OBI, zusammen 40 € + 6 € Muffen):
  - Waschmaschine — Werksstand 0,1775 m³
  - Pool/Werkstatt — Werksstand 0,292 m³
- **wasser_zaehler.js auf 5 Werte erweitert**: /zaehler <Haupt> <Kalt> <Warm> <WM> <Pool>
  (3 Werte gehen weiter, WM/Pool bleiben dann stehen). Neue Aufteilung:
  - Familie 1.OG = Kalt + Warm + Waschmaschine
  - Pool/Werkstatt = eigener Topf (Poolbefüllung, Gartenschlauch, Werkstatt)
  - EG (Eltern) = Haupt − Familie − Pool
- **Getrennte Baseline** für WM/Pool: Werksstand + eigener Zeitstempel (ts_wmpool),
  einmalig per wmpool_seed_done geseedet. Raten (L/Tag) werden je Zähler über das
  eigene Fenster gerechnet → nur die erste Ablesung leicht verzerrt (von Stefan
  akzeptiert), ab der 2. Ablesung alle Fenster gleich = sauber.
- Neue States wasser.wm / wasser.pool / wm_lpt / pool_lpt in InfluxDB.
- /status-Cockpit zeigt jetzt einen Wasser-Block (Familie/WW/WM/Pool/EG L/Tag).
- /hilfe + 2-Wochen-Erinnerung auf 5 Werte aktualisiert.
- **/verbrauch** neu: kumulierter Verbrauch seit 31.01.2026 (WM/Pool seit Einbau)
  = aktueller Stand − Baseline, unabhängig von Zwischenablesungen. Zeigt Familie/
  WW-kWh/Pool/EG/Haus je m³ + Ø L/Tag. (/zaehler zeigt nur Delta seit letzter Ablesung.)

---

## Offen / Nächste Sessions
Siehe haussteuerung_todo.md für aktuelle offene Punkte.
