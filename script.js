let map, fakeMarker, routeControl;
let myLocation = null;

window.onload = initMap; // Directly load map, no password

function initMap() {
  map = L.map('map').setView([25.276987, 55.296249], 13); // Fake: Qatar

  L.tileLayer('https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=VcSgtSTkXfCbU3n3RqBO', {
    attribution: '',
    tileSize: 256
  }).addTo(map);

  fakeMarker = L.marker([25.276987, 55.296249], { draggable: false }).addTo(map);
  map.on('dblclick', () => map.removeLayer(fakeMarker));

  setupSearch();
  setupDirectionAutocomplete();
  getLiveLocation(); // preload GPS
}

// UI toggles
document.getElementById("search-toggle").onclick = () => togglePanel("search-panel");
document.getElementById("direction-toggle").onclick = () => togglePanel("direction-panel");
document.getElementById("location-toggle").onclick = getLiveLocation;

function togglePanel(id) {
  document.getElementById("search-panel").style.display = "none";
  document.getElementById("direction-panel").style.display = "none";
  document.getElementById(id).style.display = "block";
}

function hidePanel(id) {
  document.getElementById(id).style.display = "none";
}

// Suggestions
async function fetchSuggestions(query) {
  const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2tzcHRmOHd2MDY5bTMxcGJpazExZjBkaSJ9.PtEyT0MDGHeOS1aNq6xOZQ&language=en`);
  const data = await res.json();
  return data.features || [];
}

function setupSearch() {
  const box = document.getElementById("searchBox");
  const suggestDiv = document.getElementById("searchSuggestions");

  box.oninput = async () => {
    suggestDiv.innerHTML = "";
    const suggestions = await fetchSuggestions(box.value);
    suggestions.forEach(place => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = place.place_name;
      div.onclick = () => {
        box.value = place.place_name;
        suggestDiv.innerHTML = "";
        setSearchMarker(place.center);
      };
      suggestDiv.appendChild(div);
    });
  };
}

function setSearchMarker([lng, lat]) {
  if (fakeMarker) fakeMarker.setLatLng([lat, lng]);
  else fakeMarker = L.marker([lat, lng]).addTo(map);
  map.setView([lat, lng], 15);
}

async function searchPlace() {
  const query = document.getElementById("searchBox").value;
  const results = await fetchSuggestions(query);
  if (results[0]) setSearchMarker(results[0].center);
}

function setupDirectionAutocomplete() {
  const start = document.getElementById("start");
  const end = document.getElementById("end");

  attachAutocomplete(start, "startSuggestions");
  attachAutocomplete(end, "endSuggestions");
}

function attachAutocomplete(input, suggestionBoxId) {
  const box = document.getElementById(suggestionBoxId);
  input.oninput = async () => {
    box.innerHTML = "";
    const suggestions = await fetchSuggestions(input.value);
    suggestions.forEach(place => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = place.place_name;
      div.onclick = () => {
        input.value = place.place_name;
        box.innerHTML = "";
      };
      box.appendChild(div);
    });
  };
}

async function getDirections() {
  const startVal = document.getElementById("start").value;
  const endVal = document.getElementById("end").value;

  if (!startVal || !endVal) return alert("Enter both locations.");

  const startCoords = startVal.toLowerCase().includes("my location") && myLocation
    ? [myLocation.lng, myLocation.lat]
    : (await fetchSuggestions(startVal))[0]?.center;

  const endCoords = (await fetchSuggestions(endVal))[0]?.center;

  if (!startCoords || !endCoords) return alert("Couldn't find one of the locations.");

  if (routeControl) map.removeControl(routeControl);
  routeControl = L.Routing.control({
    waypoints: [
      L.latLng(startCoords[1], startCoords[0]),
      L.latLng(endCoords[1], endCoords[0])
    ],
    routeWhileDragging: false,
    show: false,
    createMarker: () => null
  }).addTo(map);

  map.setView([startCoords[1], startCoords[0]], 12);
}

function getLiveLocation() {
  if (!navigator.geolocation) return alert("GPS not supported.");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    myLocation = { lat: latitude, lng: longitude };

    L.circleMarker([latitude, longitude], {
      radius: 10,
      color: "#007bff",
      fillColor: "#007bff",
      fillOpacity: 0.6
    }).addTo(map).bindPopup("You are here").openPopup();

    map.setView([latitude, longitude], 15);
  }, () => {
    alert("Permission denied.");
  });
}
