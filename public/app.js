const listingList = document.querySelector("#listing-list");
const emptyState = document.querySelector("#empty-state");
const listingForm = document.querySelector("#listing-form");
const formMessage = document.querySelector("#form-message");
const categoryFilters = document.querySelectorAll("[data-category]");
const statusFilter = document.querySelector("#status-filter");
const foodIcons = {
  Produce: "🥬",
  Prepared: "🍲",
  Dairy: "🥛",
  Bakery: "🥖",
  Pantry: "🥫",
};

let listings = [];
let selectedCategory = "All";

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
}

function formatPickupWindow(listing) {
  const date = new Date(`${listing.pickupDate}T12:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const dateKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const dayLabel = listing.pickupDate === dateKey(today)
    ? "Today"
    : listing.pickupDate === dateKey(tomorrow)
      ? "Tomorrow"
      : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
  const formatTime = (time) => new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${time}:00`));
  return `${dayLabel}, ${formatTime(listing.pickupStart)}–${formatTime(listing.pickupEnd)}`;
}

function updateMetrics(metrics) {
  document.querySelector("#meals-saved").textContent = formatNumber(metrics.mealsSaved);
  document.querySelector("#pounds-distributed").textContent = formatNumber(metrics.poundsDistributed);
  document.querySelector("#co2-avoided").textContent = formatNumber(metrics.co2Avoided);
  document.querySelector("#available-count").textContent = formatNumber(metrics.available);
}

function makeTag(className, text) {
  const tag = document.createElement("span");
  tag.className = className;
  tag.textContent = text;
  return tag;
}

function createListingCard(listing) {
  const card = document.createElement("article");
  card.className = "listing-card";
  card.dataset.status = listing.status;

  const icon = document.createElement("div");
  icon.className = `food-icon food-${listing.category.toLowerCase()}`;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = foodIcons[listing.category] || "🥬";

  const content = document.createElement("div");
  content.className = "listing-content";
  const topline = document.createElement("div");
  topline.className = "listing-tags";
  topline.append(
    makeTag("category-tag", listing.category),
    makeTag(`status-tag status-${listing.status.toLowerCase().replace(" ", "-")}`, listing.status),
  );
  const title = document.createElement("h3");
  title.textContent = listing.item;
  const donor = document.createElement("p");
  donor.className = "listing-donor";
  donor.textContent = `${listing.donor} · ${listing.location}`;

  const details = document.createElement("div");
  details.className = "listing-details";
  const quantity = document.createElement("span");
  const quantityIcon = document.createElement("span");
  quantityIcon.setAttribute("aria-hidden", "true");
  quantityIcon.textContent = "▦";
  quantity.append(quantityIcon, ` ${formatNumber(listing.quantity)} ${listing.unit}`);
  const pickup = document.createElement("span");
  const pickupIcon = document.createElement("span");
  pickupIcon.setAttribute("aria-hidden", "true");
  pickupIcon.textContent = "◷";
  pickup.append(pickupIcon, ` ${formatPickupWindow(listing)}`);
  details.append(quantity, pickup);
  content.append(topline, title, donor, details);

  const aside = document.createElement("div");
  aside.className = "listing-aside";
  const weight = document.createElement("div");
  weight.className = "listing-weight";
  weight.textContent = `${formatNumber(listing.weight)} lbs`;
  const meals = document.createElement("span");
  meals.className = "listing-meals";
  meals.textContent = `~${formatNumber(listing.meals)} meals`;
  aside.append(weight, meals);

  if (listing.status === "Available" || listing.status === "Claimed" || listing.status === "In Transit") {
    const action = document.createElement("button");
    action.className = listing.status === "Available" ? "claim-button" : "progress-button";
    action.type = "button";
    action.dataset.listingId = listing.id;
    action.textContent = listing.status === "Available"
      ? "Claim food →"
      : listing.status === "Claimed"
        ? "Start pickup →"
        : "Mark delivered ✓";
    action.addEventListener("click", () => advanceListing(listing, action));
    aside.append(action);
  } else {
    const delivered = document.createElement("span");
    delivered.className = "delivered-note";
    delivered.textContent = "Safely delivered ✓";
    aside.append(delivered);
  }

  card.append(icon, content, aside);
  if (listing.status !== "Available") {
    const progress = document.createElement("div");
    progress.className = "listing-progress";
    const recipient = document.createElement("span");
    recipient.className = "progress-recipient";
    recipient.textContent = listing.status === "Delivered"
      ? `Delivered to ${listing.claimedBy}`
      : `Reserved for ${listing.claimedBy}`;
    const steps = document.createElement("span");
    steps.className = "progress-steps";
    const currentStep = ["Available", "Claimed", "In Transit", "Delivered"].indexOf(listing.status);
    ["Claimed", "In transit", "Delivered"].forEach((label, index) => {
      const step = document.createElement("span");
      step.className = index < currentStep ? "step complete" : index === currentStep ? "step current" : "step";
      step.textContent = label;
      steps.append(step);
    });
    progress.append(recipient, steps);
    card.append(progress);
  }
  return card;
}

