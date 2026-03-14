const fs = require("fs");
const path = require("path");

const stations = ["KPOC", "KCCB", "KRAL"];
const windsStations = ["ONT", "WJF", "SBA", "SAN"];
const windsFcsts = ["06", "12", "24"];
const windsAltitudes = ["3000", "6000", "9000", "12000", "18000", "24000"];
const baseUrl = "https://aviationweather.gov/api/data";

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
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
