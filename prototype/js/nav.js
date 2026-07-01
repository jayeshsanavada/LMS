/* ============================================================
   AZ-LMS Prototype — Navigation & Shared Behaviour
   ============================================================ */

/* ---- Role-based navigation config ---- */
const ROLES = {
  employee: {
    label: 'Employee',
    name:  'Rahul Sharma',
    initials: 'RS',
    badge: 'badge-employee',
    nav: [
      { label: 'MAIN',  items: [
        { icon: 'bi-speedometer2', text: 'Dashboard',       href: 'dashboard-employee.html' },
        { icon: 'bi-journal-bookmark', text: 'My Training', href: 'my-training.html', badge: 2 },
        { icon: 'bi-grid',         text: 'Training Catalog',href: 'catalog.html' },
        { icon: 'bi-camera-video', text: 'Sessions',        href: 'sessions.html' },
        { icon: 'bi-award',        text: 'Certificates',    href: 'certificate.html' },
      ]},
      { label: 'ACCOUNT', items: [
        { icon: 'bi-bell',         text: 'Notifications',   href: 'notifications.html', badge: 3 },
        { icon: 'bi-person',       text: 'Profile',         href: 'profile.html' },
      ]},
    ]
  },
  manager: {
    label: 'Manager',
    name:  'Priya Mehta',
    initials: 'PM',
    badge: 'badge-employee',
    nav: [
      { label: 'MAIN', items: [
        { icon: 'bi-speedometer2',    text: 'Dashboard',       href: 'dashboard-manager.html' },
        { icon: 'bi-journal-bookmark',text: 'My Training',     href: 'my-training.html' },
        { icon: 'bi-grid',            text: 'Training Catalog',href: 'catalog.html' },
        { icon: 'bi-camera-video',    text: 'Sessions',        href: 'sessions.html' },
        { icon: 'bi-award',           text: 'Certificates',    href: 'certificate.html' },
      ]},
      { label: 'TEAM', items: [
        { icon: 'bi-people',          text: 'Team Assignments',href: 'team-assignments.html' },
        { icon: 'bi-check2-circle',   text: 'Approvals',       href: 'approvals.html', badge: 4 },
        { icon: 'bi-bar-chart',       text: 'Team Reports',    href: 'reports.html' },
      ]},
      { label: 'ACCOUNT', items: [
        { icon: 'bi-bell',            text: 'Notifications',   href: 'notifications.html', badge: 5 },
        { icon: 'bi-person',          text: 'Profile',         href: 'profile.html' },
      ]},
    ]
  },
  hr: {
    label: 'HR',
    name:  'Sneha Patel',
    initials: 'SP',
    badge: 'badge-hr',
    nav: [
      { label: 'MAIN', items: [
        { icon: 'bi-speedometer2',    text: 'Dashboard',       href: 'dashboard-hr.html' },
        { icon: 'bi-journal-bookmark',text: 'My Training',     href: 'my-training.html' },
        { icon: 'bi-grid',            text: 'Training Catalog',href: 'catalog.html' },
        { icon: 'bi-award',           text: 'Certificates',    href: 'certificate.html' },
      ]},
      { label: 'ORGANISATION', items: [
        { icon: 'bi-people',          text: 'Users',           href: 'admin-users.html' },
        { icon: 'bi-camera-video',    text: 'Sessions',        href: 'admin-sessions.html' },
        { icon: 'bi-shield-check',    text: 'Compliance',      href: 'compliance.html' },
        { icon: 'bi-bar-chart-line',  text: 'Reports',         href: 'reports.html' },
        { icon: 'bi-clock-history',   text: 'Audit Logs',      href: 'audit-logs.html' },
      ]},
      { label: 'ACCOUNT', items: [
        { icon: 'bi-bell',            text: 'Notifications',   href: 'notifications.html', badge: 2 },
        { icon: 'bi-person',          text: 'Profile',         href: 'profile.html' },
      ]},
    ]
  },
  admin: {
    label: 'Admin',
    name:  'Jayesh Sanavada',
    initials: 'JS',
    badge: 'badge-admin',
    nav: [
      { label: 'MAIN', items: [
        { icon: 'bi-speedometer2',    text: 'Dashboard',        href: 'dashboard-admin.html' },
        { icon: 'bi-journal-bookmark',text: 'My Training',      href: 'my-training.html' },
        { icon: 'bi-award',           text: 'Certificates',     href: 'certificate.html' },
      ]},
      { label: 'MANAGE', items: [
        { icon: 'bi-people',          text: 'Users',            href: 'admin-users.html' },
        { icon: 'bi-mortarboard',     text: 'Training',         href: 'admin-training.html' },
        { icon: 'bi-camera-video',    text: 'Sessions',         href: 'admin-sessions.html' },
      ]},
      { label: 'REPORTS & AUDIT', items: [
        { icon: 'bi-bar-chart-line',  text: 'Reports',          href: 'reports.html' },
        { icon: 'bi-shield-check',    text: 'Compliance',       href: 'compliance.html' },
        { icon: 'bi-clock-history',   text: 'Audit Logs',       href: 'audit-logs.html' },
      ]},
      { label: 'SYSTEM', items: [
        { icon: 'bi-plug',            text: 'Integrations',     href: 'admin-integrations.html' },
        { icon: 'bi-gear',            text: 'Settings',         href: 'admin-settings.html' },
        { icon: 'bi-bell',            text: 'Notifications',    href: 'notifications.html', badge: 1 },
        { icon: 'bi-person',          text: 'Profile',          href: 'profile.html' },
      ]},
    ]
  }
};

