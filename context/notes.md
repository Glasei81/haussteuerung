# ETA REST API — Analyse /user/menu (28.05.2026)
# Firmware 4.65.0, Release 20260413

## Bestätigte URIs (aus menu XML)

### Warmwasser (/121/10111)
- WW oben:  /121/10111/0/0/12271  (war schon bekannt)
- WW unten: /121/10111/0/0/12272  (NEU bestätigt)
- WW Soll:  /121/10111/0/0/12132  (NEU bestätigt -> WW/myPV Optimierung möglich)

### Puffer 1a/1b (/272/10601) — 5 Fühler
- Fühler 1 oben:  /272/10601/0/0/13191  (bekannt)
- Fühler 2:       TODO testen: /272/10601/0/11328/0
- Fühler 3:       TODO testen: /272/10601/0/11329/0
- Fühler 4:       TODO testen: /272/10601/0/11330/0
- Fühler 5 unten: /272/10601/0/0/13192  (bekannt)
- Ladezustand:    /272/10601/0/0/12528  (bekannt)

### Puffer 2 (600L Keller = /121/10601) — nach Umbau
- Fühler 1 oben:  /121/10601/0/0/13191  (bereit)
- Fühler 2 mitte: /121/10601/0/0/13934  (testen)
- Fühler 3 unten: /121/10601/0/0/13192  (bereit)
HINWEIS: Puffer 2 noch nicht physisch installiert -> null bis Umbau fertig

### Pellets (/264/10891)
- Zustand:           /264/10891/0/0/12000  (bekannt)
- Ertrag heute:      /264/10891/14877/0/12350  (NEU)
- Energie gesamt:    /264/10891/14877/0/2273   (NEU)
- Leistung aktuell:  /264/10891/14877/0/2287   (NEU)
- Volllaststunden:   /264/10891/0/0/12153       (NEU)
- Gesamtverbrauch:   /264/10891/0/0/12016       (NEU)
- Behälter Inhalt:   /264/10891/0/0/12011       (NEU)
- Verriegelung:      /264/10891/0/0/12651       (bekannt)

### Scheitholz (/272/10921)
- Zustand:        /272/10921/0/0/12000   (bekannt)
- Ertrag heute:   /272/10921/14877/0/12350  (NEU)
- Energie gesamt: /272/10921/14877/0/2273   (NEU)

### Solarthermie (/121/10221)
- Solar-Zustand: /121/10221/0/0/12183
- Kollektor Sensor: /121/10221/0/11139/0  (testen)
- Kein expliziter Wärmemengenzähler im menu sichtbar
  -> Wärmemengenzähler kommt nach Umbau, URI dann neu suchen

---



## Problem
ETA heizt Warmwasser per Puffer-Wärme (Vorlauf 58°C), obwohl gleichzeitig
PV 9613W produziert und Batterie bei 99% ist.
myPV WW-Heizstab (3kW) könnte das mit gratis PV-Strom erledigen.

## Ursache
ETA und Solarmanager kennen sich nicht.
ETA sieht "WW 1°C unter Soll" → lädt sofort über Puffer.
Solarmanager steuert myPV unabhängig nach eigener Logik.

## Lösungsansatz
Wenn PV-Überschuss > X kW UND Batterie > 95%:
  -> ETA WW-Soll per REST API temporär hochsetzen (z.B. 60°C)
  -> ETA greift dann nicht mehr ein
  -> myPV Heizstab übernimmt WW-Laden mit PV-Strom
  -> Bei schlechtem Wetter: WW-Soll wieder auf Normal (55°C)

## Voraussetzung
URI für "Warmwasser Soll" in ETA REST API finden (noch unbekannt).

---



## Geprüfte Bereiche
- ETA REST Zugriff
- Pellets-Automatik
- Solarmanager-Logik
- Wetterstation
- Telegram-Steuerung
- Datenpunktstruktur

## Gravierende Änderungen

### 1. Hysterese gegen Takten
ALT:
- Sperre bereits ab 40°C
- Freigabe sofort wieder unter 40°C

NEU:
- Sperre erst ab 42°C
- Freigabe erst unter 38°C

Vorteil:
- deutlich weniger Ein/Aus-Schalten
- ruhigerer ETA Betrieb
- weniger Pelletzünder-Zyklen
- besser für Hydraulik und Brenner

---

### 2. Sicherheitsfreigabe bei fehlenden Daten
ALT:
- Fehlende Werte konnten theoretisch falsche Sperren erzeugen

NEU:
- Wenn ETA oder Solarmanager Daten älter als 15 Minuten:
  -> automatische Freigabe

Warum?
Bei Kommunikationsfehlern ist "Heizung läuft weiter"
fast immer sicherer als unbeabsichtigtes Sperren.

---

### 3. SafeState Wrapper
ALT:
- getState() direkt verwendet

RISIKO:
- Fehler bei nicht vorhandenen Datenpunkten

NEU:
- zentrale safeState() Funktion
- Fallback-Werte
- stabilere Laufzeit

---

### 4. Doppeltes Schreiben verhindert
ALT:
- Script konnte identischen Zustand erneut senden

NEU:
- Vor jedem ETA POST wird geprüft,
  ob sich der Zustand wirklich ändert

Vorteil:
- weniger REST Traffic
- weniger ETA Last
- saubereres Logging

---

### 5. Transparente Automatikentscheidung
NEU:
- neuer Datenpunkt:
  eta.pellets.letzte_entscheidung

Dadurch jederzeit sichtbar:
- warum gesperrt wurde
- warum freigegeben wurde
- welche Regel aktiv war

Ideal für Grafana oder Telegram.

---

## Bewusst NICHT geändert

- ETA Pumpenlogik
- ETA Solarthermie-Regelung
- ETA Holzlogik
- bestehende Datenpunktnamen
- Telegram-Kommandos

Dadurch bleibt maximale Kompatibilität erhalten.

---

## Empfehlung für später

Sinnvolle nächste Schritte:
- Pufferschichtung vollständig auswerten
- Wetterforecast in Pelletslogik integrieren
- PV-Prognose dynamisch berücksichtigen
- Sommer/Winter Modus automatisch
- Telegram /klima erweitern
- Influx Alarme