function renderListings() {
  const visibleListings = listings.filter((listing) => {
    const categoryMatches = selectedCategory === "All" || listing.category === selectedCategory;
    const status = statusFilter.value;
    const statusMatches = status === "All"
      || (status === "Open" && listing.status !== "Delivered")
      || listing.status === status;
    return categoryMatches && statusMatches;
  });
  listingList.replaceChildren(...visibleListings.map(createListingCard));
  emptyState.hidden = visibleListings.length > 0;
  document.querySelector("#board-count").textContent = listings.length;
  document.querySelector("#all-count").textContent = listings.length;
}

async function loadListings() {
  try {
    const response = await fetch("/api/listings");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Couldn't load food listings.");
    listings = payload.listings;
    document.querySelector("#board-message").textContent = "";
    updateMetrics(payload.metrics);
    renderListings();
  } catch (error) {
    document.querySelector("#board-message").textContent = error.message || "Couldn't refresh the food network.";
    if (!listings.length) {
      listingList.replaceChildren();
      emptyState.hidden = false;
      emptyState.textContent = "Couldn't connect to the food network. Please refresh to try again.";
    }
  }
}

async function advanceListing(listing, button) {
  const nextStatus = {
    Available: "Claimed",
    Claimed: "In Transit",
    "In Transit": "Delivered",
  }[listing.status];
  button.disabled = true;
  button.textContent = "Updating…";
  const message = document.querySelector("#board-message");
  message.textContent = "";
  const body = { status: nextStatus };
  if (nextStatus === "Claimed") {
    body.claimedBy = document.querySelector("#claiming-org").value;
  }
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(listing.id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Couldn't update the listing.");
    const index = listings.findIndex((record) => record.id === listing.id);
    listings[index] = payload.listing;
    updateMetrics(payload.metrics);
    renderListings();
  } catch (error) {
    message.textContent = error.message || "Couldn't update the listing. Please try again.";
    button.disabled = false;
    button.textContent = listing.status === "Available"
      ? "Claim food →"
      : listing.status === "Claimed"
        ? "Start pickup →"
        : "Mark delivered ✓";
  }
}

categoryFilters.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    categoryFilters.forEach((filter) => filter.classList.toggle("selected", filter === button));
    renderListings();
  });
});
statusFilter.addEventListener("change", renderListings);

listingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const submitButton = listingForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Posting listing…";
  const formData = Object.fromEntries(new FormData(listingForm));
  formData.quantity = Number(formData.quantity);
  formData.weight = Number(formData.weight);
  formData.meals = Number(formData.meals);

  try {
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Couldn't post this listing.");
    listings.unshift(payload.listing);
    updateMetrics(payload.metrics);
    selectedCategory = "All";
    statusFilter.value = "Open";
    categoryFilters.forEach((filter) => filter.classList.toggle("selected", filter.dataset.category === "All"));
    renderListings();
    listingForm.reset();
    listingForm.elements.category.value = "Produce";
    listingForm.elements.quantity.value = "10";
    listingForm.elements.unit.value = "boxes";
    listingForm.elements.pickupDate.value = listingForm.elements.pickupDate.min;
    listingForm.elements.pickupStart.value = "16:00";
    listingForm.elements.pickupEnd.value = "18:00";
    formMessage.textContent = "Your food listing is live. Thanks for sharing!";
    document.querySelector("#food-board").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    formMessage.textContent = error.message || "Couldn't connect. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Post food listing";
  }
});

const today = new Date();
document.querySelector("#pickup-date").min = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");
document.querySelector("#pickup-date").value = document.querySelector("#pickup-date").min;
document.querySelector("#pickup-start").value = "16:00";
document.querySelector("#pickup-end").value = "18:00";

loadListings();
setInterval(() => {
  if (document.visibilityState === "visible") loadListings();
}, 10000);
