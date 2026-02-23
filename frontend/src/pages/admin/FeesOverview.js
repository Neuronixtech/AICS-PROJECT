import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const PER_PAGE = 8;

export default function FeesOverview() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const totalFees = students.reduce((s, st) => s + (st.finalFees || st.totalFees || 0), 0);
  const totalPaid = students.reduce((s, st) => s + (st.paidFees || 0), 0);
  const totalPending = students.reduce((s, st) => s + (st.pendingFees || 0), 0);

  const filtered = students.filter(s => {
    const name = `${s.firstName} ${s.fatherName} ${s.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || s.phoneNumber.includes(search);
    const matchFilter = filter === 'all' || (filter === 'paid' && s.pendingFees === 0) || (filter === 'pending' && s.pendingFees > 0);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;
  const pct = (paid, total) => total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">💰 Fees Overview</h1>
          <p className="page-subtitle">Track all student fee collections</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue">💳</div><div className="stat-info"><div className="stat-value" style={{fontSize:'1.1rem'}}>{fmt(totalFees)}</div><div className="stat-label">Total Fees</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value" style={{fontSize:'1.1rem'}}>{fmt(totalPaid)}</div><div className="stat-label">Collected</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div className="stat-info"><div className="stat-value" style={{fontSize:'1.1rem'}}>{fmt(totalPending)}</div><div className="stat-label">Pending</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">📊</div><div className="stat-info"><div className="stat-value">{pct(totalPaid, totalFees)}%</div><div className="stat-label">Collection Rate</div></div></div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div className="progress-bar" style={{ height: '10px' }}>
          <div className="progress-fill" style={{ width: `${pct(totalPaid, totalFees)}%` }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '4px' }}>
          <span>{fmt(totalPaid)} collected</span>
          <span>{pct(totalPaid, totalFees)}% of {fmt(totalFees)}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input placeholder="Search student..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-tabs">
              {['all','paid','pending'].map(f => (
                <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner"></div></div>
          : paginated.length === 0 ? <div className="empty-state"><div className="empty-icon">💰</div><div className="empty-title">No records</div></div>
          : (
            <div className="table-responsive">
              <div className="table-container">
                <table>
                  <thead><tr><th>Student</th><th>Course</th><th>Total Fees</th><th>Paid</th><th>Pending</th><th>Progress</th><th>Status</th></tr></thead>
                  <tbody>
                    {paginated.map(s => {
                      const p = pct(s.paidFees, s.finalFees || s.totalFees);
                      return (
                        <tr key={s._id}>
                          <td data-label="Student"><div className="td-name">{s.firstName} {s.fatherName} {s.lastName}</div><div className="td-sub">{s.phoneNumber}</div></td>
                          <td data-label="Course">{s.course?.name}</td>
                          <td data-label="Total">{fmt(s.finalFees || s.totalFees)}</td>
                          <td data-label="Paid"><span className="amount amount-paid">{fmt(s.paidFees)}</span></td>
                          <td data-label="Pending"><span className="amount amount-pending">{fmt(s.pendingFees)}</span></td>
                          <td data-label="Progress" style={{ minWidth: '120px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${p}%` }}></div></div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{p}%</span>
                            </div>
                          </td>
                          <td data-label="Status"><span className={`badge ${s.pendingFees === 0 ? 'badge-success' : 'badge-warning'}`}>{s.pendingFees === 0 ? '✅ Paid' : '⏳ Pending'}</span></td>
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
    </div>
  );
}
