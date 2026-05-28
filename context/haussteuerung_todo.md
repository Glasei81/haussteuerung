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
- Neu Puffer 2 (4.5kW): Device-ID noch unbekannt, max. 65 Grad einstellen

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

## In ca. 12 Tagen (nach Heizungsumbau)

### Puffer 2 (600L Keller)
- [ ] 3 Temperatursensoren einbinden (eta.puffer2.oben/mitte/unten)
- [ ] Ladepumpe Puffer 2 Status aus ETA auslesen (nur lesen, nicht steuern!)
- [ ] Heizstab 3 (4.5kW) Device-ID in Solarmanager identifizieren
- [ ] Heizstab 3 in Solarmanager Script einbinden
- [ ] Heizstab 3 Maximaltemperatur auf 65 Grad pruefen/setzen

### Puffer 1a/1b
- [ ] 5 Temperatursensoren einbinden (Schichtung sichtbar machen)
- [ ] Puffer 1b Temperatur erfassen

### Solarthermie
- [ ] Wärmemengenzähler URI in ETA finden
- [ ] Solarthermie Ertrag als Datenpunkt in ioBroker
- [ ] ETA Entscheidung WW vs Puffer respektieren (nicht ueberschreiben!)

### Ladelogik Erweiterung
- [ ] Temperaturschwelle definieren ab der alle Heizstaebe abschalten
- [ ] Nur Solarthermie wenn alle Puffer ueber Schwelltemperatur
- [ ] Sicherstellung: ETA Pumpenlogik wird nicht gestört

### Scheitholz
- [ ] ETA URI für Scheitholz Programmstatus finden
- [ ] Kein Konflikt: Script prueft ob ETA Scheitholzprogramm aktiv
- [ ] Telegram Kommando /holz_ein dokumentieren

### Pellets
- [ ] Solltemperatur Puffer per ETA REST API setzen
- [ ] Nachlaufzeit ca. 1h beim Sperren beruecksichtigen

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
- [ ] Alles-in-einem Status App/Webapp
  - Heizung + Solar + Wetter + Empfehlung auf einem Bildschirm
- [ ] Scheitholz Priorisierung (Scheitholz gratis vs Pellets Kosten)
  - Scheitholz + PV maximieren, Pellets nur wenn noetig
- [ ] Grafana erweitern
  - Alle Puffer Temperaturen (Schichtung visualisieren)
  - Solarthermie Ertrag
  - Heizkosten-Tracking (Pellets vs Scheitholz vs PV)
- [ ] OpenClaw/Sepp Zugang zur Haussteuerung via Telegram
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
