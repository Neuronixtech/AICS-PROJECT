import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const emptyForm = { name: '', email: '', password: '' };

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/staff');
      setStaff(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/admin/staff', form);
      showAlert('success', 'Staff member added!');
      setShowModal(false);
      setForm(emptyForm);
      fetchStaff();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      showAlert('success', 'Staff member removed');
      fetchStaff();
    } catch (err) { showAlert('error', 'Failed to remove'); }
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type==='success'?'✅':'❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">👥 Staff Management</h1>
          <p className="page-subtitle">{staff.length} staff members</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setErrors({}); setShowModal(true); }}>+ Add Staff</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : staff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No staff members</div>
              <div className="empty-text">Add your first staff member</div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Staff</button>
            </div>
          ) : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s._id}>
                        <td data-label="Name">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{s.name?.charAt(0)}</div>
                            <div className="td-name">{s.name}</div>
                          </div>
                        </td>
                        <td data-label="Email">{s.email}</td>
                        <td data-label="Role"><span className="badge badge-purple">Staff</span></td>
                        <td data-label="Joined">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Status"><span className={`badge ${s.isActive !== false ? 'badge-success' : 'badge-gray'}`}>{s.isActive !== false ? '✅ Active' : '⛔ Inactive'}</span></td>
                        <td className="td-actions" data-label="Actions">
                          <button className="btn btn-sm btn-danger" onClick={() => handleRemove(s._id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">👤 Add Staff Member</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.name?'error':''}`} placeholder="Staff member name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email <span className="required">*</span></label>
                    <input type="email" className={`form-input ${errors.email?'error':''}`} placeholder="staff@institute.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password <span className="required">*</span></label>
                    <input type="password" className={`form-input ${errors.password?'error':''}`} placeholder="Min 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    {errors.password && <span className="form-error">{errors.password}</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : '✅ Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