/* ---- Get/set current role ---- */
function getCurrentRole() {
  return localStorage.getItem('lms_role') || 'employee';
}
function setCurrentRole(role) {
  localStorage.setItem('lms_role', role);
}

/* ---- Build sidebar for current role ---- */
function buildSidebar(activeHref) {
  const role    = getCurrentRole();
  const config  = ROLES[role];
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentFile = activeHref || window.location.pathname.split('/').pop() || 'dashboard-employee.html';

  let html = `
    <a href="dashboard-${role === 'employee' || role === 'manager' || role === 'hr' ? role : 'admin'}.html"
       class="sidebar-brand" style="text-decoration:none">
      <div class="brand-icon">L</div>
      <div>
        <div class="brand-name">AZ-LMS</div>
        <div class="brand-sub">Enterprise LMS</div>
      </div>
    </a>
    <nav class="sidebar-nav">
  `;

  config.nav.forEach(section => {
    html += `<div class="sidebar-section-label">${section.label}</div>`;
    section.items.forEach(item => {
      const isActive = currentFile === item.href || currentFile.includes(item.href.replace('.html',''));
      html += `
        <a href="${item.href}" class="${isActive ? 'active' : ''}">
          <i class="bi ${item.icon}"></i>
          ${item.text}
          ${item.badge ? `<span class="badge-count">${item.badge}</span>` : ''}
        </a>
      `;
    });
  });

  html += `</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${config.initials}</div>
        <div class="user-info">
          <div class="user-name">${config.name}</div>
          <div class="user-role">${config.label}</div>
        </div>
        <a href="login.html" class="logout-btn" title="Logout" onclick="localStorage.clear()">
          <i class="bi bi-box-arrow-right"></i>
        </a>
      </div>
    </div>
  `;

  sidebar.innerHTML = html;
}

/* ---- Build role switcher ---- */
function buildRoleSwitcher() {
  const el = document.getElementById('role-switcher');
  if (!el) return;
  const role = getCurrentRole();
  el.innerHTML = `
    <select onchange="switchRole(this.value)" title="Demo: switch role">
      <option value="employee" ${role==='employee'?'selected':''}>👤 Employee</option>
      <option value="manager"  ${role==='manager' ?'selected':''}>👥 Manager</option>
      <option value="hr"       ${role==='hr'      ?'selected':''}>🏢 HR</option>
      <option value="admin"    ${role==='admin'   ?'selected':''}>⚙️ Admin</option>
    </select>
  `;
}

function switchRole(role) {
  setCurrentRole(role);
  const dashMap = {
    employee: 'dashboard-employee.html',
    manager:  'dashboard-manager.html',
    hr:       'dashboard-hr.html',
    admin:    'dashboard-admin.html',
  };
  window.location.href = dashMap[role];
}

