import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  LifeBuoy, 
  Home, 
  MessageSquare, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  Radio,
  Map,
  CloudRain,
  Brain,
  BellRing,
  Settings
} from 'lucide-react';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: 'warning' | 'evacuation' | 'info';
  status: 'unread' | 'read';
  created_at: string;
}

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real-time Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Expanded nav items matching the AI FloodGuard specifications
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Live Flood Map', path: '/dashboard/map', icon: Map, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Weather', path: '/dashboard/weather', icon: CloudRain, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Flood Prediction', path: '/dashboard/prediction', icon: Brain, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Alert Center', path: '/dashboard/alerts', icon: BellRing, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Rescue Dispatch', path: '/dashboard/rescue', icon: LifeBuoy, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Evacuation safe', path: '/dashboard/shelters', icon: Shield, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Swarm Chat', path: '/dashboard/chat', icon: MessageSquare, roles: ['admin', 'coordinator', 'responder', 'resident'] },
    { name: 'Admin Panel', path: '/dashboard/admin', icon: Settings, roles: ['admin'] },
  ];

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const storedToken = localStorage.getItem('floodguard_token');
        if (!storedToken) return;

        const response = await fetch(`${API_URL}/api/notifications`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  // Connect to Socket.io for live notifications
  useEffect(() => {
    const newSocket = io(API_URL);

    // Sync live alerts via alert:new channel
    newSocket.on('alert:new', (alertData: any) => {
      const mappedNotif: SystemNotification = {
        id: alertData.id,
        title: alertData.title,
        message: alertData.message,
        type: alertData.severity === 'CRITICAL' ? 'evacuation' : 'warning',
        status: 'unread',
        created_at: alertData.created_at
      };
      setNotifications((prev) => [mappedNotif, ...prev]);
    });

    newSocket.on('notification', (notification: SystemNotification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    if (user) {
      newSocket.on(`notification_user_${user.id}`, (notification: SystemNotification) => {
        setNotifications((prev) => [notification, ...prev]);
      });
    }

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map(n => ({ ...n, status: 'read' })));
    try {
      const storedToken = localStorage.getItem('floodguard_token');
      for (const n of notifications) {
        if (n.status === 'unread') {
          await fetch(`${API_URL}/api/notifications/${n.id}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeNotificationsCount = notifications.filter(n => n.status === 'unread').length;

  // Filter items by user role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex items-center space-x-2 px-6 py-5 border-b border-gray-200">
          <Brain className="h-6 w-6 text-blue-600" />
          <span className="font-extrabold text-sm tracking-widest text-gray-900 uppercase">
            AI <span className="text-blue-600">FloodGuard</span>
          </span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold font-mono uppercase tracking-wide transition ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile capsule bottom */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-gray-900 truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5 tracking-wider">{user?.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-16 bg-white bg-opacity-90 backdrop-blur border-b border-gray-200 px-6 flex justify-between items-center z-20">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-wider">Live Feeds Synchronized</span>
            </div>
          </div>

          {/* Alarm Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllAsRead();
              }}
              className="p-2 bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition relative"
            >
              <Bell className="h-4.5 w-4.5" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 space-y-3 font-sans text-xs">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">Alert Announcements</h4>
                  {activeNotificationsCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                      {activeNotificationsCount} New
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">No announcements logged</p>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition ${
                          n.status === 'unread' ? 'bg-blue-50 border-blue-200 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-500'
                        }`}
                      >
                        <p className="font-bold text-gray-900">{n.title}</p>
                        <p className="mt-1 leading-snug">{n.message}</p>
                        <p className="text-[9px] text-gray-600 text-right mt-1.5 font-mono">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Nested Routes Renderer */}
        <main className="flex-1 overflow-y-auto p-6 grid-bg">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Sidebar - Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-40 z-50 md:hidden backdrop-blur-sm">
          <div className="w-64 bg-white h-full border-r border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5.5 w-5.5 text-blue-600" />
                  <span className="font-extrabold text-sm tracking-widest text-gray-900 uppercase">AI FloodGuard</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="px-4 py-4 space-y-1.5">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold font-mono uppercase tracking-wide transition ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-gray-900">{user?.name}</p>
                <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">{user?.role}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
