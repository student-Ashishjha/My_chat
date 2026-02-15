// ==================== UTILITY FUNCTIONS ====================

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            ${type === 'success' 
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
            }
        </svg>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format time
function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ==================== AUTHENTICATION ====================

// Register function
async function register() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;
    
    // Validation
    if (!username || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (username.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch("http://127.0.0.1:8000/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password})
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
        } else {
            showToast(data.detail || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

// Login function
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    
    if (!username || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password})
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", username);
            showToast('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = "chat.html";
            }, 800);
        } else {
            showToast(data.detail || 'Invalid credentials', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
    }
}

// ==================== CHAT FUNCTIONS ====================

// Check authentication on chat page
if (window.location.pathname.includes('chat.html')) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
    }
}

// State
let isTyping = false;
let messageHistory = [];
const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

// Remove empty state
function removeEmptyState() {
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
}

// Show typing indicator
function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;
    
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;
    
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.id = "typingIndicator";
    typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
        indicator.remove();
    }
}

// Add message to chat
function addMessage(text, sender) {
    removeEmptyState();
    
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;
    
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    
    const time = formatTime();
    messageDiv.innerHTML = `
        ${text}
        <span class="message-time">${time}</span>
    `;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Save to history
    messageHistory.push({ text, sender, time });
}

// Send message
async function send() {
    const input = document.getElementById("msg");
    const sendBtn = document.getElementById("sendBtn");
    
    if (!input || !sendBtn) return;
    
    const message = input.value.trim();
    
    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    // Disable input while sending
    input.disabled = true;
    sendBtn.disabled = true;
    
    // Add user message
    addMessage(message, "user");
    input.value = "";
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const response = await fetch("http://127.0.0.1:8000/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message, token})
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
                return;
            }
            throw new Error('Request failed');
        }
        
        const data = await response.json();
        
        // Hide typing and add bot response
        hideTypingIndicator();
        addMessage(data.reply, "bot");
        
    } catch (error) {
        hideTypingIndicator();
        showToast('Failed to send message. Please try again.', 'error');
        console.error('Error:', error);
    } finally {
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

// Clear chat
async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
        return;
    }
    
    try {
        await fetch("http://127.0.0.1:8000/clear", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({token})
        });
        
        const chatBox = document.getElementById("chatBox");
        if (chatBox) {
            chatBox.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h3>Start a conversation</h3>
                    <p>Ask me anything!</p>
                </div>
            `;
        }
        
        messageHistory = [];
        showToast('Chat cleared successfully', 'success');
        
    } catch (error) {
        showToast('Failed to clear chat', 'error');
        console.error('Error:', error);
    }
}

// Export chat
function exportChat() {
    if (messageHistory.length === 0) {
        showToast('No messages to export', 'error');
        return;
    }
    
    let chatText = `Chat Export - ${new Date().toLocaleString()}\n`;
    chatText += `User: ${username}\n`;
    chatText += `${'='.repeat(50)}\n\n`;
    
    messageHistory.forEach(msg => {
        const sender = msg.sender === 'user' ? 'You' : 'AI';
        chatText += `[${msg.time}] ${sender}: ${msg.text}\n\n`;
    });
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Chat exported successfully', 'success');
}

// Add emoji
function addEmoji() {
    const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🤔', '😎', '🔥', '💡', '✨', '👋', '🙌'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const input = document.getElementById("msg");
    if (input) {
        input.value += randomEmoji;
        input.focus();
    }
}

// ==================== EVENT LISTENERS ====================

// Enter key support
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // Check which page we're on
        if (window.location.pathname.includes('register.html')) {
            register();
        } else if (window.location.pathname.includes('login.html')) {
            login();
        } else if (window.location.pathname.includes('chat.html')) {
            send();
        }
    }
});

// Initialize chat page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('chat.html')) {
        const input = document.getElementById("msg");
        if (input) {
            input.focus();
            
            // Welcome message
            setTimeout(() => {
                if (messageHistory.length === 0) {
                    removeEmptyState();
                    addMessage(`Hello ${username}! How can I help you today?`, 'bot');
                }
            }, 500);
        }
    }
});