import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import EnquiryManagement from './pages/admin/EnquiryManagement';
import DiscountManagement from './pages/admin/DiscountManagement';
import CourseManagement from './pages/admin/CourseManagement';
import FeesOverview from './pages/admin/FeesOverview';
import Certificates from './pages/admin/Certificates';
import StaffManagement from './pages/admin/StaffManagement';
import StaffLayout from './components/StaffLayout';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffStudents from './pages/staff/StaffStudents';
import StaffEnquiries from './pages/staff/StaffEnquiries';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        user ? <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace /> : <Login />
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="enquiries" element={<EnquiryManagement />} />
        <Route path="discounts" element={<DiscountManagement />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="fees" element={<FeesOverview />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="staff" element={<StaffManagement />} />
      </Route>

      {/* Staff Routes */}
      <Route path="/staff" element={
        <ProtectedRoute roles={['staff']}><StaffLayout /></ProtectedRoute>
      }>
        <Route index element={<StaffDashboard />} />
        <Route path="students" element={<StaffStudents />} />
        <Route path="enquiries" element={<StaffEnquiries />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
