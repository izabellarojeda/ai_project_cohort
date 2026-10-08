const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");
const maxBodySize = 16 * 1024;

const students = [
  {
    email: "maya.chen@northview.edu",
    name: "Maya Chen",
    grade: "11",
    entries: [
      { organization: "Riverside Food Pantry", activity: "Meal kit packing", date: "2026-09-28", hours: 3 },
      { organization: "Greenway Conservancy", activity: "Trail restoration", date: "2026-09-21", hours: 4 },
      { organization: "Northview Elementary", activity: "Reading buddy", date: "2026-09-14", hours: 2 },
      { organization: "Riverside Food Pantry", activity: "Community garden", date: "2026-09-07", hours: 3 },
    ],
  },
  {
    email: "jordan.lee@northview.edu",
    name: "Jordan Lee",
    grade: "10",
    entries: [
      { organization: "City Animal Shelter", activity: "Weekend adoption event", date: "2026-09-27", hours: 5 },
      { organization: "Maple Street Library", activity: "Book sale setup", date: "2026-09-13", hours: 3 },
    ],
  },
  {
    email: "alex.rivera@northview.edu",
    name: "Alex Rivera",
    grade: "12",
    entries: [
      { organization: "Community Bike Works", activity: "Youth bike repair", date: "2026-09-25", hours: 4 },
      { organization: "Riverside Food Pantry", activity: "Produce distribution", date: "2026-09-18", hours: 3 },
      { organization: "Greenway Conservancy", activity: "Park cleanup", date: "2026-09-06", hours: 2 },
    ],
  },
];

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodySize) {
      throw new Error("Request body too large");
    }
  }
  return JSON.parse(body);
}

async function handleLookup(request, response) {
  let input;
  try {
    input = await readJson(request);
  } catch {
    sendJson(response, 400, { error: "Please submit a valid form." });
    return;
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    sendJson(response, 400, { error: "Please submit a valid form." });
    return;
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim().toLowerCase() : "";
  const grade = typeof input.grade === "string" ? input.grade : "";
  if (!email || !name || !["9", "10", "11", "12"].includes(grade)) {
    sendJson(response, 400, { error: "Enter your school email, name, and grade." });
    return;
  }

  const student = students.find((record) =>
    record.email === email && record.name.toLowerCase() === name && record.grade === grade,
  );
  if (!student) {
    sendJson(response, 404, { error: "We couldn't find a matching student record. Check your details and try again." });
    return;
  }

  const entries = [...student.entries].sort((first, second) => second.date.localeCompare(first.date));
  sendJson(response, 200, {
    name: student.name,
    grade: student.grade,
    totalHours: entries.reduce((total, entry) => total + entry.hours, 0),
    organizations: [...new Set(entries.map((entry) => entry.organization))].length,
    entries,
  });
}

const pages = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/lookup") {
    await handleLookup(request, response);
    return;
  }

  const page = request.method === "GET" ? pages[url.pathname] : null;
  if (!page) {
    sendJson(response, 404, { error: "Page not found." });
    return;
  }

  try {
    const content = await readFile(path.join(publicDirectory, page[0]));
    response.writeHead(200, {
      "Content-Type": page[1],
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:",
    });
    response.end(content);
  } catch {
    sendJson(response, 500, { error: "The page could not be loaded." });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Community Hours is running at http://localhost:${port}`);
});