window.addEventListener("load", () => {
  loadDaySpecialOptions();
  loadData();
});

document.getElementById("dataForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("date").value;
  const first = parseInt(document.getElementById("first").value);
  const second = parseInt(document.getElementById("second").value);
  const special = document.getElementById("daySpecial").value;

  if (!date || isNaN(first) || isNaN(second)) {
    alert("Please enter valid values.");
    return;
  }

  await fetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, first, second, special })
  });

  // Reload
  loadData();
  //e.target.reset();
});

let fullData = [];

async function loadData() {
  const res = await fetch("/data");
  const data = await res.json();
  fullData = data;
  //renderTable(data);
}

async function filterData() {
  const year = document.getElementById("filterYear").value;
  const month = document.getElementById("filterMonth").value;
  const day = document.getElementById("filterDay").value;
  const week = document.getElementById("filterWeek").value;
  const special = document.getElementById("filterDaySpecial").value;

  const res = await fetch("/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month, day, week, special })
  });

  const data = await res.json();
  renderTable(data); // Reuse your existing table-rendering logic
}

function applyFilters() {
  const y = document.getElementById("filterYear").value;
  const m = document.getElementById("filterMonth").value;
  const w = document.getElementById("filterWeek").value;
  const d = document.getElementById("filterDay").value;
  const ds = document.getElementById("filterDaySpecial").value; 
  const wd = document.getElementById("filterWeekDay").value;

  const filtered = fullData.filter(row =>
    (!y || row.Year == y) &&
    (!m || row.Month == m) &&
    (!w || row.WeekNo == w) &&
    (!d || new Date (row.Date).getDate() == d) &&
    (!ds || row.DaySpecial === ds) &&
    (!wd || row.DayName == wd)
  );
  renderTable(filtered);
 // console.log("Filtering by special:", ds.toString());
}

function resetFilters() {
  document.getElementById("filterYear").value = "";
  document.getElementById("filterMonth").value = "";
  document.getElementById("filterWeek").value = "";
  document.getElementById("filterDay").value = "";
  document.getElementById("filterDaySpecial").value = "";
  document.getElementById("filterWeekDay").value = "";
  renderTable(fullData);
}

function renderTable(data) {
  const table = document.getElementById("dataTable");
  table.innerHTML = "<tr><th>Date</th><th>Day</th><th>First</th><th>Second</th><th>holeNo</th><th>DaySpecial</th></tr>";

  let firstArray = [];
  let secondArray = [];

  data.forEach(row => {
    table.innerHTML += `<tr>
      <td>${row.Date}</td>
      <td>${row.DayName}</td>
      <td>${row.FirstNumber}</td>
      <td>${row.SecondNumber}</td>
      <td>${row.FirstNumber}${row.SecondNumber}</td>
      <td>${row.DaySpecial || ""}</td>
    </tr>`;
    firstArray.push(row.FirstNumber);
    secondArray.push(row.SecondNumber);
  });

  renderStatsTable(firstArray, secondArray);
  showStats("FirstNumber Stats", firstArray, "firstStats");
  showStats("SecondNumber Stats", secondArray, "secondStats");
}

async function addDaySpecialOption() {
  const newOption = document.getElementById("newDaySpecial").value.trim();
  if (!newOption) return;

  const res = await fetch("/dayspecials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newOption })
  });

  if (res.ok) {
    await loadDaySpecialOptions(); // reload both dropdowns
    document.getElementById("newDaySpecial").value = "";
  } else {
    alert("Could not add option.");
  }
}

async function loadDaySpecialOptions() {
  const res = await fetch("/dayspecials");
  const options = await res.json();

  const entrySelect = document.getElementById("daySpecial");
  const filterSelect = document.getElementById("filterDaySpecial");

  entrySelect.innerHTML = `<option value="">None</option>`;
  filterSelect.innerHTML = `<option value="">All</option>`;

  options.forEach(opt => {
    const o1 = new Option(opt, opt);
    const o2 = new Option(opt, opt);
    entrySelect.appendChild(o1);
    filterSelect.appendChild(o2);
  });
}

