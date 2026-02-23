import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffDashboard() {
  const [stats, setStats] = useState({ students: 0, enquiries: 0, todayPayments: 0, pendingStudents: 0 });
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studRes, enqRes] = await Promise.all([api.get('/students'), api.get('/enquiries').catch(() => ({ data: [] }))]);
        const students = studRes.data;
        const enquiries = Array.isArray(enqRes.data) ? enqRes.data : [];
        setStats({
          students: students.length,
          enquiries: enquiries.length,
          pendingStudents: students.filter(s => s.pendingFees > 0).length,
          todayPayments: students.reduce((sum, s) => {
            const today = new Date().toDateString();
            return sum + (s.payments || []).filter(p => new Date(p.date).toDateString() === today).reduce((a, p) => a + p.amount, 0);
          }, 0)
        });
        setRecentStudents(students.slice(0, 5));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Staff Dashboard</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue">👨‍🎓</div><div className="stat-info"><div className="stat-value">{stats.students}</div><div className="stat-label">Total Students</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">📋</div><div className="stat-info"><div className="stat-value">{stats.enquiries}</div><div className="stat-label">Enquiries</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div className="stat-info"><div className="stat-value">{stats.pendingStudents}</div><div className="stat-label">Pending Fees</div></div></div>
        <div className="stat-card"><div className="stat-icon green">💰</div><div className="stat-info"><div className="stat-value" style={{fontSize:'1.1rem'}}>₹{stats.todayPayments.toLocaleString('en-IN')}</div><div className="stat-label">Today's Payments</div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">📋 Recent Students</h2></div>
        {recentStudents.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👨‍🎓</div><div className="empty-title">No students yet</div></div>
        ) : (
          <div className="table-responsive">
            <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Course</th><th>Paid</th><th>Pending</th></tr></thead>
                <tbody>
                  {recentStudents.map(s => (
                    <tr key={s._id}>
                      <td data-label="Name"><div className="td-name">{s.firstName} {s.fatherName} {s.lastName}</div><div className="td-sub">{s.phoneNumber}</div></td>
                      <td data-label="Course">{s.course?.name}</td>
                      <td data-label="Paid"><span className="amount amount-paid">₹{(s.paidFees||0).toLocaleString('en-IN')}</span></td>
                      <td data-label="Pending"><span className="amount amount-pending">₹{(s.pendingFees||0).toLocaleString('en-IN')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
