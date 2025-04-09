document.addEventListener('DOMContentLoaded', function() {
    // Connect to Socket.IO
    const socket = io();
    
    // Join admin room
    socket.emit('join-admin');
    
    // Fetch initial dashboard data
    fetchDashboardData();
    
    // Listen for ticket updates
    socket.on('ticket-created', function() {
        fetchDashboardData();
    });
    
    socket.on('ticket-updated', function() {
        fetchDashboardData();
    });
    
    socket.on('response-received', function() {
        fetchRecentActivity();
    });
    
    // Refresh data periodically
    setInterval(fetchDashboardData, 60000); // Every minute
});

function fetchDashboardData() {
    fetch('/api/admin/dashboard')
        .then(response => response.json())
        .then(data => {
            updateStats(data.stats);
            updateRoleStats(data.roleStats);
            updateStaffPerformance(data.supportStaff);
            updateStatusChart(data.statusDistribution);
            updateCategoryChart(data.categoryDistribution);
            updateCriticalTickets(data.criticalTickets);
            updateRecentActivity(data.recentActivity);
        })
        .catch(error => console.error('Error fetching dashboard data:', error));
}

function fetchRecentActivity() {
    fetch('/api/admin/recent-activity')
        .then(response => response.json())
        .then(data => {
            updateRecentActivity(data);
        })
        .catch(error => console.error('Error fetching recent activity:', error));
}

function updateStats(stats) {
    document.getElementById('total-tickets').textContent = stats.total;
    document.getElementById('open-tickets').textContent = stats.open;
    document.getElementById('in-progress-tickets').textContent = stats.inProgress;
    document.getElementById('resolved-tickets').textContent = stats.resolved;
    document.getElementById('closed-tickets').textContent = stats.closed;
}

function updateRoleStats(roleStats) {
    // 1st Line
    document.getElementById('1st-line-total').textContent = roleStats['1st-line'].total;
    document.getElementById('1st-line-open').textContent = roleStats['1st-line'].open;
    document.getElementById('1st-line-in-progress').textContent = roleStats['1st-line'].inProgress;
    document.getElementById('1st-line-resolved').textContent = roleStats['1st-line'].resolved;
    document.getElementById('1st-line-closed').textContent = roleStats['1st-line'].closed;
    
    // 2nd Line
    document.getElementById('2nd-line-total').textContent = roleStats['2nd-line'].total;
    document.getElementById('2nd-line-open').textContent = roleStats['2nd-line'].open;
    document.getElementById('2nd-line-in-progress').textContent = roleStats['2nd-line'].inProgress;
    document.getElementById('2nd-line-resolved').textContent = roleStats['2nd-line'].resolved;
    document.getElementById('2nd-line-closed').textContent = roleStats['2nd-line'].closed;
    
    // Unassigned
    document.getElementById('unassigned-total').textContent = roleStats.unassigned.total;
    document.getElementById('unassigned-open').textContent = roleStats.unassigned.open;
    document.getElementById('unassigned-in-progress').textContent = roleStats.unassigned.inProgress;
    document.getElementById('unassigned-resolved').textContent = roleStats.unassigned.resolved;
    document.getElementById('unassigned-closed').textContent = roleStats.unassigned.closed;
}

function updateStatusChart(distribution) {
    const openBar = document.querySelector('.open-bar');
    const progressBar = document.querySelector('.progress-bar');
    const resolvedBar = document.querySelector('.resolved-bar');
    const closedBar = document.querySelector('.closed-bar');
    
    openBar.style.width = distribution.open + '%';
    openBar.textContent = distribution.open + '%';
    
    progressBar.style.width = distribution.inProgress + '%';
    progressBar.textContent = distribution.inProgress + '%';
    
    resolvedBar.style.width = distribution.resolved + '%';
    resolvedBar.textContent = distribution.resolved + '%';
    
    closedBar.style.width = distribution.closed + '%';
    closedBar.textContent = distribution.closed + '%';
}

function updateCategoryChart(distribution) {
    const hardwareBar = document.querySelector('.hardware-bar');
    const softwareBar = document.querySelector('.software-bar');
    const networkBar = document.querySelector('.network-bar');
    const accountBar = document.querySelector('.account-bar');
    const otherBar = document.querySelector('.other-bar');
    
    hardwareBar.style.width = distribution.hardware + '%';
    hardwareBar.textContent = distribution.hardware + '%';
    
    softwareBar.style.width = distribution.software + '%';
    softwareBar.textContent = distribution.software + '%';
    
    networkBar.style.width = distribution.network + '%';
    networkBar.textContent = distribution.network + '%';
    
    accountBar.style.width = distribution.account + '%';
    accountBar.textContent = distribution.account + '%';
    
    otherBar.style.width = distribution.other + '%';
    otherBar.textContent = distribution.other + '%';
}

function updateCriticalTickets(tickets) {
    const container = document.getElementById('critical-tickets-list');
    
    if (tickets.length === 0) {
        container.innerHTML = '<div class="empty-list">No high priority tickets</div>';
        return;
    }
    
    let html = '';
    tickets.forEach(ticket => {
        html += `
            <div class="ticket-item priority-${ticket.priority.toLowerCase()}">
                <div class="ticket-title">
                    <a href="/tickets/${ticket._id}">${ticket.title}</a>
                </div>
                <div class="ticket-meta">
                    <span class="ticket-id">#${ticket._id.substr(-6)}</span>
                    <span class="ticket-category">${ticket.category}</span>
                    <span class="ticket-status">${ticket.status}</span>
                </div>
                <div class="ticket-info">
                    <span>Created by: ${ticket.createdBy.name}</span>
                    <span>Created: ${new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateRecentActivity(activities) {
    const container = document.getElementById('activity-feed');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-list">No recent activity</div>';
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}-icon"></div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateStaffPerformance(staff) {
    const container = document.getElementById('staff-performance-list');
    
    if (staff.length === 0) {
        container.innerHTML = '<div class="empty-list">No support staff found</div>';
        return;
    }
    
    let html = '';
    staff.forEach(member => {
        const resolutionRate = member.ticketsAssigned > 0 
            ? Math.round((member.ticketsResolved / member.ticketsAssigned) * 100) 
            : 0;
            
        html += `
            <div class="staff-item role-${member.role.replace('-', '')}">
                <div class="staff-name">${member.name}</div>
                <div class="staff-role">${member.role}</div>
                <div class="staff-metrics">
                    <span>Assigned: ${member.ticketsAssigned}</span>
                    <span>Resolved: ${member.ticketsResolved}</span>
                    <span>Resolution Rate: ${resolutionRate}%</span>
                </div>
                <div class="resolution-bar-container">
                    <div class="resolution-bar" style="width: ${resolutionRate}%"></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}