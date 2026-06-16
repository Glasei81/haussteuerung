# Haussteuerung Raubling — Technischer Kontext

## hauspi — Systemzeit & NTP (16.06.2026)

**Problem:** Moes Zigbee-Thermostate zeigten 4 verschiedene Uhrzeiten (Abweichung bis 3h+).
**Ursache:** Raspberry Pi hat keine Hardware-RTC (`RTC time: n/a` in timedatectl).
  Beim Booten startet ioBroker bevor NTP synchronisiert hat → Zigbee-Adapter
  synct Thermostate mit falscher Systemzeit. Jedes Gerät verbindet zu anderem Zeitpunkt.

**Fix (16.06.2026):** ioBroker wartet auf NTP-Sync:
```bash
sudo mkdir -p /etc/systemd/system/iobroker.service.d/
printf '[Unit]\nAfter=time-sync.target\nWants=time-sync.target\n' | sudo tee /etc/systemd/system/iobroker.service.d/override.conf
sudo systemctl daemon-reload
```
Datei: `/etc/systemd/system/iobroker.service.d/override.conf`

**Langfristig:** DS3231 RTC Modul (~5€, I²C) nachrüsten falls Raspi ohne Internet bootet.

---



| Gerät | Rolle | IP / URL |
|---|---|---|
| ETA eSH 27 | Pellets + Scheitholz Kombiheizung | 192.168.178.5:8080 |
| hauspi | Raspberry Pi — ioBroker | hauspi.local |
| Dell Latitude 5320 | Ollama + InfluxDB Docker + Grafana Docker | 192.168.178.130 |
| Solarmanager v1 | PV-Überschusssteuerung | 192.168.178.36 |

### InfluxDB
- URL: http://192.168.178.130:8086
- Bucket: `wetter`
- Organisation: `iobroker`
- Aufzeichnung läuft seit 21.05.2026
- ioBroker InfluxDB-Adapter schreibt auf Dell Laptop (nicht lokal auf hauspi!)

### Grafana
- URL: http://192.168.178.130:3001
- Dashboard vorhanden: 10 Panels (Stand 21.05.2026)

---

## ETA Script — eta.js (Stand: 07.06.2026)

- **50 aktive Datenpunkte** (nach URI-Korrekturen 07.06.2026, alle Sensoren aktiv)
- Polling alle 5 Minuten via `schedule('*/5 * * * *', ...)`
- Struktur: `ETA_DATENPUNKTE` Array, je `[key, uri, statePath, name, unit, role, type]`
- Alias `eta.puffer.oben` = `eta.puffer.fuehler1` (Kompatibilität mit eta_pellets_logik.js)

### URI-Korrekturen (07.06.2026, per eta_uri_scan.js bestätigt)
| Sensor | Alte URI | Neue URI | Wert |
|---|---|---|---|
| puffer_fuehler2 | /272/10601/0/0/13933 | /272/10601/0/11328/0 | node-basiert |
| puffer_fuehler3 | /272/10601/0/0/13934 | /272/10601/0/11329/0 | node-basiert |
| puffer_fuehler4 | /272/10601/0/0/13935 | /272/10601/0/11330/0 | node-basiert |
| puffer2_mitte | /121/10601/0/0/13934 | /121/10601/0/11328/0 | 62°C ✓ (node-basiert) |
| puffer2_unten | /121/10601/0/0/13192 | /121/10601/0/11329/0 | 32°C ✓ (node-basiert) |

### Bekannte Timing-Warnung (harmlos)
Bei Script-Neustart erscheinen `State "javascript.0.eta.*" not found` Warnungen.
Ursache: `createState()` ist asynchron, erste HTTP-Antwort kann früher ankommen.
Verschwindet nach dem ersten 5-Minuten-Zyklus. Kein Handlungsbedarf.

---

## InfluxDB — Welche ETA Datenpunkte aufzeichnen

Entschieden: 07.06.2026

### Tier 1 — immer aufzeichnen
```
eta.puffer.fuehler1–5         Pufferschichtung + Verlust
eta.puffer.ladung             Puffer 1 Ladezustand
eta.puffer2.oben/mitte/unten  Puffer 2 Schichtung
eta.puffer2.ladung            Puffer 2 Ladezustand
eta.aussen.temperatur         Korrelation mit Verbrauch
eta.warmwasser.oben           WW-Temperatur Trend
eta.solar.ertrag_heute        täglicher Solarertrag
eta.pellets.leistung          Brennerleistung live
eta.pellets.ertrag_heute      täglicher Pellets-Ertrag
eta.holz.leistung             Scheitholz-Leistung live
eta.holz.ertrag_heute         täglicher Scheitholz-Ertrag
```

