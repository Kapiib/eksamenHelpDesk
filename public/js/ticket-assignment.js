document.addEventListener('DOMContentLoaded', function() {
    // Filter the assignedTo dropdown based on selected role
    const assignedRoleSelect = document.getElementById('assignedRole');
    
    if (assignedRoleSelect) {
        assignedRoleSelect.addEventListener('change', function() {
            const selectedRole = this.value;
            const assignedToSelect = document.getElementById('assignedTo');
            const options = assignedToSelect.querySelectorAll('option');
            
            options.forEach(option => {
                if (option.value === '') {
                    // Always show the unassigned option
                    option.hidden = false;
                } else {
                    const optionRole = option.getAttribute('data-role');
                    option.hidden = selectedRole !== 'unassigned' && optionRole !== selectedRole;
                }
            });
            
            // Reset selection if it's now hidden
            if (assignedToSelect.selectedOptions[0].hidden) {
                assignedToSelect.value = '';
            }
        });
    }
});