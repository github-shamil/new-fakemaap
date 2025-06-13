// Full advanced, premium-level script.js
let map = L.map("map").setView([25.276987, 51.520008], 13);
let fakeMarker, liveMarker, routingControl;

// MapTiler with ENGLISH labels (no Arabic)
L.tileLayer("https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=VcSgtSTkXfCbU3n3RqBO", {
  attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  maxZoom: 20
}).addTo(map);

// Add fake Qatar marker
fakeMarker = L.marker([25.276987, 51.520008], {
  icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue.png' })
}).addTo(map);

fakeMarker.on("dblclick", () => map.removeLayer(fakeMarker));

document.getElementById("search-toggle").onclick = () => togglePanel("search-panel");
document.getElementById("direction-toggle").onclick = () => togglePanel("direction-panel");
document.getElementById("location-toggle").onclick = () => {
  navigator.geolocation.getCurrentPosition(showLiveLocation, () => alert("Location access denied"));
};

function togglePanel(id) {
  const panel = document.getElementById(id);
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}
function hidePanel(id) {
  document.getElementById(id).style.display = "none";
}

function enableAutocomplete(inputId, suggestionId) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionId);

  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) return (suggestionBox.innerHTML = "");

    L.esri.Geocoding.geocode().text(query).language("en").run((err, results) => {
      if (err || !results.results.length) return;
      suggestionBox.innerHTML = "";
      results.results.forEach(r => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = r.text;
        div.onclick = () => {
          input.value = r.text;
          suggestionBox.innerHTML = "";
        };
        suggestionBox.appendChild(div);
      });
    });
  });
}

enableAutocomplete("searchBox", "searchSuggestions");
enableAutocomplete("start", "startSuggestions");
enableAutocomplete("end", "endSuggestions");

function searchPlace() {
  const query = document.getElementById("searchBox").value.trim();
  if (!query) return;
  L.esri.Geocoding.geocode().text(query).language("en").run((err, res) => {
    if (!res.results.length) return;
    const latlng = res.results[0].latlng;
    if (fakeMarker) map.removeLayer(fakeMarker);
    fakeMarker = L.marker(latlng, {
      icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red.png' })
    }).addTo(map);
    map.setView(latlng, 14);
  });
}

function getDirections() {
  const start = document.getElementById("start").value.trim();
  const end = document.getElementById("end").value.trim();
  if (!start || !end) return;

  if (routingControl) map.removeControl(routingControl);

  const resolve = (place) => {
    return new Promise((resolve) => {
      if (place.toLowerCase() === "my current location" && liveMarker) {
        resolve(liveMarker.getLatLng());
      } else {
        L.esri.Geocoding.geocode().text(place).language("en").run((err, res) => {
          if (!res.results.length) return resolve(null);
          resolve(res.results[0].latlng);
        });
      }
    });
  };

  Promise.all([resolve(start), resolve(end)]).then(([startLatLng, endLatLng]) => {
    if (!startLatLng || !endLatLng) return alert("Could not find one of the locations.");

    routingControl = L.Routing.control({
      waypoints: [startLatLng, endLatLng],
      routeWhileDragging: false,
      createMarker: (i, wp) => {
        return L.marker(wp.latLng, {
          icon: L.icon({
            iconUrl: i === 0 ? "assets/live-location.svg" : "https://maps.gstatic.com/mapfiles/ms2/micons/red.png",
            iconSize: [32, 32]
          })
        });
      }
    }).addTo(map);
  });
}

function showLiveLocation(position) {
  const coords = [position.coords.latitude, position.coords.longitude];
  if (liveMarker) map.removeLayer(liveMarker);
  liveMarker = L.marker(coords, {
    icon: L.icon({ iconUrl: "assets/live-location.svg", iconSize: [32, 32] })
  }).addTo(map);
  map.setView(coords, 15);
}