### Tier 2 — sinnvoll
```
eta.hk.vorlauf / ruecklauf    Spreizung Heizkreis HK
eta.fbh.vorlauf / ruecklauf   Spreizung Fußbodenheizung
eta.solar.vorlauf / ruecklauf Kollektoreffizienz
eta.pellets.behaelter_inhalt  Füllstand-Verlauf
eta.pellets.verbrauch_gesamt  Verbrauch-Counter
eta.pellets.volllaststunden   Verschleiß-Tracking
eta.pellets.heizbetriebe      Startvorgänge
eta.holz.volllaststunden      Verschleiß-Tracking
eta.holz.energie_gesamt       kumulierter Scheitholz-Ertrag
eta.solar.waermemenge         kumulierter Solarertrag
```

### Tier 3 — optional / bei Bedarf
```
eta.warmwasser.unten          wenn WW-Logik aktiv
eta.pellets.kesseldruck       nur für Fehlerdiagnose
eta.pellets.zuendungen        Statistik
eta.*.zustand                 wenn Betriebszeiten ausgewertet werden
```

### Bewusst NICHT aufzeichnen
- `eta.puffer.oben` — Alias, identisch mit fuehler1
- `eta.warmwasser.soll` — ändert sich kaum, kein Trend-Wert
- `eta.*_ertrag_gestern` — gestern bleibt gestern, täglicher Snapshot reicht

---

## Puffer 1a/1b — Schichtungsbeobachtung (28.05.2026 17:19)
```
Fühler 1 oben:   66°C
Fühler 2:        64°C
Fühler 3 mitte:  53°C  ← Thermokline
Fühler 4:        47°C
Fühler 5 unten:  46°C
Ladezustand:     36%
```

## Puffer — Abkühlkurve (07.06.2026, Sommertag)
- 43,8°C → 40,8°C in 13h bei 20–27°C Außentemperatur
- ≈ 0,23°C/h Wärmeverlust
- Nur Sommer-Datenpunkt, Winterdaten ab Herbst 2026 belastbar

---

## Hydraulik Puffer (geklärt)
- Puffer 1a + 1b in Reihe: Entnahme oben 1a, Rücklauf unten 1b
- Fernwärmeleitung: Puffer 1a ↔ Puffer 2 (Keller)
- Puffer 2 zu warm → schiebt über Rücklauf zurück → lädt Puffer 1b
- ETA steuert Pumpen selbst → wir greifen nicht ein!

## Heizstäbe
- myPV Puffer (3–3,5 kW): `672f524463329ad0323012bd`
- myPV Warmwasser (3 kW): `672f519e00c1de1963ec63db`
- Heizstab Puffer 2 (4,5 kW, Shelly Pro3, 3 Relais à 1500W):
  - Relais 1: `672cd496e4b1e4feca2e4b4c`
  - Relais 2: `672dccfdc008a5373eadad23`
  - Relais 3: `672e09ecbf2027621d498c3c`
  - State: `solar.puffer2.watt` (Summe aller 3 Relais)
  - 0W = normal wenn Puffer 2 Zieltemperatur (65°C) erreicht

### Heizstab Puffer 2 — Temperaturgrenzen
- **Heizstab-Regler-Maximum: 80°C** (Hardware-Grenze, Regler schaltet selbst ab)
- **Elektrische Abschalttemperatur (Software): 65°C** (puffer2.oben oder puffer2.mitte)
- **Puffer-Maximum bei Holz/Solarthermie: 85°C** — das ist normaler Betrieb, kein Fehler!
- Hohe Puffertemperatur allein ist KEIN Alarm-Grund
- Fehlerhaft: elektrische Leistung (solar.puffer2.watt > 100W) bei Temp ≥ 65°C

### Heizstab Puffer 2 — Schutzlogik (ENTFERNT 13.06.2026)
puffer2_heizstab_schutz.js wurde entfernt weil:
- Shelly Pro3 hat KEINE Leistungsmessung → solar.puffer2.watt las falschen Wert
  (vermutlich PV-Gesamtleistung statt Heizstab-Leistung)
- Folge: Fehlalarme ("läuft trotz 73°C"), falsche Relais-Abschaltungen
- ETA und Heizstab-Hardware-Regler (80°C) haben eigene Sicherheitsmechanismen → kein Script nötig
OFFEN: solar.puffer2.watt Quelle klären (Solarmanager summiert was genau?)

