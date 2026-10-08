const form = document.querySelector("#lookup-form");
const submitButton = form.querySelector("button[type='submit']");
const formMessage = document.querySelector("#form-message");
const results = document.querySelector("#results");
const sampleButton = document.querySelector("#sample-button");

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${dateString}T12:00:00`));
}

function showRecord(student) {
  document.querySelector("#student-heading").textContent = `${student.name}'s service record`;
  document.querySelector("#grade-tag").textContent = `Grade ${student.grade}`;
  document.querySelector("#total-hours").textContent = student.totalHours;
  document.querySelector("#organization-count").textContent = student.organizations;
  document.querySelector("#entry-count").textContent = `${student.entries.length} service ${student.entries.length === 1 ? "entry" : "entries"}`;

  const activityList = document.querySelector("#activity-list");
  activityList.replaceChildren(...student.entries.map((entry) => {
    const row = document.createElement("article");
    row.className = "activity-row";

    const main = document.createElement("div");
    main.className = "activity-main";
    const activity = document.createElement("strong");
    activity.textContent = entry.activity;
    main.append(activity);

    const place = document.createElement("span");
    place.className = "activity-place";
    place.textContent = entry.organization;

    const date = document.createElement("time");
    date.className = "activity-date";
    date.dateTime = entry.date;
    date.textContent = formatDate(entry.date);

    const hours = document.createElement("span");
    hours.className = "activity-hours";
    hours.textContent = `${entry.hours} hrs`;

    row.append(main, place, date, hours);
    return row;
  }));

  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function lookupStudent() {
  formMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Looking up your record...";

  try {
    const response = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "We couldn't load your record.");
    showRecord(payload);
  } catch (error) {
    formMessage.textContent = error.message || "Couldn't connect. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "View my service record";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  lookupStudent();
});

sampleButton.addEventListener("click", () => {
  form.elements.email.value = "maya.chen@northview.edu";
  form.elements.name.value = "Maya Chen";
  form.elements.grade.value = "11";
  lookupStudent();
});