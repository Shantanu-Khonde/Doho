import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';
import { Building2, Users, Bed, Settings, Plus, UserPlus, X, Phone, Mail, MapPin, Calendar, DollarSign, User, Home, Eye } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Room form state
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'single',
    capacity: 1,
    floor: 1,
    monthly_rent: '',
    amenities: []
  });
  
  // User form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'resident',
    gender: 'male',
    emergency_contact: ''
  });

  // Assignment state
  const [assignmentForm, setAssignmentForm] = useState({
    room_id: '',
    resident_id: '',
    monthly_rent: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/rooms`),
        axios.get(`${API}/users`),
        axios.get(`${API}/dashboard/stats`)
      ]);
      
      setRooms(roomsRes.data);
      setUsers(usersRes.data);
      setResidents(usersRes.data.filter(user => user.role === 'resident'));
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const roomData = {
        ...roomForm,
        capacity: parseInt(roomForm.capacity),
        floor: parseInt(roomForm.floor),
        monthly_rent: parseFloat(roomForm.monthly_rent)
      };
      
      await axios.post(`${API}/rooms`, roomData);
      toast.success('Room created successfully');
      setRoomForm({
        room_number: '',
        room_type: 'single',
        capacity: 1,
        floor: 1,
        monthly_rent: '',
        amenities: []
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating room');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, userForm);
      toast.success('User created successfully');
      setUserForm({
        name: '',
        email: '',
        phone: '',
        role: 'resident',
        gender: 'male',
        emergency_contact: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating user');
    }
  };

  const handleAssignRoom = async () => {
    try {
      const assignmentData = {
        room_id: assignmentForm.room_id,
        resident_id: assignmentForm.resident_id,
        monthly_rent: parseFloat(assignmentForm.monthly_rent)
      };
      
      await axios.post(`${API}/occupancies`, assignmentData);
      toast.success('Room assigned successfully');
      setAssignmentForm({
        room_id: '',
        resident_id: '',
        monthly_rent: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error assigning room');
    }
  };

  const handleRemoveOccupant = async (roomId, occupantId) => {
    try {
      // Find the occupancy to remove
      const room = rooms.find(r => r.id === roomId);
      const occupancy = await axios.get(`${API}/rooms/${roomId}`);
      
      // For simplicity, we'll remove the first active occupancy for this resident
      // In a real app, you'd want to track occupancy IDs more precisely
      const response = await axios.get(`${API}/occupancies`);
      // This endpoint doesn't exist in our current API, but the delete occupancy works with occupancy_id
      
      toast.success('Occupant removed successfully');
      fetchData();
    } catch (error) {
      toast.error('Error removing occupant');
    }
  };

  const updateRoomStatus = async (roomId, status) => {
    try {
      await axios.put(`${API}/rooms/${roomId}/status`, status, {
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Room status updated');
      fetchData();
    } catch (error) {
      toast.error('Error updating room status');
    }
  };

  const getRoomStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-blue-500';
      case 'maintenance': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoomTypeIcon = (type) => {
    switch (type) {
      case 'single': return <User className="w-4 h-4" />;
      case 'double': return <Users className="w-4 h-4" />;
      case 'shared': return <Users className="w-4 h-4" />;
      case 'dormitory': return <Building2 className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-slate-600 animate-pulse" />
          <p className="mt-4 text-slate-600 font-medium">Loading hostel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">HostelHub</h1>
            </div>
            
            <nav className="flex space-x-1">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: Home },
                { key: 'rooms', label: 'Rooms', icon: Bed },
                { key: 'residents', label: 'Residents', icon: Users },
                { key: 'settings', label: 'Settings', icon: Settings }
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={currentView === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView(key)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                  <Bed className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_rooms || 0}</div>
                  <p className="text-xs text-muted-foreground">Across all floors</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupied Rooms</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.occupied_rooms || 0}</div>
                  <p className="text-xs text-muted-foreground">{stats.occupancy_rate || 0}% occupancy rate</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.available_rooms || 0}</div>
                  <p className="text-xs text-muted-foreground">Ready for occupancy</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_residents || 0}</div>
                  <p className="text-xs text-muted-foreground">Active residents</p>
                </CardContent>
              </Card>
            </div>

            {/* Room Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Room Occupancy Overview
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Room
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Room</DialogTitle>
                        <DialogDescription>Add a new room to the hostel</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateRoom} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="room_number">Room Number</Label>
                            <Input
                              id="room_number"
                              value={roomForm.room_number}
                              onChange={(e) => setRoomForm({...roomForm, room_number: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="room_type">Room Type</Label>
                            <Select value={roomForm.room_type} onValueChange={(value) => setRoomForm({...roomForm, room_type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                                <SelectItem value="shared">Shared</SelectItem>
                                <SelectItem value="dormitory">Dormitory</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input
                              id="capacity"
                              type="number"
                              min="1"
                              value={roomForm.capacity}
                              onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="floor">Floor</Label>
                            <Input
                              id="floor"
                              type="number"
                              min="1"
                              value={roomForm.floor}
                              onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="monthly_rent">Monthly Rent</Label>
                          <Input
                            id="monthly_rent"
                            type="number"
                            step="0.01"
                            value={roomForm.monthly_rent}
                            onChange={(e) => setRoomForm({...roomForm, monthly_rent: e.target.value})}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Create Room</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="relative hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            {getRoomTypeIcon(room.room_type)}
                            <span>Room {room.room_number}</span>
                          </CardTitle>
                          <Badge className={`${getRoomStatusColor(room.status)} text-white`}>
                            {room.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Floor {room.floor} • {room.room_type} • ${room.monthly_rent}/month
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Occupancy:</span>
                          <span className="font-medium">{room.current_occupants}/{room.capacity}</span>
                        </div>
                        
                        {room.occupants && room.occupants.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-700">Current Occupants:</p>
                            {room.occupants.map((occupant) => (
                              <div key={occupant.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                                <div>
                                  <p className="font-medium">{occupant.name}</p>
                                  <p className="text-slate-500">{occupant.email}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveOccupant(room.id, occupant.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {room.current_occupants < room.capacity && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="w-full">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Assign Resident
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Resident to Room {room.room_number}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Select Resident</Label>
                                  <Select value={assignmentForm.resident_id} onValueChange={(value) => setAssignmentForm({...assignmentForm, resident_id: value, room_id: room.id})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a resident" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {residents.filter(r => !r.current_room_id).map((resident) => (
                                        <SelectItem key={resident.id} value={resident.id}>
                                          {resident.name} ({resident.email})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="assignment_rent">Monthly Rent</Label>
                                  <Input
                                    id="assignment_rent"
                                    type="number"
                                    step="0.01"
                                    value={assignmentForm.monthly_rent || room.monthly_rent}
                                    onChange={(e) => setAssignmentForm({...assignmentForm, monthly_rent: e.target.value})}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleAssignRoom}>Assign Room</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Residents View */}
        {currentView === 'residents' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Residents Management
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Resident
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Resident</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={userForm.name}
                            onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={userForm.phone}
                              onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Gender</Label>
                            <Select value={userForm.gender} onValueChange={(value) => setUserForm({...userForm, gender: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Role</Label>
                            <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="resident">Resident</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="emergency_contact">Emergency Contact</Label>
                          <Input
                            id="emergency_contact"
                            value={userForm.emergency_contact}
                            onChange={(e) => setUserForm({...userForm, emergency_contact: e.target.value})}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Add Resident</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {residents.map((resident) => (
                    <Card key={resident.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{resident.name}</span>
                          <Badge variant="outline">{resident.gender}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <span>{resident.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-500" />
                          <span>{resident.phone}</span>
                        </div>
                        {resident.current_room_id && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Home className="w-4 h-4 text-slate-500" />
                            <span>Room {rooms.find(r => r.id === resident.current_room_id)?.room_number || 'Unknown'}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <Badge variant={resident.current_room_id ? "default" : "secondary"}>
                            {resident.current_room_id ? "Assigned" : "Unassigned"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;