// --- Map Initialization ---
const mapLeft = L.map('map-left', { zoomControl: false }).setView([12.93, 79.13], 13);
let mapRight = null;
L.control.zoom({ position: 'bottomright' }).addTo(mapLeft);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM & &copy; CARTO', maxZoom: 19
}).addTo(mapLeft);

// --- State Management ---
let waypoints = [];
let mapLayers = {
    left: { markers: [], animation: [], timeoutId: null },
    right: { markers: [], animation: [], timeoutId: null }
};
let isCompareView = false;

// --- DOM Elements ---
const statusText = document.getElementById('status');
const findPathBtn = document.getElementById('find-path-btn');
const compareBtn = document.getElementById('compare-btn');
const resetBtn = document.getElementById('reset-btn');
const algoLeftSelect = document.getElementById('algorithm-select-left');
const algoRightSelect = document.getElementById('algorithm-select-right');
const algoRightGroup = document.getElementById('right-algo-group');
const animationSpeedSlider = document.getElementById('animation-speed');
const speedValueSpan = document.getElementById('speed-value');
const appContainer = document.getElementById('app-container');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const setDefaultBtn = document.getElementById('set-defaults-btn');
const defaultStartSelect = document.getElementById('default-start-loc'); // FIX
const defaultEndSelect = document.getElementById('default-end-loc');   // FIX

// --- Event Listeners ---
findPathBtn.addEventListener('click', () => {
    if (waypoints.length < 2) {
        statusText.textContent = "Please set a start and end point first.";
        return;
    }

    clearAnimationLayers();
    mapLayers.left.timeoutId = true;
    if (isCompareView && mapRight) mapLayers.right.timeoutId = true;

    if (isCompareView) {
        findAndAnimate(waypoints[0], waypoints[1], algoLeftSelect.value, mapLeft, mapLayers.left);
        findAndAnimate(waypoints[0], waypoints[1], algoRightSelect.value, mapRight, mapLayers.right);
    } else {
        findAndAnimate(waypoints[0], waypoints[1], algoLeftSelect.value, mapLeft, mapLayers.left);
    }
});

compareBtn.addEventListener('click', () => {
    isCompareView = !isCompareView;
    const mapLeftDiv = document.getElementById('map-left');
    const mapRightDiv = document.getElementById('map-right');

    if (isCompareView) {
        compareBtn.textContent = 'Exit Compare';
        algoRightGroup.style.display = 'block';
        mapRightDiv.style.display = 'block';
        mapLeftDiv.style.width = '50%';
        mapRightDiv.style.width = '50%';
        if (!mapRight) {
            mapRight = L.map('map-right', { zoomControl: false }).setView(mapLeft.getCenter(), mapLeft.getZoom());
            L.control.zoom({ position: 'bottomright' }).addTo(mapRight);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mapRight);
            mapLeft.sync(mapRight);
            mapRight.sync(mapLeft);
            mapRight.on('click', handleMapClick);
        }
        mapLayers.right.markers.forEach(layer => mapRight.removeLayer(layer));
        if (waypoints.length > 0) mapLayers.right.markers.push(createDotMarker(waypoints[0], '#007bff', mapRight));
        if (waypoints.length > 1) mapLayers.right.markers.push(createDotMarker(waypoints[1], '#ff69b4', mapRight));
    } else {
        compareBtn.textContent = 'Compare Algorithms';
        algoRightGroup.style.display = 'none';
        mapRightDiv.style.display = 'none';
        mapLeftDiv.style.width = '100%';
        if (mapRight) {
            [...mapLayers.right.markers, ...mapLayers.right.animation].forEach(layer => mapRight.removeLayer(layer));
            mapLayers.right.markers = [];
            mapLayers.right.animation = [];
        }
    }
    setTimeout(() => {
        mapLeft.invalidateSize();
        if (mapRight) mapRight.invalidateSize();
    }, 300);
});

resetBtn.addEventListener('click', fullReset);
mapLeft.on('click', handleMapClick);
animationSpeedSlider.addEventListener('input', () => {
    speedValueSpan.textContent = animationSpeedSlider.value + 'x';
});
sidebarToggleBtn.addEventListener('click', () => {
    appContainer.classList.toggle('app-container-sidebar-collapsed');
    sidebarToggleBtn.textContent = appContainer.classList.contains('app-container-sidebar-collapsed') ? '»' : '«';
    setTimeout(() => {
        mapLeft.invalidateSize();
        if (mapRight) mapRight.invalidateSize();
    }, 310);
});

setDefaultBtn.addEventListener('click', () => {
    fullReset();
    const [startLat, startLon] = defaultStartSelect.value.split(',');
    const [endLat, endLon] = defaultEndSelect.value.split(',');
    addPointToMap(L.latLng(parseFloat(startLat), parseFloat(startLon)));
    addPointToMap(L.latLng(parseFloat(endLat), parseFloat(endLon)));
});

