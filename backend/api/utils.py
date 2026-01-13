import requests
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

def get_delivery_cost(pickup_address, delivery_address):
    geolocator = Nominatim(user_agent="dkut_textbook_project_2026", timeout=10)

    def get_coords(address):
        try:
            location = geolocator.geocode(address)
            if location: return location
            location = geolocator.geocode(f"{address}, Kenya")
            if location: return location
            return None
        except:
            return None

    try:
        # 2. Find Coordinates
        location_1 = get_coords(pickup_address)
        location_2 = get_coords(delivery_address)

        if not location_1:
            return None, None, None, None, f"Map could not find: '{pickup_address}'"
        if not location_2:
            return None, None, None, None, f"Map could not find: '{delivery_address}'"

        coords_1 = (location_1.latitude, location_1.longitude)
        coords_2 = (location_2.latitude, location_2.longitude)

        # 3. Get Distance from OSRM
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords_1[1]},{coords_1[0]};{coords_2[1]},{coords_2[0]}?overview=full&geometries=geojson"  

        response = requests.get(osrm_url, timeout=10)
        data = response.json()

        if data.get("code") != "Ok":
            return None, None, None, None, "Could not calculate road path."

        distance_meters = data['routes'][0]['distance']
        distance_km = distance_meters / 1000

        # 4. Pricing
        base_fee = 50 
        cost_per_km = 3
        
        total_cost = base_fee + (distance_km * cost_per_km)
        
        if total_cost < 100:
            total_cost = 100

        distance_text = f"{round(distance_km, 1)} km (via Road)"

        # Success Return
        route_geometry = data['routes'][0]['geometry']
        return round(total_cost), distance_text, coords_1, coords_2, route_geometry, None

    except Exception as e:
        return None, None, None, None, None, f"System Error: {str(e)}"