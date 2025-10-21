import heapq
import osmnx as ox
from collections import deque

def heuristic(G, node1, node2):
    x1, y1 = G.nodes[node1]['x'], G.nodes[node1]['y']
    x2, y2 = G.nodes[node2]['x'], G.nodes[node2]['y']
    return ((x1 - x2)**2 + (y1 - y2)**2) ** 0.5

def find_path(G, start_node, end_node, algorithm='astar'):
    algorithms = {
        'astar': _astar_search,
        'dijkstra': _dijkstra_search,
        'greedy_bfs': _greedy_bfs_search,
        'bfs': _bfs_search,
        'dfs': _dfs_search
    }
    if algorithm not in algorithms:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    return algorithms[algorithm](G, start_node, end_node)

def _reconstruct_path(G, came_from, start_node, end_node):
    path = []
    curr = end_node
    while curr in came_from:
        path.append((G.nodes[curr]['y'], G.nodes[curr]['x']))
        curr = came_from[curr]
    path.append((G.nodes[start_node]['y'], G.nodes[start_node]['x']))
    return path[::-1]

def _create_step(G, came_from, current_node):
    step = {"new_edge": None}
    if current_node in came_from:
        prev = came_from[current_node]
        step["new_edge"] = [
            (G.nodes[prev]['y'], G.nodes[prev]['x']),
            (G.nodes[current_node]['y'], G.nodes[current_node]['x'])
        ]
    return step

def _astar_search(G, start_node, end_node):
    open_set = []
    heapq.heappush(open_set, (heuristic(G, start_node, end_node), start_node))
    came_from = {}
    g_score = {node: float('inf') for node in G.nodes}
    g_score[start_node] = 0
    
    animation_steps = []
    visited_nodes = set()

    while open_set:
        _, current_node = heapq.heappop(open_set)
        if current_node in visited_nodes:
            continue
        visited_nodes.add(current_node)
        
        animation_steps.append(_create_step(G, came_from, current_node))
        if current_node == end_node:
            return {"steps": animation_steps, "final_path": _reconstruct_path(G, came_from, start_node, end_node)}

        for neighbor in G.neighbors(current_node):
            tentative_g_score = g_score[current_node] + G.edges[current_node, neighbor, 0].get('length', 1)
            if tentative_g_score < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current_node
                g_score[neighbor] = tentative_g_score
                f_score = tentative_g_score + heuristic(G, neighbor, end_node)
                heapq.heappush(open_set, (f_score, neighbor))
    return {"steps": animation_steps, "final_path": []}

def _dijkstra_search(G, start_node, end_node):
    open_set = []
    heapq.heappush(open_set, (0, start_node))
    came_from = {}
    g_score = {node: float('inf') for node in G.nodes}
    g_score[start_node] = 0
    
    animation_steps = []
    visited_nodes = set()

    while open_set:
        current_g, current_node = heapq.heappop(open_set)
        if current_node in visited_nodes:
            continue
        visited_nodes.add(current_node)
        
        animation_steps.append(_create_step(G, came_from, current_node))
        if current_node == end_node:
            return {"steps": animation_steps, "final_path": _reconstruct_path(G, came_from, start_node, end_node)}

        for neighbor in G.neighbors(current_node):
            tentative_g_score = g_score[current_node] + G.edges[current_node, neighbor, 0].get('length', 1)
            if tentative_g_score < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current_node
                g_score[neighbor] = tentative_g_score
                heapq.heappush(open_set, (tentative_g_score, neighbor))
    return {"steps": animation_steps, "final_path": []}

def _greedy_bfs_search(G, start_node, end_node):
    open_set = []
    heapq.heappush(open_set, (heuristic(G, start_node, end_node), start_node))
    came_from = {}
    visited = {start_node}
    
    animation_steps = []
    while open_set:
        _, current_node = heapq.heappop(open_set)
        animation_steps.append(_create_step(G, came_from, current_node))

        if current_node == end_node:
            return {"steps": animation_steps, "final_path": _reconstruct_path(G, came_from, start_node, end_node)}

        for neighbor in G.neighbors(current_node):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current_node
                priority = heuristic(G, neighbor, end_node)
                heapq.heappush(open_set, (priority, neighbor))
    return {"steps": animation_steps, "final_path": []}

def _bfs_search(G, start_node, end_node):
    queue = deque([start_node])
    came_from = {}
    visited = {start_node}
    
    animation_steps = []
    while queue:
        current_node = queue.popleft()
        animation_steps.append(_create_step(G, came_from, current_node))

        if current_node == end_node:
            return {"steps": animation_steps, "final_path": _reconstruct_path(G, came_from, start_node, end_node)}

        for neighbor in G.neighbors(current_node):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current_node
                queue.append(neighbor)
    return {"steps": animation_steps, "final_path": []}

def _dfs_search(G, start_node, end_node):
    stack = [start_node]
    came_from = {}
    visited = {start_node}
    
    animation_steps = []
    while stack:
        current_node = stack.pop()
        animation_steps.append(_create_step(G, came_from, current_node))

        if current_node == end_node:
            return {"steps": animation_steps, "final_path": _reconstruct_path(G, came_from, start_node, end_node)}

        for neighbor in G.neighbors(current_node):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current_node
                stack.append(neighbor)
    return {"steps": animation_steps, "final_path": []}