// --- Core Functions ---
function handleMapClick(e) {
    if (waypoints.length >= 2) return;
    addPointToMap(e.latlng);
}

function addPointToMap(latlng) {
    const color = waypoints.length === 0 ? '#007bff' : '#ff69b4';
    waypoints.push(latlng);
    const leftMarker = createDotMarker(latlng, color, mapLeft);
    mapLayers.left.markers.push(leftMarker);
    if (isCompareView && mapRight) {
        const rightMarker = createDotMarker(latlng, color, mapRight);
        mapLayers.right.markers.push(rightMarker);
    }
    statusText.textContent = waypoints.length === 1 ? 'Click map for end point.' : 'Points set. Click "Find Path" or "Compare".';
}

function createDotMarker(latlng, color, mapInstance) {
    return L.circleMarker(latlng, {
        radius: 8, fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(mapInstance);
}

async function findAndAnimate(startLatLng, endLatLng, algorithm, mapInstance, layerState) {
    statusText.textContent = 'Calculating path...';
    findPathBtn.disabled = true;
    compareBtn.disabled = true;
    try {
        const response = await fetch('/api/find_path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_lat: startLatLng.lat, start_lon: startLatLng.lng,
                end_lat: endLatLng.lat, end_lon: endLatLng.lng,
                algorithm
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.steps?.length > 0 && data.final_path?.length > 0) {
            layerState.timeoutId = true;
            await startAnimation(data.steps, data.final_path, mapInstance, layerState);
        } else {
            statusText.textContent = 'No path found.';
        }
    } catch (err) {
        console.error('Find path failed:', err);
        statusText.textContent = `Error: ${err.message}`;
    } finally {
        findPathBtn.disabled = false;
        compareBtn.disabled = false;
    }
}

function startAnimation(steps, final_path, mapInstance, layerState) {
    return new Promise(resolve => {
        let currentStep = 0;
        const totalSteps = steps.length;
        function animate() {
            if (!layerState.timeoutId) return;
            if (currentStep >= totalSteps) {
                applyFinalPathEffect(final_path, mapInstance, layerState);
                resolve();
                return;
            }
            const stepData = steps[currentStep];
            if (stepData.new_edge) {
                const polyline = L.polyline(stepData.new_edge, { color: '#00ffff', weight: 3, opacity: 0.7 }).addTo(mapInstance);
                layerState.animation.push(polyline);
            }
            statusText.textContent = `Searching... Step ${currentStep + 1} / ${totalSteps}`;
            currentStep++;
            const delay = 1000 / animationSpeedSlider.value;
            layerState.timeoutId = setTimeout(animate, delay);
        }
        animate();
    });
}

function applyFinalPathEffect(path, mapInstance, layerState) {

    layerState.animation.forEach(layer => {

        setTimeout(() => mapInstance.removeLayer(layer), 300);

    });

    layerState.animation = [];

    const finalPathPolyline = L.polyline(path, { color:' #38b000', weight: 5, opacity: 0 }).addTo(mapInstance);

    layerState.animation.push(finalPathPolyline);

    setTimeout(() => {

        finalPathPolyline.setStyle({ opacity: 1.0, weight: 8 });

        setTimeout(() => finalPathPolyline.setStyle({ weight: 5 }), 300);

    }, 100);

}



function fullReset() {
    clearTimeout(mapLayers.left.timeoutId);
    if (mapRight) clearTimeout(mapLayers.right.timeoutId);
    mapLayers.left.timeoutId = null;
    if (mapRight) mapLayers.right.timeoutId = null;

    [...mapLayers.left.markers, ...mapLayers.left.animation].forEach(l => mapLeft.removeLayer(l));
    if (mapRight) [...mapLayers.right.markers, ...mapLayers.right.animation].forEach(l => mapRight.removeLayer(l));
    waypoints = [];
    mapLayers = {
        left: { markers: [], animation: [], timeoutId: null },
        right: { markers: [], animation: [], timeoutId: null }
    };
    if (isCompareView) {
        isCompareView = false;
        compareBtn.textContent = 'Compare Algorithms';
        algoRightGroup.style.display = 'none';
        document.getElementById('map-right').style.display = 'none';
        document.getElementById('map-left').style.width = '100%';
        setTimeout(() => mapLeft.invalidateSize(), 10);
    }
    statusText.textContent = 'Click on the map to set a starting point.';
    findPathBtn.disabled = false;
    compareBtn.disabled = false;
}

function clearAnimationLayers() {
    [...mapLayers.left.animation].forEach(l => mapLeft.removeLayer(l));
    if (mapRight) [...mapLayers.right.animation].forEach(l => mapRight.removeLayer(l));
    mapLayers.left.animation = [];
    mapLayers.right.animation = [];
}