/* ---- Role-specific notification preview items ---- */
const NOTIF_ITEMS = {
  employee: [
    { icon: 'bi-journal-bookmark', color: '#3b82f6', title: 'New training assigned', body: 'Anti-Harassment Policy is due Apr 30', time: '2h ago',  unread: true },
    { icon: 'bi-exclamation-circle', color: '#ef4444', title: 'Training overdue',      body: 'Safety Compliance 2026 was due Apr 1', time: '1d ago', unread: true },
    { icon: 'bi-award',            color: '#22c55e', title: 'Certificate issued',     body: 'Code of Conduct — download ready',     time: '2d ago', unread: false },
  ],
  manager: [
    { icon: 'bi-check2-circle',    color: '#22c55e', title: 'Enrollment approved',    body: 'You approved Rahul Sharma — Leadership Essentials', time: '1h ago', unread: true },
    { icon: 'bi-person-exclamation', color: '#f59e0b', title: 'Team member overdue',  body: 'Arjun Nair — Data Privacy Training overdue 3d', time: '5h ago', unread: true },
    { icon: 'bi-clock',            color: '#f59e0b', title: 'Approval pending',       body: '2 enrollment requests awaiting your review', time: '1d ago', unread: true },
    { icon: 'bi-bar-chart',        color: '#6366f1', title: 'Weekly team report',     body: 'Team compliance: 82% this week',       time: '2d ago', unread: false },
    { icon: 'bi-people',           color: '#3b82f6', title: 'New team member',        body: 'Rohan Verma joined your team',         time: '3d ago', unread: false },
  ],
  hr: [
    { icon: 'bi-shield-x',         color: '#ef4444', title: 'Compliance alert',       body: '31 employees are non-compliant this month', time: '3h ago',  unread: true },
    { icon: 'bi-hourglass-split',  color: '#7c3aed', title: 'Probation gate alert',   body: '2 employees are overdue on probation gate trainings', time: '6h ago', unread: true },
    { icon: 'bi-person-plus',      color: '#22c55e', title: 'New employee synced',    body: 'Rohan Verma added via Zoho HR sync',   time: '2d ago', unread: false },
  ],
  admin: [
    { icon: 'bi-mortarboard',      color: '#3b82f6', title: 'Training published',     body: 'Safety Compliance 2026 v2 is live',    time: '1h ago',  unread: true },
    { icon: 'bi-plug',             color: '#f59e0b', title: 'Integration warning',    body: 'OneDrive upload latency elevated (4.2s)', time: '3h ago', unread: false },
    { icon: 'bi-shield-x',         color: '#ef4444', title: 'Compliance alert',       body: '31 employees non-compliant this month', time: '1d ago', unread: false },
  ],
};

/* ---- Build topbar notification dropdown content ---- */
function buildNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  const role  = getCurrentRole();
  const items = NOTIF_ITEMS[role] || [];
  const unreadCount = items.filter(i => i.unread).length;

  let html = `<div class="notif-dropdown-header"><span>Notifications ${unreadCount > 0 ? '<span style="background:var(--danger);color:#fff;border-radius:10px;padding:1px 7px;font-size:10px;margin-left:4px">' + unreadCount + '</span>' : ''}</span><a href="notifications.html">View all</a></div>`;

  items.forEach(n => {
    html += `
      <div style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);background:${n.unread ? '#f8fafc' : '#fff'};cursor:pointer" onclick="window.location.href='notifications.html'">
        <div style="width:32px;height:32px;border-radius:50%;background:${n.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="bi ${n.icon}" style="color:${n.color};font-size:14px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:${n.unread ? '600' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.title}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.body}</div>
        </div>
        <div style="font-size:10.5px;color:var(--text-muted);flex-shrink:0">${n.time}</div>
      </div>
    `;
  });

  html += `<div style="padding:10px 14px;text-align:center"><a href="notifications.html" style="font-size:12.5px;color:var(--primary)">See all notifications →</a></div>`;
  dd.innerHTML = html;
}

/* ---- Notification toggle ---- */
function toggleNotif() {
  const el = document.getElementById('notif-dropdown');
  if (el) el.classList.toggle('show');
}
document.addEventListener('click', function(e) {
  const btn = document.getElementById('notif-btn');
  const dd  = document.getElementById('notif-dropdown');
  if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.remove('show');
  }
});

/* ---- Init on DOM ready ---- */
document.addEventListener('DOMContentLoaded', function () {
  buildSidebar();
  buildRoleSwitcher();
  buildNotifDropdown();
});
