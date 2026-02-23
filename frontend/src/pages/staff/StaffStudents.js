import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;
const PAYMENT_METHODS = ['cash', 'upi'];
const emptyForm = { firstName: '', fatherName: '', lastName: '', address: '', qualification: '', phoneNumber: '', email: '', course: '', couponCode: '', courseDuration: '', totalFees: '', initialPayment: '0', initialPaymentMethod: 'cash', numInstallments: '1' };

export default function StaffStudents() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', remarks: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [availableInstallments, setAvailableInstallments] = useState([1, 2, 3, 4, 6, 12]);
  const [uploadDocuments, setUploadDocuments] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.get('/students'), api.get('/courses')]);
      setStudents(s.data);
      setCourses(c.data.filter(co => co.isActive !== false));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  const filtered = students.filter(s => {
    const name = `${s.firstName} ${s.fatherName} ${s.lastName}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || s.phoneNumber.includes(search);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleCourseChange = (courseId) => {
    const c = courses.find(co => co._id === courseId);
    setForm(f => ({ ...f, course: courseId, totalFees: c ? String(c.fees || c.defaultFees || '') : '', courseDuration: c ? String(c.duration || '') : '', numInstallments: '1' }));
    if (c) {
      setAvailableInstallments(c.installmentOptions || [1, 2, 3, 4, 6, 12]);
    }
    setCouponInfo(null);
  };

  const validateCoupon = async () => {
    if (!form.couponCode.trim() || !form.totalFees) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/discounts/validate', { couponCode: form.couponCode, courseFees: Number(form.totalFees) });
      setCouponInfo(data);
      showAlert('success', `Coupon applied! Save ₹${data.discountAmount.toLocaleString('en-IN')}`);
    } catch (err) { showAlert('error', 'Invalid coupon'); setCouponInfo(null); }
    finally { setCouponLoading(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.fatherName.trim()) e.fatherName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.phoneNumber.match(/^[0-9]{10}$/)) e.phoneNumber = 'Valid 10-digit number';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.qualification.trim()) e.qualification = 'Required';
    if (!form.course) e.course = 'Select course';
    if (!form.totalFees) e.totalFees = 'Required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const n = parseInt(form.numInstallments) || 1;
      const total = couponInfo ? couponInfo.finalFees : Number(form.totalFees);
      const each = Math.floor(total / n);
      const rem = total - each * n;
      const installments = Array.from({ length: n }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() + i);
        return { amount: i === n - 1 ? each + rem : each, dueDate: d.toISOString().split('T')[0] };
      });
      const { data } = await api.post('/students', { 
        firstName: form.firstName, 
        fatherName: form.fatherName, 
        lastName: form.lastName, 
        address: form.address, 
        qualification: form.qualification, 
        phoneNumber: form.phoneNumber, 
        email: form.email, 
        course: form.course, 
        totalFees: Number(form.totalFees), 
        paidFees: Number(form.initialPayment) || 0, 
        initialPaymentMethod: form.initialPaymentMethod || 'cash',
        couponCode: form.couponCode || undefined, 
        courseDuration: Number(form.courseDuration) || 3, 
        installments 
      });
      
      // Upload documents if provided
      if (uploadDocuments.length > 0) {
        for (const file of uploadDocuments) {
          try {
            const formData = new FormData();
            formData.append('document', file);
            await api.post(`/students/${data.student._id}/upload-document`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (docErr) {
            console.error('Document upload error:', docErr);
          }
        }
      }
      
      // Open invoice in new tab
      if (data.invoice && data.invoice.url) {
        const invoiceUrl = `http://localhost:5000${data.invoice.url}`;
        window.open(invoiceUrl, '_blank');
      }
      
      showAlert('success', `Student added! ${uploadDocuments.length > 0 ? uploadDocuments.length + ' documents uploaded.' : ''}`); setShowAddModal(false); setForm(emptyForm); setCouponInfo(null); setUploadDocuments([]); fetchData();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return showAlert('error', 'Enter valid amount');
    
    // Check if payment exceeds pending fees
    if (Number(paymentForm.amount) > selectedStudent.pendingFees) {
      return showAlert('error', `Payment cannot exceed pending fees (₹${selectedStudent.pendingFees.toLocaleString('en-IN')})`);
    }
    
    setSubmitting(true);
    try {
      const { data } = await api.post(`/students/${selectedStudent._id}/payment`, { amount: Number(paymentForm.amount), paymentMethod: paymentForm.paymentMethod, remarks: paymentForm.remarks });
      
      // Open invoice in new tab
      if (data.invoice && data.invoice.url) {
        const invoiceUrl = `http://localhost:5000${data.invoice.url}`;
        window.open(invoiceUrl, '_blank');
      }
      
      showAlert('success', 'Payment recorded! Invoice opened in new tab.'); setShowPayModal(false); setPaymentForm({ amount: '', paymentMethod: 'cash', remarks: '' }); fetchData();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type==='success'?'✅':'❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">👨‍🎓 Students</h1>
          <p className="page-subtitle">{students.length} students</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setCouponInfo(null); setErrors({}); setShowAddModal(true); }}>+ Add Student</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ maxWidth: '320px' }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search name, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? <div className="empty-state"><div className="empty-icon">👨‍🎓</div><div className="empty-title">No students found</div><button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Student</button></div>
          : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Student</th><th>Course</th><th>Total</th><th>Paid</th><th>Pending</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginated.map(s => (
                      <tr key={s._id}>
                        <td data-label="Student"><div className="td-name">{s.firstName} {s.fatherName} {s.lastName}</div><div className="td-sub">{s.phoneNumber}</div></td>
                        <td data-label="Course">{s.course?.name}</td>
                        <td data-label="Total">₹{(s.finalFees||s.totalFees||0).toLocaleString('en-IN')}</td>
                        <td data-label="Paid"><span className="amount amount-paid">₹{(s.paidFees||0).toLocaleString('en-IN')}</span></td>
                        <td data-label="Pending"><span className="amount amount-pending">₹{(s.pendingFees||0).toLocaleString('en-IN')}</span></td>
                        <td className="td-actions" data-label="Actions">
                          <button className="btn btn-sm btn-success" onClick={() => { setSelectedStudent(s); setPaymentForm({ amount: '', paymentMethod: 'cash', remarks: '' }); setShowPayModal(true); }} disabled={s.pendingFees===0}>Pay</button>
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

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add Student</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.firstName?'error':''}`} placeholder="First name" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                    {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.fatherName?'error':''}`} placeholder="Father's name" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} />
                    {errors.fatherName && <span className="form-error">{errors.fatherName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.lastName?'error':''}`} placeholder="Last name" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                    {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile <span className="required">*</span></label>
                    <input className={`form-input ${errors.phoneNumber?'error':''}`} placeholder="10-digit" maxLength={10} value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value.replace(/\D/g,'')})} />
                    {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification <span className="required">*</span></label>
                    <input className={`form-input ${errors.qualification?'error':''}`} placeholder="e.g. B.Tech" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} />
                    {errors.qualification && <span className="form-error">{errors.qualification}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" placeholder="Optional" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Address <span className="required">*</span></label>
                    <textarea className={`form-textarea ${errors.address?'error':''}`} placeholder="Full address" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                    {errors.address && <span className="form-error">{errors.address}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course <span className="required">*</span></label>
                    <select className={`form-select ${errors.course?'error':''}`} value={form.course} onChange={e => handleCourseChange(e.target.value)}>
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {errors.course && <span className="form-error">{errors.course}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fees (₹)</label>
                    <input type="number" className={`form-input ${errors.totalFees?'error':''}`} placeholder="Total fees" value={form.totalFees} onChange={e => { setForm({...form, totalFees: e.target.value}); setCouponInfo(null); }} />
                    {errors.totalFees && <span className="form-error">{errors.totalFees}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Coupon Code</label>
                    <div className="coupon-row">
                      <input className="form-input" placeholder="Optional" value={form.couponCode} onChange={e => { setForm({...form, couponCode: e.target.value.toUpperCase()}); setCouponInfo(null); }} />
                      <button type="button" className="btn btn-outline" onClick={validateCoupon} disabled={couponLoading || !form.couponCode || !form.totalFees}>{couponLoading ? '...' : 'Apply'}</button>
                    </div>
                    {couponInfo && <div className="discount-badge">🏷️ {couponInfo.percentage}% off → ₹{couponInfo.finalFees.toLocaleString('en-IN')}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Payment (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="Amount paid now" 
                      min="0"
                      max={couponInfo ? couponInfo.finalFees : form.totalFees}
                      step="1"
                      value={form.initialPayment} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        const maxFees = couponInfo ? couponInfo.finalFees : Number(form.totalFees);
                        if (val <= maxFees) {
                          setForm({...form, initialPayment: e.target.value});
                        } else {
                          showAlert('error', `Cannot exceed total fees (₹${maxFees.toLocaleString('en-IN')})`);
                        }
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.initialPaymentMethod} onChange={e => setForm({...form, initialPaymentMethod: e.target.value})}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Installments</label>
                    <select className="form-select" value={form.numInstallments} onChange={e => setForm({...form, numInstallments: e.target.value})}>
                      {availableInstallments.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Documents (Upload at least 2)</label>
                    <input 
                      type="file" 
                      className="form-input" 
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={e => setUploadDocuments(Array.from(e.target.files))}
                    />
                    <span className="form-hint">Select at least 2 documents (PDF, DOC, DOCX, JPG, PNG)</span>
                    {uploadDocuments.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {uploadDocuments.map((f, i) => <div key={i}>📎 {f.name}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : '✅ Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal && selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">💰 Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{selectedStudent.firstName} {selectedStudent.fatherName} {selectedStudent.lastName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>Pending: <strong style={{ color: 'var(--danger)' }}>₹{(selectedStudent.pendingFees||0).toLocaleString('en-IN')}</strong></div>
                </div>
                <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                  <label className="form-label">Amount <span className="required">*</span></label>
                  <input type="number" className="form-input" placeholder="Enter amount" max={selectedStudent.pendingFees} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} required />
                </div>
                <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                  <label className="form-label">Method</label>
                  <select className="form-select" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input className="form-input" placeholder="Optional" value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? '...' : '✅ Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
