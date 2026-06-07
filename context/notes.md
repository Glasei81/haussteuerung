# Haussteuerung Raubling — Technischer Kontext

## Infrastruktur (Stand: 07.06.2026)

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

- **50 aktive Datenpunkte** (bestätigt im Log 07.06.2026 13:08)
- Polling alle 5 Minuten via `schedule('*/5 * * * *', ...)`
- Struktur: `ETA_DATENPUNKTE` Array, je `[key, uri, statePath, name, unit, role, type]`
- Alias `eta.puffer.oben` = `eta.puffer.fuehler1` (Kompatibilität mit eta_pellets_logik.js)

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
- Heizstab Puffer 2 (4,5 kW): Device-ID in Solarmanager noch unbekannt

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
- POST-Wert = Rohwert ohne Skalierung (z.B. `value=1803` für 60,1°C bei scale=10)
- `/user/errors` → nützlich für Telegram-Alerts bei ETA-Fehlern (noch nicht implementiert)
