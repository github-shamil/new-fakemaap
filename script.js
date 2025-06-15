// 🌍 Map Initialization
let map = L.map("map").setView([25.276987, 51.520008], 13);
let fakeMarker, liveMarker, routingControl;
let isStreet = true, trafficLayer = null;

// 🗺️ Tile Layers
const streetLayer = L.tileLayer("https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=VcSgtSTkXfCbU3n3RqBO", {
  attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>', maxZoom: 20
});
const satelliteLayer = L.tileLayer("https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=VcSgtSTkXfCbU3n3RqBO", {
  attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>', maxZoom: 20
});
streetLayer.addTo(map);

// 🧭 Initial Fake Marker
fakeMarker = L.marker([25.276987, 51.520008], {
  icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue.png' })
}).addTo(map);
fakeMarker.on("dblclick", () => map.removeLayer(fakeMarker));

// 🌗 Dark Mode Toggle
document.getElementById("theme-toggle").onclick = () => {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
};

// 🛰️ Layer Switch
document.getElementById("layer-toggle").onclick = () => {
  if (isStreet) {
    map.removeLayer(streetLayer);
    map.addLayer(satelliteLayer);
  } else {
    map.removeLayer(satelliteLayer);
    map.addLayer(streetLayer);
  }
  isStreet = !isStreet;
};

// 📍 My Live Location
document.getElementById("location-toggle").onclick = () =>
  navigator.geolocation.getCurrentPosition(showLiveLocation, () => alert("Location access denied"));

function showLiveLocation(position) {
  const coords = [position.coords.latitude, position.coords.longitude];
  if (liveMarker) map.removeLayer(liveMarker);
  liveMarker = L.marker(coords, {
    icon: L.icon({ iconUrl: "assets/live-location.svg", iconSize: [32, 32] })
  }).addTo(map);
  map.setView(coords, 15);
  fetchWeather(coords[0], coords[1]);
}

// 🔍 Autocomplete for Inputs
function enableAutocomplete(inputId, suggestionId) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionId);

  input.addEventListener("input", async () => {
    const query = input.value.trim();
    if (!query) return (suggestionBox.innerHTML = "");

    const res = await fetch(`https://photon.komoot.io/api/?q=${query}&lang=en`);
    const data = await res.json();
    suggestionBox.innerHTML = "";
 data.features.slice(0, 5).forEach((feature) => {
  const div = document.createElement("div");
  div.className = "suggestion";
  div.textContent = feature.properties.name + ", " + feature.properties.country;

  function selectPlace() {
    input.value = feature.properties.name;
    input.dataset.lat = feature.geometry.coordinates[1];
    input.dataset.lon = feature.geometry.coordinates[0];
    suggestionBox.innerHTML = "";
    input.blur();
    saveSearch(input.value);
  }

  div.addEventListener("click", selectPlace);
  div.addEventListener("touchstart", selectPlace);

  suggestionBox.appendChild(div);
});

  });
}

enableAutocomplete("searchBox", "searchSuggestions");
enableAutocomplete("start", "startSuggestions");
enableAutocomplete("end", "endSuggestions");

// 📌 Search Place
async function searchPlace() {
  const input = document.getElementById("searchBox");
  let lat = input.dataset.lat;
  let lon = input.dataset.lon;

  // 🔍 If no suggestion clicked (manual input), fetch coords using Photon
  if (!lat || !lon) {
    const query = input.value.trim();
    if (!query) return alert("Please enter a place.");

    const res = await fetch(`https://photon.komoot.io/api/?q=${query}&lang=en`);
    const data = await res.json();
    if (data.features.length === 0) return alert("Place not found. Try again.");

    const coords = data.features[0].geometry.coordinates;
    lat = coords[1];
    lon = coords[0];
  }

  // 🗺️ Update fake marker
  if (fakeMarker) map.removeLayer(fakeMarker);
  const coords = [parseFloat(lat), parseFloat(lon)];
  fakeMarker = L.marker(coords, {
    icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red.png' })
  }).addTo(map);
  map.setView(coords, 15);
  fetchWeather(coords[0], coords[1]);
  saveSearch(input.value);
}


