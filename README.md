# 🎓 Course Institute Management System

## 🚀 Quick Start:

### Backend:
```bash
cd backend
npm install
cp .env.example .env   # Add your MongoDB URI
node scripts/createAdmin.js
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm start
```

## 🔑 Login:
- Admin: `admin@institute.com` / `admin123`
- Staff: `staff@example.com` / `staff123`

## 📱 Responsive Breakpoints:
- Mobile: < 768px (cards, hamburger menu)
- Tablet: 768–1023px (collapsible sidebar)
- Desktop: ≥ 1024px (full layout)

## 📁 Frontend Structure:
```
frontend/src/
├── App.js                    ← Routes & layout
├── styles/global.css         ← All styling
├── context/AuthContext.js    ← Auth state
├── utils/api.js              ← Axios
├── components/
│   ├── Navbar.js
│   ├── Sidebar.js
│   └── Pagination.js
└── pages/
    ├── Login.js
    ├── admin/
    │   ├── Dashboard.js
    │   ├── StudentManagement.js  
    │   ├── EnquiryManagement.js  
    │   ├── DiscountManagement.js 
    │   ├── CourseManagement.js
    │   ├── FeesOverview.js
    │   ├── Certificates.js       
    │   └── StaffManagement.js
    └── staff/
        ├── StaffDashboard.js
        ├── StaffStudents.js
        └── StaffEnquiries.js
```
