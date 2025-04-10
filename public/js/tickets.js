document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('ticket-search');
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const categoryFilter = document.getElementById('category-filter');
    const roleFilter = document.getElementById('role-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const ticketCards = document.querySelectorAll('.ticket-card');
    
    // Translate categories in ticket list
    document.querySelectorAll('.ticket-category').forEach(element => {
        const englishCategory = element.textContent;
        element.textContent = translateCategory(englishCategory);
    });
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const priorityValue = priorityFilter.value;
        const categoryValue = categoryFilter.value;
        const roleValue = roleFilter ? roleFilter.value : '';
        
        ticketCards.forEach(card => {
            const title = card.querySelector('h3 a').textContent.toLowerCase();
            const status = card.querySelector('.ticket-status').textContent;
            const priority = card.querySelector('.ticket-priority').textContent;
            const category = card.querySelector('.ticket-category').textContent;
            const role = card.getAttribute('data-role') || 'unassigned';
            
            console.log('Ticket role:', role, 'Filter value:', roleValue); // Debugging
            
            const matchesSearch = title.includes(searchTerm);
            const matchesStatus = statusValue === '' || status === statusValue;
            const matchesPriority = priorityValue === '' || priority === priorityValue;
            const matchesCategory = categoryValue === '' || category === categoryValue;
            const matchesRole = roleValue === '' || role === roleValue;
            
            if (matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesRole) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyFilters);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    if (roleFilter) {
        roleFilter.addEventListener('change', applyFilters);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (priorityFilter) priorityFilter.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (roleFilter) roleFilter.value = '';
            
            ticketCards.forEach(card => {
                card.style.display = 'block';
            });
        });
    }
});

// Add this helper function to translate categories
function translateCategory(englishCategory) {
    const translations = {
        'Hardware': 'Maskinvare',
        'Software': 'Programvare',
        'Network': 'Nettverk',
        'Account': 'Konto',
        'Other': 'Annet'
    };
    
    return translations[englishCategory] || englishCategory;
}