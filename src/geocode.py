# ===============================================
# geocode.py - Start/End Point Handling
# ===============================================

import os
import osmnx as ox
from geopy.geocoders import Nominatim
from dotenv import load_dotenv

# -------------------------------
# 1️⃣ Load environment variables
# -------------------------------
load_dotenv()
GRAPH_FILE_PRE = os.getenv("GRAPH_FILE_PRE", "data/city_map_preprocessed.graphml")

# Ensure graph exists
if not os.path.exists(GRAPH_FILE_PRE):
    raise FileNotFoundError(f"Graph file not found: {GRAPH_FILE_PRE}")

# Load preprocessed graph
G = ox.load_graphml(GRAPH_FILE_PRE)
print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

# -------------------------------
# 2️⃣ Initialize Geocoder
# -------------------------------
geolocator = Nominatim(user_agent="astar_project")

def geocode_address(address):
    """
    Convert address string to (lat, lon)
    """
    location = geolocator.geocode(address)
    if location is None:
        raise ValueError(f"Address not found: {address}")
    return location.latitude, location.longitude

def nearest_node(lat, lon):
    """
    Map a (lat, lon) point to the nearest graph node
    """
    node_id = ox.distance.nearest_nodes(G, lon, lat)  # ox uses (x=lon, y=lat)
    return node_id

# -------------------------------
# 3️⃣ Example Usage for Vellore, India
# -------------------------------
if __name__ == "__main__":
    # Input addresses in Vellore
    start_address = "VIT University, Vellore"
    end_address = "Vellore Fort, Vellore"

    # Convert to lat/lon
    start_lat, start_lon = geocode_address(start_address)
    end_lat, end_lon = geocode_address(end_address)

    # Map to nearest graph nodes
    start_node = nearest_node(start_lat, start_lon)
    end_node = nearest_node(end_lat, end_lon)

    print(f"Start: {start_address} -> Node {start_node} at ({start_lat}, {start_lon})")
    print(f"End: {end_address} -> Node {end_node} at ({end_lat}, {end_lon})")

    # Optional: direct coordinates instead of addresses
    # start_node = nearest_node(12.9716, 79.1557)
    # end_node = nearest_node(12.9190, 79.1325)
