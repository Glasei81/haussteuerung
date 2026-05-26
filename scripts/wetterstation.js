// ============================================
// Wetterstation Script
// Weather Company API - IRAUBL19
// Aktuelle Werte alle 10 Min
// Forecast einmal täglich
// ============================================

var https = require('https');

var PWS_ID  = 'IRAUBL19';
var API_KEY = 'cf0bad571a684a698bad571a687a69c6';
var LAT     = '47.788';
var LON     = '12.106';

var states = [
    // Aktuelle Werte
    ['wetter.aktuell.temperatur',    'Temperatur',         'number', 'C',    'value.temperature'],
    ['wetter.aktuell.feuchte',       'Luftfeuchte',        'number', '%',    'value.humidity'],
    ['wetter.aktuell.druck',         'Luftdruck',          'number', 'hPa',  'value.pressure'],
    ['wetter.aktuell.wind',          'Windgeschwindigkeit','number', 'km/h', 'value.speed.wind'],
    ['wetter.aktuell.windboee',      'Windböe',            'number', 'km/h', 'value.speed.wind.gust'],
    ['wetter.aktuell.windrichtung',  'Windrichtung',       'number', 'Grad', 'value.direction.wind'],
    ['wetter.aktuell.solar',         'Solarstrahlung',     'number', 'W/m2', 'value'],
    ['wetter.aktuell.uv',            'UV Index',           'number', '',     'value.uv'],
    ['wetter.aktuell.regen_rate',    'Regenrate',          'number', 'mm/h', 'value.rain'],
    ['wetter.aktuell.regen_gesamt',  'Regen gesamt',       'number', 'mm',   'value.rain'],
    ['wetter.aktuell.timestamp',     'Letztes Update',     'string', '',     'value'],
    // Forecast morgen
    ['wetter.forecast.morgen.max',        'Morgen Max',         'number', 'C',  'value.temperature.max'],
    ['wetter.forecast.morgen.min',        'Morgen Min',         'number', 'C',  'value.temperature.min'],
    ['wetter.forecast.morgen.regen',      'Morgen Regenrisiko', 'number', '%',  'value'],
    ['wetter.forecast.morgen.bewoelkung', 'Morgen Bewoelkung',  'number', '%',  'value'],
    ['wetter.forecast.morgen.uv',         'Morgen UV',          'number', '',   'value.uv'],
    ['wetter.forecast.morgen.text',       'Morgen Beschreibung','string', '',   'value'],
    // Forecast übermorgen
    ['wetter.forecast.uebermorgen.max',   'Uebermorgen Max',    'number', 'C',  'value.temperature.max'],
    ['wetter.forecast.uebermorgen.regen', 'Uebermorgen Regen',  'number', '%',  'value'],
    ['wetter.forecast.uebermorgen.uv',    'Uebermorgen UV',     'number', '',   'value.uv'],
    // PV Prognose
    ['wetter.pv.prognose_morgen',    'PV Prognose morgen', 'string', '', 'value'],
];

states.forEach(function(s) {
    createState(s[0], s[2] === 'number' ? 0 : '', {
        name: s[1], type: s[2], unit: s[3], role: s[4], read: true, write: false
    });
});

function httpsGet(url, callback) {
    https.get(url, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            try { callback(JSON.parse(data)); }
            catch(e) { log('Wetter Parse Fehler: ' + e, 'error'); }
        });
    }).on('error', function(e) {
        log('Wetter Verbindungsfehler: ' + e.message, 'error');
    });
}

function pvPrognose(cloudCover, precipChance, uvIndex) {
    if (precipChance > 60) return 'schlecht (Regen ' + precipChance + '%)';
    if (cloudCover > 70)   return 'gering (Bewoelkung ' + cloudCover + '%)';
    if (uvIndex >= 6)      return 'sehr gut (UV ' + uvIndex + ')';
    if (uvIndex >= 4)      return 'gut (UV ' + uvIndex + ')';
    return 'mittel';
}

