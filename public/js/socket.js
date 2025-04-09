document.addEventListener('DOMContentLoaded', function() {
    // Connect to Socket.IO server
    const socket = io();
    
    // Store processed message IDs to prevent duplicates
    const processedMessages = new Set();
    
    // Check if we're on the tickets list page
    const ticketsListContainer = document.querySelector('.tickets-list');
    const noTicketsContainer = document.querySelector('.no-tickets');
    
    if (ticketsListContainer || noTicketsContainer) {
        // Join the tickets list room to get updates about new tickets
        socket.emit('join-tickets-list');
        
        // Listen for new ticket creation
        socket.on('ticket-created', function(data) {
            console.log('New ticket created:', data);
            
            // If there are no tickets, remove the "no tickets" message
            if (noTicketsContainer) {
                noTicketsContainer.remove();
                
                // Create tickets-list container if it doesn't exist
                if (!document.querySelector('.tickets-list')) {
                    const ticketsListDiv = document.createElement('div');
                    ticketsListDiv.className = 'tickets-list';
                    document.querySelector('.container').appendChild(ticketsListDiv);
                }
            }
            
            // Get ticket list container (which may have just been created)
            const ticketsList = document.querySelector('.tickets-list');
            
            // Create new ticket card
            const ticketId = data.ticket._id.toString();
            const shortId = ticketId.substr(-6);
            const createdBy = data.ticket.createdBy ? data.ticket.createdBy.name : 'Unknown';
            const isAdmin = document.querySelector('meta[name="user-role"]')?.content === 'admin';
            
            const ticketCard = document.createElement('div');
            ticketCard.className = `ticket-card status-${data.ticket.status.toLowerCase().replace(' ', '-')}`;
            ticketCard.innerHTML = `
                <div class="ticket-info">
                    <h3><a href="/tickets/${ticketId}">${data.ticket.title}</a></h3>
                    <div class="ticket-meta">
                        <span class="ticket-id">#${shortId}</span>
                        <span class="ticket-category">${data.ticket.category}</span>
                        <span class="ticket-priority priority-${data.ticket.priority.toLowerCase()}">${data.ticket.priority}</span>
                        <span class="ticket-status">${data.ticket.status}</span>
                    </div>
                    <div class="ticket-details">
                        ${isAdmin ? `<span class="ticket-user">Created by: ${createdBy}</span>` : ''}
                        <span class="ticket-date">Created: ${new Date(data.ticket.createdAt).toLocaleString()}</span>
                        <span class="ticket-assigned">Unassigned</span>
                    </div>
                </div>
            `;
            
            // Add the new ticket to the top of the list
            if (ticketsList) {
                ticketsList.insertBefore(ticketCard, ticketsList.firstChild);
                
                // Show a notification
                showNotification(`New ticket created by ${data.creator}`);
            }
        });

        // Listen for ticket updates
        socket.on('ticket-list-updated', function(data) {
            // Find the ticket card that needs to be updated
            const ticketCard = document.querySelector(`.ticket-card a[href="/tickets/${data.ticketId}"]`)?.closest('.ticket-card');
            
            if (ticketCard) {
                // Update status
                const statusElement = ticketCard.querySelector('.ticket-status');
                if (statusElement) {
                    statusElement.className = `ticket-status status-${data.status.toLowerCase().replace(' ', '-')}`;
                    statusElement.textContent = data.status;
                }
                
                // Update priority
                const priorityElement = ticketCard.querySelector('.ticket-priority');
                if (priorityElement) {
                    priorityElement.className = `ticket-priority priority-${data.priority.toLowerCase()}`;
                    priorityElement.textContent = data.priority;
                }
                
                // Update assigned to
                const assignedElement = ticketCard.querySelector('.ticket-assigned');
                if (assignedElement) {
                    if (data.assignedTo === 'Unassigned') {
                        assignedElement.textContent = 'Unassigned';
                    } else {
                        assignedElement.textContent = `Assigned to: ${data.assignedTo}`;
                    }
                }
                
                // Add a highlight effect
                ticketCard.classList.add('highlight-update');
                setTimeout(() => {
                    ticketCard.classList.remove('highlight-update');
                }, 2000);
                
                // Show a notification
                showNotification(`Ticket #${data.ticketId.substr(-6)} updated by ${data.updatedBy}`);
            }
        });
    }
    
    // Check if we're on a ticket details page
    const ticketContainer = document.querySelector('.ticket-details-card');
    if (ticketContainer) {
        const ticketId = window.location.pathname.split('/').pop();
        const responsesList = document.querySelector('.responses-list');
        const noResponsesMessage = document.querySelector('.no-responses');
        const responseForm = document.querySelector('.add-response form');
        
        // Join the ticket room
        socket.emit('join-ticket', ticketId);
        
        // Listen for ticket updates
        socket.on('ticket-updated', function(data) {
            console.log('Ticket updated:', data);
            
            // Update status if changed
            if (data.statusChanged) {
                const statusElement = document.querySelector('.ticket-status');
                if (statusElement) {
                    // Update class to reflect new status
                    statusElement.className = `ticket-status status-${data.status.toLowerCase().replace(' ', '-')}`;
                    statusElement.textContent = data.status;
                }
            }
            
            // Update priority if changed
            if (data.priorityChanged) {
                const priorityElement = document.querySelector('.ticket-priority');
                if (priorityElement) {
                    // Update class to reflect new priority
                    priorityElement.className = `ticket-priority priority-${data.priority.toLowerCase()}`;
                    priorityElement.textContent = data.priority;
                }
            }
            
            // Update assigned to if changed
            if (data.assignedToChanged) {
                const assignedToElement = document.querySelector('.ticket-info p:nth-child(4) strong');
                if (assignedToElement && assignedToElement.nextSibling) {
                    assignedToElement.nextSibling.textContent = ` ${data.assignedTo}`;
                }
            }
            
            // Update the last updated time
            const updatedAtElement = document.querySelector('.ticket-info p:nth-child(3) strong');
            if (updatedAtElement && updatedAtElement.nextSibling) {
                updatedAtElement.nextSibling.textContent = ` ${new Date(data.updatedAt).toLocaleString()}`;
            }
            
            // Show a notification about the update
            const notificationText = `Ticket updated by ${data.updatedBy}`;
            showNotification(notificationText);
        });
        
        // Listen for new responses
        socket.on('response-received', function(data) {
            // Generate a unique ID for this message to prevent duplicates
            const messageId = `${data.ticketId}-${data.text}-${data.userName}-${Date.now()}`;
            
            // If we've already processed this message, ignore it
            if (processedMessages.has(messageId)) {
                return;
            }
            
            // Mark this message as processed
            processedMessages.add(messageId);
            
            // Hide "no responses" message if it exists
            if (noResponsesMessage) {
                noResponsesMessage.style.display = 'none';
            }
            
            // Create response element if it doesn't exist yet
            let responseListElement = responsesList;
            if (!responseListElement) {
                const newResponsesList = document.createElement('div');
                newResponsesList.className = 'responses-list';
                document.querySelector('.ticket-responses h3').after(newResponsesList);
                responseListElement = newResponsesList;
            }
            
            // Add the new response to the list
            const responseClass = data.isAdmin ? 'admin-response' : 'user-response';
            const responseItem = `
                <div class="response-item ${responseClass}">
                    <div class="response-header">
                        <span class="response-author">${data.userName} ${data.isAdmin ? '(Staff)' : ''}</span>
                        <span class="response-date">${new Date().toLocaleString()}</span>
                    </div>
                    <div class="response-content">
                        ${data.text}
                    </div>
                </div>
            `;
            
            responseListElement.innerHTML = responseItem + responseListElement.innerHTML;
            
            // Scroll to the bottom of the responses
            responseListElement.scrollTop = responseListElement.scrollHeight;
        });
        
        // Submit new response via Socket.IO
        if (responseForm) {
            responseForm.addEventListener('submit', function(e) {
                // Prevent default form submission
                e.preventDefault();
                
                const textArea = this.querySelector('textarea[name="text"]');
                const text = textArea.value.trim();
                
                if (text) {
                    // Get user data from the page
                    const userName = document.querySelector('meta[name="user-name"]').content;
                    const isAdmin = document.querySelector('meta[name="user-role"]').content === 'admin';
                    
                    // Show temporary loading state
                    const submitButton = this.querySelector('button[type="submit"]');
                    const originalText = submitButton.textContent;
                    submitButton.textContent = 'Sending...';
                    submitButton.disabled = true;
                    
                    // Send request to server using fetch API
                    fetch(`/tickets/${ticketId}/respond`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Clear the text area
                            textArea.value = '';
                            
                            // Let the Socket.IO event handle the UI update
                            console.log('Response submitted successfully');
                        } else {
                            console.error('Error:', data.message);
                            alert('Error sending response: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error sending response');
                    })
                    .finally(() => {
                        // Reset the button
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    });
                }
            });
        }
        
        // Helper function to show notifications
        function showNotification(message) {
            // Create notification element if it doesn't exist
            let notification = document.querySelector('.ticket-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.className = 'ticket-notification';
                document.querySelector('.ticket-details-header').appendChild(notification);
            }
            
            // Set message and show notification
            notification.textContent = message;
            notification.classList.add('show');
            
            // Hide after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
        }
    }
    
    // Helper function to show notifications
    function showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.ticket-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'ticket-notification';
            document.body.appendChild(notification);
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
});