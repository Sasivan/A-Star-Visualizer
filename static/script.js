// Initialize the map
const map = L.map('map').setView([12.93, 79.13], 13);

// Add a dark tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// --- Global variables for animation state ---
let animationLayers = [];
let animationFrameId = null;

// --- DOM Elements ---
const findPathBtn = document.getElementById('find-path-btn');
const startLocSelect = document.getElementById('start-loc');
const endLocSelect = document.getElementById('end-loc');
const statusText = document.getElementById('status');

// --- Event Listener ---
findPathBtn.addEventListener('click', async () => {
    // 1. Clear previous animation and results
    clearAnimation();
    
    // 2. Disable button and show loading state
    findPathBtn.disabled = true;
    statusText.textContent = 'Calculating path...';
    
    // 3. Get coordinates from UI
    const [start_lat, start_lon] = startLocSelect.value.split(',');
    const [end_lat, end_lon] = endLocSelect.value.split(',');

    // 4. Call the backend API
    try {
        const response = await fetch('/api/find_path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_lat, start_lon, end_lat, end_lon })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.steps && data.steps.length > 0) {
            // 5. If successful, start the animation
            startAnimation(data.steps, data.final_path);
        } else {
            statusText.textContent = 'No path could be found.';
        }

    } catch (error) {
        console.error('Error fetching path:', error);
        statusText.textContent = 'Failed to find path. See console for details.';
    } finally {
        // 6. Re-enable the button
        findPathBtn.disabled = false;
    }
});


function startAnimation(steps, final_path) {
    let currentStep = 0;
    const totalSteps = steps.length;

    function animate() {
        if (currentStep >= totalSteps) {
            statusText.textContent = `Path found! ${final_path.length} nodes.`;
            drawFinalPath(final_path);
            return; // Animation finished
        }

        const stepData = steps[currentStep];
        
        // Draw the newly explored edges for this step
        stepData.new_edges.forEach(edge => {
            const polyline = L.polyline(edge, { color: '#00ffff', weight: 3, opacity: 0.7 }).addTo(map);
            animationLayers.push(polyline);
        });

        statusText.textContent = `Step ${currentStep + 1} / ${totalSteps}: Searching...`;
        currentStep++;
        
        // Request the next frame
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animate(); // Start the loop
}

function drawFinalPath(path) {
    const finalPathPolyline = L.polyline(path, { color: '#ffff00', weight: 5, opacity: 1.0 }).addTo(map);
    animationLayers.push(finalPathPolyline);
}

function clearAnimation() {
    // Stop any ongoing animation loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Remove all layers (polylines, markers) from the map
    animationLayers.forEach(layer => map.removeLayer(layer));
    animationLayers = [];
}