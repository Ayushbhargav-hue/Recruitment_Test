# models.py
import re
from datetime import datetime

class CandidateInfo:
    """Candidate information model with validation"""
    
    def __init__(self, session_id=None):
        self.session_id = session_id
        self.full_name = None
        self.contact_number = None
        self.alternate_contact = None
        self.email_id = None
        self.address = None
        self.work_experience = False
        self.company_name = None
        self.total_experience = None
        self.current_salary = None
        self.form_completed = False
        self.errors = {}
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number"""
        if not phone:
            return False
        # Basic phone validation - adjust pattern as needed
        pattern = r'^[0-9]{10}$'
        return bool(re.match(pattern, phone))
    
    @staticmethod
    def validate_email(email):
        """Validate email address"""
        if not email:
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def validate(self, data):
        """Validate all form data"""
        self.errors = {}
        
        # Required fields validation
        required_fields = {
            'full_name': 'Full Name',
            'contact_number': 'Contact Number',
            'email_id': 'Email ID',
            'address': 'Address'
        }
        
        for field, label in required_fields.items():
            if not data.get(field):
                self.errors[field] = f"{label} is required"
        
        # Email validation
        if data.get('email_id') and not self.validate_email(data['email_id']):
            self.errors['email_id'] = "Invalid email format"
        
        # Phone validation
        if data.get('contact_number') and not self.validate_phone(data['contact_number']):
            self.errors['contact_number'] = "Phone number must be 10 digits"
        
        if data.get('alternate_contact') and not self.validate_phone(data['alternate_contact']):
            self.errors['alternate_contact'] = "Alternate phone must be 10 digits"
        
        # Work experience validation
        work_exp = data.get('work_experience') == 'yes'
        if work_exp:
            if not data.get('company_name'):
                self.errors['company_name'] = "Company name is required if you have work experience"
            if not data.get('total_experience'):
                self.errors['total_experience'] = "Total experience is required"
            if not data.get('current_salary'):
                self.errors['current_salary'] = "Current salary is required"
        
        return len(self.errors) == 0
    
    def to_dict(self):
        """Convert object to dictionary"""
        return {
            'full_name': self.full_name,
            'contact_number': self.contact_number,
            'alternate_contact': self.alternate_contact,
            'email_id': self.email_id,
            'address': self.address,
            'work_experience': self.work_experience,
            'company_name': self.company_name,
            'total_experience': self.total_experience,
            'current_salary': self.current_salary,
            'form_completed': self.form_completed
        }
    
    def from_dict(self, data):
        """Populate object from dictionary"""
        self.full_name = data.get('full_name')
        self.contact_number = data.get('contact_number')
        self.alternate_contact = data.get('alternate_contact')
        self.email_id = data.get('email_id')
        self.address = data.get('address')
        self.work_experience = data.get('work_experience') == 'yes'
        self.company_name = data.get('company_name') if self.work_experience else None
        self.total_experience = float(data.get('total_experience')) if data.get('total_experience') else None
        self.current_salary = float(data.get('current_salary')) if data.get('current_salary') else None
        self.form_completed = data.get('form_completed', False)
        return self