import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const emptyForm = { name: '', duration: '', description: '', fees: '', installmentOptions: [1, 2, 3, 4, 6, 12] };

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([1, 2, 3, 4, 6, 12]);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  const filtered = courses.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.duration || Number(form.duration) < 1) e.duration = 'Min 1 month';
    if (!form.fees || Number(form.fees) < 0) e.fees = 'Enter valid fees';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { 
        name: form.name.trim(), 
        duration: Number(form.duration), 
        description: form.description.trim(), 
        fees: Number(form.fees), 
        defaultFees: Number(form.fees),
        installmentOptions: selectedOptions.sort((a, b) => a - b)
      };
      if (editing) { await api.put(`/courses/${editing._id}`, payload); showAlert('success', 'Course updated!'); }
      else { await api.post('/courses', payload); showAlert('success', 'Course added!'); }
      setShowModal(false); setEditing(null); setForm(emptyForm); setSelectedOptions([1, 2, 3, 4, 6, 12]); fetchCourses();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try { await api.delete(`/courses/${id}`); fetchCourses(); showAlert('success', 'Deleted'); }
    catch (err) { showAlert('error', err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, duration: String(c.duration || ''), description: c.description || '', fees: String(c.fees || c.defaultFees || '') });
    setSelectedOptions(c.installmentOptions || [1, 2, 3, 4, 6, 12]);
    setErrors({});
    setShowModal(true);
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type==='success'?'✅':'❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📚 Course Management</h1>
          <p className="page-subtitle">{courses.length} courses available</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setSelectedOptions([1, 2, 3, 4, 6, 12]); setErrors({}); setShowModal(true); }}>+ Add Course</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ maxWidth: '320px' }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <div className="empty-title">No courses found</div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Course</button>
            </div>
          ) : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Course Name</th><th>Duration</th><th>Fees</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c._id}>
                        <td data-label="Course">
                          <div className="td-name">{c.name}</div>
                          {c.description && <div className="td-sub">{c.description}</div>}
                        </td>
                        <td data-label="Duration">{c.duration} month{c.duration !== 1 ? 's' : ''}</td>
                        <td data-label="Fees"><span className="amount">₹{(c.fees || c.defaultFees || 0).toLocaleString('en-IN')}</span></td>
                        <td data-label="Students"><span className="badge badge-info">{c.enrolledCount || 0} enrolled</span></td>
                        <td data-label="Status"><span className={`badge ${c.isActive !== false ? 'badge-success' : 'badge-gray'}`}>{c.isActive !== false ? '✅ Active' : '⛔ Inactive'}</span></td>
                        <td className="td-actions" data-label="Actions">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id)}>Delete</button>
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
              <h3 className="modal-title">{editing ? '✏️ Edit Course' : '📚 Add Course'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Course Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.name?'error':''}`} placeholder="e.g. Full Stack Development" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Duration (months) <span className="required">*</span></label>
                      <input type="number" className={`form-input ${errors.duration?'error':''}`} placeholder="e.g. 6" min={1} value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                      {errors.duration && <span className="form-error">{errors.duration}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fees (₹) <span className="required">*</span></label>
                      <input type="number" className={`form-input ${errors.fees?'error':''}`} placeholder="e.g. 25000" min={0} value={form.fees} onChange={e => setForm({...form, fees: e.target.value})} />
                      {errors.fees && <span className="form-error">{errors.fees}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" placeholder="Optional course description" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Installment Options</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {[1, 2, 3, 4, 6, 12].map(num => (
                        <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: selectedOptions.includes(num) ? '2px solid var(--primary)' : '2px solid var(--gray-200)' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedOptions.includes(num)}
                            onChange={e => {
                              if (e.target.checked) {
                                // Auto-select all lower numbers (e.g., selecting 3 auto-selects 1, 2)
                                const lowerNumbers = [1, 2, 3, 4, 6, 12].filter(n => n <= num);
                                const newOptions = Array.from(new Set([...selectedOptions, ...lowerNumbers])).sort((a, b) => a - b);
                                setSelectedOptions(newOptions);
                              } else {
                                // Uncheck this and all higher numbers
                                const newOptions = selectedOptions.filter(n => n < num);
                                setSelectedOptions(newOptions);
                              }
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{num} {num === 1 ? 'EMI' : 'EMIs'}</span>
                        </label>
                      ))}
                    </div>
                    <span className="form-hint">Select which installment options are available for this course</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : editing ? '✅ Update' : '✅ Add Course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
