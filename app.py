from flask import Flask, render_template, request, jsonify
import osmnx as ox
import heapq
import os

# Initialize the Flask app
app = Flask(__name__)

# --- Configuration and Graph Loading ---
GRAPH_FILE = "data/vellore_map.graphml"

def load_graph(filepath):
    """Load the graph from a file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Graph file not found at {filepath}. Please run a preprocessing script to create it.")
    return ox.load_graphml(filepath)

# Load the graph once when the server starts
G = load_graph(GRAPH_FILE)
print("Graph loaded successfully.")

# --- A* Algorithm ---
def heuristic(node1, node2):
    x1, y1 = G.nodes[node1]['x'], G.nodes[node1]['y']
    x2, y2 = G.nodes[node2]['x'], G.nodes[node2]['y']
    return ((x1 - x2)**2 + (y1 - y2)**2) ** 0.5

def calculate_path_and_steps(start_node_id, end_node_id):
    open_set = []
    heapq.heappush(open_set, (0 + heuristic(start_node_id, end_node_id), start_node_id))
    g_score = {node: float('inf') for node in G.nodes}
    g_score[start_node_id] = 0
    came_from = {}
    closed_set = set()
    
    animation_steps = []

    while open_set:
        _, current_node = heapq.heappop(open_set)
        if current_node in closed_set: continue
        
        closed_set.add(current_node)
        
        step_data = {"new_edges": [], "open_nodes": []}
        
        if current_node in came_from:
            prev_node = came_from[current_node]
            step_data["new_edges"].append([
                (G.nodes[prev_node]['y'], G.nodes[prev_node]['x']),
                (G.nodes[current_node]['y'], G.nodes[current_node]['x'])
            ])
        
        open_set_nodes = [node for _, node in open_set]
        step_data["open_nodes"] = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in open_set_nodes]

        animation_steps.append(step_data)

        if current_node == end_node_id:
            path = []
            temp_node = end_node_id
            while temp_node in came_from:
                path.append((G.nodes[temp_node]['y'], G.nodes[temp_node]['x']))
                temp_node = came_from[temp_node]
            path.append((G.nodes[start_node_id]['y'], G.nodes[start_node_id]['x']))
            return {"steps": animation_steps, "final_path": path[::-1]}

        for neighbor in G.neighbors(current_node):
            edge_data = G.get_edge_data(current_node, neighbor)
            if not edge_data: continue
            edge_length = edge_data[0].get('length', 1)
            if neighbor in closed_set: continue
            
            tentative_g = g_score[current_node] + edge_length
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current_node
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, end_node_id)
                heapq.heappush(open_set, (f_score, neighbor))
    
    return {"steps": [], "final_path": []}


# --- API Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/find_path', methods=['POST'])
def find_path():
    data = request.json
    start_lat, start_lon = float(data['start_lat']), float(data['start_lon'])
    end_lat, end_lon = float(data['end_lat']), float(data['end_lon'])

    start_node = ox.distance.nearest_nodes(G, start_lon, start_lat)
    end_node = ox.distance.nearest_nodes(G, end_lon, end_lat)

    if start_node == end_node:
        return jsonify({"error": "Start and end points are the same."}), 400

    path_data = calculate_path_and_steps(start_node, end_node)
    return jsonify(path_data)


if __name__ == '__main__':
    app.run(debug=True)