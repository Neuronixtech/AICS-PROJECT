import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;
const emptyForm = { couponCode: '', description: '', percentage: '', validFrom: '', validTill: '', maxUsage: '', applicableToAll: true, isActive: true };

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState([]);
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

  const fetchDiscounts = useCallback(async () => {
    try {
      const { data } = await api.get('/discounts');
      setDiscounts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  const isExpired = (d) => d.validTill && new Date(d.validTill) < new Date();
  const isActive = (d) => d.isActive && !isExpired(d);

  const filtered = discounts.filter(d => {
    const matchSearch = !search || d.couponCode.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' && isActive(d)) || (filter === 'expired' && isExpired(d)) || (filter === 'inactive' && !d.isActive);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.couponCode.trim()) e.couponCode = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    if (!form.percentage || Number(form.percentage) < 0 || Number(form.percentage) > 100) e.percentage = '0-100 only';
    if (!form.validFrom) e.validFrom = 'Required';
    if (!form.validTill) e.validTill = 'Required';
    if (form.validFrom && form.validTill && form.validFrom >= form.validTill) e.validTill = 'Must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, couponCode: form.couponCode.toUpperCase(), percentage: Number(form.percentage), maxUsage: form.maxUsage ? Number(form.maxUsage) : null };
      if (editing) { await api.put(`/discounts/${editing._id}`, payload); showAlert('success', 'Discount updated!'); }
      else { await api.post('/discounts', payload); showAlert('success', 'Discount created!'); }
      setShowModal(false); setEditing(null); setForm(emptyForm); fetchDiscounts();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Error saving discount');
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (d) => {
    try {
      await api.put(`/discounts/${d._id}`, { isActive: !d.isActive });
      fetchDiscounts();
    } catch (err) { showAlert('error', 'Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this discount?')) return;
    try { await api.delete(`/discounts/${id}`); fetchDiscounts(); showAlert('success', 'Deleted'); }
    catch (err) { showAlert('error', 'Failed'); }
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      couponCode: d.couponCode, description: d.description, percentage: String(d.percentage),
      validFrom: d.validFrom ? d.validFrom.split('T')[0] : '',
      validTill: d.validTill ? d.validTill.split('T')[0] : '',
      maxUsage: d.maxUsage ? String(d.maxUsage) : '',
      applicableToAll: d.applicableToAll !== false, isActive: d.isActive
    });
    setErrors({});
    setShowModal(true);
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type === 'success' ? '✅' : '❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🏷️ Discount Management</h1>
          <p className="page-subtitle">Create coupon codes for student fee discounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setErrors({}); setShowModal(true); }}>+ Create Coupon</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input placeholder="Search coupon code..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-tabs">
              {['all','active','expired','inactive'].map(f => (
                <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏷️</div>
              <div className="empty-title">No discount coupons</div>
              <div className="empty-text">Create your first discount coupon</div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Coupon</button>
            </div>
          ) : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Code</th><th>Description</th><th>Discount</th><th>Valid From</th><th>Valid Till</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginated.map(d => (
                      <tr key={d._id}>
                        <td data-label="Code"><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.925rem', color: 'var(--primary)', letterSpacing: '0.05em' }}>{d.couponCode}</span></td>
                        <td data-label="Description">{d.description}</td>
                        <td data-label="Discount"><span className="badge badge-success" style={{ fontSize: '0.85rem' }}>{d.percentage}%</span></td>
                        <td data-label="From">{d.validFrom ? new Date(d.validFrom).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Till">{d.validTill ? new Date(d.validTill).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Usage">{d.usageCount || 0}{d.maxUsage ? `/${d.maxUsage}` : ''}</td>
                        <td data-label="Status">
                          <span className={`badge ${isActive(d) ? 'badge-success' : isExpired(d) ? 'badge-danger' : 'badge-gray'}`}>
                            {isActive(d) ? '✅ Active' : isExpired(d) ? '⏰ Expired' : '⛔ Inactive'}
                          </span>
                        </td>
                        <td className="td-actions" data-label="Actions">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(d)}>Edit</button>
                          <button className="btn btn-sm btn-warning" onClick={() => toggleActive(d)}>{d.isActive ? 'Disable' : 'Enable'}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Del</button>
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
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-page)<=2).map(p=>(
                <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? '✏️ Edit Coupon' : '🏷️ Create Discount Coupon'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Coupon Code <span className="required">*</span></label>
                    <input className={`form-input ${errors.couponCode ? 'error' : ''}`} placeholder="e.g. SUMMER2025" value={form.couponCode} onChange={e => setForm({...form, couponCode: e.target.value.toUpperCase().replace(/\s/g,'')})} disabled={!!editing} style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }} />
                    {errors.couponCode && <span className="form-error">{errors.couponCode}</span>}
                    <span className="form-hint">Uppercase letters and numbers only</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount % <span className="required">*</span></label>
                    <input type="number" className={`form-input ${errors.percentage ? 'error' : ''}`} placeholder="e.g. 20" min={0} max={100} value={form.percentage} onChange={e => setForm({...form, percentage: e.target.value})} />
                    {errors.percentage && <span className="form-error">{errors.percentage}</span>}
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Description <span className="required">*</span></label>
                    <input className={`form-input ${errors.description ? 'error' : ''}`} placeholder="e.g. Summer Sale 2025" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    {errors.description && <span className="form-error">{errors.description}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid From <span className="required">*</span></label>
                    <input type="date" className={`form-input ${errors.validFrom ? 'error' : ''}`} value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} />
                    {errors.validFrom && <span className="form-error">{errors.validFrom}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid Till <span className="required">*</span></label>
                    <input type="date" className={`form-input ${errors.validTill ? 'error' : ''}`} value={form.validTill} onChange={e => setForm({...form, validTill: e.target.value})} />
                    {errors.validTill && <span className="form-error">{errors.validTill}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Usage</label>
                    <input type="number" className="form-input" placeholder="Leave blank for unlimited" min={1} value={form.maxUsage} onChange={e => setForm({...form, maxUsage: e.target.value})} />
                    <span className="form-hint">Unlimited if left blank</span>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem' }}>
                    <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                    <label htmlFor="isActive" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Active immediately</label>
                  </div>
                </div>

                {form.percentage && (
                  <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d' }}>
                    <span>🎉</span>
                    <span>Students save <strong>{form.percentage}%</strong> on course fees with code <strong>{form.couponCode || 'CODE'}</strong></span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : editing ? '✅ Update' : '🏷️ Create Coupon'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
