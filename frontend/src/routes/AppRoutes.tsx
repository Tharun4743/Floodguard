import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/Layout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import LandingPage from '../pages/LandingPage';
import Dashboard from '../pages/Dashboard';
import LiveFloodMap from '../pages/LiveFloodMap';
import WeatherMonitoring from '../pages/WeatherMonitoring';
import FloodPrediction from '../pages/FloodPrediction';
import AlertCenter from '../pages/AlertCenter';
import AdminDashboard from '../pages/AdminDashboard';
import RescueRequests from '../pages/RescueRequests';
import EvacuationPanel from '../pages/EvacuationPanel';
import ChatCoordination from '../pages/ChatCoordination';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Gate */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Layout Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="map" element={<LiveFloodMap />} />
        <Route path="weather" element={<WeatherMonitoring />} />
        <Route path="prediction" element={<FloodPrediction />} />
        <Route path="alerts" element={<AlertCenter />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="rescue" element={<RescueRequests />} />
        <Route path="shelters" element={<EvacuationPanel />} />
        <Route path="chat" element={<ChatCoordination />} />
      </Route>

      {/* Catch-all Route redirects to Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
