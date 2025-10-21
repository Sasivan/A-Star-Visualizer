import osmnx as ox
import os

# --- Configuration ---
# The location you want to map.
PLACE_NAME = "Vellore, India"
# The file path where the map data will be saved.
FILEPATH = "data/vellore_map.graphml"

# --- Main Script ---
# Ensure the 'data' directory exists before trying to save a file in it.
os.makedirs(os.path.dirname(FILEPATH), exist_ok=True)

print(f"Downloading map data for '{PLACE_NAME}'... (This may take a moment)")

# This is the core function from OSMnx. It connects to the OpenStreetMap API,
# downloads the road network data for the specified place, and builds a graph.
# 'network_type="drive"' gets the roads suitable for driving.
G = ox.graph_from_place(PLACE_NAME, network_type='drive')

# Save the graph object to a file. GraphML is a standard format for storing
# graph data, preserving all the node coordinates, edges, and metadata.
ox.save_graphml(G, filepath=FILEPATH)

print(f"✅ Graph saved successfully to '{FILEPATH}'")
print(f"   Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")