import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const PER_PAGE = 8;
const STATUS_COLORS = { new: 'badge-info', contacted: 'badge-warning', converted: 'badge-success', closed: 'badge-gray' };

const emptyForm = { firstName: '', fatherName: '', lastName: '', phoneNumber: '', email: '', address: '', qualification: '', interestedCourse: '', expectedAdmissionDate: '', followUpDate: '', notes: '' };

export default function EnquiryManagement() {
  const [enquiries, setEnquiries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [eq, co] = await Promise.all([api.get('/enquiries'), api.get('/courses')]);
      setEnquiries(eq.data);
      setCourses(co.data.filter(c => c.isActive !== false));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showAlert = (type, message) => { setAlert({ type, message }); setTimeout(() => setAlert(null), 4000); };

  const filtered = enquiries.filter(e => {
    const name = `${e.firstName} ${e.fatherName} ${e.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || e.phoneNumber?.includes(search);
    const matchFilter = filter === 'all' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.fatherName.trim()) e.fatherName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.phoneNumber.match(/^[0-9]{10}$/)) e.phoneNumber = 'Enter valid 10-digit number';
    if (!form.interestedCourse) e.interestedCourse = 'Select a course';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/enquiries/${editing._id}`, form);
        showAlert('success', 'Enquiry updated!');
      } else {
        await api.post('/enquiries', form);
        showAlert('success', 'Enquiry added!');
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Error saving enquiry');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/enquiries/${id}`, { status });
      fetchData();
    } catch (err) { showAlert('error', 'Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try { await api.delete(`/enquiries/${id}`); fetchData(); showAlert('success', 'Enquiry deleted'); }
    catch (err) { showAlert('error', 'Failed to delete'); }
  };

  const convertToAdmission = (enquiry) => {
    // Navigate to student management with pre-filled data via sessionStorage
    sessionStorage.setItem('convertEnquiry', JSON.stringify(enquiry));
    navigate('/admin/students');
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      firstName: e.firstName || '', fatherName: e.fatherName || '', lastName: e.lastName || '',
      phoneNumber: e.phoneNumber || '', email: e.email || '', address: e.address || '',
      qualification: e.qualification || '', interestedCourse: e.interestedCourse?._id || '',
      expectedAdmissionDate: e.expectedAdmissionDate ? e.expectedAdmissionDate.split('T')[0] : '',
      followUpDate: e.followUpDate ? e.followUpDate.split('T')[0] : '',
      notes: e.notes || ''
    });
    setErrors({});
    setShowModal(true);
  };

  const counts = { all: enquiries.length, new: enquiries.filter(e => e.status === 'new').length, contacted: enquiries.filter(e => e.status === 'contacted').length };

  const handleMarkContacted = async (enquiryId) => {
    try {
      await api.put(`/enquiries/${enquiryId}`, { status: 'contacted' });
      showAlert('success', 'Marked as contacted!');
      fetchData();
    } catch (err) {
      showAlert('error', 'Failed to update status');
    }
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type === 'success' ? '✅' : '❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📋 Enquiry Management</h1>
          <p className="page-subtitle">{counts.new} new, {counts.contacted} contacted</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setErrors({}); setShowModal(true); }}>+ Add Enquiry</button>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '1rem' }}>
        {['new','contacted'].map(s => (
          <div key={s} className="stat-card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => { setFilter(s); setPage(1); }}>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{counts[s]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'capitalize' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input placeholder="Search name, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-tabs">
              {['all','new','contacted'].map(f => (
                <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${counts[f]})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No enquiries found</div>
              <div className="empty-text">Start tracking potential students</div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Enquiry</button>
            </div>
          ) : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Phone</th><th>Course</th><th>Expected Date</th><th>Follow Up</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginated.map(e => (
                      <tr key={e._id}>
                        <td data-label="Name">
                          <div className="td-name">{e.firstName} {e.fatherName} {e.lastName}</div>
                          {e.qualification && <div className="td-sub">{e.qualification}</div>}
                        </td>
                        <td data-label="Phone">{e.phoneNumber}</td>
                        <td data-label="Course">{e.interestedCourse?.name}</td>
                        <td data-label="Expected">{e.expectedAdmissionDate ? new Date(e.expectedAdmissionDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Follow Up">{e.followUpDate ? new Date(e.followUpDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Status">
                          <span className={`badge ${e.status === 'new' ? 'badge-info' : 'badge-warning'}`}>
                            {e.status === 'new' ? '🆕 New' : '✅ Contacted'}
                          </span>
                        </td>
                        <td className="td-actions" data-label="Actions">
                          {e.status === 'new' && (
                            <button className="btn btn-sm btn-success" onClick={() => handleMarkContacted(e._id)}>✓ Mark Contacted</button>
                          )}
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(e)}>Edit</button>
                          <button className="btn btn-sm btn-success" onClick={() => convertToAdmission(e)}>➡️ Admit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e._id)}>Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
              {Array.from({length: totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-page)<=2).map(p=>(
                <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? '✏️ Edit Enquiry' : '➕ Add Enquiry'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.firstName ? 'error' : ''}`} placeholder="First name" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                    {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.fatherName ? 'error' : ''}`} placeholder="Father's name" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} />
                    {errors.fatherName && <span className="form-error">{errors.fatherName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.lastName ? 'error' : ''}`} placeholder="Last name" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                    {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile <span className="required">*</span></label>
                    <input className={`form-input ${errors.phoneNumber ? 'error' : ''}`} placeholder="10-digit number" maxLength={10} value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value.replace(/\D/,'')})} />
                    {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" placeholder="Optional" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <input className="form-input" placeholder="Highest qualification" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Address</label>
                    <textarea className="form-textarea" placeholder="Address" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interested Course <span className="required">*</span></label>
                    <select className={`form-select ${errors.interestedCourse ? 'error' : ''}`} value={form.interestedCourse} onChange={e => setForm({...form, interestedCourse: e.target.value})}>
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {errors.interestedCourse && <span className="form-error">{errors.interestedCourse}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Admission Date</label>
                    <input type="date" className="form-input" value={form.expectedAdmissionDate} onChange={e => setForm({...form, expectedAdmissionDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow Up Date</label>
                    <input type="date" className="form-input" value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" placeholder="Any additional notes..." rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : editing ? '✅ Update' : '✅ Add Enquiry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
