document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.querySelector('.chat-container');
    const chatToggle = document.querySelector('.chat-toggle');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const previewImage = document.getElementById('preview-image');
    const removePreview = document.querySelector('.remove-preview');
    
    // Get ticket ID from URL
    const ticketId = window.location.pathname.split('/').pop();
    
    // Get user data
    const userName = document.querySelector('meta[name="user-name"]').content;
    const isAdmin = document.querySelector('meta[name="user-role"]').content === 'admin';
    
    // Connect to Socket.IO
    const socket = io();
    
    // Join the ticket chat room
    socket.emit('join-ticket', ticketId);
    
    // Toggle chat window
    chatToggle.addEventListener('click', function() {
        chatContainer.classList.toggle('minimized');
        this.textContent = chatContainer.classList.contains('minimized') ? '+' : '−';
    });
    
    // Image upload
    uploadImageBtn.addEventListener('click', function() {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB. Please choose a smaller file.');
                imageUpload.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                imagePreview.classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    });
    
    removePreview.addEventListener('click', function() {
        imagePreview.classList.remove('active');
        imageUpload.value = '';
    });
    
    // Send message
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    function sendMessage() {
        const text = chatInput.value.trim();
        const hasFile = imagePreview.classList.contains('active');
        
        if (!text && !hasFile) return;
        
        // Create FormData for text + file
        const formData = new FormData();
        formData.append('text', text);
        
        if (hasFile) {
            formData.append('file', imageUpload.files[0]);
        }
        
        // Show sending state
        chatSendBtn.disabled = true;
        
        // Send to server
        fetch(`/tickets/${ticketId}/respond`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear input
                chatInput.value = '';
                imagePreview.classList.remove('active');
                imageUpload.value = '';
                
                // Add message to UI (socket.io will handle it)
                console.log('Message sent successfully');
            } else {
                console.error('Error:', data.message);
                alert('Error sending message: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error sending message');
        })
        .finally(() => {
            chatSendBtn.disabled = false;
        });
    }
    
    // Listen for new messages
    socket.on('response-received', function(data) {
        console.log('Message received:', data); // Add this for debugging
        addMessageToUI(data);
    });
    
    function addMessageToUI(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${data.isAdmin ? 'message-admin' : 'message-user'}`;
        
        let messageHTML = `
            <div class="message-content">
                ${data.text}
        `;
        
        // Check if there's a file URL to display
        if (data.fileUrl) {
            // For images, create an img element
            if (data.fileType && data.fileType.startsWith('image/')) {
                messageHTML += `<img src="${data.fileUrl}" alt="Attached image" loading="lazy">`;
            } else {
                // For other file types, create a download link
                const fileName = data.fileUrl.split('/').pop();
                messageHTML += `<div class="file-attachment"><a href="${data.fileUrl}" target="_blank" download>${fileName}</a></div>`;
            }
        }
        
        messageHTML += `
            </div>
            <div class="message-meta">
                <span class="message-sender">${data.userName}</span>
                <span class="message-time">${new Date().toLocaleString()}</span>
            </div>
        `;
        
        messageDiv.innerHTML = messageHTML;
        
        // Remove no messages notice if it exists
        const noMessages = chatMessages.querySelector('.no-messages');
        if (noMessages) {
            noMessages.remove();
        }
        
        // Add to UI - at the top since display is flex column-reverse
        chatMessages.prepend(messageDiv);
        
        // Scroll to newest message if not minimized
        if (!chatContainer.classList.contains('minimized')) {
            chatMessages.scrollTop = 0;
        } else {
            // Show badge if chat is minimized
            const existingBadge = chatContainer.querySelector('.chat-badge');
            if (existingBadge) {
                const count = parseInt(existingBadge.textContent) + 1;
                existingBadge.textContent = count;
            } else {
                const badge = document.createElement('div');
                badge.className = 'chat-badge';
                badge.textContent = '1';
                chatContainer.appendChild(badge);
            }
        }
    }
    
    // Clear badge when opening the chat
    chatToggle.addEventListener('click', function() {
        if (!chatContainer.classList.contains('minimized')) {
            const badge = chatContainer.querySelector('.chat-badge');
            if (badge) {
                badge.remove();
            }
        }
    });
});