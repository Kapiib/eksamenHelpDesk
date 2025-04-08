document.addEventListener('DOMContentLoaded', function() {
    // Prevent form from causing page reload if Socket.IO is working
    const updateForm = document.getElementById('ticket-update-form');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            // Always prevent default form submission
            e.preventDefault();
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Updating...';
            submitButton.disabled = true;
            
            // Submit form data via fetch
            const formData = new FormData(this);
            
            fetch(this.action, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // First check the content type
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                }
                return { success: true }; // Return a default success object if not JSON
            })
            .then(data => {
                console.log('Ticket updated successfully:', data);
                // Let Socket.IO handle UI updates
            })
            .catch(error => {
                console.error('Error updating ticket:', error);
                // Comment out or remove the alert
                // alert('Error updating ticket. Please try again.');
            })
            .finally(() => {
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            });
        });
    }
});