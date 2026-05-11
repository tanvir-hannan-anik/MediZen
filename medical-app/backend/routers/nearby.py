"""
Nearby medical services router.
Returns a curated list of Dhaka-area medical facilities including hospitals,
clinics, pharmacies, and medical colleges (Wikipedia: List of medical colleges
in Bangladesh). Accepts user lat/lng to compute real distances via Haversine.
"""

from typing import Optional
from math import radians, sin, cos, sqrt, atan2
from fastapi import APIRouter, Query

router = APIRouter()

DISTRICT_BOUNDARIES = {
    "dhaka":      (23.6, 23.9, 90.2, 90.5),
    "chittagong": (22.2, 22.8, 91.7, 92.1),
    "khulna":     (22.0, 23.0, 89.4, 89.8),
    "rajshahi":   (24.3, 25.0, 88.7, 89.1),
    "sylhet":     (24.7, 25.2, 91.8, 92.3),
    "barisal":    (22.1, 22.8, 90.0, 90.4),
    "rangpur":    (25.5, 26.2, 88.8, 89.5),
    "mymensingh": (24.3, 25.0, 90.3, 90.8),
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def get_user_district(lat: float, lng: float) -> str:
    for district, (lat_min, lat_max, lon_min, lon_max) in DISTRICT_BOUNDARIES.items():
        if lat_min <= lat <= lat_max and lon_min <= lng <= lon_max:
            return district
    return "dhaka"


def in_district(lat: float, lng: float, district: str) -> bool:
    if district not in DISTRICT_BOUNDARIES:
        return True
    lat_min, lat_max, lon_min, lon_max = DISTRICT_BOUNDARIES[district]
    return lat_min <= lat <= lat_max and lon_min <= lng <= lon_max


# ── Service database ─────────────────────────────────────────────────────────
# Medical colleges sourced from Wikipedia: List of medical colleges in Bangladesh
# https://en.wikipedia.org/wiki/List_of_medical_colleges_in_Bangladesh

SERVICES = [
    # ── Government hospitals ────────────────────────────────────────────────
    {
        "id": 1,
        "name": "Dhaka Medical College Hospital",
        "type": "hospital",
        "address": "Bakshibazar Rd, Dhaka 1000",
        "phone": "+880-2-55165088",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.4,
        "distance_km": 0,
        "latitude": 23.7261,
        "longitude": 90.3979,
        "departments": ["Emergency", "Cardiology", "Pulmonology", "Neurology", "+8 depts"],
        "website": "http://dmch.gov.bd",
        "featured": False,
    },
    {
        "id": 2,
        "name": "Bangabandhu Sheikh Mujib Medical University",
        "type": "hospital",
        "address": "Shahbag, Dhaka 1000",
        "phone": "+880-2-9661064",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.3,
        "distance_km": 0,
        "latitude": 23.7394,
        "longitude": 90.3967,
        "departments": ["Neurology", "Cardiology", "Oncology", "Transplant", "Research"],
        "website": "https://bsmmu.edu.bd",
        "featured": False,
    },
    {
        "id": 3,
        "name": "Sir Salimullah Medical College & Mitford Hospital",
        "type": "hospital",
        "address": "Mitford Rd, Old Dhaka 1100",
        "phone": "+880-2-7312050",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.1,
        "distance_km": 0,
        "latitude": 23.7073,
        "longitude": 90.4009,
        "departments": ["Emergency", "Surgery", "Gynecology", "Pediatrics"],
        "website": "",
        "featured": False,
    },
    {
        "id": 4,
        "name": "Shaheed Suhrawardy Medical College Hospital",
        "type": "hospital",
        "address": "Sher-e-Bangla Nagar, Dhaka 1207",
        "phone": "+880-2-9130951",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.7705,
        "longitude": 90.3681,
        "departments": ["Emergency", "Medicine", "Surgery", "ENT", "Pediatrics"],
        "website": "",
        "featured": False,
    },
    {
        "id": 5,
        "name": "Mugda Medical College Hospital",
        "type": "hospital",
        "address": "Mugda, Dhaka 1214",
        "phone": "+880-2-7271011",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.0,
        "distance_km": 0,
        "latitude": 23.7350,
        "longitude": 90.4312,
        "departments": ["Emergency", "General Medicine", "Surgery"],
        "website": "",
        "featured": False,
    },
    {
        "id": 6,
        "name": "National Heart Foundation Hospital",
        "type": "hospital",
        "address": "Mirpur Rd, Dhaka 1216",
        "phone": "+880-2-9003391",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.7,
        "distance_km": 0,
        "latitude": 23.7801,
        "longitude": 90.3601,
        "departments": ["Cardiology", "Cardiac Surgery", "ICU", "Cath Lab"],
        "website": "https://nhf.org.bd",
        "featured": False,
    },
    # ── Private hospitals ───────────────────────────────────────────────────
    {
        "id": 7,
        "name": "Square Hospital",
        "type": "hospital",
        "address": "18/F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka 1205",
        "phone": "+880-2-8159457",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.8,
        "distance_km": 0,
        "latitude": 23.7511,
        "longitude": 90.3798,
        "departments": ["Cardiac", "Oncology", "Orthopedics", "Neurology", "+12 depts"],
        "website": "https://squarehospital.com",
        "featured": False,
    },
    {
        "id": 8,
        "name": "United Hospital",
        "type": "hospital",
        "address": "Plot 15, Road 71, Gulshan, Dhaka 1212",
        "phone": "+880-10666-70000",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.7,
        "distance_km": 0,
        "latitude": 23.7937,
        "longitude": 90.4106,
        "departments": ["Cardiac", "Neurology", "Oncology", "Orthopedics", "+10 depts"],
        "website": "https://uhlbd.com",
        "featured": False,
    },
    {
        "id": 9,
        "name": "Labaid Specialized Hospital",
        "type": "hospital",
        "address": "6/2 Mirpur Rd, Dhanmondi, Dhaka 1205",
        "phone": "+880-2-9671733",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.5,
        "distance_km": 0,
        "latitude": 23.7441,
        "longitude": 90.3728,
        "departments": ["Orthopedics", "ENT", "Dental", "Cardiology"],
        "website": "https://labaidgroup.com",
        "featured": False,
    },
    {
        "id": 10,
        "name": "Samorita Hospital",
        "type": "hospital",
        "address": "89/1 Panthapath, Dhaka 1215",
        "phone": "+880-2-9125427",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.1,
        "distance_km": 0,
        "latitude": 23.7518,
        "longitude": 90.3832,
        "departments": ["General Medicine", "Diabetes", "Nephrology"],
        "website": "",
        "featured": False,
    },
    {
        "id": 11,
        "name": "Ibn Sina Medical College Hospital",
        "type": "hospital",
        "address": "House 48, Road 9/A, Dhanmondi, Dhaka 1209",
        "phone": "+880-2-8116191",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.5,
        "distance_km": 0,
        "latitude": 23.7491,
        "longitude": 90.3659,
        "departments": ["Medicine", "Surgery", "Gynecology", "Pediatrics"],
        "website": "https://ibnsina.net",
        "featured": False,
    },
    # ── FEATURED: DIU Medical Center ───────────────────────────────────────
    {
        "id": 12,
        "name": "DIU Medical Center",
        "type": "hospital",
        "address": "Daffodil Smart City, Birulia, Savar, Dhaka 1349",
        "phone": "+880-2-9112244",
        "hours": "24h emergency",
        "open_24h": True,
        "rating": 4.5,
        "distance_km": 0,
        "latitude": 23.8783991,
        "longitude": 90.3213219,
        "departments": ["General Medicine", "Surgery", "Gynecology", "Pediatrics", "Diagnostics"],
        "website": "https://maps.app.goo.gl/z9HQqgaRWzdoqKNv8",
        "featured": True,
    },
    # ── Clinics & diagnostics ───────────────────────────────────────────────
    {
        "id": 13,
        "name": "Popular Diagnostic Centre",
        "type": "clinic",
        "address": "House 16, Road 2, Dhanmondi, Dhaka 1205",
        "phone": "+880-2-9667359",
        "hours": "8 AM – 10 PM",
        "open_24h": False,
        "rating": 4.6,
        "distance_km": 0,
        "latitude": 23.7461,
        "longitude": 90.3742,
        "departments": ["Lab", "Imaging", "GP Consultation", "ECG"],
        "website": "https://populardiagnostic.com",
        "featured": False,
    },
    {
        "id": 14,
        "name": "Islami Bank Hospital",
        "type": "clinic",
        "address": "Kakrail, Dhaka 1000",
        "phone": "+880-2-8317744",
        "hours": "8 AM – 9 PM",
        "open_24h": False,
        "rating": 4.3,
        "distance_km": 0,
        "latitude": 23.7370,
        "longitude": 90.4049,
        "departments": ["Medicine", "Surgery", "Eye", "ENT"],
        "website": "",
        "featured": False,
    },
    {
        "id": 15,
        "name": "MedPlus Diagnostic",
        "type": "clinic",
        "address": "House 42, Road 11, Dhanmondi, Dhaka",
        "phone": "+880-2-9138001",
        "hours": "7 AM – 9 PM",
        "open_24h": False,
        "rating": 4.4,
        "distance_km": 0,
        "latitude": 23.7528,
        "longitude": 90.3741,
        "departments": ["Lab", "Radiology", "Echo", "X-Ray"],
        "website": "",
        "featured": False,
    },
    {
        "id": 16,
        "name": "Holy Family Red Crescent Medical College & Hospital",
        "type": "clinic",
        "address": "1 Eskaton Garden Rd, Dhaka 1000",
        "phone": "+880-2-9331401",
        "hours": "8 AM – 8 PM",
        "open_24h": False,
        "rating": 4.4,
        "distance_km": 0,
        "latitude": 23.7389,
        "longitude": 90.3992,
        "departments": ["OB/GYN", "Pediatrics", "Medicine", "Surgery"],
        "website": "",
        "featured": False,
    },
    # ── Pharmacies ──────────────────────────────────────────────────────────
    {
        "id": 17,
        "name": "Lazz Pharma – Dhanmondi",
        "type": "pharmacy",
        "address": "House 9, Road 4, Dhanmondi, Dhaka 1205",
        "phone": "+880-1711-622222",
        "hours": "Open 24h",
        "open_24h": True,
        "rating": 4.7,
        "distance_km": 0,
        "latitude": 23.7511,
        "longitude": 90.3712,
        "departments": ["Prescription", "OTC", "Home Delivery"],
        "website": "https://lazzpharma.com",
        "featured": False,
    },
    {
        "id": 18,
        "name": "Beacon Pharmacy – Dhanmondi",
        "type": "pharmacy",
        "address": "Road 27, Dhanmondi, Dhaka 1209",
        "phone": "+880-1800-222888",
        "hours": "Open 24h",
        "open_24h": True,
        "rating": 4.6,
        "distance_km": 0,
        "latitude": 23.7481,
        "longitude": 90.3769,
        "departments": ["Prescription", "OTC", "Medical Equipment"],
        "website": "",
        "featured": False,
    },
    {
        "id": 19,
        "name": "Wellbeing Pharmacy",
        "type": "pharmacy",
        "address": "32 Elephant Road, Dhaka 1205",
        "phone": "+880-1700-111000",
        "hours": "8 AM – 11 PM",
        "open_24h": False,
        "rating": 4.5,
        "distance_km": 0,
        "latitude": 23.7368,
        "longitude": 90.3888,
        "departments": ["Prescription", "OTC"],
        "website": "",
        "featured": False,
    },
    {
        "id": 20,
        "name": "ACI Pharma Retail – Gulshan",
        "type": "pharmacy",
        "address": "Road 35, Gulshan 2, Dhaka 1212",
        "phone": "+880-2-9882226",
        "hours": "8 AM – 10 PM",
        "open_24h": False,
        "rating": 4.5,
        "distance_km": 0,
        "latitude": 23.7945,
        "longitude": 90.4145,
        "departments": ["Prescription", "OTC", "Baby Care"],
        "website": "https://acipharmaceuticals.com",
        "featured": False,
    },
    {
        "id": 21,
        "name": "Nipa Pharmacy – Mirpur",
        "type": "pharmacy",
        "address": "Mirpur 10 Roundabout, Dhaka 1216",
        "phone": "+880-1755-333444",
        "hours": "Open 24h",
        "open_24h": True,
        "rating": 4.3,
        "distance_km": 0,
        "latitude": 23.8065,
        "longitude": 90.3669,
        "departments": ["Prescription", "OTC", "Delivery"],
        "website": "",
        "featured": False,
    },
    {
        "id": 22,
        "name": "Drug International – Uttara",
        "type": "pharmacy",
        "address": "Sector 3, Uttara, Dhaka 1230",
        "phone": "+880-1600-444555",
        "hours": "8 AM – 11 PM",
        "open_24h": False,
        "rating": 4.4,
        "distance_km": 0,
        "latitude": 23.8703,
        "longitude": 90.3979,
        "departments": ["Prescription", "OTC", "Surgical Items"],
        "website": "",
        "featured": False,
    },
    # ── Medical Colleges (Wikipedia: List of medical colleges in Bangladesh) ─
    {
        "id": 23,
        "name": "Dhaka Medical College",
        "type": "college",
        "address": "Bakshibazar Rd, Dhaka 1000",
        "phone": "+880-2-55165088",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.6,
        "distance_km": 0,
        "latitude": 23.7255,
        "longitude": 90.3970,
        "departments": ["MBBS", "BDS", "Postgraduate", "Research"],
        "website": "http://dmc.gov.bd",
        "featured": False,
    },
    {
        "id": 24,
        "name": "Sir Salimullah Medical College",
        "type": "college",
        "address": "Mitford Rd, Old Dhaka 1100",
        "phone": "+880-2-7312050",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.7080,
        "longitude": 90.4015,
        "departments": ["MBBS", "Clinical Training"],
        "website": "",
        "featured": False,
    },
    {
        "id": 25,
        "name": "Shaheed Suhrawardy Medical College",
        "type": "college",
        "address": "Sher-e-Bangla Nagar, Dhaka 1207",
        "phone": "+880-2-9130951",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.7712,
        "longitude": 90.3672,
        "departments": ["MBBS", "Postgraduate"],
        "website": "",
        "featured": False,
    },
    {
        "id": 26,
        "name": "Bangladesh Medical College",
        "type": "college",
        "address": "House 34, Road 14/A, Dhanmondi, Dhaka 1209",
        "phone": "+880-2-8116791",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.3,
        "distance_km": 0,
        "latitude": 23.7474,
        "longitude": 90.3730,
        "departments": ["MBBS", "BDS", "Nursing"],
        "website": "https://bmc.edu.bd",
        "featured": False,
    },
    {
        "id": 27,
        "name": "Green Life Medical College",
        "type": "college",
        "address": "32 Green Rd, Dhanmondi, Dhaka 1205",
        "phone": "+880-2-9671733",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.7515,
        "longitude": 90.3721,
        "departments": ["MBBS", "Hospital Training"],
        "website": "",
        "featured": False,
    },
    {
        "id": 28,
        "name": "Anwer Khan Modern Medical College",
        "type": "college",
        "address": "House 16, Road 8, Dhanmondi, Dhaka 1205",
        "phone": "+880-2-9680091",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.1,
        "distance_km": 0,
        "latitude": 23.7474,
        "longitude": 90.3725,
        "departments": ["MBBS", "Allied Health"],
        "website": "https://akmmc.edu.bd",
        "featured": False,
    },
    {
        "id": 29,
        "name": "Popular Medical College",
        "type": "college",
        "address": "Shyamoli Rd, Dhaka 1207",
        "phone": "+880-2-9113111",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.3,
        "distance_km": 0,
        "latitude": 23.7703,
        "longitude": 90.3563,
        "departments": ["MBBS", "Hospital Attachment"],
        "website": "",
        "featured": False,
    },
    # ── FEATURED: Daffodil Health Institute ────────────────────────────────
    {
        "id": 30,
        "name": "Daffodil Health Institute",
        "type": "college",
        "address": "Dhanmondi, Dhaka",
        "phone": "+880-2-9138080",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.4,
        "distance_km": 0,
        "latitude": 23.7549795,
        "longitude": 90.3763357,
        "departments": ["MBBS", "Community Medicine", "Research", "Hospital Training"],
        "website": "https://maps.app.goo.gl/KxYYaYJyxsjVEeB7A",
        "featured": True,
    },
    {
        "id": 31,
        "name": "Enam Medical College",
        "type": "college",
        "address": "Savar, Dhaka 1340",
        "phone": "+880-2-7745038",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.8607,
        "longitude": 90.2602,
        "departments": ["MBBS", "Postgraduate", "Research"],
        "website": "",
        "featured": False,
    },
    {
        "id": 32,
        "name": "Z H Sikder Women's Medical College",
        "type": "college",
        "address": "Zigatola, Dhanmondi, Dhaka 1209",
        "phone": "+880-2-9113991",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.2,
        "distance_km": 0,
        "latitude": 23.7315,
        "longitude": 90.3738,
        "departments": ["MBBS", "Women's Health", "Gynecology"],
        "website": "",
        "featured": False,
    },
    {
        "id": 33,
        "name": "Mugda Medical College",
        "type": "college",
        "address": "Mugda, Dhaka 1214",
        "phone": "+880-2-7271011",
        "hours": "Sun–Thu 8 AM – 4 PM",
        "open_24h": False,
        "rating": 4.0,
        "distance_km": 0,
        "latitude": 23.7345,
        "longitude": 90.4320,
        "departments": ["MBBS", "Government Medical"],
        "website": "",
        "featured": False,
    },
]


VALID_TYPES = {"hospital", "clinic", "pharmacy", "college"}


@router.get("")
def get_nearby(
    service_type: Optional[str] = Query(None, description="hospital | clinic | pharmacy | college | all"),
    max_distance: Optional[float] = Query(None, description="Max distance in km"),
    min_rating: Optional[float] = Query(None, description="Minimum rating (e.g. 4.0)"),
    open_now: Optional[bool] = Query(None, description="Only open 24h facilities"),
    user_lat: Optional[float] = Query(None, description="User latitude"),
    user_lng: Optional[float] = Query(None, description="User longitude"),
    featured_only: Optional[bool] = Query(None, description="Only featured (Daffodil) entries"),
    limit: int = Query(50, le=200),
):
    user_district = None
    if user_lat is not None and user_lng is not None:
        user_district = get_user_district(user_lat, user_lng)

    results = []
    for s in SERVICES:
        item = dict(s)

        if user_lat is not None and user_lng is not None:
            item["distance_km"] = round(haversine(user_lat, user_lng, s["latitude"], s["longitude"]), 1)
        else:
            item["distance_km"] = 0

        # District filter — skip for colleges which may be in Savar (outside core Dhaka bounds)
        if user_district and s["type"] != "college":
            if not in_district(s["latitude"], s["longitude"], user_district):
                continue

        results.append(item)

    if service_type and service_type != "all":
        results = [s for s in results if s["type"] == service_type]

    if max_distance is not None:
        results = [s for s in results if s["distance_km"] <= max_distance]

    if min_rating is not None:
        results = [s for s in results if s["rating"] >= min_rating]

    if open_now:
        results = [s for s in results if s["open_24h"]]

    if featured_only:
        results = [s for s in results if s.get("featured")]

    # Featured items always float to the top, then sort by distance
    results.sort(key=lambda s: (not s.get("featured", False), s["distance_km"]))
    return results[:limit]


@router.get("/{service_id}")
def get_service(service_id: int):
    for s in SERVICES:
        if s["id"] == service_id:
            return s
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Service not found")
