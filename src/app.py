from flask import Flask, render_template, request, jsonify
import osmnx as ox
from . import pathfinder

app = Flask(__name__)

G = ox.load_graphml("data/vellore_map.graphml")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/find_path', methods=['POST'])
def api_find_path():
    data = request.json
    start_lat, start_lon = float(data['start_lat']), float(data['start_lon'])
    end_lat, end_lon = float(data['end_lat']), float(data['end_lon'])
    
    start_node = ox.distance.nearest_nodes(G, start_lon, start_lat)
    end_node = ox.distance.nearest_nodes(G, end_lon, end_lat)
    
    if start_node == end_node:
        return jsonify({"error": "Start and end points are the same."}), 400
        
    path_data = pathfinder.find_path(G, start_node, end_node)
    return jsonify(path_data)

if __name__ == '__main__':
    app.run(debug=True)