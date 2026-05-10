// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ JavaScript loaded successfully!');
    
    // Get all elements
    const pinInput = document.getElementById('pin-input');
    const clearBtn = document.getElementById('clear-pin');
    const numberButtons = document.querySelectorAll('.pin-btn[data-value]');
    const backspaceBtn = document.querySelector('.pin-btn.backspace');
    const verifyBtn = document.getElementById('verify-pin');
    const startTestBtn = document.getElementById('start-test');
    const statusMessage = document.getElementById('status-message');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    // State
    let pinVerified = false;

    // Function to show toast message
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Number buttons
    numberButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = this.dataset.value;
            if (value && pinInput.value.length < 6) {
                pinInput.value += value;
                pinInput.classList.add('pulse');
                setTimeout(() => pinInput.classList.remove('pulse'), 300);
            }
        });
    });

    // Backspace button
    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', function() {
            pinInput.value = pinInput.value.slice(0, -1);
            pinInput.classList.add('pulse');
            setTimeout(() => pinInput.classList.remove('pulse'), 300);
        });
    }

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            pinInput.value = '';
            pinInput.classList.add('pulse');
            setTimeout(() => pinInput.classList.remove('pulse'), 300);
        });
    }

    // Verify button
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const pin = pinInput.value;
            
            if (pin.length !== 6) {
                showToast('Please enter a 6-digit PIN', 'error');
                return;
            }
            
            // Disable verify button during processing
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            
            // Send to server
            fetch('/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    pinVerified = true;
                    startTestBtn.disabled = false;
                    startTestBtn.classList.add('enabled');
                    showToast('✅ PIN verified successfully!', 'success');
                    statusMessage.className = 'status-message success';
                    statusMessage.innerHTML = 'PIN verified successfully!';
                    
                    // Optional: Auto-clear PIN after success
                    setTimeout(() => {
                        pinInput.value = '';
                    }, 1000);
                } else {
                    showToast('❌ Wrong PIN!', 'error');
                    statusMessage.className = 'status-message error';
                    statusMessage.innerHTML = 'Invalid PIN. Please try again.';
                    pinInput.classList.add('shake');
                    setTimeout(() => pinInput.classList.remove('shake'), 500);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error connecting to server', 'error');
            })
            .finally(() => {
                // Re-enable verify button
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify PIN';
            });
        });
    }

    // Start test button
    // In script.js, update the start test button click handler
if (startTestBtn) {
    startTestBtn.addEventListener('click', function() {
        if (!pinVerified) {
            showToast('Please verify PIN first', 'error');
            return;
        }
        
        startTestBtn.disabled = true;
        startTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        fetch('/start-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Redirecting to information form...', 'success');
                // Redirect to information form
                setTimeout(() => {
                    window.location.href = data.redirect || '/information-form';
                }, 1000);
            } else {
                showToast(data.message || 'Error starting test', 'error');
                startTestBtn.disabled = false;
                startTestBtn.innerHTML = '<i class="fas fa-play"></i> Test Start';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error connecting to server', 'error');
            startTestBtn.disabled = false;
            startTestBtn.innerHTML = '<i class="fas fa-play"></i> Test Start';
        });
    });
}

    // Optional: Allow Enter key to submit PIN
    pinInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyBtn.click();
        }
    });
});