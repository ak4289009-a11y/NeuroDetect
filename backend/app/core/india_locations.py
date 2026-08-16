"""
Comprehensive India States, Union Territories & Major Cities Dataset
Used for India-Wide Location Autocomplete & Verification across NeuroDetect.
"""

INDIA_STATES_AND_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    # Union Territories
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

INDIA_CITY_STATE_MAP = [
    {"city": "New Delhi", "state": "Delhi (NCT)"},
    {"city": "Delhi", "state": "Delhi (NCT)"},
    {"city": "Mumbai", "state": "Maharashtra"},
    {"city": "Pune", "state": "Maharashtra"},
    {"city": "Nagpur", "state": "Maharashtra"},
    {"city": "Thane", "state": "Maharashtra"},
    {"city": "Nashik", "state": "Maharashtra"},
    {"city": "Aurangabad", "state": "Maharashtra"},
    {"city": "Bangalore", "state": "Karnataka"},
    {"city": "Bengaluru", "state": "Karnataka"},
    {"city": "Mysore", "state": "Karnataka"},
    {"city": "Mangalore", "state": "Karnataka"},
    {"city": "Hubli", "state": "Karnataka"},
    {"city": "Hyderabad", "state": "Telangana"},
    {"city": "Warangal", "state": "Telangana"},
    {"city": "Chennai", "state": "Tamil Nadu"},
    {"city": "Coimbatore", "state": "Tamil Nadu"},
    {"city": "Madurai", "state": "Tamil Nadu"},
    {"city": "Salem", "state": "Tamil Nadu"},
    {"city": "Tiruchirappalli", "state": "Tamil Nadu"},
    {"city": "Kolkata", "state": "West Bengal"},
    {"city": "Howrah", "state": "West Bengal"},
    {"city": "Asansol", "state": "West Bengal"},
    {"city": "Siliguri", "state": "West Bengal"},
    {"city": "Durgapur", "state": "West Bengal"},
    {"city": "Jaipur", "state": "Rajasthan"},
    {"city": "Jodhpur", "state": "Rajasthan"},
    {"city": "Udaipur", "state": "Rajasthan"},
    {"city": "Kota", "state": "Rajasthan"},
    {"city": "Bikaner", "state": "Rajasthan"},
    {"city": "Ajmer", "state": "Rajasthan"},
    {"city": "Ahmedabad", "state": "Gujarat"},
    {"city": "Surat", "state": "Gujarat"},
    {"city": "Vadodara", "state": "Gujarat"},
    {"city": "Rajkot", "state": "Gujarat"},
    {"city": "Bhavnagar", "state": "Gujarat"},
    {"city": "Gandhinagar", "state": "Gujarat"},
    {"city": "Lucknow", "state": "Uttar Pradesh"},
    {"city": "Kanpur", "state": "Uttar Pradesh"},
    {"city": "Varanasi", "state": "Uttar Pradesh"},
    {"city": "Agra", "state": "Uttar Pradesh"},
    {"city": "Noida", "state": "Uttar Pradesh"},
    {"city": "Ghaziabad", "state": "Uttar Pradesh"},
    {"city": "Prayagraj", "state": "Uttar Pradesh"},
    {"city": "Meerut", "state": "Uttar Pradesh"},
    {"city": "Patna", "state": "Bihar"},
    {"city": "Gaya", "state": "Bihar"},
    {"city": "Bhagalpur", "state": "Bihar"},
    {"city": "Muzaffarpur", "state": "Bihar"},
    {"city": "Bhubaneswar", "state": "Odisha"},
    {"city": "Cuttack", "state": "Odisha"},
    {"city": "Rourkela", "state": "Odisha"},
    {"city": "Puri", "state": "Odisha"},
    {"city": "Guwahati", "state": "Assam"},
    {"city": "Dibrugarh", "state": "Assam"},
    {"city": "Silchar", "state": "Assam"},
    {"city": "Shillong", "state": "Meghalaya"},
    {"city": "Imphal", "state": "Manipur"},
    {"city": "Aizawl", "state": "Mizoram"},
    {"city": "Kohima", "state": "Nagaland"},
    {"city": "Agartala", "state": "Tripura"},
    {"city": "Itanagar", "state": "Arunachal Pradesh"},
    {"city": "Gangtok", "state": "Sikkim"},
    {"city": "Ranchi", "state": "Jharkhand"},
    {"city": "Jamshedpur", "state": "Jharkhand"},
    {"city": "Dhanbad", "state": "Jharkhand"},
    {"city": "Bhopal", "state": "Madhya Pradesh"},
    {"city": "Indore", "state": "Madhya Pradesh"},
    {"city": "Gwalior", "state": "Madhya Pradesh"},
    {"city": "Jabalpur", "state": "Madhya Pradesh"},
    {"city": "Ujjain", "state": "Madhya Pradesh"},
    {"city": "Raipur", "state": "Chhattisgarh"},
    {"city": "Bhilai", "state": "Chhattisgarh"},
    {"city": "Bilaspur", "state": "Chhattisgarh"},
    {"city": "Chandigarh", "state": "Chandigarh"},
    {"city": "Ludhiana", "state": "Punjab"},
    {"city": "Amritsar", "state": "Punjab"},
    {"city": "Jalandhar", "state": "Punjab"},
    {"city": "Patiala", "state": "Punjab"},
    {"city": "Gurugram", "state": "Haryana"},
    {"city": "Faridabad", "state": "Haryana"},
    {"city": "Panipat", "state": "Haryana"},
    {"city": "Ambala", "state": "Haryana"},
    {"city": "Shimla", "state": "Himachal Pradesh"},
    {"city": "Dharamshala", "state": "Himachal Pradesh"},
    {"city": "Dehradun", "state": "Uttarakhand"},
    {"city": "Haridwar", "state": "Uttarakhand"},
    {"city": "Roorkee", "state": "Uttarakhand"},
    {"city": "Thiruvananthapuram", "state": "Kerala"},
    {"city": "Kochi", "state": "Kerala"},
    {"city": "Kozhikode", "state": "Kerala"},
    {"city": "Thrissur", "state": "Kerala"},
    {"city": "Visakhapatnam", "state": "Andhra Pradesh"},
    {"city": "Vijayawada", "state": "Andhra Pradesh"},
    {"city": "Guntur", "state": "Andhra Pradesh"},
    {"city": "Tirupati", "state": "Andhra Pradesh"},
    {"city": "Panaji", "state": "Goa"},
    {"city": "Srinagar", "state": "Jammu and Kashmir"},
    {"city": "Jammu", "state": "Jammu and Kashmir"},
    {"city": "Leh", "state": "Ladakh"},
    {"city": "Puducherry", "state": "Puducherry"},
    {"city": "Port Blair", "state": "Andaman and Nicobar Islands"}
]

def search_india_locations(query: str) -> list:
    """Returns matching Indian cities & states based on user search query."""
    if not query or len(query.strip()) == 0:
        return INDIA_CITY_STATE_MAP[:10]

    q = query.strip().lower()
    matches = []
    seen = set()

    for item in INDIA_CITY_STATE_MAP:
        city = item["city"]
        state = item["state"]
        full_loc = f"{city}, {state}"
        if q in city.lower() or q in state.lower() or q in full_loc.lower():
            if full_loc not in seen:
                seen.add(full_loc)
                matches.append({"city": city, "state": state, "location": full_loc})
            if len(matches) >= 12:
                break

    return matches
