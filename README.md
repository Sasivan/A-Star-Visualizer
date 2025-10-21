# A\* Visualizer

This project is an interactive, web-based pathfinding visualizer built for the city of Vellore, India. It allows users to select start and end points on a map and visualize how different classic search algorithms explore the road network to find the optimal path. The application features a side-by-side comparison mode to see two algorithms race to the destination simultaneously.

## ✨ Features

  * **Multiple Pathfinding Algorithms:** Visualize and compare 5 different algorithms:
      * A\* Search (A-Star)
      * Dijkstra's Algorithm
      * Greedy Best-First Search
      * Breadth-First Search (BFS)
      * Depth-First Search (DFS)
  * **Interactive Map Interface:**
      * Click directly on the map to set start and end points.
      * Use pre-defined default locations from a collapsible menu.
  * **Side-by-Side Comparison Mode:** Run two different algorithms at the same time on two synchronized maps to visually compare their search patterns and efficiency.
  * **Real-time Search Animation:** Watch the algorithm explore the road network step-by-step with a "glowing" effect.
  * **Animation Controls:**
      * A speed slider to control the animation playback speed from 1x to 200x.
      * A dedicated "Reset" button to clear the maps and start over.
  * **Polished UI/UX:**
      * A clean, dark-themed interface.
      * A collapsible sidebar to maximize map viewing area.
      * Visual effects on the final path to highlight the result.

## 🛠️ Tech Stack

  * **Backend:** **Python** with the **Flask** web framework.
  * **Pathfinding & Map Data:** **OSMnx** and **NetworkX** for downloading road network data from OpenStreetMap and performing graph operations.
  * **Frontend:** **HTML**, **CSS**, and vanilla **JavaScript**.
  * **Map Rendering:** **Leaflet.js** for the interactive map display.

## 📂 Project Structure

The project is organized into a clean `src` directory, separating backend logic, frontend assets, and HTML templates.

```
Project/
├── data/
│   └── vellore_map.graphml      # Pre-processed map data
├── src/
│   ├── static/                  # CSS and JavaScript files
│   │   ├── style.css
│   │   └── script.js
│   ├── templates/               # HTML files
│   │   └── index.html
│   ├── __init__.py              # Makes 'src' a Python package
│   ├── app.py                   # Flask web server and API
│   └── pathfinder.py            # Core pathfinding algorithms
├── preprocess.py                # One-time script to generate map data
├── requirements.txt             # Python dependencies
└── README.md
```

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### 1\. Prerequisites

  * Python 3.8+
  * `pip` and `venv`

### 2\. Setup and Installation

**Step 1: Clone the Repository**

```bash
[git clone <your-repository-url>](https://github.com/Sasivan/A-Star-Visualizer.git)
```

**Step 2: Create and Activate a Virtual Environment**
This keeps your project's dependencies isolated.

```bash
# Create the environment
python -m venv .venv

# Activate it
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate
```

**Step 3: Install Dependencies**
Install all the required Python libraries from the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

**Step 4: Preprocess the Map Data**
This is a one-time step to download the Vellore road network from OpenStreetMap.

```bash
python preprocess.py
```

This will create the `data/vellore_map.graphml` file.

### 3\. Running the Application

Once the setup is complete, run the Flask web server from the project's **root directory**.

```bash
python -m src.app
```

You will see output in your terminal indicating the server is running, typically on `http://127.0.0.1:5000`.

## 🎮 How to Use

1.  **Set Points:**
      * **Click on the Map:** Click once to set a start point (blue dot) and a second time to set an end point (pink dot).
      * **Use Defaults:** Open the "Default Places" section, select a start and end location, and click "Set Default Route".
2.  **Find a Path:**
      * Select your desired algorithm from the dropdown.
      * Click the **"Find Path"** button to see the animation on a single map.
3.  **Compare Algorithms:**
      * After setting two points, click the **"Compare"** button.
      * The screen will split. Select a different algorithm for each map.
      * Click the **"Find Path"** button to run both animations simultaneously.
4.  **Reset:**
      * Click the **"Reset Map"** button at any time to clear all points and paths.

## 🔮 Future Improvements

  * **Address Search (Geocoding):** Add a search bar to find locations by name.
  * **Different Travel Modes:** Add support for "walking" and "biking" networks.
  * **Interactive Obstacles:** Allow users to draw polygons on the map to represent "no-go" zones.
  * **Display Path Statistics:** Show the calculated path's total distance and estimated travel time.
