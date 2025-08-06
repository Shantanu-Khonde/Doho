from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class RoomType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    SHARED = "shared"
    DORMITORY = "dormitory"

class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    RESERVED = "reserved"

class UserRole(str, Enum):
    MANAGER = "manager"
    RESIDENT = "resident"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# Models
class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_number: str
    room_type: RoomType
    capacity: int
    floor: int
    monthly_rent: float
    status: RoomStatus = RoomStatus.AVAILABLE
    current_occupants: int = 0
    amenities: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RoomCreate(BaseModel):
    room_number: str
    room_type: RoomType
    capacity: int
    floor: int
    monthly_rent: float
    amenities: List[str] = []

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    role: UserRole
    gender: Gender
    emergency_contact: str
    current_room_id: Optional[str] = None
    check_in_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str
    phone: str
    role: UserRole
    gender: Gender
    emergency_contact: str

class Occupancy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    resident_id: str
    check_in_date: datetime = Field(default_factory=datetime.utcnow)
    check_out_date: Optional[datetime] = None
    is_active: bool = True
    monthly_rent: float

class OccupancyCreate(BaseModel):
    room_id: str
    resident_id: str
    monthly_rent: float

class RoomWithOccupants(BaseModel):
    id: str
    room_number: str
    room_type: RoomType
    capacity: int
    floor: int
    monthly_rent: float
    status: RoomStatus
    current_occupants: int
    amenities: List[str]
    occupants: List[User] = []
    created_at: datetime

# Room Routes
@api_router.post("/rooms", response_model=Room)
async def create_room(room_data: RoomCreate):
    # Check if room number already exists
    existing_room = await db.rooms.find_one({"room_number": room_data.room_number})
    if existing_room:
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    room = Room(**room_data.dict())
    await db.rooms.insert_one(room.dict())
    return room

@api_router.get("/rooms", response_model=List[RoomWithOccupants])
async def get_all_rooms():
    rooms = await db.rooms.find().sort("room_number", 1).to_list(1000)
    room_list = []
    
    for room in rooms:
        # Get current occupants for each room
        occupancies = await db.occupancies.find({
            "room_id": room["id"], 
            "is_active": True
        }).to_list(100)
        
        occupants = []
        for occ in occupancies:
            resident = await db.users.find_one({"id": occ["resident_id"]})
            if resident:
                occupants.append(User(**resident))
        
        room_with_occupants = RoomWithOccupants(**room, occupants=occupants)
        room_list.append(room_with_occupants)
    
    return room_list

@api_router.get("/rooms/{room_id}", response_model=RoomWithOccupants)
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Get current occupants
    occupancies = await db.occupancies.find({
        "room_id": room_id, 
        "is_active": True
    }).to_list(100)
    
    occupants = []
    for occ in occupancies:
        resident = await db.users.find_one({"id": occ["resident_id"]})
        if resident:
            occupants.append(User(**resident))
    
    return RoomWithOccupants(**room, occupants=occupants)

class RoomStatusUpdate(BaseModel):
    status: RoomStatus

@api_router.put("/rooms/{room_id}/status")
async def update_room_status(room_id: str, status_update: RoomStatusUpdate):
    result = await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room status updated successfully"}

# User Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users", response_model=List[User])
async def get_all_users(role: Optional[UserRole] = None):
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query).sort("name", 1).to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Occupancy Routes
@api_router.post("/occupancies", response_model=Occupancy)
async def assign_room(occupancy_data: OccupancyCreate):
    # Verify room exists
    room = await db.rooms.find_one({"id": occupancy_data.room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Verify user exists
    user = await db.users.find_one({"id": occupancy_data.resident_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if room has capacity
    current_occupancies = await db.occupancies.count_documents({
        "room_id": occupancy_data.room_id,
        "is_active": True
    })
    
    if current_occupancies >= room["capacity"]:
        raise HTTPException(status_code=400, detail="Room is at full capacity")
    
    # Check if user is already assigned to a room
    existing_occupancy = await db.occupancies.find_one({
        "resident_id": occupancy_data.resident_id,
        "is_active": True
    })
    
    if existing_occupancy:
        raise HTTPException(status_code=400, detail="User is already assigned to a room")
    
    # Create occupancy
    occupancy = Occupancy(**occupancy_data.dict())
    await db.occupancies.insert_one(occupancy.dict())
    
    # Update room's current occupants count and status
    new_occupant_count = current_occupancies + 1
    new_status = RoomStatus.OCCUPIED if new_occupant_count > 0 else RoomStatus.AVAILABLE
    
    await db.rooms.update_one(
        {"id": occupancy_data.room_id},
        {"$set": {
            "current_occupants": new_occupant_count,
            "status": new_status
        }}
    )
    
    # Update user's current room
    await db.users.update_one(
        {"id": occupancy_data.resident_id},
        {"$set": {
            "current_room_id": occupancy_data.room_id,
            "check_in_date": datetime.utcnow()
        }}
    )
    
    return occupancy

@api_router.delete("/occupancies/{occupancy_id}")
async def remove_occupancy(occupancy_id: str):
    occupancy = await db.occupancies.find_one({"id": occupancy_id, "is_active": True})
    if not occupancy:
        raise HTTPException(status_code=404, detail="Active occupancy not found")
    
    # Mark occupancy as inactive
    await db.occupancies.update_one(
        {"id": occupancy_id},
        {"$set": {
            "is_active": False,
            "check_out_date": datetime.utcnow()
        }}
    )
    
    # Update room's current occupants count
    current_occupancies = await db.occupancies.count_documents({
        "room_id": occupancy["room_id"],
        "is_active": True
    })
    
    new_status = RoomStatus.AVAILABLE if current_occupancies == 0 else RoomStatus.OCCUPIED
    
    await db.rooms.update_one(
        {"id": occupancy["room_id"]},
        {"$set": {
            "current_occupants": current_occupancies,
            "status": new_status
        }}
    )
    
    # Update user's current room
    await db.users.update_one(
        {"id": occupancy["resident_id"]},
        {"$set": {
            "current_room_id": None,
            "check_in_date": None
        }}
    )
    
    return {"message": "Occupancy removed successfully"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": "occupied"})
    available_rooms = await db.rooms.count_documents({"status": "available"})
    maintenance_rooms = await db.rooms.count_documents({"status": "maintenance"})
    total_residents = await db.users.count_documents({"role": "resident"})
    active_occupancies = await db.occupancies.count_documents({"is_active": True})
    
    return {
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "available_rooms": available_rooms,
        "maintenance_rooms": maintenance_rooms,
        "total_residents": total_residents,
        "active_occupancies": active_occupancies,
        "occupancy_rate": round((occupied_rooms / total_rooms * 100), 1) if total_rooms > 0 else 0
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()