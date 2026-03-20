const fs = require("fs");
const path = require("path");

const stations = ["KPOC", "KCCB", "KRAL"];
const windsStations = ["ONT", "WJF", "SBA", "SAN"];
const windsFcsts = ["06", "12", "24"];
const windsAltitudes = ["3000", "6000", "9000", "12000", "18000", "24000"];
const baseUrl = "https://aviationweather.gov/api/data";

// METAR Map — all SoCal airports
const mapStations = [
  { icao: "KLAX", name: "Los Angeles Intl", lat: 33.9425, lon: -118.4081 },
  { icao: "KBUR", name: "Hollywood Burbank", lat: 34.2007, lon: -118.3585 },
  { icao: "KVNY", name: "Van Nuys", lat: 34.2098, lon: -118.4900 },
  { icao: "KSMO", name: "Santa Monica", lat: 34.0158, lon: -118.4513 },
  { icao: "KHHR", name: "Hawthorne", lat: 33.9228, lon: -118.3352 },
  { icao: "KTOA", name: "Zamperini (Torrance)", lat: 33.8034, lon: -118.3396 },
  { icao: "KLGB", name: "Long Beach", lat: 33.8177, lon: -118.1516 },
  { icao: "KSNA", name: "John Wayne", lat: 33.6757, lon: -117.8682 },
  { icao: "KFUL", name: "Fullerton", lat: 33.8720, lon: -117.9783 },
  { icao: "KONT", name: "Ontario Intl", lat: 34.0560, lon: -117.6012 },
  { icao: "KPOC", name: "Brackett Field", lat: 34.0917, lon: -117.7831 },
  { icao: "KCCB", name: "Cable Airport", lat: 34.1114, lon: -117.6878 },
  { icao: "KRAL", name: "Riverside Muni", lat: 33.9519, lon: -117.4451 },
  { icao: "KCNO", name: "Chino", lat: 33.9747, lon: -117.6365 },
  { icao: "KEMT", name: "El Monte", lat: 34.0861, lon: -118.0347 },
  { icao: "KWHP", name: "Whiteman", lat: 34.2584, lon: -118.4135 },
  { icao: "KPMD", name: "Palmdale", lat: 34.6294, lon: -118.0845 },
  { icao: "KWJF", name: "Fox Field (Lancaster)", lat: 34.7411, lon: -118.2186 },
  { icao: "KCMA", name: "Camarillo", lat: 34.2137, lon: -119.0943 },
  { icao: "KOXR", name: "Oxnard", lat: 34.2008, lon: -119.2072 },
  { icao: "KSBD", name: "San Bernardino Intl", lat: 34.0954, lon: -117.2354 },
  { icao: "KRIR", name: "Flabob", lat: 33.9897, lon: -117.4111 },
  { icao: "KAJO", name: "Corona Muni", lat: 33.8978, lon: -117.6026 },
  { icao: "KSLI", name: "Los Alamitos", lat: 33.7900, lon: -118.0519 },
  { icao: "KCRQ", name: "Carlsbad", lat: 33.1283, lon: -117.2801 }
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "familywebsite-weather/1.0" }
  });

  if (response.status === 204) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "familywebsite-weather/1.0" }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.text();
}

function parseWindEntry(s) {
  if (!s || s.trim() === "" || s.trim() === "----") return null;
  s = s.trim();
  if (s === "9900") return { dir: "L&V", speed: "<5", temp: null };
  if (s.startsWith("99")) {
    const temp = s.length > 4 ? parseInt(s.slice(4), 10) : null;
    return { dir: "L&V", speed: "<5", temp: temp !== null ? temp : null };
  }
  const dirCode = parseInt(s.slice(0, 2), 10);
  let speed = parseInt(s.slice(2, 4), 10);
  let windDir = dirCode * 10;
  if (dirCode >= 51) {
    windDir = (dirCode - 50) * 10;
    speed += 100;
  }
  let temp = null;
  if (s.length > 4) {
    const match = s.slice(4).match(/^([+-]?)(\d+)/);
    if (match) {
      const val = parseInt(match[2], 10);
      temp = match[1] === "-" ? -val : val;
    }
  }
  return { dir: windDir, speed, temp };
}

