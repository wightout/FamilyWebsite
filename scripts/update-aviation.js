const fs = require("fs");
const path = require("path");

const stations = ["KPOC", "KCCB", "KRAL"];
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

  const payload = {
    updated: new Date().toISOString(),
    airports: Object.fromEntries(
      stations.map((code) => [
        code,
        {
          name: airports[code].name,
          metar: metarById[code]?.raw || "",
          metarTime: metarById[code]?.time || "",
          taf: tafById[code]?.raw || "",
          tafTime: tafById[code]?.time || ""
        }
      ])
    )
  };

  const outPath = path.join(__dirname, "..", "data", "aviation.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
