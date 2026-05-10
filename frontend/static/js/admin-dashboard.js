// admin-dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    initializeCharts();
    
    // Load initial data
    loadCandidates();
    
    // Setup event listeners
    setupEventListeners();
});

// Section navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

// Initialize charts
function initializeCharts() {
    // Progress Distribution Chart
    const progressCtx = document.getElementById('progressChart')?.getContext('2d');
    if (progressCtx) {
        new Chart(progressCtx, {
            type: 'doughnut',
            data: {
                labels: ['PIN Only', 'Form Started', 'Form Completed', 'Test Completed'],
                datasets: [{
                    data: [12, 19, 8, 5],
                    backgroundColor: [
                        '#6c757d',
                        '#ffc107',
                        '#28a745',
                        '#17a2b8'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Activity Chart
    const activityCtx = document.getElementById('activityChart')?.getContext('2d');
    if (activityCtx) {
        new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                datasets: [{
                    label: 'PIN Verifications',
                    data: [5, 8, 12, 7, 15, 10, 20],
                    borderColor: '#667eea',
                    tension: 0.4
                }, {
                    label: 'Form Submissions',
                    data: [3, 5, 8, 4, 10, 7, 12],
                    borderColor: '#28a745',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    // Completion Chart
    const completionCtx = document.getElementById('completionChart')?.getContext('2d');
    if (completionCtx) {
        new Chart(completionCtx, {
            type: 'bar',
            data: {
                labels: ['PIN → Form', 'Form → Test'],
                datasets: [{
                    label: 'Conversion Rate (%)',
                    data: [75, 60],
                    backgroundColor: ['#667eea', '#28a745']
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    // Score Distribution Chart
    const scoreCtx = document.getElementById('scoreChart')?.getContext('2d');
    if (scoreCtx) {
        new Chart(scoreCtx, {
            type: 'pie',
            data: {
                labels: ['0-25%', '26-50%', '51-75%', '76-100%'],
                datasets: [{
                    data: [2, 5, 8, 3],
                    backgroundColor: [
                        '#dc3545',
                        '#ffc107',
                        '#17a2b8',
                        '#28a745'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

// Filter candidates
function filterCandidates() {
    const status = document.getElementById('status-filter').value;
    const date = document.getElementById('date-filter').value;
    const search = document.getElementById('search-candidates').value.toLowerCase();
    
    const rows = document.querySelectorAll('#candidates-table-body tr');
    
    rows.forEach(row => {
        let show = true;
        
        // Status filter
        if (status !== 'all') {
            const statusBadge = row.querySelector('.status-badge');
            if (!statusBadge || !statusBadge.textContent.includes(status)) {
                show = false;
            }
        }
        
        // Search filter
        if (search) {
            const name = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const email = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase() || '';
            if (!name.includes(search) && !email.includes(search)) {
                show = false;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// View candidate details
async function viewCandidate(sessionId) {
    try {
        const response = await fetch(`/admin/candidate/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
            showCandidateModal(data.candidate);
        } else {
            showToast('Error loading candidate details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Network error', 'error');
    }
}

// Show candidate modal
function showCandidateModal(candidate) {
    const modal = document.getElementById('candidate-modal');
    const modalBody = document.getElementById('candidate-details');
    
    let html = `
        <div class="candidate-detail-card">
            <h4>Personal Information</h4>
            <p><strong>Name:</strong> ${candidate.full_name || 'N/A'}</p>
            <p><strong>Contact:</strong> ${candidate.contact_number || 'N/A'}</p>
            <p><strong>Alternate:</strong> ${candidate.alternate_contact || 'N/A'}</p>
            <p><strong>Email:</strong> ${candidate.email_id || 'N/A'}</p>
            <p><strong>Address:</strong> ${candidate.address || 'N/A'}</p>
        </div>
    `;
    
    if (candidate.work_experience) {
        html += `
            <div class="candidate-detail-card">
                <h4>Work Experience</h4>
                <p><strong>Company:</strong> ${candidate.company_name || 'N/A'}</p>
                <p><strong>Experience:</strong> ${candidate.total_experience_years || 'N/A'} years</p>
                <p><strong>Current Salary:</strong> ₹${candidate.current_salary || 'N/A'}</p>
            </div>
        `;
    }
    
    html += `
        <div class="candidate-detail-card">
            <h4>Activity Timeline</h4>
            <p><strong>PIN Verified:</strong> ${new Date(candidate.pin_verified_time).toLocaleString()}</p>
            <p><strong>Form Completed:</strong> ${candidate.form_completed ? 'Yes' : 'No'}</p>
            <p><strong>Test Started:</strong> ${candidate.test_start_time ? new Date(candidate.test_start_time).toLocaleString() : 'Not started'}</p>
            <p><strong>Test Score:</strong> ${candidate.score || 'N/A'}</p>
        </div>
    `;
    
    modalBody.innerHTML = html;
    modal.classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('candidate-modal').classList.remove('show');
}

// Export to CSV
function exportToCSV() {
    const rows = [];
    const headers = ['Name', 'Contact', 'Email', 'Status', 'PIN Verified', 'Form Completed'];
    
    // Get all visible rows
    document.querySelectorAll('#candidates-table-body tr:visible').forEach(row => {
        const rowData = [
            row.querySelector('td:nth-child(2)')?.textContent.trim() || '',
            row.querySelector('td:nth-child(3)')?.textContent.trim() || '',
            row.querySelector('td:nth-child(4)')?.textContent.trim() || '',
            row.querySelector('.status-badge')?.textContent.trim() || '',
            row.querySelector('td:nth-child(6)')?.textContent.trim() || '',
            row.querySelector('td:nth-child(7) i')?.classList.contains('fa-check-circle') ? 'Yes' : 'No'
        ];
        rows.push(rowData.join(','));
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-candidates');
    if (searchInput) {
        searchInput.addEventListener('input', filterCandidates);
    }
    
    // Settings forms
    const pinSettingsForm = document.getElementById('pin-settings-form');
    if (pinSettingsForm) {
        pinSettingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPin = document.getElementById('new-pin').value;
            const confirmPin = document.getElementById('confirm-pin').value;
            
            if (newPin !== confirmPin) {
                showToast('PINs do not match', 'error');
                return;
            }
            
            if (newPin.length !== 6) {
                showToast('PIN must be 6 digits', 'error');
                return;
            }
            
            // Send to server
            try {
                const response = await fetch('/admin/update-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_pin: newPin })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('PIN updated successfully', 'success');
                    document.getElementById('new-pin').value = '';
                    document.getElementById('confirm-pin').value = '';
                } else {
                    showToast(data.message || 'Error updating PIN', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Network error', 'error');
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('candidate-modal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load candidates (refresh data)
async function loadCandidates() {
    try {
        const response = await fetch('/admin/api/candidates');
        const data = await response.json();
        
        if (data.success) {
            updateCandidatesTable(data.candidates);
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
    }
}

// Update candidates table
function updateCandidatesTable(candidates) {
    const tbody = document.getElementById('candidates-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = candidates.map((candidate, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div class="candidate-name">
                    <strong>${candidate.full_name || 'N/A'}</strong>
                </div>
            </td>
            <td>${candidate.contact_number || 'N/A'}</td>
            <td>${candidate.email_id || 'N/A'}</td>
            <td>
                <span class="status-badge status-${candidate.current_status?.toLowerCase().replace(' ', '-') || 'unknown'}">
                    ${candidate.current_status || 'Unknown'}
                </span>
            </td>
            <td>${candidate.pin_verified_time ? new Date(candidate.pin_verified_time).toLocaleDateString() : 'N/A'}</td>
            <td>
                ${candidate.form_completed ? 
                    '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : 
                    '<i class="fas fa-times-circle" style="color: #dc3545;"></i>'}
            </td>
            <td>
                <button class="action-btn view-btn" onclick="viewCandidate('${candidate.session_id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" onclick="editCandidate('${candidate.session_id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Add admin function
function addAdmin() {
    // Implement add admin functionality
    showToast('Add admin feature coming soon', 'info');
}