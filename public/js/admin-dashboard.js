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
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dashboard data received:', data);
            
            // Use try/catch for each update to isolate errors
            try {
                if (data.stats) updateStats(data.stats);
            } catch (e) {
                console.error('Error updating stats:', e);
            }
            
            try {
                if (data.roleStats) updateRoleStats(data.roleStats);
            } catch (e) {
                console.error('Error updating role stats:', e);
            }
            
            try {
                if (data.supportStaff) updateStaffPerformance(data.supportStaff);
            } catch (e) {
                console.error('Error updating staff performance:', e);
            }
            
            try {
                if (data.assignedTickets) updateAssignedTickets(data.assignedTickets);
            } catch (e) {
                console.error('Error updating assigned tickets:', e);
            }
            
            try {
                if (data.statusDistribution) updateStatusChart(data.statusDistribution);
            } catch (e) {
                console.error('Error updating status chart:', e);
            }
            
            try {
                if (data.categoryDistribution) updateCategoryChart(data.categoryDistribution);
            } catch (e) {
                console.error('Error updating category chart:', e);
            }
            
            try {
                if (data.criticalTickets) updateCriticalTickets(data.criticalTickets);
            } catch (e) {
                console.error('Error updating critical tickets:', e);
            }
            
            try {
                if (data.recentActivity) updateRecentActivity(data.recentActivity);
            } catch (e) {
                console.error('Error updating recent activity:', e);
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            
            // Show error message in all loading indicators
            document.querySelectorAll('.loading-indicator').forEach(el => {
                el.textContent = 'Failed to load data. Please try refreshing.';
                el.classList.add('error');
            });
        });
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

// Update the critical tickets section with Norwegian categories
function updateCriticalTickets(tickets) {
    const container = document.getElementById('critical-tickets-list');
    if (!container) return;
    
    // Defensive check for undefined/null tickets
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
        container.innerHTML = '<div class="empty-list">Ingen høyprioritets-saker</div>';
        return;
    }
    
    try {
        let html = '';
        tickets.forEach(ticket => {
            const id = ticket._id || 'unknown';
            const title = ticket.title || 'Sak uten tittel';
            
            // Directly translate status
            let status = 'Ukjent status';
            if (ticket.status === 'Open') status = 'Åpen';
            else if (ticket.status === 'In Progress') status = 'Under behandling';
            else if (ticket.status === 'Resolved') status = 'Løst';
            else if (ticket.status === 'Closed') status = 'Avsluttet';
            
            // Directly translate category
            let category = 'Ukategorisert';
            if (ticket.category === 'Hardware') category = 'Maskinvare';
            else if (ticket.category === 'Software') category = 'Programvare';
            else if (ticket.category === 'Network') category = 'Nettverk';
            else if (ticket.category === 'Account') category = 'Konto';
            else if (ticket.category === 'Other') category = 'Annet';
            else category = ticket.category;
            
            const createdBy = ticket.createdBy && ticket.createdBy.name ? ticket.createdBy.name : 'Ukjent';
            
            html += `
                <div class="ticket-item priority-critical">
                    <div class="ticket-title">
                        <a href="/tickets/${id}">${title}</a>
                    </div>
                    <div class="ticket-meta">
                        <span class="ticket-id">#${typeof id === 'string' ? id.substr(-6) : id}</span>
                        <span class="ticket-category">${category}</span>
                        <span class="ticket-status">${status}</span>
                    </div>
                    <div class="ticket-info">
                        <span>Opprettet av: ${createdBy}</span>
                        <span>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Ukjent dato'}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (err) {
        console.error('Error rendering critical tickets:', err);
        container.innerHTML = '<div class="error-message">Feil ved visning av saker</div>';
    }
}

function updateRecentActivity(activities) {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    
    // Defensive check for undefined/null activities
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
        container.innerHTML = '<div class="empty-list">No recent activity</div>';
        return;
    }
    
    try {
        let html = '';
        activities.forEach(activity => {
            // Default values if properties are undefined
            const type = activity.type || 'update';
            const text = activity.text || 'Unknown activity';
            const time = activity.time || '';
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon ${type}-icon"></div>
                    <div class="activity-content">
                        <div class="activity-text">${text}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (err) {
        console.error('Error rendering activity feed:', err);
        container.innerHTML = '<div class="error-message">Error displaying activity</div>';
    }
}

function updateStaffPerformance(staff) {
    const container = document.getElementById('staff-performance-list');
    
    if (!staff || staff.length === 0) {
        container.innerHTML = '<div class="empty-list">No support staff found</div>';
        return;
    }
    
    let html = '';
    staff.forEach(member => {
        const resolutionRate = member.ticketsAssigned > 0 
            ? Math.round(((member.ticketsResolved + member.ticketsClosed) / member.ticketsAssigned) * 100) 
            : 0;
            
        html += `
            <div class="staff-item role-${member.role.replace('-', '')}">
                <div class="staff-name">${member.name}</div>
                <div class="staff-role">${member.role}</div>
                <div class="staff-metrics">
                    <span>Assigned: ${member.ticketsAssigned}</span>
                    <span>Resolved: ${member.ticketsResolved}</span>
                    <span>Closed: ${member.ticketsClosed}</span>
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

// Update the assigned tickets section with Norwegian categories
function updateAssignedTickets(tickets) {
    const container = document.getElementById('assigned-tickets-list');
    if (!container) return;
    
    // Defensive check for undefined/null tickets
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
        container.innerHTML = '<div class="empty-list">Ingen saker tildelt deg</div>';
        return;
    }
    
    try {
        let html = '';
        tickets.forEach(ticket => {
            const id = ticket._id || 'unknown';
            const title = ticket.title || 'Sak uten tittel';
            
            // Directly translate status
            let status = 'Ukjent status';
            if (ticket.status === 'Open') status = 'Åpen';
            else if (ticket.status === 'In Progress') status = 'Under behandling';
            else if (ticket.status === 'Resolved') status = 'Løst';
            else if (ticket.status === 'Closed') status = 'Avsluttet';
            else status = ticket.status;
            
            // Directly translate category
            let category = 'Ukategorisert';
            if (ticket.category === 'Hardware') category = 'Maskinvare';
            else if (ticket.category === 'Software') category = 'Programvare';
            else if (ticket.category === 'Network') category = 'Nettverk';
            else if (ticket.category === 'Account') category = 'Konto';
            else if (ticket.category === 'Other') category = 'Annet';
            else category = ticket.category;
            
            const priority = ticket.priority ? ticket.priority.toLowerCase() : 'medium';
            
            html += `
                <div class="ticket-item priority-${priority}">
                    <div class="ticket-title">
                        <a href="/tickets/${id}">${title}</a>
                    </div>
                    <div class="ticket-meta">
                        <span class="ticket-id">#${typeof id === 'string' ? id.substr(-6) : id}</span>
                        <span class="ticket-category">${category}</span>
                        <span class="ticket-status">${status}</span>
                    </div>
                    <div class="ticket-info">
                        <span>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Ukjent dato'}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (err) {
        console.error('Error rendering assigned tickets:', err);
        container.innerHTML = '<div class="error-message">Feil ved visning av saker</div>';
    }
}