---

## WW-Optimierung (Konzept, noch nicht implementiert)
- Problem: ETA lädt WW über Puffer auch bei vollem PV-Überschuss
- Lösung: wenn PV > X kW UND Batterie > 95% → ETA WW-Soll per POST auf 65°C
- URI bestätigt: `/121/10111/0/0/12132` (warmwasser.soll bereits geloggt)

## Zigbee
- Dongle bereits auf hauspi installiert
- Zigbee-Adapter läuft in ioBroker
- FBH-Thermostate OG bereits sichtbar: `0x9035eafffe2a7ad9`, `0x2c1165fffe52fc24` (TS0601)
- TS0601 Ping-Fehler im Log = normal (Sleep-Mode-Geräte)
- **NICHTS mit ETA REST API zu tun** — komplett getrennte Systeme

## ETA REST API
- Dokumentation: Version 1.2, November 2019
- Endpunkte: `/user/var` (GET+POST), `/user/menu`, `/user/errors`, `/user/varinfo`
- POST body: `value=<Rohwert>&at=0` (at=0 = sofort)
- Rohwert = strValue × scaleFactor (z.B. 25,5°C × scale=10 → value=255)
- Enum-Werte: Rohwert = advTextOffset + Enum-Index (z.B. 1802+0=Aus, 1802+1=1803=Ein)
- `/user/errors` → nützlich für Telegram-Alerts bei ETA-Fehlern (noch nicht implementiert)

### ETA Puffer2 Rückspeisung — Erkenntnisse (13.06.2026)
- "Sofort laden" URI: /121/10601/0/0/13025
  GET: scaleFactor=1, advTextOffset=1802, strValue="Aus", value=1802
  POST value=1803&at=0 → <success> ✓ — aber Pumpe läuft NUR wenn ETA P2-Bedarf sieht
- ETA Logik: Pumpe lädt P2 AUS P1 (P1→P2 Richtung)
  → startet nur wenn P2 < P1 (P2 braucht Wärme)
  → bei P2 > P1 (unser Szenario: solar/Heizstab) kein Bedarf → Pumpe bleibt aus
- Pump-Ausgänge (Ausgang /2130, Anforderung /2001, Drehzahlsteuerung /2133):
  read-only oder ETA-intern berechnet → können nicht direkt überschrieben werden
- FAZIT: P2→P1 Wärmerückspeisung nur mit Shelly 1PM direkt an der Pumpe möglich

## ETA Sub-Scripts (08.06.2026)

Zusätzlich zu eta.js (50 Datenpunkte) gibt es 4 spezialisierte Sub-Scripts
für erweiterte/ergänzende Datenpunkte. Alle 5 Minuten, gleiches Muster.

| Script | Datenpunkte | States |
|---|---|---|
| eta.js | 50 | eta.puffer.*, eta.warmwasser.*, eta.hk.*, eta.fbh.*, eta.solar.*, eta.pellets.*, eta.holz.*, eta.aussen.* |
| eta_solar.js | 6 | eta.solar.vorlauf/ruecklauf/leistung/ertrag_heute/waermemenge/kollektor_pumpe |
| eta_zirkulation.js | 5 | eta.zirkulation.status/laufzeit/pause/freigabe, eta.warmwasser.ladepumpe |
| eta_puffer2.js | 5 | eta.puffer2.oben/mitte/unten/ladepumpe/ladezustand |
| eta_scheitholz.js | 4 | eta.scheitholz.zustand/isoliertuere/waermemenge/leistung |

**Wichtig: State-Überschneidungen**
- eta.puffer2.oben/mitte/unten: gelesen von eta.js UND eta_puffer2.js (leicht andere URIs, /2002 vs /0)
- eta.solar.vorlauf/ruecklauf/waermemenge: gelesen von eta.js UND eta_solar.js (gleiche URIs)
- eta.holz.* vs eta.scheitholz.*: unterschiedliche State-Namensräume, gleiche Hardware
- Wenn beide Scripts installiert: eta.js hat Vorrang (50 DP), Sub-Scripts ergänzen spezifische Werte

**URI noch zu prüfen:**
- eta.solar.leistung: /121/10221/14877/0/2287 — analog Pellets/Holz, aber Solarthermie hat evtl. andere Struktur
- eta.solar.kollektor_pumpe: /121/10221/0/11142/2002 — node-basiert, erst nach Test bestätigt

Alle URIs vollständig dokumentiert in: `context/ids_keys.md` (gitignored, lokal)
