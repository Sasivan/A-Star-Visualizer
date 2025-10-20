import osmnx as ox
import os

# Define the place to download
place_name = "Vellore, India"
filepath = "data/vellore_map.graphml"

# Create the 'data' directory if it doesn't exist
os.makedirs(os.path.dirname(filepath), exist_ok=True)

print(f"Downloading map data for '{place_name}'...")

# Download the graph for the specified place
G = ox.graph_from_place(place_name, network_type='drive')

# Save the graph to the file
ox.save_graphml(G, filepath=filepath)

print(f"✅ Graph saved successfully to '{filepath}'")
print(f"Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")