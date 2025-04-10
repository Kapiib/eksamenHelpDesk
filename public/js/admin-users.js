document.addEventListener('DOMContentLoaded', function() {
    // Client-side user filtering
    const searchInput = document.getElementById('user-search-input');
    const roleFilter = document.getElementById('role-filter');
    const userCards = document.querySelectorAll('.user-card');
    
    function filterUsers() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedRole = roleFilter.value;
        
        userCards.forEach(card => {
            const userName = card.querySelector('h3').textContent.toLowerCase();
            const userEmail = card.querySelector('p').textContent.toLowerCase();
            const userRole = card.querySelector('.user-role').textContent;
            
            const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
            const matchesRole = selectedRole === '' || userRole === selectedRole;
            
            if (matchesSearch && matchesRole) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // Run filter on input changes
    searchInput.addEventListener('input', filterUsers);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            filterUsers();
        }
    });
    roleFilter.addEventListener('change', filterUsers);
    
    // Auto-submit role change forms
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', function() {
            this.closest('form').submit();
        });
    });
});