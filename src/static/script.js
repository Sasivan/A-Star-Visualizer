// --- Map Initialization ---
const mapLeft = L.map('map-left', { zoomControl: false }).setView([12.93, 79.13], 13);
let mapRight = null;
L.control.zoom({ position: 'bottomright' }).addTo(mapLeft);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM & &copy; CARTO', maxZoom: 19
}).addTo(mapLeft);

// --- State Management ---
let waypoints = [null, null]; // [start, end] - The markers *on the map*
let selectedStart = null; // Temp storage for search
let selectedEnd = null;   // Temp storage for search
let mapLayers = {
    left: { markers: {}, animation: [], timeoutId: null },
    right: { markers: {}, animation: [], timeoutId: null }
};
let isCompareView = false;
let searchTimeout = null; // For debouncing search

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
const defaultStartSelect = document.getElementById('default-start-loc');
const defaultEndSelect = document.getElementById('default-end-loc');

// Search Elements
const searchFromInput = document.getElementById('search-from');
const suggestionsFrom = document.getElementById('suggestions-from');
const searchToInput = document.getElementById('search-to');
const suggestionsTo = document.getElementById('suggestions-to');
const setPointsBtn = document.getElementById('set-points-btn'); // New button

// --- Event Listeners ---
findPathBtn.addEventListener('click', () => {
    // *** Use waypoints[] state, which is set by *both* default and search
    if (!waypoints[0] || !waypoints[1]) {
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
        // Add existing markers to the right map
        if (waypoints[0]) mapLayers.right.markers[0] = createDotMarker(waypoints[0], '#007bff', mapRight, 'Start');
        if (waypoints[1]) mapLayers.right.markers[1] = createDotMarker(waypoints[1], '#ff69b4', mapRight, 'End');
    } else {
        compareBtn.textContent = 'Compare Algorithms';
        algoRightGroup.style.display = 'none';
        mapRightDiv.style.display = 'none';
        mapLeftDiv.style.width = '100%';
        if (mapRight) {
            [...Object.values(mapLayers.right.markers), ...mapLayers.right.animation].forEach(layer => mapRight.removeLayer(layer));
            mapLayers.right.markers = {};
            mapLayers.right.animation = [];
        }
    }
    setTimeout(() => {
        mapLeft.invalidateSize();
        if (mapRight) mapRight.invalidateSize();
    }, 300);
});

resetBtn.addEventListener('click', fullReset); // Calls the full, hard reset
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

// *** This "Set Default Route" logic is CORRECT ***
// It will work once you add coordinates to your HTML
setDefaultBtn.addEventListener('click', () => {
    clearMapLayers(); // Clears map, not search state
    
    // Get coords directly from the <option> value
    // This relies on your HTML being correct: value="lat,lon"
    const [startLat, startLon] = defaultStartSelect.value.split(',');
    const [endLat, endLon] = defaultEndSelect.value.split(',');
    
    const startLatLng = L.latLng(parseFloat(startLat), parseFloat(startLon));
    const endLatLng = L.latLng(parseFloat(endLat), parseFloat(endLon));

    // Get the text from the selected option
    const startName = defaultStartSelect.options[defaultStartSelect.selectedIndex].text;
    const endName = defaultEndSelect.options[defaultEndSelect.selectedIndex].text;

    // Set markers directly
    setWaypoint(startLatLng, 0, 'Start', '#007bff');
    setWaypoint(endLatLng, 1, 'End', '#ff69b4');

    // Update search box text
    searchFromInput.value = startName;
    searchToInput.value = endName;

    // Store these selections so "Find Path" works immediately
    selectedStart = { latlng: startLatLng, name: startName };
    selectedEnd = { latlng: endLatLng, name: endName };
    
    autoZoom();
    statusText.textContent = "Default route set. Click 'Find Path'.";
});


// --- Search Logic ---
setupSearch(searchFromInput, suggestionsFrom, 0); // 0 for start
setupSearch(searchToInput, suggestionsTo, 1);   // 1 for end

// "Set Points" button for Search
setPointsBtn.addEventListener('click', () => {
    if (selectedStart && selectedEnd) {
        clearMapLayers(); // Use light reset
        
        // Set waypoints from stored search selections
        setWaypoint(selectedStart.latlng, 0, 'Start', '#007bff');
        setWaypoint(selectedEnd.latlng, 1, 'End', '#ff69b4');
        
        // Restore text to input fields
        searchFromInput.value = selectedStart.name;
        searchToInput.value = selectedEnd.name;
        
        autoZoom();
        statusText.textContent = "Points set from search. Click 'Find Path'.";
    } else {
        statusText.textContent = 'Please select a "From" and "To" location from the suggestions.';
    }
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchFromInput.contains(e.target)) suggestionsFrom.innerHTML = '';
    if (!searchToInput.contains(e.target)) suggestionsTo.innerHTML = '';
});


// --- Core Functions ---

function handleMapClick(e) {
    if (!waypoints[0]) {
        setWaypoint(e.latlng, 0, 'Start', '#007bff', 'Clicked Location');
        // Store selection
        selectedStart = { latlng: e.latlng, name: `[${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}]` };
    } else if (!waypoints[1]) {
        setWaypoint(e.latlng, 1, 'End', '#ff69b4', 'Clicked Location');
        // Store selection
        selectedEnd = { latlng: e.latlng, name: `[${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}]` };
    }
}

/**
 * Sets a waypoint (start or end) on the map.
 * This function *only* places markers and updates state.
 */