function parseFBWindsForStation(text, station) {
  const lines = text.split("\n");
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\b3000\b/.test(lines[i]) && /\b6000\b/.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const header = lines[headerIdx];
  // Find all altitude column positions in the header
  const allAlts = ["3000", "6000", "9000", "12000", "18000", "24000", "30000", "34000", "39000"];
  const allColPos = allAlts.map((alt) => header.indexOf(alt));

  const stUpper = station.toUpperCase();
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().toUpperCase().startsWith(stUpper)) {
      // Find all tokens in line with their start positions
      const tokens = [];
      const tokenPattern = /\S+/g;
      let match;
      while ((match = tokenPattern.exec(line)) !== null) {
        tokens.push({ text: match[0], pos: match.index });
      }
      // Skip the station code (first token)
      const dataTokens = tokens.slice(1);

      // Match each altitude column to the nearest token by position
      return windsAltitudes.map((alt) => {
        const colIdx = allAlts.indexOf(alt);
        const colPos = allColPos[colIdx];
        if (colPos < 0) return null;

        // Find the token whose start position is closest to the column position
        let best = null;
        let bestDist = Infinity;
        for (const t of dataTokens) {
          const dist = Math.abs(t.pos - colPos);
          if (dist < bestDist) {
            bestDist = dist;
            best = t;
          }
        }
        // Only accept if within reasonable distance (half a column width)
        if (!best || bestDist > 5) return null;
        return parseWindEntry(best.text);
      });
    }
  }
  return null;
}

async function fetchWindsAloft() {
  const results = {};
  for (const fcst of windsFcsts) {
    const url = `${baseUrl}/windtemp?region=sfo&level=low&fcst=${fcst}`;
    try {
      const text = await fetchText(url);
      for (const station of windsStations) {
        const parsed = parseFBWindsForStation(text, station);
        if (parsed) {
          const key = `${station}_${fcst}`;
          results[key] = parsed;
        }
      }
    } catch (err) {
      console.error(`Winds aloft fcst=${fcst}: ${err.message}`);
    }
  }
  return results;
}

async function run() {
  const metarUrl = `${baseUrl}/metar?ids=${stations.join(",")}&format=json`;
  const tafUrl = `${baseUrl}/taf?ids=${stations.join(",")}&format=json`;

  const [metars, tafs] = await Promise.all([fetchJson(metarUrl), fetchJson(tafUrl)]);

  const metarById = Object.fromEntries(
    metars.map((m) => [
      m.icaoId,
      {
        raw: m.rawOb || "",
        time: m.reportTime || m.obsTime || ""
      }
    ])
  );

  const tafById = Object.fromEntries(
    tafs.map((t) => [
      t.icaoId,
      {
        raw: t.rawTAF || "",
        time: t.issueTime || ""
      }
    ])
  );

  const airports = {
    KPOC: { name: "Brackett Field" },
    KCCB: { name: "Cable Airport" },
    KRAL: { name: "Riverside Municipal" }
  };

  const airportEntries = stations.map((code) => [
    code,
    {
      name: airports[code].name,
      metar: metarById[code]?.raw || "",
      metarTime: metarById[code]?.time || "",
      taf: tafById[code]?.raw || "",
      tafTime: tafById[code]?.time || ""
    }
  ]);

  const times = airportEntries.flatMap(([, data]) => [data.metarTime, data.tafTime]).filter(Boolean);
  const latestMillis = times
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];

  const payload = {
    updated: latestMillis ? new Date(latestMillis).toISOString() : new Date().toISOString(),
    airports: Object.fromEntries(airportEntries)
  };

  const outPath = path.join(__dirname, "..", "data", "aviation.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  // Fetch and save winds aloft data
  const windsData = await fetchWindsAloft();
  const windsPayload = {
    updated: new Date().toISOString(),
    winds: windsData
  };
  const windsPath = path.join(__dirname, "..", "data", "winds.json");
  fs.writeFileSync(windsPath, `${JSON.stringify(windsPayload, null, 2)}\n`, "utf-8");

  // Fetch METAR Map data for all SoCal airports
  const mapIds = mapStations.map((s) => s.icao).join(",");
  let mapMetars = [];
  try {
    mapMetars = await fetchJson(`${baseUrl}/metar?ids=${mapIds}&format=json`);
  } catch (err) {
    console.error("METAR map fetch failed:", err.message);
  }

  const mapMetarById = Object.fromEntries(
    mapMetars.map((m) => [m.icaoId, m])
  );

  const mapPayload = {
    updated: new Date().toISOString(),
    stations: {}
  };

  for (const ap of mapStations) {
    const m = mapMetarById[ap.icao];
    mapPayload.stations[ap.icao] = {
      name: ap.name,
      lat: ap.lat,
      lon: ap.lon,
      metar: m?.rawOb || "",
      metarTime: m?.reportTime || m?.obsTime || "",
      flightCategory: m?.fltcat || ""
    };
  }

  const mapPath = path.join(__dirname, "..", "data", "metar-map.json");
  fs.writeFileSync(mapPath, `${JSON.stringify(mapPayload, null, 2)}\n`, "utf-8");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
