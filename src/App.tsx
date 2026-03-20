import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/doctors" element={<AdminDashboard />} />
                      <Route path="/appointments" element={<AdminDashboard />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />

            {/* Doctor Routes */}
            <Route
              path="/doctor/*"
              element={
                <AuthGuard allowedRoles={['doctor']}>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<DoctorDashboard />} />
                      <Route path="/appointments" element={<DoctorDashboard />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />

            {/* Patient Routes */}
            <Route
              path="/patient/*"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<PatientDashboard />} />
                      <Route path="/doctors" element={<PatientDashboard />} />
                      <Route path="/appointments" element={<PatientDashboard />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