// 🛣️ Directions
async function getDirections() {
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");

  let startCoords, endCoords;

  // 🧭 Handle "My Location"
  if (startInput.value.toLowerCase() === "my location") {
    navigator.geolocation.getCurrentPosition((pos) => {
      startCoords = [pos.coords.latitude, pos.coords.longitude];
      handleEnd();
    });
  } else {
    startCoords = await resolveCoords(startInput);
    handleEnd();
  }

  async function handleEnd() {
    endCoords = await resolveCoords(endInput);
    if (!startCoords || !endCoords) return;

    buildRoute(startCoords, endCoords);
    fetchWeather(...endCoords);
  }

  async function resolveCoords(input) {
    if (input.dataset.lat && input.dataset.lon) {
      return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
    }

    const query = input.value.trim();
    if (!query) return alert("Please enter both places.");
    const res = await fetch(`https://photon.komoot.io/api/?q=${query}&lang=en`);
    const data = await res.json();
    if (data.features.length === 0) {
      alert(`Place not found: ${query}`);
      return null;
    }
    const coords = data.features[0].geometry.coordinates;
    input.dataset.lat = coords[1];
    input.dataset.lon = coords[0];
    return [coords[1], coords[0]];
  }
}


function buildRoute(startCoords, endCoords) {
  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [L.latLng(...startCoords), L.latLng(...endCoords)],
    lineOptions: { styles: [{ color: "#1976d2", weight: 5 }] },
    show: false,
    createMarker: (i, wp) => {
      return L.marker(wp.latLng, {
        icon: L.icon({
          iconUrl: i === 0 ? "assets/live-location.svg" : "https://maps.gstatic.com/mapfiles/ms2/micons/red.png",
          iconSize: [32, 32]
        })
      });
    }
  })
    .addTo(map)
    .on("routesfound", function (e) {
      const route = e.routes[0];
      const summary = route.summary;
      document.getElementById("routeSummary").innerHTML =
        `<p><strong>Distance:</strong> ${(summary.totalDistance / 1000).toFixed(2)} km<br><strong>Time:</strong> ${(summary.totalTime / 60).toFixed(1)} min</p>`;
    });
}

function getCoords(input) {
  return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
}

// 📑 Panels
document.getElementById("direction-toggle").onclick = () => togglePanel("direction-panel");
document.getElementById("history-toggle").onclick = () => togglePanel("history-panel");

function togglePanel(id) {
  const panel = document.getElementById(id);
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}
function hidePanel(id) {
  document.getElementById(id).style.display = "none";
}

// 📜 Search History
function saveSearch(query) {
  let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
  if (!history.includes(query)) {
    history.unshift(query);
    if (history.length > 10) history.pop();
    localStorage.setItem("searchHistory", JSON.stringify(history));
    renderHistory();
  }
}
function renderHistory() {
  const list = document.getElementById("historyList");
  let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
  list.innerHTML = "";
  history.forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    li.onclick = () => {
      document.getElementById("searchBox").value = q;
      document.getElementById("searchBox").dispatchEvent(new Event("input"));
    };
    list.appendChild(li);
  });
}
renderHistory();

// 🚦 Real TomTom Traffic Toggle
let tomtomTraffic;

document.getElementById("traffic-toggle").onclick = () => {
  const apiKey = "a3vv3A6LAvqLAIKmknfwzSBXEjJOpXwu"; // ⬅️ Replace with your real key

  if (!tomtomTraffic) {
    tomtomTraffic = L.tileLayer(
      `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${apiKey}`,
      {
        attribution: '&copy; <a href="https://www.tomtom.com/">TomTom</a>',
        maxZoom: 20,
        opacity: 0.7,
      }
    );
    map.addLayer(tomtomTraffic);
  } else {
    map.hasLayer(tomtomTraffic)
      ? map.removeLayer(tomtomTraffic)
      : map.addLayer(tomtomTraffic);
  }
};


// ⛅ Weather Toggle
document.getElementById("weather-toggle").onclick = () => {
  const box = document.getElementById("weather-box");
  box.style.display = box.style.display === "block" ? "none" : "block";
};

// 🌦️ Fetch Weather
async function fetchWeather(lat, lon) {
  const apiKey = "71aec132cf2764d6ea577d3616629a9b"; // <-- Replace with real key
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  document.getElementById("weatherTemp").innerText = `${Math.round(data.main.temp)}°C`;
  document.getElementById("weatherCondition").innerText = data.weather[0].description;
  document.getElementById("weatherDetails").innerHTML = `
    <p>Humidity: ${data.main.humidity}%<br>
    Wind: ${data.wind.speed} m/s<br>
    Pressure: ${data.main.pressure} hPa</p>
  `;
}