function aktuelleWerte() {
    var url = 'https://api.weather.com/v2/pws/observations/current?stationId=' +
              PWS_ID + '&format=json&units=m&apiKey=' + API_KEY;

    httpsGet(url, function(json) {
        if (!json.observations || !json.observations[0]) return;
        var o = json.observations[0];
        var m = o.metric;

        setState('javascript.0.wetter.aktuell.temperatur',   {val: m.temp,                ack: true});
        setState('javascript.0.wetter.aktuell.feuchte',      {val: o.humidity,            ack: true});
        setState('javascript.0.wetter.aktuell.druck',        {val: m.pressure,            ack: true});
        setState('javascript.0.wetter.aktuell.wind',         {val: m.windSpeed,           ack: true});
        setState('javascript.0.wetter.aktuell.windboee',     {val: m.windGust || 0,       ack: true});
        setState('javascript.0.wetter.aktuell.windrichtung', {val: o.winddir,             ack: true});
        setState('javascript.0.wetter.aktuell.solar',        {val: o.solarRadiation || 0, ack: true});
        setState('javascript.0.wetter.aktuell.uv',           {val: o.uv || 0,             ack: true});
        setState('javascript.0.wetter.aktuell.regen_rate',   {val: m.precipRate || 0,     ack: true});
        setState('javascript.0.wetter.aktuell.regen_gesamt', {val: m.precipTotal || 0,    ack: true});
        setState('javascript.0.wetter.aktuell.timestamp',    {val: o.obsTimeLocal,        ack: true});

        log('Wetter: ' + m.temp + 'C, ' + o.humidity + '%, Wind ' + m.windSpeed + ' km/h, Boee ' + (m.windGust || 0) + ' km/h, Solar ' + o.solarRadiation + ' W/m2');
    });
}

function forecastAbrufen() {
    var url = 'https://api.weather.com/v3/wx/forecast/daily/5day?geocode=' +
              LAT + ',' + LON + '&format=json&units=m&language=de-DE&apiKey=' + API_KEY;

    httpsGet(url, function(json) {
        var maxMorgen  = json.calendarDayTemperatureMax[1];
        var minMorgen  = json.calendarDayTemperatureMin[1];

        var dp = json.daypart[0];
        var regenMorgen    = dp.precipChance[2]  || 0;
        var bewoelkMorgen  = dp.cloudCover[2]    || 0;
        var uvMorgen       = dp.uvIndex[2]        || 0;
        var textMorgen     = dp.narrative[2]      || '';

        var regenUeber     = dp.precipChance[4]  || 0;
        var uvUeber        = dp.uvIndex[4]        || 0;
        var maxUeber       = json.calendarDayTemperatureMax[2];

        setState('javascript.0.wetter.forecast.morgen.max',        {val: maxMorgen,     ack: true});
        setState('javascript.0.wetter.forecast.morgen.min',        {val: minMorgen,     ack: true});
        setState('javascript.0.wetter.forecast.morgen.regen',      {val: regenMorgen,   ack: true});
        setState('javascript.0.wetter.forecast.morgen.bewoelkung', {val: bewoelkMorgen, ack: true});
        setState('javascript.0.wetter.forecast.morgen.uv',         {val: uvMorgen,      ack: true});
        setState('javascript.0.wetter.forecast.morgen.text',       {val: textMorgen,    ack: true});
        setState('javascript.0.wetter.forecast.uebermorgen.max',   {val: maxUeber,      ack: true});
        setState('javascript.0.wetter.forecast.uebermorgen.regen', {val: regenUeber,    ack: true});
        setState('javascript.0.wetter.forecast.uebermorgen.uv',    {val: uvUeber,       ack: true});

        var prognose = pvPrognose(bewoelkMorgen, regenMorgen, uvMorgen);
        setState('javascript.0.wetter.pv.prognose_morgen', {val: prognose, ack: true});

        log('Forecast morgen: ' + maxMorgen + 'C, Regen ' + regenMorgen + '%, UV ' + uvMorgen + ', PV: ' + prognose);
    });
}

// Sofort starten
aktuelleWerte();
forecastAbrufen();

// Aktuelle Werte alle 10 Minuten
schedule('*/10 * * * *', function() { aktuelleWerte(); });

// Forecast einmal täglich um 06:00
schedule('0 6 * * *', function() { forecastAbrufen(); });

log('Wetterstation Script gestartet');
