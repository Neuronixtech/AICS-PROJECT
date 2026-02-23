import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;
const emptyForm = { firstName: '', fatherName: '', lastName: '', phoneNumber: '', address: '', qualification: '', interestedCourse: '', expectedAdmissionDate: '', notes: '' };

export default function StaffEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [eq, co] = await Promise.all([api.get('/enquiries'), api.get('/courses')]);
      setEnquiries(eq.data);
      setCourses(co.data.filter(c => c.isActive !== false));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  const filtered = enquiries.filter(e => {
    const name = `${e.firstName} ${e.fatherName} ${e.lastName}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || e.phoneNumber?.includes(search);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.fatherName.trim()) e.fatherName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.phoneNumber.match(/^[0-9]{10}$/)) e.phoneNumber = 'Valid 10-digit number';
    if (!form.interestedCourse) e.interestedCourse = 'Required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/enquiries', form);
      showAlert('success', 'Enquiry added!'); setShowModal(false); setForm(emptyForm); fetchData();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type==='success'?'✅':'❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📋 Enquiries</h1>
          <p className="page-subtitle">{enquiries.length} total enquiries</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setErrors({}); setShowModal(true); }}>+ Add Enquiry</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ maxWidth: '320px' }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search name, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No enquiries</div><button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Enquiry</button></div>
          : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Phone</th><th>Course</th><th>Expected Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {paginated.map(e => (
                      <tr key={e._id}>
                        <td data-label="Name"><div className="td-name">{e.firstName} {e.fatherName} {e.lastName}</div>{e.qualification && <div className="td-sub">{e.qualification}</div>}</td>
                        <td data-label="Phone">{e.phoneNumber}</td>
                        <td data-label="Course">{e.interestedCourse?.name}</td>
                        <td data-label="Expected">{e.expectedAdmissionDate ? new Date(e.expectedAdmissionDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td data-label="Status"><span className={`badge ${e.status==='new'?'badge-info':e.status==='contacted'?'badge-warning':e.status==='converted'?'badge-success':'badge-gray'}`}>{e.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</span>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add Enquiry</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">First Name <span className="required">*</span></label><input className={`form-input ${errors.firstName?'error':''}`} placeholder="First name" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />{errors.firstName && <span className="form-error">{errors.firstName}</span>}</div>
                  <div className="form-group"><label className="form-label">Father's Name <span className="required">*</span></label><input className={`form-input ${errors.fatherName?'error':''}`} placeholder="Father's name" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} />{errors.fatherName && <span className="form-error">{errors.fatherName}</span>}</div>
                  <div className="form-group"><label className="form-label">Last Name <span className="required">*</span></label><input className={`form-input ${errors.lastName?'error':''}`} placeholder="Last name" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />{errors.lastName && <span className="form-error">{errors.lastName}</span>}</div>
                  <div className="form-group"><label className="form-label">Mobile <span className="required">*</span></label><input className={`form-input ${errors.phoneNumber?'error':''}`} placeholder="10-digit" maxLength={10} value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value.replace(/\D/g,'')})} />{errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}</div>
                  <div className="form-group"><label className="form-label">Qualification</label><input className="form-input" placeholder="Highest qualification" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Course <span className="required">*</span></label><select className={`form-select ${errors.interestedCourse?'error':''}`} value={form.interestedCourse} onChange={e => setForm({...form, interestedCourse: e.target.value})}><option value="">Select</option>{courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>{errors.interestedCourse && <span className="form-error">{errors.interestedCourse}</span>}</div>
                  <div className="form-group full-width"><label className="form-label">Address</label><textarea className="form-textarea" placeholder="Address" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Expected Admission Date</label><input type="date" className="form-input" value={form.expectedAdmissionDate} onChange={e => setForm({...form, expectedAdmissionDate: e.target.value})} /></div>
                  <div className="form-group full-width"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Notes..." rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : '✅ Add Enquiry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
