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
- **Dell Latitude 5320:** Ollama + InfluxDB Docker + Grafana Docker
- **InfluxDB:** http://192.168.178.130:8086 (Bucket: wetter, Org: iobroker)
- **Grafana:** http://192.168.178.130:3001

---

## Erledigt
- Solarmanager Script (alle 1 Min, solar.* Datenpunkte)
- ETA Script (alle 5 Min, eta.* Datenpunkte)
- ETA Pellets Logik (Temperatur + PV + Mindestlaufzeit 30 Min)
- Wetterstation Script (Weather Company API, Station IRAUBL19)
- windGust (Windboeen) ins Wetterstation Script ergaenzt (25.05.2026)
- Telegram Steuerung (/status, /forecast, /pellets_ein/aus/auto)
- /status zeigt: Pellets, Puffer, WW, Aussen, PV, Batterie, Forecast
- InfluxDB Datenaufzeichnung laeuft (seit 21.05.2026)
- windGust wird in InfluxDB aufgezeichnet (seit 25.05.2026)
- Grafana Dashboard (10 Panels)
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
- Solarmanager Script: Puffer 2 Heizstab (Shelly Pro3, 3 Relais) eingebunden (07.06.2026)
  - State solar.puffer2.watt = Summe aller 3 Relais
  - Bugs in Original-Script behoben: d.id → d._id, d.state → d.switchState
- InfluxDB ETA Datenpunkte aktiviert via influxdb_setup_eta.js (07.06.2026)
  - 31 States aktiviert (0 Fehler): Tier 1 + Tier 2 + solar.puffer2.watt
  - changesOnly: false → jeden 5-Min-Polling-Wert aufzeichnen

---

## Kurzfristig (naechste Session am PC)
- [ ] Grafana Panel Wind + Windboee kombiniert ergaenzen
  Flux Query: filter wind or windboee, unit km/h
- [ ] Tailscale auf hauspi einrichten (Fernzugriff)
- [ ] Telegram /klima Befehl einbauen
  -> Jahresmitteltemperatur aus InfluxDB berechnen
  -> Jahresniederschlag gesamt
  -> Starkregenereignisse zaehlen (precipRate > 10mm/h)
  -> Windmittel Jahresdurchschnitt

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
- [ ] Maximaltemperatur 65°C in Solarmanager Gerätekonfiguration prüfen/setzen

### Ladelogik Erweiterung (nach Datensammlung)
- [ ] Temperaturschwelle definieren ab der alle Heizstäbe abschalten
- [ ] Nur Solarthermie wenn alle Puffer über Schwelltemperatur
- [ ] ETA Pumpenlogik nicht stören

### Scheitholz
- [ ] holz_zustand Werte beobachten: was liefert ETA wenn Holz brennt vs. Bereitschaft?
- [ ] Telegram Kommando /holz_ein dokumentieren

### Pellets
- [ ] Nachlaufzeit ca. 1h beim Sperren berücksichtigen (bereits bekannt)

### ETA / myPV Koordination (WW Optimierung)
- [ ] WW Soll URI bestätigt: /121/10111/0/0/12132 (warmwasser.soll bereits geloggt)
- [ ] Logik: wenn PV > X kW UND Batterie > 95%
        -> ETA WW-Soll per POST auf 65°C setzen
        -> myPV Heizstab übernimmt mit gratis PV-Strom
  HINWEIS: Beobachtet 28.05.2026 (PV 9613W, Bat 99%, ETA lud trotzdem per Puffer)

---

## Nach Datensammlung (Herbst 2026)
- [ ] Abkuehlkurve aus InfluxDB berechnen
  - Grad/h Abkuehlung pro Aussentemperaturbereich
  - Tabelle: 0-5 / 5-10 / 10-15 / 15-20 Grad Aussen
  - ACHTUNG: Sommer-Daten nicht belastbar (keine Waermeanforderung)
  - Belastbare Daten erst ab Heizsaison Herbst 2026
- [ ] Forecast in Heizungslogik einbauen
  - Sperrschwelle dynamisch (40 vs 55 Grad je nach Morgen-Forecast)
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

### TRVs für EG Heizkörper (niedrige Priorität)
- [ ] Sonoff TRVZB (~20€/Stück Amazon, ~15€ AliExpress) pro Heizkörper EG
  - Zigbee2MQTT Adapter in ioBroker (gleicher Weg wie bestehende Thermometer)
  - Datenpunkte: zigbee.eg.wohnzimmer.soll / ist / ventil_position
  - Logik: Ventil zu wenn Fenster offen (Fensterkontakt-Integration)
  - Logik: Eco-Temperatur (z.B. 18°C) wenn niemand zuhause (Anwesenheitserkennung)
  - HINWEIS: ETA steuert Pumpen selbst -> TRV nur Ventil, nicht Pumpe!

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

## Laengerfristig / Ideen
- [ ] Wasserverbrauch Tracking via AI-on-the-edge-device (ESP32-CAM vorhanden)
  - ESP32-CAM am digitalen Hausanschluss montieren
  - AI-on-the-edge-device Firmware flashen (liest Ziffern per neuronales Netz)
  - HTTP API -> ioBroker Datenpunkt wasser.gesamt.m3
  - ioBroker Adapter vorhanden
  - TODO: Zaehlertyp feststellen -> Halterung planen
    (digital: einfacher, analog: praeziser Winkel noetig -> evtl 3D Druck)
    (Karton mit Lichtschutz als guenstige Alternative moeglich)
  - HINWEIS: Hauptzaehler = Gesamtwasser (kalt + warm)
  - Warmwasser indirekt aus ETA Temperaturverlauf (eta.warmwasser.oben) schaetzen
- [ ] Eigener ioBroker Adapter mit Installationsassistent
  - Wizard fuehrt einmalig durch alle benoetigten Werte
    (Device-IDs, IPs, API Keys, Temperaturschwellen)
  - Werte werden direkt in ioBroker Datenpunkte geschrieben
  - Kein manuelles Eintragen mehr in ids_keys.md noetig
  - Vorbild: klassischer Setup-Wizard, Schritt fuer Schritt
- [ ] ioBroker VIS-2 Dashboard (Drill-Down Konzept)
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
- [ ] Klimaanlagen in ioBroker einbinden
  - Tuya Klimaanlage: Tuya Adapter konfigurieren (Local Key besorgen via tuya-cli)
  - NetHome Plus Klimaanlage: wahrscheinlich Midea-basiert
    -> ioBroker Adapter: ioBroker.midea-air-conditioner pruefen
    -> Marke/Modell klaeren fuer passenden Adapter
  - Solarmanager trackt bereits Verbrauch beider Geraete
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
