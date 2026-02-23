import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;
const PAYMENT_METHODS = ['cash', 'upi'];

const emptyForm = {
  firstName: '', fatherName: '', lastName: '',
  address: '', qualification: '', phoneNumber: '', email: '',
  course: '', couponCode: '', courseDuration: '',
  totalFees: '', initialPayment: '0', initialPaymentMethod: 'cash',
  numInstallments: '1', installments: []
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [finalFees, setFinalFees] = useState(0);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', remarks: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [availableInstallments, setAvailableInstallments] = useState([1, 2, 3, 4, 6, 12]);
  const [uploadDocuments, setUploadDocuments] = useState([]);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data.filter(c => c.isActive !== false));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchStudents(); fetchCourses(); }, [fetchStudents, fetchCourses]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Filter and paginate
  const filtered = students.filter(s => {
    const fullName = `${s.firstName} ${s.fatherName} ${s.lastName}`.toLowerCase();
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || s.phoneNumber.includes(search);
    const matchFilter = filter === 'all' || s.status === filter ||
      (filter === 'complete' && s.profileComplete) || (filter === 'incomplete' && !s.profileComplete) ||
      (filter === 'paid' && s.pendingFees === 0) || (filter === 'pending' && s.pendingFees > 0);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    setForm(f => ({
      ...f, course: courseId,
      totalFees: course ? String(course.fees || course.defaultFees || '') : '',
      courseDuration: course ? String(course.duration || '') : '',
      numInstallments: '1' // Reset to 1 when course changes
    }));
    setCouponInfo(null);
    if (course) {
      setFinalFees(course.fees || course.defaultFees || 0);
      setAvailableInstallments(course.installmentOptions || [1, 2, 3, 4, 6, 12]);
    }
  };

  const validateCoupon = async () => {
    if (!form.couponCode.trim()) return;
    if (!form.totalFees) return showAlert('error', 'Select a course first');
    setCouponLoading(true);
    setCouponInfo(null);
    try {
      const { data } = await api.post('/discounts/validate', {
        couponCode: form.couponCode,
        courseFees: Number(form.totalFees)
      });
      setCouponInfo(data);
      setFinalFees(data.finalFees);
      showAlert('success', `Coupon applied! You save ₹${data.discountAmount.toLocaleString('en-IN')}`);
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Invalid coupon');
      setFinalFees(Number(form.totalFees));
    } finally {
      setCouponLoading(false);
    }
  };

  const buildInstallments = () => {
    const n = parseInt(form.numInstallments) || 1;
    const total = couponInfo ? couponInfo.finalFees : Number(form.totalFees);
    const each = Math.floor(total / n);
    const remainder = total - each * n;
    return Array.from({ length: n }, (_, i) => {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        amount: i === n - 1 ? each + remainder : each,
        dueDate: dueDate.toISOString().split('T')[0]
      };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.fatherName.trim()) e.fatherName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.phoneNumber.match(/^[0-9]{10}$/)) e.phoneNumber = 'Enter valid 10-digit number';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.qualification.trim()) e.qualification = 'Required';
    if (!form.course) e.course = 'Select a course';
    if (!form.totalFees) e.totalFees = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const installments = buildInstallments();
      const payload = {
        firstName: form.firstName.trim(),
        fatherName: form.fatherName.trim(),
        lastName: form.lastName.trim(),
        address: form.address.trim(),
        qualification: form.qualification.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        course: form.course,
        totalFees: Number(form.totalFees),
        paidFees: Number(form.initialPayment) || 0,
        initialPaymentMethod: form.initialPaymentMethod || 'cash',
        couponCode: form.couponCode.trim() || undefined,
        courseDuration: Number(form.courseDuration) || 3,
        installments
      };
      const { data } = await api.post('/students', payload);
      
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
      
      showAlert('success', `Student added! ${uploadDocuments.length > 0 ? uploadDocuments.length + ' documents uploaded.' : ''}`);
      setShowModal(false);
      setForm(emptyForm);
      setCouponInfo(null);
      setFinalFees(0);
      setUploadDocuments([]);
      fetchStudents();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return showAlert('error', 'Enter valid amount');
    
    // Check if payment exceeds pending fees
    if (Number(paymentForm.amount) > selectedStudent.pendingFees) {
      return showAlert('error', `Payment cannot exceed pending fees (₹${selectedStudent.pendingFees.toLocaleString('en-IN')})`);
    }
    
    setSubmitting(true);
    try {
      const { data } = await api.post(`/students/${selectedStudent._id}/payment`, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        remarks: paymentForm.remarks
      });
      
      // Open invoice in new tab
      if (data.invoice && data.invoice.url) {
        const invoiceUrl = `http://localhost:5000${data.invoice.url}`;
        window.open(invoiceUrl, '_blank');
      }
      
      showAlert('success', 'Payment recorded! Invoice opened in new tab.');
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMethod: 'cash', remarks: '' });
      fetchStudents();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to add payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      showAlert('success', 'Student removed');
      fetchStudents();
    } catch (err) {
      showAlert('error', 'Failed to remove student');
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return showAlert('error', 'Please select a file');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      
      await api.post(`/students/${selectedStudent._id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showAlert('success', 'Document uploaded successfully!');
      setShowDocumentModal(false);
      setSelectedFile(null);
      fetchStudents();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const openDocumentUpload = (student) => { 
    setSelectedStudent(student); 
    setSelectedFile(null); 
    setShowDocumentModal(true); 
  };

  const openPayment = (student) => { setSelectedStudent(student); setPaymentForm({ amount: '', paymentMethod: 'cash', remarks: '' }); setShowPaymentModal(true); };
  const openDetail = (student) => { setSelectedStudent(student); setShowDetailModal(true); };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>
          {alert.type === 'success' ? '✅' : '❌'} {alert.message}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">👨‍🎓 Student Management</h1>
          <p className="page-subtitle">{students.length} total students</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setCouponInfo(null); setFinalFees(0); setErrors({}); setShowModal(true); }}>
          + Add Student
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input placeholder="Search name, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-tabs">
              {['all','active','inactive','paid','pending'].map(f => (
                <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner"></div></div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍🎓</div>
            <div className="empty-title">No students found</div>
            <div className="empty-text">Try adjusting your search or filters</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Student</button>
          </div>
        ) : (
          <div className="table-responsive">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Total Fees</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Profile</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s._id}>
                      <td data-label="Student">
                        <div className="td-name">{s.firstName} {s.fatherName} {s.lastName}</div>
                        <div className="td-sub">{s.phoneNumber}</div>
                        {s.discount?.couponCode && <div className="td-sub">🏷️ {s.discount.couponCode} ({s.discount.percentage}%)</div>}
                      </td>
                      <td data-label="Course">
                        <div>{s.course?.name}</div>
                        <div className="td-sub">{s.courseDuration}m</div>
                      </td>
                      <td data-label="Total">{fmt(s.finalFees || s.totalFees)}</td>
                      <td data-label="Paid"><span className="amount amount-paid">{fmt(s.paidFees)}</span></td>
                      <td data-label="Pending"><span className="amount amount-pending">{fmt(s.pendingFees)}</span></td>
                      <td data-label="Profile">
                        {s.profileComplete
                          ? <span className="badge badge-success">✅ Complete</span>
                          : <span className="badge badge-warning">⚠️ Incomplete</span>}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{s.status}</span>
                        {s.certificateEligible && !s.certificateIssued && <span className="badge badge-purple" style={{ marginLeft: '4px' }}>🏆 Eligible</span>}
                      </td>
                      <td className="td-actions" data-label="Actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openDetail(s)}>View</button>
                        {!s.profileComplete && (
                          <button className="btn btn-sm btn-warning" onClick={() => openDocumentUpload(s)}>📄 Upload Doc</button>
                        )}
                        <button className="btn btn-sm btn-success" onClick={() => openPayment(s)} disabled={s.pendingFees === 0}>Pay</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>Remove</button>
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
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i+1).filter(p => Math.abs(p-page) <= 2).map(p => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Student</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Name Section */}
                <div className="form-grid">
                  <div style={{ gridColumn: '1 / -1' }} className="form-section-title">Personal Information</div>
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.firstName ? 'error' : ''}`} placeholder="e.g. Rahul" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                    {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.fatherName ? 'error' : ''}`} placeholder="e.g. Suresh" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} />
                    {errors.fatherName && <span className="form-error">{errors.fatherName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input className={`form-input ${errors.lastName ? 'error' : ''}`} placeholder="e.g. Kumar" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                    {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number <span className="required">*</span></label>
                    <input className={`form-input ${errors.phoneNumber ? 'error' : ''}`} placeholder="10-digit number" maxLength={10} value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value.replace(/\D/g,'')})} />
                    {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" placeholder="Optional" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification <span className="required">*</span></label>
                    <input className={`form-input ${errors.qualification ? 'error' : ''}`} placeholder="e.g. B.Tech CSE" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} />
                    {errors.qualification && <span className="form-error">{errors.qualification}</span>}
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Address <span className="required">*</span></label>
                    <textarea className={`form-textarea ${errors.address ? 'error' : ''}`} placeholder="Full address" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                    {errors.address && <span className="form-error">{errors.address}</span>}
                  </div>

                  {/* Course & Fees Section */}
                  <div style={{ gridColumn: '1 / -1' }} className="form-section-title">Course & Fees</div>
                  <div className="form-group">
                    <label className="form-label">Course <span className="required">*</span></label>
                    <select className={`form-select ${errors.course ? 'error' : ''}`} value={form.course} onChange={e => handleCourseChange(e.target.value)}>
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {errors.course && <span className="form-error">{errors.course}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (months)</label>
                    <input type="number" className="form-input" placeholder="e.g. 6" value={form.courseDuration} onChange={e => setForm({...form, courseDuration: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Fees (₹) <span className="required">*</span></label>
                    <input type="number" className={`form-input ${errors.totalFees ? 'error' : ''}`} placeholder="Total fees" value={form.totalFees} onChange={e => { setForm({...form, totalFees: e.target.value}); setFinalFees(Number(e.target.value)); setCouponInfo(null); }} />
                    {errors.totalFees && <span className="form-error">{errors.totalFees}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Coupon</label>
                    <div className="coupon-row">
                      <input className="form-input" placeholder="Enter coupon code" value={form.couponCode} onChange={e => { setForm({...form, couponCode: e.target.value.toUpperCase()}); setCouponInfo(null); setFinalFees(Number(form.totalFees)); }} />
                      <button type="button" className="btn btn-outline" onClick={validateCoupon} disabled={couponLoading || !form.couponCode || !form.totalFees}>
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponInfo && (
                      <div className="discount-badge">🏷️ {couponInfo.percentage}% off → Final: ₹{couponInfo.finalFees.toLocaleString('en-IN')}</div>
                    )}
                  </div>

                  {form.totalFees && (
                    <div className="form-group full-width">
                      <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {couponInfo && <span>Original: <s>₹{Number(form.totalFees).toLocaleString('en-IN')}</s></span>}
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
                          Final Fees: ₹{(couponInfo ? couponInfo.finalFees : Number(form.totalFees)).toLocaleString('en-IN')}
                        </span>
                        {couponInfo && <span style={{ color: 'var(--success)', fontWeight: 600 }}>Save: ₹{couponInfo.discountAmount.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                  )}

                  {/* Payment Section */}
                  <div style={{ gridColumn: '1 / -1' }} className="form-section-title">Initial Payment & Installments</div>
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
                          showAlert('error', `Initial payment cannot exceed total fees (₹${maxFees.toLocaleString('en-IN')})`);
                        }
                      }} 
                    />
                    <span className="form-hint">Maximum: ₹{(couponInfo ? couponInfo.finalFees : Number(form.totalFees) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.initialPaymentMethod} onChange={e => setForm({...form, initialPaymentMethod: e.target.value})}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Installments</label>
                    <select className="form-select" value={form.numInstallments} onChange={e => setForm({...form, numInstallments: e.target.value})}>
                      {availableInstallments.map(n => <option key={n} value={n}>{n} {n === 1 ? 'installment' : 'installments'}</option>)}
                    </select>
                    <span className="form-hint">
                      {form.numInstallments > 1 && form.totalFees
                        ? `≈ ₹${Math.floor((couponInfo ? couponInfo.finalFees : Number(form.totalFees)) / Number(form.numInstallments)).toLocaleString('en-IN')} per installment`
                        : 'Full payment in one go'}
                    </span>
                  </div>

                  {/* Document Upload Section */}
                  <div style={{ gridColumn: '1 / -1' }} className="form-section-title">Documents (Upload at least 2)</div>
                  <div className="form-group full-width">
                    <label className="form-label">Upload Documents</label>
                    <input 
                      type="file" 
                      className="form-input" 
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={e => setUploadDocuments(Array.from(e.target.files))}
                    />
                    <span className="form-hint">Select at least 2 documents (PDF, DOC, DOCX, JPG, PNG - Max 5MB each)</span>
                    {uploadDocuments.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {uploadDocuments.map((file, i) => (
                          <div key={i} style={{ padding: '0.5rem', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span>📎</span>
                            <span style={{ flex: 1, fontWeight: 600, color: '#15803d' }}>{file.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>{(file.size / 1024).toFixed(0)}KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Adding...' : '✅ Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">💰 Add Payment</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="modal-body">
                <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedStudent.firstName} {selectedStudent.fatherName} {selectedStudent.lastName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Pending: <strong style={{ color: 'var(--danger)' }}>₹{(selectedStudent.pendingFees || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                  <label className="form-label">Amount (₹) <span className="required">*</span></label>
                  <input type="number" className="form-input" placeholder="Enter amount" max={selectedStudent.pendingFees} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} required />
                </div>
                <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input className="form-input" placeholder="Optional notes" value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? '...' : '✅ Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetailModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">👤 Student Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>Full Name</div>
                  <div style={{ fontWeight: 600 }}>{selectedStudent.firstName} {selectedStudent.fatherName} {selectedStudent.lastName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>Phone</div>
                  <div>{selectedStudent.phoneNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>Course</div>
                  <div>{selectedStudent.course?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>Qualification</div>
                  <div>{selectedStudent.qualification}</div>
                </div>
                <div className="full-width">
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>Address</div>
                  <div>{selectedStudent.address}</div>
                </div>
              </div>

              <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-800)' }}>₹{(selectedStudent.finalFees || selectedStudent.totalFees || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Total Fees</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>₹{(selectedStudent.paidFees || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Paid</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>₹{(selectedStudent.pendingFees || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Pending</div>
                </div>
              </div>

              <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, ((selectedStudent.paidFees || 0) / (selectedStudent.finalFees || selectedStudent.totalFees || 1)) * 100)}%` }}></div></div>

              {/* Uploaded Documents */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 700 }}>📄 Uploaded Documents</div>
                  {!selectedStudent.profileComplete && (
                    <button className="btn btn-sm btn-warning" onClick={() => { setShowDetailModal(false); openDocumentUpload(selectedStudent); }}>
                      📤 Upload
                    </button>
                  )}
                </div>
                {selectedStudent.documents?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedStudent.documents.map((doc, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--gray-200)' }}>
                        <span style={{ fontSize: '1.5rem' }}>📎</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{doc.fileName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '-'}
                          </div>
                        </div>
                        <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                          👁️ View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>Profile Incomplete</div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309' }}>No documents uploaded. Student is not eligible for certificate.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Installments */}
              {selectedStudent.installments?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📅 Installments</div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>#</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedStudent.installments.map((inst, i) => (
                          <tr key={i} className={inst.status === 'paid' ? 'inst-paid' : inst.status === 'overdue' ? 'inst-overdue' : ''}>
                            <td>{inst.installmentNumber || i+1}</td>
                            <td>₹{(inst.amount || 0).toLocaleString('en-IN')}</td>
                            <td>{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN') : '-'}</td>
                            <td><span className={`badge ${inst.status === 'paid' ? 'badge-success' : inst.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>{inst.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment History */}
              {selectedStudent.payments?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>💳 Payment History</div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Amount</th><th>Method</th><th>Date</th><th>Remarks</th></tr></thead>
                      <tbody>
                        {selectedStudent.payments.map((p, i) => (
                          <tr key={i}>
                            <td><span className="amount amount-paid">₹{(p.amount || 0).toLocaleString('en-IN')}</span></td>
                            <td><span className="badge badge-info">{p.paymentMethod}</span></td>
                            <td>{p.date ? new Date(p.date).toLocaleDateString('en-IN') : '-'}</td>
                            <td style={{ color: 'var(--gray-500)' }}>{p.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Close</button>
              {selectedStudent.pendingFees > 0 && (
                <button className="btn btn-success" onClick={() => { setShowDetailModal(false); openPayment(selectedStudent); }}>💰 Add Payment</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      {showDocumentModal && selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDocumentModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">📄 Upload Document</h3>
              <button className="modal-close" onClick={() => setShowDocumentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleDocumentUpload}>
              <div className="modal-body">
                <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedStudent.firstName} {selectedStudent.fatherName} {selectedStudent.lastName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                    {selectedStudent.documents?.length > 0 
                      ? `${selectedStudent.documents.length} document(s) uploaded`
                      : '⚠️ No documents uploaded yet'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Document <span className="required">*</span></label>
                  <input 
                    type="file" 
                    className="form-input" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setSelectedFile(e.target.files[0])}
                    required
                  />
                  <span className="form-hint">Accepted: PDF, DOC, DOCX, JPG, PNG (Max 5MB)</span>
                </div>

                {selectedFile && (
                  <div style={{ padding: '0.75rem', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📎</span>
                    <div style={{ flex: 1, fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: '#15803d' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>{(selectedFile.size / 1024).toFixed(2)} KB</div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#155e75' }}>
                  <strong>Note:</strong> At least 2 documents must be uploaded to complete the student profile and become eligible for certificate issuance.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowDocumentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !selectedFile}>
                  {submitting ? '⏳ Uploading...' : '📤 Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
