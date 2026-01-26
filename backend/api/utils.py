import requests
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

# --- FIX: ADD is_swap PARAMETER HERE ---
def get_delivery_cost(pickup_address, delivery_address, is_swap=False):
    geolocator = Nominatim(user_agent="dkut_textbook_project_2026", timeout=10)

    def get_coords(address):
        try:
            # 1. First attempt: Strict Nyeri Search
            # We explicitly append Nyeri, Kenya to force local results
            local_address = f"{address}, Nyeri, Kenya"
            location = geolocator.geocode(local_address)
            if location: return location

            # 2. Fallback: Search just Kenya if strict fails
            general_address = f"{address}, Kenya"
            location = geolocator.geocode(general_address)
            if location: return location
            
            return None
        except:
            return None

    try:
        # 1. Find Coordinates
        location_1 = get_coords(pickup_address)
        location_2 = get_coords(delivery_address)

        if not location_1:
            return None, None, None, None, None, f"Map could not find: '{pickup_address}'. Try adding 'Nyeri'."
        if not location_2:
            return None, None, None, None, None, f"Map could not find: '{delivery_address}'. Try adding 'Nyeri'."

        coords_1 = (location_1.latitude, location_1.longitude)
        coords_2 = (location_2.latitude, location_2.longitude)

        # 2. Get Distance from OSRM
        # Using driving profile for accuracy
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords_1[1]},{coords_1[0]};{coords_2[1]},{coords_2[0]}?overview=full&geometries=geojson"  

        response = requests.get(osrm_url, timeout=10)
        data = response.json()

        if data.get("code") != "Ok":
            return None, None, None, None, None, "Could not calculate road path."

        distance_meters = data['routes'][0]['distance']
        distance_km = distance_meters / 1000

        # --- 3. PRICING FORMULA ---
        base_fee = 50 
        cost_per_km = 3
        
        # --- LOGIC: Handle Swap Round Trip ---
        calc_distance = distance_km * 2 if is_swap else distance_km
        
        total_cost = base_fee + (calc_distance * cost_per_km)
        
        # Minimum Fare Logic
        if total_cost < 50:
            total_cost = 50

        # Round to nearest 10
        total_cost = round(total_cost / 10) * 10 

        # Format distance text
        distance_val = round(distance_km, 1)
        if is_swap:
            distance_text = f"{distance_val} km x 2 (Round Trip)"
        else:
            distance_text = f"{distance_val} km"

        route_geometry = data['routes'][0]['geometry']

        # Return exactly 6 values as expected by views.py
        return int(total_cost), distance_text, coords_1, coords_2, route_geometry, None

    except Exception as e:
        # Return 6 values (last one is error message)
        return None, None, None, None, None, f"System Error: {str(e)}"