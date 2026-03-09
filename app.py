# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import secrets
from database import Database
from models import CandidateInfo
import logging
# Add these imports at the top
from functools import wraps
import hashlib
from datetime import datetime

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database tables on startup
try:
    Database.initialize_all_tables()
    logger.info("All database tables initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/verify-pin', methods=['POST'])
def verify_pin():
    """Verify the entered PIN against database"""
    try:
        data = request.get_json()
        entered_pin = data.get('pin', '')
        ip_address = request.remote_addr
        
        # Generate session ID for this attempt
        session_id = secrets.token_hex(16)
        
        # Verify PIN from database
        is_valid = Database.verify_pin(entered_pin)
        
        # Log the attempt with session_id
        Database.log_pin_attempt(entered_pin, is_valid, ip_address, session_id)
        
        if is_valid:
            session['pin_verified'] = True
            session['candidate_session'] = session_id
            return jsonify({
                'success': True,
                'message': 'PIN verified successfully!'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid PIN. Please try again.'
            })
            
    except Exception as e:
        logger.error(f"Error in verify_pin: {e}")
        return jsonify({
            'success': False,
            'message': 'Server error. Please try again.'
        }), 500

@app.route('/information-form')
def information_form():
    """Render the information form page"""
    if not session.get('pin_verified'):
        return redirect(url_for('index'))
    
    # Check if form already submitted
    candidate_session = session.get('candidate_session')
    if candidate_session:
        existing_data = Database.get_candidate_info(candidate_session)
        if existing_data and existing_data.get('form_completed'):
            # If form is completed, redirect to test page
            return redirect(url_for('test_page'))
        
        # Check if test has already started
        if Database.has_test_started(candidate_session):
            return redirect(url_for('test_page'))
    
    return render_template('information_form.html')


@app.route('/save-candidate-info', methods=['POST'])
def save_candidate_info():
    """Save candidate information"""
    if not session.get('pin_verified'):
        return jsonify({'success': False, 'message': 'Please verify PIN first'}), 403
    
    try:
        data = request.get_json()
        candidate_session = session.get('candidate_session')
        
        if not candidate_session:
            return jsonify({'success': False, 'message': 'Session expired'}), 400
        
        # Validate data
        candidate = CandidateInfo()
        if not candidate.validate(data):
            return jsonify({
                'success': False,
                'message': 'Validation failed',
                'errors': candidate.errors
            }), 400
        
        # Save to database
        form_data = {
            'full_name': data.get('full_name'),
            'contact_number': data.get('contact_number'),
            'alternate_contact': data.get('alternate_contact'),
            'email_id': data.get('email_id'),
            'address': data.get('address'),
            'work_experience': data.get('work_experience') == 'yes',
            'company_name': data.get('company_name'),
            'total_experience': data.get('total_experience'),
            'current_salary': data.get('current_salary'),
            'form_completed': True
        }
        
        if Database.save_candidate_info(candidate_session, form_data):
            session['form_completed'] = True
            session['test_started'] = True  # Mark test as started in session
            return jsonify({
                'success': True,
                'message': 'Information saved successfully!',
                'redirect': url_for('test_page')
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to save information'
            }), 500
            
    except Exception as e:
        logger.error(f"Error saving candidate info: {e}")
        return jsonify({
            'success': False,
            'message': 'Server error'
        }), 500

@app.route('/test-page')
def test_page():
    """Render the actual test page"""
    if not session.get('pin_verified') or not session.get('form_completed'):
        return redirect(url_for('index'))
    
    candidate_session = session.get('candidate_session')
    
    # Check if test has already started/completed
    test_status = Database.get_test_status(candidate_session)
    
    if test_status.get('test_completed'):
        # If test is completed, show completion message
        return render_template('test_completed.html', score=test_status.get('score'))
    
    # Mark test as started in database if not already
    if not test_status.get('test_started'):
        Database.mark_test_started(candidate_session)
        session['test_started'] = True
    
    return render_template('test_page.html')


@app.route('/start-test', methods=['POST'])
def start_test():
    """Start the test (redirect to information form)"""
    if session.get('pin_verified'):
        return jsonify({
            'success': True,
            'message': 'Redirecting to information form...',
            'redirect': url_for('information_form')
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Please verify PIN first'
        }), 403

@app.route('/check-database-status')
def check_database_status():
    """Check if database connection is working"""
    if Database.check_database_connection():
        return jsonify({'status': 'connected', 'message': 'Database connection successful'})
    else:
        return jsonify({'status': 'disconnected', 'message': 'Database connection failed'}), 500

@app.route('/logout')
def logout():
    """Clear the session"""
    session.clear()
    return jsonify({'success': True})




# Admin login required decorator
def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Admin routes
@app.route('/admin')
def admin_redirect():
    """Redirect to admin login"""
    return redirect(url_for('admin_login'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'GET':
        return render_template('admin_login.html')
    
    # POST request - handle login
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Verify admin from database
        admin = Database.verify_admin(username, password)
        
        if admin:
            session['admin_logged_in'] = True
            session['admin_id'] = admin['id']
            session['admin_name'] = admin['full_name']
            session['admin_username'] = admin['username']
            
            # Log login
            Database.update_admin_login(
                admin['id'], 
                request.remote_addr,
                request.user_agent.string
            )
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'redirect': '/admin/dashboard'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
            
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return jsonify({
            'success': False,
            'message': 'Server error'
        }), 500

@app.route('/admin/dashboard')
@admin_login_required
def admin_dashboard():
    """Admin dashboard"""
    # Get all candidates with status
    candidates = Database.get_all_candidates_with_status()
    
    # Get statistics
    stats = Database.get_admin_stats()
    
    return render_template('admin_dashboard.html', 
                         candidates=candidates, 
                         stats=stats,
                         now=datetime.now())

@app.route('/admin/api/candidates')
@admin_login_required
def admin_api_candidates():
    """API endpoint to get candidates data"""
    candidates = Database.get_all_candidates_with_status()
    return jsonify({
        'success': True,
        'candidates': candidates
    })

@app.route('/admin/candidate/<session_id>')
@admin_login_required
def admin_candidate_details(session_id):
    """Get candidate details"""
    candidate = Database.get_candidate_details(session_id)
    if candidate:
        return jsonify({
            'success': True,
            'candidate': candidate
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Candidate not found'
        }), 404

@app.route('/admin/update-pin', methods=['POST'])
@admin_login_required
def admin_update_pin():
    """Update application PIN"""
    try:
        data = request.get_json()
        new_pin = data.get('new_pin')
        
        if not new_pin or len(new_pin) != 6:
            return jsonify({
                'success': False,
                'message': 'PIN must be 6 digits'
            }), 400
        
        # Update PIN in database
        connection = Database.get_connection()
        if connection:
            cursor = connection.cursor()
            update_query = """
            UPDATE authentication 
            SET authentication_password = %s, datetime = %s
            WHERE authentication_name = 'Application_pin'
            """
            cursor.execute(update_query, (new_pin, datetime.now()))
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({
                'success': True,
                'message': 'PIN updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Database error'
            }), 500
            
    except Exception as e:
        logger.error(f"Error updating PIN: {e}")
        return jsonify({
            'success': False,
            'message': 'Server error'
        }), 500

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_logged_in', None)
    session.pop('admin_id', None)
    session.pop('admin_name', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/test-data')
@admin_login_required
def test_data():
    """Test route to check database data"""
    connection = Database.get_connection()
    data = {}
    
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Check pin_attempts
        cursor.execute("SELECT COUNT(*) as count FROM pin_attempts")
        data['pin_attempts'] = cursor.fetchone()
        
        # Check candidate_info
        cursor.execute("SELECT COUNT(*) as count FROM candidate_info")
        data['candidate_info'] = cursor.fetchone()
        
        # Check test_results
        cursor.execute("SELECT COUNT(*) as count FROM test_results")
        data['test_results'] = cursor.fetchone()
        
        cursor.close()
        connection.close()
    
    return jsonify(data)


@app.route('/submit-test', methods=['POST'])
def submit_test():
    """Submit test answers"""
    if not session.get('pin_verified') or not session.get('form_completed'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        candidate_session = session.get('candidate_session')
        answers = data.get('answers', [])
        
        # Calculate score (implement your scoring logic)
        score = calculate_score(answers)  # You need to implement this function
        
        # Save test results
        if Database.save_test_results(candidate_session, answers, score):
            session['test_completed'] = True
            return jsonify({
                'success': True,
                'message': 'Test submitted successfully',
                'score': score
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to submit test'
            }), 500
            
    except Exception as e:
        logger.error(f"Error submitting test: {e}")
        return jsonify({
            'success': False,
            'message': 'Server error'
        }), 500

def calculate_score(answers):
    """Calculate test score - implement your logic here"""
    # This is a placeholder - implement your actual scoring logic
    total_questions = len(answers)
    correct_answers = sum(1 for answer in answers if answer.get('correct', False))
    return (correct_answers / total_questions) * 100 if total_questions > 0 else 0


if __name__ == '__main__':
    app.run(debug=True)