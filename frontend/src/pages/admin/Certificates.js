import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;

export default function Certificates() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('eligible');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [generating, setGenerating] = useState(null);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const showAlert = (type, msg) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 4000); };

  // Check eligibility based on NEW criteria
  const checkEligibility = (s) => {
    const fullPaid = (s.pendingFees || 0) === 0;
    const completed = s.courseCompleted === true;
    const docsUploaded = s.profileComplete === true;
    let sevenDaysPassed = false;
    if (s.courseEndDate) {
      const endDate = new Date(s.courseEndDate);
      endDate.setDate(endDate.getDate() + 7);
      sevenDaysPassed = new Date() >= endDate;
    }
    return { fullPaid, completed, sevenDaysPassed, docsUploaded, eligible: fullPaid && completed && sevenDaysPassed && docsUploaded };
  };

  const getEligibilityStatus = (s) => {
    if (s.certificateIssued) return 'issued';
    const { eligible } = checkEligibility(s);
    if (eligible || s.certificateEligible) return 'eligible';
    return 'not_eligible';
  };

  const filteredStudents = students.filter(s => {
    const name = `${s.firstName} ${s.fatherName} ${s.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || s.phoneNumber.includes(search);
    const status = getEligibilityStatus(s);
    const matchFilter = filter === 'all' || filter === status ||
      (filter === 'eligible' && status === 'eligible') ||
      (filter === 'issued' && status === 'issued');
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filteredStudents.length / PER_PAGE);
  const paginated = filteredStudents.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const eligibleCount = students.filter(s => getEligibilityStatus(s) === 'eligible').length;
  const issuedCount = students.filter(s => s.certificateIssued).length;

  const generateCertificate = async (student) => {
    setGenerating(student._id);
    try {
      const response = await api.get(`/certificates/generate/${student._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${student.firstName}_${student.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showAlert('success', 'Certificate generated and downloaded!');
      fetchStudents();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to generate certificate');
    } finally { setGenerating(null); }
  };

  const markComplete = async (studentId) => {
    try {
      await api.put(`/students/${studentId}`, { courseCompleted: true });
      fetchStudents();
      showAlert('success', 'Course marked as completed!');
    } catch (err) { showAlert('error', 'Failed to update'); }
  };

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, maxWidth: '380px' }}>{alert.type==='success'?'✅':'❌'} {alert.message}</div>}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🏆 Certificates</h1>
          <p className="page-subtitle">{eligibleCount} eligible, {issuedCount} issued</p>
        </div>
      </div>

      {/* Criteria Card */}
      <div className="card" style={{ marginBottom: '1.25rem', background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2rem' }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: '0.5rem' }}>Certificate Eligibility Criteria</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                <span>✅</span> <strong>Full Payment</strong> — All fees must be paid (₹0 pending)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                <span>✅</span> <strong>Course Complete</strong> — Full course duration must be finished
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                <span>✅</span> <strong>7 Days After</strong> — 7 working days after course completion
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                <span>✅</span> <strong>Documents Uploaded</strong> — Student profile must be complete with documents
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
        <div className="stat-card"><div className="stat-icon blue">👨‍🎓</div><div className="stat-info"><div className="stat-value">{students.length}</div><div className="stat-label">Total Students</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">🎯</div><div className="stat-info"><div className="stat-value">{eligibleCount}</div><div className="stat-label">Eligible</div></div></div>
        <div className="stat-card"><div className="stat-icon green">🏆</div><div className="stat-info"><div className="stat-value">{issuedCount}</div><div className="stat-label">Issued</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input placeholder="Search student..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-tabs">
              {[['all','All'],['eligible','Eligible 🎯'],['issued','Issued ✅'],['not_eligible','Not Ready']].map(([f, label]) => (
                <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => { setFilter(f); setPage(1); }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <div className="empty-title">No students found</div>
              <div className="empty-text">{filter === 'eligible' ? 'No eligible students yet' : 'Try changing the filter'}</div>
            </div>
          ) : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Student</th><th>Course</th><th>Enrolled</th><th>Payment</th><th>Completed</th><th>7 Days</th><th>Documents</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {paginated.map(s => {
                      const { fullPaid, completed, sevenDaysPassed, docsUploaded } = checkEligibility(s);
                      const status = getEligibilityStatus(s);
                      return (
                        <tr key={s._id}>
                          <td data-label="Student"><div className="td-name">{s.firstName} {s.fatherName} {s.lastName}</div><div className="td-sub">{s.phoneNumber}</div></td>
                          <td data-label="Course">{s.course?.name}</td>
                          <td data-label="Enrolled">{s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('en-IN') : '-'}</td>
                          <td data-label="Payment"><span>{fullPaid ? '✅' : '❌'}</span></td>
                          <td data-label="Completed">
                            {completed ? '✅' : (
                              <button className="btn btn-sm btn-outline" onClick={() => markComplete(s._id)}>Mark Done</button>
                            )}
                          </td>
                          <td data-label="7 Days"><span>{sevenDaysPassed ? '✅' : '⏳'}</span></td>
                          <td data-label="Documents"><span>{docsUploaded ? '✅' : '❌'}</span></td>
                          <td data-label="Status">
                            {status === 'issued' && <span className="badge badge-success">🏆 Issued</span>}
                            {status === 'eligible' && <span className="badge badge-warning">🎯 Eligible</span>}
                            {status === 'not_eligible' && <span className="badge badge-gray">⏳ Not Ready</span>}
                          </td>
                          <td data-label="Action">
                            {status === 'eligible' && (
                              <button className="btn btn-sm btn-primary" onClick={() => generateCertificate(s)} disabled={generating === s._id}>
                                {generating === s._id ? '⏳' : '📄 Generate'}
                              </button>
                            )}
                            {status === 'issued' && (
                              <button className="btn btn-sm btn-outline" onClick={() => generateCertificate(s)}>🔄 Re-print</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filteredStudents.length)} of {filteredStudents.length}</span>
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
    </div>
  );
}
