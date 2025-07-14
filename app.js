const useMockLocation = false;

let watchId;
let prevCoords = null;
let totalDistance = 0;
const positions = [];

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const distanceDisplay = document.getElementById("distance");
const speedDisplay = document.getElementById("speed");
const networkDisplay = document.getElementById("network");
const canvas = document.getElementById("routeCanvas");
const ctx = canvas.getContext("2d");

// 🌐 Network Information API
function getNetworkStatus() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    networkDisplay.textContent = `${connection.effectiveType}`;
    connection.addEventListener('change', () => {
      networkDisplay.textContent = `${connection.effectiveType}`;
    });
  } else {
    networkDisplay.textContent = "Unavailable";
  }
}

// 🗺️ Draw path on canvas using Canvas API
function drawPath(coords) {
  if (coords.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;

  // Calculate bounds
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;

  const padding = 20;
  const scaleX = (width - padding * 2) / lngRange;
  const scaleY = (height - padding * 2) / latRange;
  const scale = Math.min(scaleX, scaleY);

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();

  coords.forEach((coord, i) => {
    const x = (coord.lng - minLng) * scale + padding;
    const y = (maxLat - coord.lat) * scale + padding;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let lastMoveTimestamp = Date.now();
const EMERGENCY_TIMEOUT = 60000;

function checkInactivity() {
  if (Date.now() - lastMoveTimestamp > EMERGENCY_TIMEOUT) {
    alert("🚨 No movement detected! Notifying emergency contact.");
  }
}
setInterval(checkInactivity, 10000);

function handlePositionUpdate(pos) {
  const { latitude, longitude, speed } = pos.coords;
  console.log("📍 Location update:", latitude, longitude);

  speedDisplay.textContent = speed ? speed.toFixed(2) : "0";

  if (prevCoords) {
    const dist = getDistance(prevCoords.lat, prevCoords.lng, latitude, longitude);
    totalDistance += dist;
    distanceDisplay.textContent = Math.round(totalDistance);
  }

  prevCoords = { lat: latitude, lng: longitude };
  lastMoveTimestamp = Date.now();
  positions.push(prevCoords);
  drawPath(positions);
}

// ▶️ Start tracking
function startTracking() {
  if (!navigator.geolocation && !useMockLocation) {
    alert("Geolocation not supported.");
    return;
  }

  if (useMockLocation) {
    let lat = 28.6139;
    let lng = 77.2090;

    watchId = setInterval(() => {
      lat += 0.0001;
      lng += 0.0001;
      const fakePos = {
        coords: {
          latitude: lat,
          longitude: lng,
          speed: 1
        }
      };
      handlePositionUpdate(fakePos);
    }, 2000);
  } else {
    // 📡 Use real geolocation
    watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (err) => alert("Error: " + err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  startBtn.disabled = true;
  stopBtn.disabled = false;
}

// ⏹️ Stop tracking
function stopTracking() {
  if (useMockLocation) {
    clearInterval(watchId);
  } else if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;

  localStorage.setItem("lastRun", JSON.stringify(positions));

  const blob = new Blob([JSON.stringify(positions)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "safe-runner-route.json";
  a.click();
}

startBtn.addEventListener("click", startTracking);
stopBtn.addEventListener("click", stopTracking);

getNetworkStatus();