function renderStatsTable(firstArray, secondArray) {
  const table = document.getElementById("statsTable").querySelector("tbody");
  table.innerHTML = "";

  const stats = [
    { name: "Total Count", fn: a => a.length },
    { name: "Average", fn: avg },
    { name: "Median", fn: median },
    { name: "Most Frequent", fn: mode },
    { name: "Least Frequent", fn: least },
    { name: "Missing Digits (0–9)", fn: missingDigits }
  ];

  stats.forEach((stat, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${stat.name}</td>
      <td>${format(stat.fn(firstArray))}</td>
      <td>${format(stat.fn(secondArray))}</td>
    `;
    table.appendChild(row);
  });
}

// Optional: format arrays for display
function format(val) {
  return Array.isArray(val) ? val.join(", ") : val;
}

function avg(arr) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : "—";
}

function median(arr) {
  if (!arr.length) return "—";
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(0);
}

function mode(arr) {
  if (!arr.length) return "—";
  const freq = {};
  arr.forEach(n => freq[n] = (freq[n] || 0) + 1);
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter(k => freq[k] === maxFreq);
  return modes.join(", ");
}

function least(arr) {
  if (!arr.length) return "—";
  const freq = {};
  arr.forEach(n => freq[n] = (freq[n] || 0) + 1);
  const minFreq = Math.min(...Object.values(freq));
  const leasts = Object.keys(freq).filter(k => freq[k] === minFreq);
  return leasts.join(", ");
}

function missingDigits(arr) {
  const present = new Set(arr.map(n => Number(n)));
  const all = [...Array(10).keys()];
  return all.filter(n => !present.has(n));
}

function showStats(title, arr, elementId) {
  if (arr.length === 0) {
    document.getElementById(elementId).innerHTML = `<h3>${title}</h3><p>No data</p>`;
    return;
  }

  const random = arr[Math.floor(Math.random() * arr.length)];
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const freq = {};
  arr.forEach(n => freq[n] = (freq[n] || 0) + 1);
  const most = Object.entries(freq).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const least = Object.entries(freq).reduce((a, b) => a[1] < b[1] ? a : b)[0];
  const nth = arr[4] ?? "N/A";

  // Calculate median
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Track digits seen
  const digitsSeen = new Set();
  arr.forEach(n => {
    n.toString().split("").forEach(d => digitsSeen.add(d));
  });

  const allDigits = Array.from({ length: 10 }, (_, i) => i.toString());
  const missingDigits = allDigits.filter(d => !digitsSeen.has(d));


  document.getElementById(elementId).innerHTML = `
    <h3>${title}</h3>
    <p>Count: ${arr.length}</p>
    <p>Random: ${random}</p>
    <p>Average: ${avg.toFixed(0)}</p>
    <p>Most Frequent: ${most}</p>
    <p>Least Frequent: ${least}</p>
    <p>Median: ${median}</p>
    <p>5th Number: ${nth}</p>
    <p>Missing Digits (0–9): <strong>${missingDigits.join(", ") || "None"}</strong></p>
  `;
}
/**
 * Generates all "family numbers" for a given two-digit number based on "cut number" logic.
 * A "cut" digit is its value + 5, modulo 10 (e.g., 0->5, 1->6, 2->7, 3->8, 4->9, 5->0, 6->1, etc.).
 * The logic involves:
 * 1. The original number.
 * 2. The number with both digits "cut" (add/subtract 5).
 * 3. The number with the first digit original, second digit cut.
 * 4. The number with the first digit cut, second digit original.
 * 5. The reversed original number.
 * 6. The reversed number with both digits cut.
 * 7. The reversed number with the first digit original, second digit cut.
 * 8. The reversed number with the first digit cut, second digit original.
 */

function getJodiFamily(num) {
  const numStr = String(num).padStart(2, '0');
  const d1 = parseInt(numStr[0]);
  const d2 = parseInt(numStr[1]);

  const repeatingFamily = ["00", "11", "22", "33", "44", "55", "66", "77", "88", "99"];

  // If repeating number like 00, 11, 22...
  if (d1 === d2) {
    return {
      type: "repeating",
      family: repeatingFamily
    };
  }

  // Jodi family logic
  const getCutDigit = (digit) => (digit + 5) % 10;

  const family = new Set();
  family.add(`${d1}${d2}`);
  family.add(`${getCutDigit(d1)}${getCutDigit(d2)}`);
  family.add(`${d1}${getCutDigit(d2)}`);
  family.add(`${getCutDigit(d1)}${d2}`);

  const r1 = d2;
  const r2 = d1;
  family.add(`${r1}${r2}`);
  family.add(`${getCutDigit(r1)}${getCutDigit(r2)}`);
  family.add(`${r1}${getCutDigit(r2)}`);
  family.add(`${getCutDigit(r1)}${r2}`);

  return {
    type: "jodi",
    family: Array.from(family).sort()
  };
}

function handleJodiInput() {
  const input = document.getElementById("jodiInput").value.trim();
  const num = parseInt(input, 10);

  if (isNaN(num) || num < 0 || num > 99) {
    document.getElementById("jodiResult").innerText = "Please enter a valid 2-digit number (00 to 99)";
    return;
  }

  const result = getJodiFamily(num);

  const label = result.type === "repeating" ? "Family" : "Family";

  document.getElementById("jodiResult").innerHTML = `
    <div><strong>${label}:</strong> ${result.family.join(", ")}</div>
  `;
}

loadData();
