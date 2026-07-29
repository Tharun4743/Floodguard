import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  Home, 
  MapPin, 
  Plus, 
  Minus, 
  DoorOpen,
  Trash2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Shelter {
  id: number;
  name: string;
  location: string;
  capacity: number;
  occupancy: number;
  status: 'open' | 'full' | 'closed';
  created_at: string;
}

const EvacuationPanel: React.FC = () => {
  const { user } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New shelter form fields (Coordinator/Admin only)
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchShelters = async () => {
    try {
      const response = await api.get('/api/shelters');
      if (response.data.success) {
        setShelters(response.data.shelters);
      }
    } catch (err) {
      setError('Failed to fetch evacuation shelter list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  // Socket synchronization
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('shelter_created', (newShelter: Shelter) => {
      setShelters((prev) => [...prev, newShelter]);
    });

    socket.on('shelter_updated', (updatedShelter: Shelter) => {
      updateShelterInState(updatedShelter);
    });

    socket.on('shelter_deleted', (id: number) => {
      setShelters((prev) => prev.filter((s) => s.id !== Number(id)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateShelterInState = (updated: Shelter) => {
    setShelters((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormSuccess(null);
    setFormLoading(true);

    try {
      const response = await api.post('/api/shelters', { name, location, capacity });
      if (response.data.success) {
        setFormSuccess('Evacuation shelter added successfully!');
        setName('');
        setLocation('');
        setCapacity(100);
        fetchShelters();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register shelter safe zone');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdjustOccupancy = async (shelterId: number, adjustment: number) => {
    const shelter = shelters.find((s) => s.id === shelterId);
    if (!shelter) return;
    const newOccupancy = Math.max(0, shelter.occupancy + adjustment);
    if (newOccupancy === shelter.occupancy) return;
    updateShelterInState({ ...shelter, occupancy: newOccupancy });
    try {
      await api.put(`/api/shelters/${shelterId}`, { occupancy: newOccupancy });
    } catch (err) {
      console.error('Failed to update shelter occupancy', err);
      fetchShelters();
    }
  };

  const handleStatusChange = async (shelterId: number, newStatus: string) => {
    const shelter = shelters.find((s) => s.id === shelterId);
    if (!shelter) return;
    updateShelterInState({ ...shelter, status: newStatus as any });
    try {
      await api.put(`/api/shelters/${shelterId}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update shelter status', err);
      fetchShelters();
    }
  };

  const handleDeleteShelter = async (shelterId: number) => {
    if (!window.confirm('Are you sure you want to delete this safe zone?')) return;
    try {
      await api.delete(`/api/shelters/${shelterId}`);
      fetchShelters();
    } catch (err) {
      console.error('Failed to delete shelter', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':  return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      case 'full':  return 'bg-red-100 text-red-700 border border-red-300';
      default:      return 'bg-gray-100 text-gray-600 border border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isManagementAllowed = user?.role === 'admin' || user?.role === 'coordinator' || user?.role === 'responder';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Home className="h-5 w-5 text-emerald-600" />
            <span>Evacuation &amp; Shelters Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Check safe zone limits, real-time capacities, and shelter status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (Create Shelter Form, Admin/Coord Only) */}
        {(user?.role === 'admin' || user?.role === 'coordinator') && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center space-x-2">
              <Plus className="h-4.5 w-4.5 text-blue-600" />
              <span>Register New Safe Haven</span>
            </h3>

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                {formSuccess}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateShelter} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Shelter Facility Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-gray-900 text-xs outline-none"
                  placeholder="E.g. Indira Nagar Community Shelter"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Location / Zone Address
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-gray-900 text-xs outline-none"
                  placeholder="E.g. 5th Main St, Sector 2"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Total Shelter Capacity (Beds/Pax)
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-gray-900 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
              >
                {formLoading ? 'Registering...' : 'Provision Shelter Safe Zone'}
              </button>
            </form>
          </div>
        )}

        {/* Right Columns (Shelters grid list) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
          (user?.role === 'admin' || user?.role === 'coordinator') ? 'xl:col-span-2' : 'xl:col-span-3'
        }`}>
          {shelters.length === 0 ? (
            <div className="col-span-full p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center text-gray-500 text-xs">
              No evacuation safe zones registered in this operational grid.
            </div>
          ) : (
            shelters.map((shelter) => {
              const ratio = Math.round((shelter.occupancy / shelter.capacity) * 100);
              return (
                <div key={shelter.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Delete trigger */}
                  {(user?.role === 'admin' || user?.role === 'coordinator') && (
                    <button
                      onClick={() => handleDeleteShelter(shelter.id)}
                      className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                      title="Deregister Shelter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <DoorOpen className="h-5 w-5 text-emerald-600" />
                      <h4 className="font-bold text-gray-900 text-sm">{shelter.name}</h4>
                    </div>

                    <p className="text-xs text-gray-500 flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 flex-shrink-0" />
                      <span>{shelter.location || 'Location not set'}</span>
                    </p>

                    {/* Capacity indicators */}
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-gray-500">Utilization Status</span>
                        <span className="font-bold text-gray-700">{shelter.occupancy} / {shelter.capacity} ({ratio}%)</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            ratio >= 95 ? 'bg-red-500' :
                            ratio >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Responders/Coordinators/Admins) */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {isManagementAllowed ? (
                        <select
                          value={shelter.status}
                          onChange={(e) => handleStatusChange(shelter.id, e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-[10px] font-mono font-bold rounded-lg px-2 py-1 text-gray-700 cursor-pointer outline-none focus:border-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="full">Full</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-bold tracking-wider ${getStatusBadge(shelter.status)}`}>
                          {shelter.status}
                        </span>
                      )}
                    </div>

                    {isManagementAllowed && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleAdjustOccupancy(shelter.id, -10)}
                          className="p-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                          title="Reduce 10"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleAdjustOccupancy(shelter.id, -1)}
                          className="p-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                          title="Reduce 1"
                        >
                          <span className="text-[10px] font-bold px-1">-1</span>
                        </button>
                        
                        <span className="text-[10px] font-mono font-bold px-1 text-gray-400">Log</span>
                        
                        <button
                          onClick={() => handleAdjustOccupancy(shelter.id, 1)}
                          className="p-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                          title="Add 1"
                        >
                          <span className="text-[10px] font-bold px-1">+1</span>
                        </button>
                        <button
                          onClick={() => handleAdjustOccupancy(shelter.id, 10)}
                          className="p-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                          title="Add 10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default EvacuationPanel;
