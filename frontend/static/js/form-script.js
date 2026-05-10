// form-script.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Form JavaScript loaded!');
    
    // Get form elements
    const form = document.getElementById('candidate-form');
    const workExperienceRadios = document.querySelectorAll('input[name="work_experience"]');
    const experienceFields = document.getElementById('experience-fields');
    const submitBtn = document.getElementById('submit-form');
    const saveDraftBtn = document.getElementById('save-draft');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    // Form fields
    const fields = {
        full_name: document.getElementById('full_name'),
        contact_number: document.getElementById('contact_number'),
        alternate_contact: document.getElementById('alternate_contact'),
        email_id: document.getElementById('email_id'),
        address: document.getElementById('address'),
        company_name: document.getElementById('company_name'),
        total_experience: document.getElementById('total_experience'),
        current_salary: document.getElementById('current_salary')
    };

    // Show/hide experience fields based on radio selection
    workExperienceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                experienceFields.style.display = 'block';
                // Add animation
                experienceFields.style.animation = 'slideIn 0.3s ease-out';
            } else {
                experienceFields.style.display = 'none';
                // Clear experience fields
                fields.company_name.value = '';
                fields.total_experience.value = '';
                fields.current_salary.value = '';
            }
            validateForm();
        });
    });

    // Real-time validation
    Object.keys(fields).forEach(key => {
        if (fields[key]) {
            fields[key].addEventListener('input', function() {
                validateField(key);
                validateForm();
            });
            
            fields[key].addEventListener('blur', function() {
                validateField(key);
            });
        }
    });

    // Phone number validation (only numbers)
    fields.contact_number.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });

    if (fields.alternate_contact) {
        fields.alternate_contact.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }

    // Validate individual field
    function validateField(fieldName) {
        const field = fields[fieldName];
        if (!field) return true;
        
        const errorElement = document.getElementById(`${fieldName}_error`);
        let isValid = true;
        let errorMessage = '';

        switch(fieldName) {
            case 'full_name':
                if (!field.value.trim()) {
                    errorMessage = 'Full name is required';
                    isValid = false;
                } else if (field.value.trim().length < 3) {
                    errorMessage = 'Name must be at least 3 characters';
                    isValid = false;
                }
                break;

            case 'contact_number':
                if (!field.value) {
                    errorMessage = 'Contact number is required';
                    isValid = false;
                } else if (!/^\d{10}$/.test(field.value)) {
                    errorMessage = 'Please enter a valid 10-digit number';
                    isValid = false;
                }
                break;

            case 'alternate_contact':
                if (field.value && !/^\d{10}$/.test(field.value)) {
                    errorMessage = 'Please enter a valid 10-digit number';
                    isValid = false;
                }
                break;

            case 'email_id':
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!field.value) {
                    errorMessage = 'Email is required';
                    isValid = false;
                } else if (!emailPattern.test(field.value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                }
                break;

            case 'address':
                if (!field.value.trim()) {
                    errorMessage = 'Address is required';
                    isValid = false;
                }
                break;

            case 'company_name':
                if (document.querySelector('input[name="work_experience"]:checked').value === 'yes') {
                    if (!field.value.trim()) {
                        errorMessage = 'Company name is required';
                        isValid = false;
                    }
                }
                break;

            case 'total_experience':
                if (document.querySelector('input[name="work_experience"]:checked').value === 'yes') {
                    if (!field.value) {
                        errorMessage = 'Total experience is required';
                        isValid = false;
                    } else if (parseFloat(field.value) < 0) {
                        errorMessage = 'Experience cannot be negative';
                        isValid = false;
                    }
                }
                break;

            case 'current_salary':
                if (document.querySelector('input[name="work_experience"]:checked').value === 'yes') {
                    if (!field.value) {
                        errorMessage = 'Current salary is required';
                        isValid = false;
                    } else if (parseFloat(field.value) < 0) {
                        errorMessage = 'Salary cannot be negative';
                        isValid = false;
                    }
                }
                break;
        }

        // Update UI
        if (errorElement) {
            errorElement.textContent = errorMessage;
        }
        
        field.classList.toggle('error', !isValid && errorMessage);
        
        return isValid;
    }

    // Validate entire form
    function validateForm() {
        let isValid = true;
        
        // Check all required fields
        isValid = validateField('full_name') && isValid;
        isValid = validateField('contact_number') && isValid;
        isValid = validateField('email_id') && isValid;
        isValid = validateField('address') && isValid;
        
        // Check experience fields if work experience is yes
        if (document.querySelector('input[name="work_experience"]:checked').value === 'yes') {
            isValid = validateField('company_name') && isValid;
            isValid = validateField('total_experience') && isValid;
            isValid = validateField('current_salary') && isValid;
        }
        
        submitBtn.disabled = !isValid;
        return isValid;
    }

    // Show toast message
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Submit form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        // Collect form data
        const formData = {
            full_name: fields.full_name.value.trim(),
            contact_number: fields.contact_number.value,
            alternate_contact: fields.alternate_contact ? fields.alternate_contact.value : '',
            email_id: fields.email_id.value.trim(),
            address: fields.address.value.trim(),
            work_experience: document.querySelector('input[name="work_experience"]:checked').value,
            company_name: fields.company_name ? fields.company_name.value.trim() : '',
            total_experience: fields.total_experience ? fields.total_experience.value : '',
            current_salary: fields.current_salary ? fields.current_salary.value : ''
        };

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const response = await fetch('/save-candidate-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showToast('Information saved successfully!', 'success');
                
                // Redirect to test page after short delay
                setTimeout(() => {
                    window.location.href = data.redirect || '/test-page';
                }, 1500);
            } else {
                showToast(data.message || 'Error saving information', 'error');
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Test';
                
                // Display field errors if any
                if (data.errors) {
                    Object.keys(data.errors).forEach(key => {
                        const errorElement = document.getElementById(`${key}_error`);
                        if (errorElement) {
                            errorElement.textContent = data.errors[key];
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Network error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Test';
        }
    });

    // Save draft functionality
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            // Collect form data
            const formData = {
                full_name: fields.full_name.value.trim(),
                contact_number: fields.contact_number.value,
                alternate_contact: fields.alternate_contact ? fields.alternate_contact.value : '',
                email_id: fields.email_id.value.trim(),
                address: fields.address.value.trim(),
                work_experience: document.querySelector('input[name="work_experience"]:checked').value,
                company_name: fields.company_name ? fields.company_name.value.trim() : '',
                total_experience: fields.total_experience ? fields.total_experience.value : '',
                current_salary: fields.current_salary ? fields.current_salary.value : '',
                form_completed: false
            };

            // Save to localStorage
            localStorage.setItem('candidate_draft', JSON.stringify(formData));
            showToast('Draft saved successfully!', 'success');
        });

        // Load draft from localStorage
        const savedDraft = localStorage.getItem('candidate_draft');
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            
            // Populate form fields
            Object.keys(draftData).forEach(key => {
                if (fields[key]) {
                    fields[key].value = draftData[key];
                }
            });
            
            // Set radio button
            if (draftData.work_experience) {
                document.querySelector(`input[name="work_experience"][value="${draftData.work_experience}"]`).checked = true;
                if (draftData.work_experience === 'yes') {
                    experienceFields.style.display = 'block';
                }
            }
            
            validateForm();
            showToast('Draft loaded successfully!', 'success');
        }
    }

    // Initial validation
    validateForm();
});