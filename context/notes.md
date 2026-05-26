# Optimierungen 26.05.2026

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
