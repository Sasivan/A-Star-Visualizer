# ===============================================
# Map.py - Robust Map Acquisition & Preprocessing
# ===============================================

import os
import math
import osmnx as ox
import networkx as nx
import pandas as pd
from shapely.geometry import box
from dotenv import load_dotenv

# -------------------------------
# 1️⃣ Load environment variables
# -------------------------------
load_dotenv()
CITY_NAME = os.getenv("CITY_NAME")
GRAPH_FILE_PRE = os.getenv("GRAPH_FILE_PRE", "data/city_map_preprocessed.graphml")
N_SPLITS = int(os.getenv("N_SPLITS", 4))  # optional number of splits

# Ensure directories exist
os.makedirs("data", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# -------------------------------
# 2️⃣ Get city bounding box
# -------------------------------
city_boundary = ox.geocode_to_gdf(CITY_NAME)
west, south, east, north = city_boundary.total_bounds  # [minx, miny, maxx, maxy]

print(f"City bounding box: West={west}, South={south}, East={east}, North={north}")

# -------------------------------
# 3️⃣ Function: Split bounding box into tiles
# -------------------------------
def split_bbox(west, south, east, north, n_splits=4):
    """Split bounding box into n_splits x n_splits grid"""
    x_step = (east - west) / n_splits
    y_step = (north - south) / n_splits
    bboxes = []
    for i in range(n_splits):
        for j in range(n_splits):
            bbox_chunk = (
                south + j * y_step,          # south
                south + (j + 1) * y_step,    # north
                west + i * x_step,           # west
                west + (i + 1) * x_step      # east
            )
            bboxes.append(bbox_chunk)
    return bboxes

# -------------------------------
# 4️⃣ Download and merge all tiles
# -------------------------------
print("Downloading map tiles...")
graphs = []
for idx, (s, n, w, e) in enumerate(split_bbox(west, south, east, north, N_SPLITS)):
    print(f"  Tile {idx+1}/{N_SPLITS*N_SPLITS}: S={s}, N={n}, W={w}, E={e}")
    polygon = box(w, s, e, n)
    g = ox.graph_from_polygon(polygon, network_type='drive')
    graphs.append(g)

# Merge all graphs
full_graph = graphs[0]
for g in graphs[1:]:
    full_graph = nx.compose(full_graph, g)

print(f"Total nodes after merge: {full_graph.number_of_nodes()}")
print(f"Total edges after merge: {full_graph.number_of_edges()}")

# -------------------------------
# 5️⃣ Preprocess edges
# -------------------------------
for u, v, k, data in full_graph.edges(keys=True, data=True):
    if "length" not in data:
        data["length"] = ox.distance.euclidean_dist_vec(
            full_graph.nodes[u]['y'], full_graph.nodes[u]['x'],
            full_graph.nodes[v]['y'], full_graph.nodes[v]['x']
        )
    data["weight"] = data["length"]

# -------------------------------
# 6️⃣ Save preprocessed graph
# -------------------------------
ox.save_graphml(full_graph, GRAPH_FILE_PRE)
print(f"Preprocessed graph saved to {GRAPH_FILE_PRE}")

# -------------------------------
# 7️⃣ Export node positions (for visualization)
# -------------------------------
nodes_df = pd.DataFrame([
    {"node": node, "lat": data['y'], "lon": data['x']}
    for node, data in full_graph.nodes(data=True)
])
nodes_df.to_csv("outputs/nodes_positions.csv", index=False)
print("Node positions saved to outputs/nodes_positions.csv")

# -------------------------------
# 8️⃣ Export edge weights
# -------------------------------
edges_df = pd.DataFrame([
    {"from_node": u, "to_node": v, "weight": data['weight']}
    for u, v, data in full_graph.edges(data=True)
])
edges_df.to_csv("outputs/edges_data.csv", index=False)
print("Edge data saved to outputs/edges_data.csv")

print("✅ Map processing complete!")
