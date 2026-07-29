import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  LifeBuoy, 
  MapPin, 
  Phone, 
  Users, 
  Clock, 
  AlertOctagon, 
  Edit, 
  Trash2, 
  XCircle
} from 'lucide-react';
import { formatDate } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RescueRequest {
  id: number;
  user_id: number | null;
  reporter_name: string;
  reporter_contact: string;
  location: string;
  people_count: number;
  status: 'pending' | 'assigned' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_at: string;
}

interface Responder {
  id: number;
  name: string;
  role: string;
}

const RescueRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields for new request (Residents)
  const [reporterName, setReporterName] = useState(user?.name || '');
  const [reporterContact, setReporterContact] = useState('');
  const [location, setLocation] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [notes, setNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Edit / Assignment modal details
  const [selectedRequest, setSelectedRequest] = useState<RescueRequest | null>(null);
  const [editStatus, setEditStatus] = useState<string>('pending');
  const [editPriority, setEditPriority] = useState<string>('medium');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editAssignedTo, setEditAssignedTo] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api/rescue');
      if (response.data.success) {
        setRequests(response.data.requests);
      }
    } catch (err) {
      setError('Failed to fetch rescue requests queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponders = async () => {
    if (user?.role === 'resident') return;
    try {
      const response = await api.get('/api/users');
      if (response.data.success) {
        // Filter users who can be assigned to rescues
        const activeResponders = response.data.users.filter(
          (u: any) => u.role === 'responder' || u.role === 'coordinator' || u.role === 'admin'
        );
        setResponders(activeResponders);
      }
    } catch (err) {
      console.error('Error fetching responders list', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchResponders();
  }, [user]);

  // Handle socket events
  useEffect(() => {
    const socket = io(API_URL);

    // Watch for new requests created on server
    socket.on('rescue_created', (newReq: RescueRequest) => {
      setRequests((prev) => {
        // For residents, only append if it belongs to them
        if (user?.role === 'resident' && newReq.user_id !== user.id) {
          return prev;
        }
        return [newReq, ...prev];
      });
    });

    // Watch for requests updated
    socket.on('rescue_updated', (updatedReq: RescueRequest) => {
      setRequests((prev) => {
        return prev.map((req) => (req.id === updatedReq.id ? updatedReq : req));
      });
    });

    // Watch for requests deleted
    socket.on('rescue_deleted', (id: number) => {
      setRequests((prev) => prev.filter((req) => req.id !== Number(id)));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormSuccess(null);
    setFormLoading(true);

    try {
      const response = await api.post('/api/rescue', {
        reporter_name: reporterName,
        reporter_contact: reporterContact,
        location,
        people_count: peopleCount,
        priority,
        notes,
      });

      if (response.data.success) {
        setFormSuccess('SOS Emergency Broadcast Transmitted! Rescue coordinators have been notified.');
        // Reset form
        setReporterContact('');
        setLocation('');
        setPeopleCount(1);
        setPriority('medium');
        setNotes('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Emergency transmission failed. Please retry.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleClaimRequest = async (requestId: number) => {
    try {
      await api.put(`/api/rescue/${requestId}`, {
        status: 'assigned',
        assigned_to: user?.id,
      });
      fetchRequests();
    } catch (err) {
      console.error('Error claiming request', err);
    }
  };

  const handleOpenEditModal = (req: RescueRequest) => {
    setSelectedRequest(req);
    setEditStatus(req.status);
    setEditPriority(req.priority);
    setEditNotes(req.notes || '');
    setEditAssignedTo(req.assigned_to);
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setEditLoading(true);

    try {
      const response = await api.put(`/api/rescue/${selectedRequest.id}`, {
        status: editStatus,
        priority: editPriority,
        notes: editNotes,
        assigned_to: editAssignedTo === 0 ? null : editAssignedTo,
      });

      if (response.data.success) {
        setSelectedRequest(null);
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to update request', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!window.confirm(`Are you sure you want to delete rescue request #${requestId}?`)) return;

    try {
      await api.delete(`/api/rescue/${requestId}`);
      fetchRequests();
    } catch (err) {
      console.error('Failed to delete request', err);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to cancel your rescue request?')) return;

    try {
      await api.put(`/api/rescue/${requestId}`, { status: 'cancelled' });
      fetchRequests();
    } catch (err) {
      console.error('Failed to cancel request', err);
    }
  };

  const getPriorityColor = (lvl: string) => {
    switch (lvl) {
      case 'critical': return 'bg-red-950 text-red-400 border border-red-950 animate-pulse';
      case 'high': return 'bg-orange-950 text-orange-400 border border-orange-950';
      case 'medium': return 'bg-blue-950 text-blue-400 border border-blue-950';
      default: return 'bg-gray-950 text-gray-400 border border-gray-850';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-950 text-amber-400 border border-amber-900';
      case 'assigned': return 'bg-indigo-950 text-indigo-400 border border-indigo-900';
      case 'resolved': return 'bg-emerald-950 text-emerald-400 border border-emerald-900';
      default: return 'bg-red-950 text-red-400 border border-red-900';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <LifeBuoy className="h-5 w-5 text-blue-500" />
            <span>Emergency Assistance Portal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {user?.role === 'resident'
              ? 'Submit SOS calls and track responders details'
              : 'Dispatch team queue: analyze priorities and coordinate rescue swarms'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-950 bg-opacity-40 border border-red-500 border-opacity-35 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Forms or queue */}
        {user?.role === 'resident' ? (
          /* Resident Panel: Request form + My requests */
          <>
            <div className="glass-panel rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
                <AlertOctagon className="h-4.5 w-4.5 text-red-500" />
                <span>Transmit SOS Assistance Signal</span>
              </h3>

              {formSuccess && (
                <div className="p-4 bg-emerald-950 bg-opacity-20 border border-emerald-900 rounded-xl text-xs text-emerald-400">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    required
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                    placeholder="E.g. John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={reporterContact}
                      onChange={(e) => setReporterContact(e.target.value)}
                      className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                      placeholder="E.g. +91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Stranded People Count
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value))}
                      className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Specific Location Coordinates / Address
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 px-3 text-white text-xs outline-none"
                    placeholder="E.g. Block C, Flat 402, Velachery Main Rd (Near Water Tank)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Situation Urgency
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="low">Low (Standing Water, Safe)</option>
                      <option value="medium">Medium (Water Entering Ground Floor)</option>
                      <option value="high">High (Water Up To Chest Level)</option>
                      <option value="critical">Critical (Roof Level, Immediate Medical Needs)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Situation Details / Special Instructions
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-900 bg-opacity-50 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                    placeholder="Elderly people present, needs boat assistance, etc."
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-950"
                >
                  {formLoading ? 'Transmitting Beacon...' : 'Broadcast SOS Signals'}
                </button>
              </form>
            </div>

            {/* My Requests queue */}
            <div className="xl:col-span-2 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">My Emergency Signals</h3>
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="p-6 bg-gray-900 bg-opacity-40 border border-gray-850 rounded-2xl text-center text-gray-500 text-xs">
                    No active SOS signals registered to your profile
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between space-y-3 md:space-y-0 border border-gray-850">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2.5">
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold ${getPriorityColor(req.priority)}`}>
                            {req.priority}
                          </span>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">#{req.id}</span>
                        </div>
                        
                        <p className="text-xs text-gray-300 flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1 text-blue-400 flex-shrink-0" />
                          <span>{req.location}</span>
                        </p>
                        
                        <p className="text-[11px] text-gray-500 flex items-center space-x-4">
                          <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-0.5 text-gray-600" /> Headcount: {req.people_count}</span>
                          <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-0.5 text-gray-600" /> Submitted: {formatDate(req.created_at)}</span>
                        </p>
                        
                        {req.notes && (
                          <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-850 text-[11px] text-gray-400">
                            <strong>Note:</strong> {req.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-gray-500 font-mono">Dispatched Responder</p>
                          <p className="text-xs font-bold text-blue-400 mt-0.5">
                            {req.assigned_to_name || 'Awaiting dispatch queue...'}
                          </p>
                        </div>
                        
                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="mt-3 text-xs bg-red-950 bg-opacity-20 border border-red-950 text-red-400 py-1 px-3 rounded-lg hover:bg-opacity-40 transition"
                          >
                            Cancel SOS
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* Coordinator / Responder Panel: Central Table dispatch queue list */
          <div className="xl:col-span-3 space-y-4">
            <div className="glass-panel rounded-2xl shadow-lg p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Emergency Swarm queue</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-400">
                  <thead className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800 bg-gray-950 bg-opacity-35">
                    <tr>
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Urgency</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Details</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Dispatched Responder</th>
                      <th className="py-2.5 px-3 text-right">Coordination Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 font-mono">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500">No emergency requests active</td>
                      </tr>
                    ) : (
                      requests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-900 hover:bg-opacity-10 transition">
                          <td className="py-3 px-3 text-gray-500">#{req.id}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(req.priority)}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-gray-200 font-sans font-bold">{req.reporter_name}</p>
                            <p className="text-[10px] text-gray-500 flex items-center mt-0.5"><Phone className="h-3 w-3 mr-0.5" /> {req.reporter_contact}</p>
                            <p className="text-[10px] text-gray-500 flex items-center mt-0.5"><Users className="h-3 w-3 mr-0.5" /> Headcount: {req.people_count}</p>
                          </td>
                          <td className="py-3 px-3 text-gray-300 font-sans truncate max-w-xs" title={req.location}>
                            {req.location}
                          </td>
                          <td className="py-3 px-3 text-blue-400 text-[11px] font-sans font-semibold">
                            {req.assigned_to_name || 'UNASSIGNED'}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleClaimRequest(req.id)}
                                className="px-2.5 py-1 bg-indigo-900 bg-opacity-35 text-indigo-300 border border-indigo-800 rounded-lg hover:bg-indigo-600 hover:text-white transition text-[11px]"
                              >
                                Claim
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleOpenEditModal(req)}
                              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 inline-flex items-center"
                              title="Update Dispatch Info"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {(user?.role === 'admin' || user?.role === 'coordinator') && (
                              <button
                                onClick={() => handleDeleteRequest(req.id)}
                                className="p-1.5 rounded-lg bg-red-950 bg-opacity-20 border border-red-950 text-red-400 hover:bg-red-600 hover:text-white inline-flex items-center"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit / Dispatch Coordination Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Dispatch Coordinator: #{selectedRequest.id}
              </h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDetails} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Update Operational Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-white text-xs"
                >
                  <option value="pending">Pending Queue</option>
                  <option value="assigned">Assigned Responders</option>
                  <option value="resolved">Resolved / Safe</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Urgency Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-white text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Assign Responder
                  </label>
                  <select
                    value={editAssignedTo || 0}
                    onChange={(e) => setEditAssignedTo(e.target.value === '0' ? null : parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-white text-xs"
                  >
                    <option value={0}>Unassigned</option>
                    {responders.map((resp) => (
                      <option key={resp.id} value={resp.id}>
                        {resp.name} ({resp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Coordinator Dispatch Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-white text-xs"
                  placeholder="Record team assignments, safety status details..."
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-2 border border-gray-800 hover:bg-gray-800 text-gray-400 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  {editLoading ? 'Saving...' : 'Commit Dispatch Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RescueRequests;
