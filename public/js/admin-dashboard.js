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
}

function updateStatusChart(distribution) {
    const openBar = document.querySelector('.open-bar');
    const progressBar = document.querySelector('.progress-bar');
    const resolvedBar = document.querySelector('.resolved-bar');
    
    openBar.style.width = distribution.open + '%';
    openBar.textContent = distribution.open + '%';
    
    progressBar.style.width = distribution.inProgress + '%';
    progressBar.textContent = distribution.inProgress + '%';
    
    resolvedBar.style.width = distribution.resolved + '%';
    resolvedBar.textContent = distribution.resolved + '%';
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