function setWaypoint(latlng, index, label, color, displayName = null) {
    waypoints[index] = latlng; // This is the main state for pathfinding

    // Clear existing marker for this index
    if (mapLayers.left.markers[index]) {
        mapLeft.removeLayer(mapLayers.left.markers[index]);
    }
    if (mapRight && mapLayers.right.markers[index]) {
        mapRight.removeLayer(mapLayers.right.markers[index]);
    }

    // Create new marker
    mapLayers.left.markers[index] = createDotMarker(latlng, color, mapLeft, label);
    if (isCompareView && mapRight) {
        mapLayers.right.markers[index] = createDotMarker(latlng, color, mapRight, label);
    }
    
    // Update input text ONLY if it's a map click
    if (displayName === 'Clicked Location') {
        const input = (index === 0) ? searchFromInput : searchToInput;
        input.value = `[${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}]`;
    }
    
    statusText.textContent = waypoints[0] && waypoints[1]
        ? 'Points set. Click "Find Path" or "Compare".'
        : 'Click map or search for end point.';
}

function createDotMarker(latlng, color, mapInstance, label) {
    return L.circleMarker(latlng, {
        radius: 8, fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.9
    })
    .addTo(mapInstance)
    .bindTooltip(label, { permanent: false, direction: 'top' });
}

function autoZoom() {
    if (waypoints[0] && waypoints[1]) {
        const bounds = L.latLngBounds([waypoints[0], waypoints[1]]);
        mapLeft.fitBounds(bounds.pad(0.2)); // 20% padding
        if (isCompareView && mapRight) {
            mapRight.fitBounds(bounds.pad(0.2));
        }
    }
}

/**
 * Sets up a search input with autocomplete.
 * Stores selection in temp variable, does not place marker.
 */
function setupSearch(inputElement, suggestionBox, index) {
    inputElement.addEventListener('input', () => {
        const query = inputElement.value.trim();
        suggestionBox.innerHTML = '';

        // Clear stored selection if user is typing
        if (index === 0) { selectedStart = null; }
        else { selectedEnd = null; }

        if (query.length < 3) return;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                // Biasing search to Vellore region
                const viewbox = '79.0,13.0,79.2,12.8'; // [lon_min, lat_max, lon_max, lat_min]
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&countrycodes=IN`);
                
                if (!res.ok) throw new Error('Network error');
                const data = await res.json();

                suggestionBox.innerHTML = data
                    .map(r => `<div data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.display_name}">${r.display_name}</div>`)
                    .join("");

                // Add click listeners to new suggestions
                [...suggestionBox.children].forEach(item => {
                    item.onclick = () => {
                        const latlng = L.latLng(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon));
                        const displayName = item.dataset.name;
                        
                        inputElement.value = displayName; // Set input text
                        suggestionBox.innerHTML = ""; // Hide suggestions
                        
                        // Store the selected latlng and name
                        if (index === 0) {
                            selectedStart = { latlng: latlng, name: displayName };
                        } else {
                            selectedEnd = { latlng: latlng, name: displayName };
                        }
                    };
                });
            } catch (err) {
                console.error("Nominatim search failed:", err);
                suggestionBox.innerHTML = `<div style="color: #aaa;">Search failed.</div>`;
            }
        }, 300); // 300ms debounce
    });
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
    // Fade out animation lines
    layerState.animation.forEach(layer => {
        // Simple removal
        setTimeout(() => mapInstance.removeLayer(layer), 300);
    });
    layerState.animation = []; // Clear the array

    // Add final path with a "pop" effect
    const finalPathPolyline = L.polyline(path, { color: ' #38b000', weight: 5, opacity: 0 }).addTo(mapInstance);
    layerState.animation.push(finalPathPolyline); // Store final path
    setTimeout(() => {
        finalPathPolyline.setStyle({ opacity: 1.0, weight: 8 });
        setTimeout(() => finalPathPolyline.setStyle({ weight: 5 }), 300);
    }, 100);
}

/**
 * Clears only the map layers, not the search state.
 */
function clearMapLayers() {
    // Stop any running animations
    clearTimeout(mapLayers.left.timeoutId);
    if (mapRight) clearTimeout(mapLayers.right.timeoutId);
    mapLayers.left.timeoutId = null;
    if (mapRight) mapLayers.right.timeoutId = null;

    // Remove all layers (markers and animations)
    [...Object.values(mapLayers.left.markers), ...mapLayers.left.animation].forEach(l => mapLeft.removeLayer(l));
    if (mapRight) {
        [...Object.values(mapLayers.right.markers), ...mapLayers.right.animation].forEach(l => mapRight.removeLayer(l));
    }
    
    // Reset layer state
    waypoints = [null, null];
    mapLayers = {
        left: { markers: {}, animation: [], timeoutId: null },
        right: { markers: {}, animation: [], timeoutId: null }
    };
}


/**
 * Wipes everything, including search state.
 */
function fullReset() {
    clearMapLayers(); // Clears map

    // Reset search state
    selectedStart = null; 
    selectedEnd = null;   
    
    // Reset search inputs
    searchFromInput.value = '';
    searchToInput.value = '';
    suggestionsFrom.innerHTML = '';
    suggestionsTo.innerHTML = '';

    // Reset compare view if active
    if (isCompareView) {
        isCompareView = false;
        compareBtn.textContent = 'Compare Algorithms';
        algoRightGroup.style.display = 'none';
        document.getElementById('map-right').style.display = 'none';
        document.getElementById('map-left').style.width = '100%';
        setTimeout(() => mapLeft.invalidateSize(), 10);
    }
    
    statusText.textContent = 'Click on the map or search to set a starting point.';
    findPathBtn.disabled = false;
    compareBtn.disabled = false;
}

function clearAnimationLayers() {
    [...mapLayers.left.animation].forEach(l => mapLeft.removeLayer(l));
    if (mapRight) [...mapLayers.right.animation].forEach(l => mapRight.removeLayer(l));
    mapLayers.left.animation = [];
    if (mapRight) mapLayers.right.animation = [];
}