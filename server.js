const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");
const maxBodySize = 16 * 1024;
const statuses = ["Available", "Claimed", "In Transit", "Delivered"];

function dayFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const listings = [
  {
    id: randomUUID(),
    item: "Seasonal produce boxes",
    category: "Produce",
    quantity: 36,
    unit: "boxes",
    weight: 180,
    meals: 216,
    donor: "Green Valley Market",
    location: "184 Willow Street",
    pickupDate: dayFromNow(0),
    pickupStart: "16:30",
    pickupEnd: "18:00",
    status: "Available",
    claimedBy: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    item: "Freshly baked sourdough loaves",
    category: "Bakery",
    quantity: 24,
    unit: "loaves",
    weight: 30,
    meals: 36,
    donor: "Little Hearth Bakery",
    location: "22 Market Lane",
    pickupDate: dayFromNow(0),
    pickupStart: "17:00",
    pickupEnd: "19:00",
    status: "Claimed",
    claimedBy: "Harbor House Shelter",
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    item: "Prepared vegetarian meals",
    category: "Prepared",
    quantity: 18,
    unit: "trays",
    weight: 45,
    meals: 72,
    donor: "Juniper Kitchen",
    location: "6 Oak Avenue",
    pickupDate: dayFromNow(0),
    pickupStart: "18:00",
    pickupEnd: "19:30",
    status: "In Transit",
    claimedBy: "Riverside Community Pantry",
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    item: "Organic whole milk",
    category: "Dairy",
    quantity: 20,
    unit: "gallons",
    weight: 168,
    meals: 120,
    donor: "Maple & Main Grocers",
    location: "310 Main Street",
    pickupDate: dayFromNow(1),
    pickupStart: "09:00",
    pickupEnd: "11:00",
    status: "Available",
    claimedBy: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    item: "Mixed fruit snack packs",
    category: "Produce",
    quantity: 42,
    unit: "packs",
    weight: 56,
    meals: 84,
    donor: "Green Valley Market",
    location: "184 Willow Street",
    pickupDate: dayFromNow(1),
    pickupStart: "10:00",
    pickupEnd: "12:00",
    status: "Available",
    claimedBy: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    item: "Assorted pantry staples",
    category: "Pantry",
    quantity: 15,
    unit: "crates",
    weight: 120,
    meals: 144,
    donor: "Northside Co-op",
    location: "51 Pine Road",
    pickupDate: dayFromNow(-1),
    pickupStart: "14:00",
    pickupEnd: "16:00",
    status: "Delivered",
    claimedBy: "City Food Bank Drivers",
    createdAt: new Date().toISOString(),
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

function getMetrics() {
  const delivered = listings.filter((listing) => listing.status === "Delivered");
  return {
    available: listings.filter((listing) => listing.status === "Available").length,
    mealsSaved: delivered.reduce((total, listing) => total + listing.meals, 0),
    poundsDistributed: delivered.reduce((total, listing) => total + listing.weight, 0),
    co2Avoided: Math.round(delivered.reduce((total, listing) => total + listing.weight * 2.5, 0)),
  };
}

async function handleCreateListing(request, response) {
  let input;
  try {
    input = await readJson(request);
  } catch {
    sendJson(response, 400, { error: "Please submit a valid listing." });
    return;
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    sendJson(response, 400, { error: "Please submit a valid listing." });
    return;
  }

  const item = typeof input.item === "string" ? input.item.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const donor = typeof input.donor === "string" ? input.donor.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const pickupDate = typeof input.pickupDate === "string" ? input.pickupDate : "";
  const pickupStart = typeof input.pickupStart === "string" ? input.pickupStart : "";
  const pickupEnd = typeof input.pickupEnd === "string" ? input.pickupEnd : "";
  const quantity = Number(input.quantity);
  const weight = Number(input.weight);
  const meals = Number(input.meals);
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const parsedDate = new Date(`${pickupDate}T12:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)
    && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === pickupDate
    && pickupDate >= new Date().toISOString().slice(0, 10);
  const validTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (
    !item || item.length > 100 ||
    !["Produce", "Prepared", "Dairy", "Bakery", "Pantry"].includes(category) ||
    !donor || donor.length > 100 ||
    !location || location.length > 160 ||
    !validDate || !validTime(pickupStart) || !validTime(pickupEnd) || pickupEnd <= pickupStart ||
    !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 ||
    !Number.isFinite(weight) || weight <= 0 || weight > 100000 ||
    !Number.isInteger(meals) || meals < 1 || meals > 100000 ||
    !unit || unit.length > 20
  ) {
    sendJson(response, 400, { error: "Check the item, pickup details, and positive quantity and impact values." });
    return;
  }

  const listing = {
    id: randomUUID(),
    item,
    category,
    quantity,
    unit,
    weight,
    meals,
    donor,
    location,
    pickupDate,
    pickupStart,
    pickupEnd,
    status: "Available",
    claimedBy: "",
    createdAt: new Date().toISOString(),
  };
  listings.unshift(listing);
  sendJson(response, 201, { listing, metrics: getMetrics() });
}

async function handleUpdateStatus(request, response, id) {
  let input;
  try {
    input = await readJson(request);
  } catch {
    sendJson(response, 400, { error: "Please submit a valid status update." });
    return;
  }

  const listing = listings.find((record) => record.id === id);
  if (!listing) {
    sendJson(response, 404, { error: "That food listing could not be found." });
    return;
  }

  const nextStatus = input && typeof input.status === "string" ? input.status : "";
  const statusIndex = statuses.indexOf(listing.status);
  if (nextStatus !== statuses[statusIndex + 1]) {
    sendJson(response, 409, { error: `This listing cannot move from ${listing.status} to ${nextStatus || "that status"}.` });
    return;
  }

  if (nextStatus === "Claimed") {
    const claimedBy = typeof input.claimedBy === "string" ? input.claimedBy.trim() : "";
    if (!claimedBy || claimedBy.length > 100) {
      sendJson(response, 400, { error: "Choose a receiving organization before claiming this listing." });
      return;
    }
    listing.claimedBy = claimedBy;
  }
  listing.status = nextStatus;
  sendJson(response, 200, { listing, metrics: getMetrics() });
}

const pages = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/listings") {
    sendJson(response, 200, { listings, metrics: getMetrics() });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/listings") {
    await handleCreateListing(request, response);
    return;
  }
  const statusMatch = url.pathname.match(/^\/api\/listings\/([0-9a-f-]+)\/status$/i);
  if (request.method === "PATCH" && statusMatch) {
    await handleUpdateStatus(request, response, statusMatch[1]);
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
      "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:",
    });
    response.end(content);
  } catch {
    sendJson(response, 500, { error: "The page could not be loaded." });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`GoodGather is running at http://localhost:${port}`);
});
