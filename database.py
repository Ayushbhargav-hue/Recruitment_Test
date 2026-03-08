import mysql.connector
from mysql.connector import Error
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MySQL Database Configuration
db_config = {
    'host': 'localhost',
    'database': 'recruitment_test',
    'user': 'root',  # Replace with your MySQL username
    'password': 'abcd1234'  # Replace with your MySQL password
}

class Database:
    """Database connection and operations class"""
    
    @staticmethod
    def get_connection():
        """Create and return a database connection"""
        try:
            connection = mysql.connector.connect(**db_config)
            return connection
        except Error as e:
            logger.error(f"Error connecting to MySQL: {e}")
            return None

    @staticmethod
    def create_tables():
        """Create all necessary tables if they don't exist"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # Create authentication table if not exists
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS authentication (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    datetime DATETIME,
                    authentication_name VARCHAR(100),
                    authentication_password VARCHAR(100)
                )
                """)
                
                # Create pin_attempts table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS pin_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    datetime DATETIME,
                    entered_pin VARCHAR(100),
                    success BOOLEAN,
                    ip_address VARCHAR(50)
                )
                """)
                
                # Create candidate_info table for form data
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_info (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100),
                    full_name VARCHAR(200) NOT NULL,
                    contact_number VARCHAR(20) NOT NULL,
                    alternate_contact VARCHAR(20),
                    email_id VARCHAR(200) NOT NULL,
                    address TEXT NOT NULL,
                    work_experience BOOLEAN DEFAULT FALSE,
                    company_name VARCHAR(200),
                    total_experience_years DECIMAL(5,2),
                    current_salary DECIMAL(10,2),
                    created_at DATETIME,
                    updated_at DATETIME,
                    form_completed BOOLEAN DEFAULT FALSE,
                    INDEX idx_session (session_id)
                )
                """)
                
                connection.commit()
                logger.info("All tables created successfully")
                
        except Error as e:
            logger.error(f"Error creating tables: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def verify_pin(entered_pin):
        """Verify PIN from database"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                query = """
                SELECT authentication_password 
                FROM authentication 
                WHERE authentication_name = 'Application_pin'
                """
                
                cursor.execute(query)
                result = cursor.fetchone()
                
                if result:
                    stored_pin = result['authentication_password']
                    return entered_pin == stored_pin
                else:
                    logger.warning("No PIN record found in database")
                    return False
                    
        except Error as e:
            logger.error(f"Database error in verify_pin: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()
        return False

    @staticmethod
    def save_candidate_info(session_id, form_data):
        """Save candidate information to database"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # Check if record exists for this session
                check_query = "SELECT id FROM candidate_info WHERE session_id = %s"
                cursor.execute(check_query, (session_id,))
                existing = cursor.fetchone()
                
                current_time = datetime.now()
                
                if existing:
                    # Update existing record
                    update_query = """
                    UPDATE candidate_info SET
                        full_name = %s,
                        contact_number = %s,
                        alternate_contact = %s,
                        email_id = %s,
                        address = %s,
                        work_experience = %s,
                        company_name = %s,
                        total_experience_years = %s,
                        current_salary = %s,
                        updated_at = %s,
                        form_completed = %s
                    WHERE session_id = %s
                    """
                    
                    cursor.execute(update_query, (
                        form_data['full_name'],
                        form_data['contact_number'],
                        form_data.get('alternate_contact'),
                        form_data['email_id'],
                        form_data['address'],
                        form_data['work_experience'],
                        form_data.get('company_name'),
                        form_data.get('total_experience'),
                        form_data.get('current_salary'),
                        current_time,
                        form_data.get('form_completed', True),
                        session_id
                    ))
                else:
                    # Insert new record
                    insert_query = """
                    INSERT INTO candidate_info (
                        session_id, full_name, contact_number, alternate_contact,
                        email_id, address, work_experience, company_name,
                        total_experience_years, current_salary, created_at, 
                        updated_at, form_completed
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    cursor.execute(insert_query, (
                        session_id,
                        form_data['full_name'],
                        form_data['contact_number'],
                        form_data.get('alternate_contact'),
                        form_data['email_id'],
                        form_data['address'],
                        form_data['work_experience'],
                        form_data.get('company_name'),
                        form_data.get('total_experience'),
                        form_data.get('current_salary'),
                        current_time,
                        current_time,
                        form_data.get('form_completed', True)
                    ))
                
                connection.commit()
                logger.info(f"Candidate info saved for session: {session_id}")
                return True
                
        except Error as e:
            logger.error(f"Error saving candidate info: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def get_candidate_info(session_id):
        """Retrieve candidate information by session ID"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                query = "SELECT * FROM candidate_info WHERE session_id = %s"
                cursor.execute(query, (session_id,))
                result = cursor.fetchone()
                
                return result
                
        except Error as e:
            logger.error(f"Error retrieving candidate info: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def check_database_connection():
        """Check if database connection is working"""
        connection = Database.get_connection()
        if connection and connection.is_connected():
            connection.close()
            return True
        return False

    @staticmethod
    def create_admin_tables():
        """Create admin-related tables if they don't exist"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # Create admin users table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(200),
                    email VARCHAR(200),
                    role VARCHAR(50) DEFAULT 'admin',
                    created_at DATETIME,
                    updated_at DATETIME,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT TRUE
                )
                """)
                
                # Create admin login history table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_login_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    admin_id INT,
                    login_time DATETIME,
                    logout_time DATETIME,
                    ip_address VARCHAR(50),
                    user_agent TEXT,
                    FOREIGN KEY (admin_id) REFERENCES admin_users(id)
                )
                """)
                
                # Check if default admin exists, if not create one
                cursor.execute("SELECT * FROM admin_users WHERE username = 'ayush bhargav'")
                if not cursor.fetchone():
                    # Using proper password hashing
                    import hashlib
                    hashed_password = hashlib.sha256('ayush'.encode()).hexdigest()
                    
                    insert_query = """
                    INSERT INTO admin_users (username, password, full_name, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    """
                    current_time = datetime.now()
                    cursor.execute(insert_query, ('ayush bhargav', hashed_password, 'Ayush Bhargav', current_time, current_time))
                
                connection.commit()
                logger.info("Admin tables created successfully")
                
        except Error as e:
            logger.error(f"Error creating admin tables: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def verify_admin(username, password):
        """Verify admin credentials"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                # Using direct password comparison since we have plain text in DB
                # In production, you should use hashed passwords
                query = """
                SELECT * FROM admin_users 
                WHERE username = %s AND password = %s AND is_active = TRUE
                """
                cursor.execute(query, (username, password))
                admin = cursor.fetchone()
                
                return admin
                
        except Error as e:
            logger.error(f"Error verifying admin: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def update_admin_login(admin_id, ip_address, user_agent):
        """Update admin login history"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # Update last login
                update_query = "UPDATE admin_users SET last_login = %s WHERE id = %s"
                cursor.execute(update_query, (datetime.now(), admin_id))
                
                # Insert login history
                insert_query = """
                INSERT INTO admin_login_history (admin_id, login_time, ip_address, user_agent)
                VALUES (%s, %s, %s, %s)
                """
                cursor.execute(insert_query, (admin_id, datetime.now(), ip_address, user_agent))
                
                connection.commit()
                logger.info(f"Admin login updated for ID: {admin_id}")
                
        except Error as e:
            logger.error(f"Error updating admin login: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def create_test_results_table():
        """Create test results table"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100),
                    test_start_time DATETIME,
                    test_end_time DATETIME,
                    score DECIMAL(5,2),
                    answers JSON,
                    created_at DATETIME,
                    INDEX idx_session (session_id)
                )
                """)
                
                connection.commit()
                logger.info("Test results table created successfully")
                
        except Error as e:
            logger.error(f"Error creating test results table: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def update_pin_attempts_table():
        """Add session_id column to pin_attempts table if not exists"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # Check if column exists
                cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = 'recruitment_test' 
                AND TABLE_NAME = 'pin_attempts' 
                AND COLUMN_NAME = 'session_id'
                """)
                
                result = cursor.fetchone()
                if result and result[0] == 0:
                    alter_query = "ALTER TABLE pin_attempts ADD COLUMN session_id VARCHAR(100)"
                    cursor.execute(alter_query)
                    connection.commit()
                    logger.info("Added session_id column to pin_attempts table")
                else:
                    logger.info("session_id column already exists in pin_attempts table")
                    
        except Error as e:
            logger.error(f"Error updating pin_attempts table: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def initialize_all_tables():
        """Initialize all database tables"""
        Database.create_tables()
        Database.create_admin_tables()
        Database.create_test_results_table()
        Database.update_pin_attempts_table()
        
        # Insert default PIN if not exists
        connection = Database.get_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("SELECT * FROM authentication WHERE authentication_name = 'Application_pin'")
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO authentication (datetime, authentication_name, authentication_password)
                VALUES (%s, %s, %s)
                """, (datetime.now(), 'Application_pin', '123456'))  # Default PIN
                connection.commit()
                logger.info("Default PIN inserted")
            cursor.close()
            connection.close()

    @staticmethod
    def log_pin_attempt(entered_pin, success, ip_address, session_id=None):
        """Log PIN verification attempts"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor()
                
                # First, check if session_id column exists
                cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = 'recruitment_test' 
                AND TABLE_NAME = 'pin_attempts' 
                AND COLUMN_NAME = 'session_id'
                """)
                
                if cursor.fetchone()[0] > 0:
                    insert_query = """
                    INSERT INTO pin_attempts (datetime, entered_pin, success, ip_address, session_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """
                    current_time = datetime.now()
                    cursor.execute(insert_query, (current_time, entered_pin, success, ip_address, session_id))
                else:
                    # Fallback if column doesn't exist
                    insert_query = """
                    INSERT INTO pin_attempts (datetime, entered_pin, success, ip_address)
                    VALUES (%s, %s, %s, %s)
                    """
                    current_time = datetime.now()
                    cursor.execute(insert_query, (current_time, entered_pin, success, ip_address))
                
                connection.commit()
                logger.info(f"PIN attempt logged: success={success}, session={session_id}")
                
        except Error as e:
            logger.error(f"Error logging PIN attempt: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def get_all_candidates_with_status():
        """Get all candidates with their current status"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                query = """
                SELECT 
                    ci.*,
                    CASE 
                        WHEN ci.form_completed = 1 AND t.id IS NOT NULL THEN 'Test Completed'
                        WHEN ci.form_completed = 1 THEN 'Form Completed'
                        WHEN ci.id IS NOT NULL THEN 'Form Started'
                        ELSE 'PIN Verified'
                    END as current_status,
                    pa.datetime as pin_verified_time,
                    t.test_start_time,
                    t.test_end_time,
                    t.score
                FROM candidate_info ci
                LEFT JOIN pin_attempts pa ON ci.session_id = pa.session_id AND pa.success = 1
                LEFT JOIN test_results t ON ci.session_id = t.session_id
                WHERE ci.id IS NOT NULL
                ORDER BY ci.created_at DESC
                """
                
                cursor.execute(query)
                candidates = cursor.fetchall()
                
                return candidates
                
        except Error as e:
            logger.error(f"Error getting candidates: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def get_candidate_details(session_id):
        """Get detailed information about a specific candidate"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                # Get candidate info
                query = """
                SELECT 
                    ci.*,
                    pa.datetime as pin_verified_time,
                    pa.ip_address as pin_verified_ip,
                    t.test_start_time,
                    t.test_end_time,
                    t.score,
                    t.answers
                FROM candidate_info ci
                LEFT JOIN pin_attempts pa ON ci.session_id = pa.session_id AND pa.success = 1
                LEFT JOIN test_results t ON ci.session_id = t.session_id
                WHERE ci.session_id = %s
                """
                
                cursor.execute(query, (session_id,))
                details = cursor.fetchone()
                
                return details
                
        except Error as e:
            logger.error(f"Error getting candidate details: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def get_admin_stats():
        """Get statistics for admin dashboard"""
        connection = None
        cursor = None
        try:
            connection = Database.get_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                stats = {
                    'total_pin_verified': 0,
                    'total_forms_started': 0,
                    'total_forms_completed': 0,
                    'total_tests_started': 0,
                    'today_activity': 0,
                    'average_score': None
                }
                
                # Total PIN verifications
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM pin_attempts WHERE success = 1")
                    result = cursor.fetchone()
                    stats['total_pin_verified'] = result['count'] if result else 0
                except Exception as e:
                    logger.error(f"Error getting PIN verifications: {e}")
                
                # Total forms started
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM candidate_info")
                    result = cursor.fetchone()
                    stats['total_forms_started'] = result['count'] if result else 0
                except Exception as e:
                    logger.error(f"Error getting forms started: {e}")
                
                # Total forms completed
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM candidate_info WHERE form_completed = 1")
                    result = cursor.fetchone()
                    stats['total_forms_completed'] = result['count'] if result else 0
                except Exception as e:
                    logger.error(f"Error getting forms completed: {e}")
                
                # Total tests started
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM test_results")
                    result = cursor.fetchone()
                    stats['total_tests_started'] = result['count'] if result else 0
                except Exception as e:
                    logger.error(f"Error getting tests started: {e}")
                
                # Today's activity
                try:
                    today = datetime.now().date()
                    cursor.execute("""
                    SELECT COUNT(*) as count FROM pin_attempts 
                    WHERE DATE(datetime) = %s
                    """, (today,))
                    result = cursor.fetchone()
                    stats['today_activity'] = result['count'] if result else 0
                except Exception as e:
                    logger.error(f"Error getting today's activity: {e}")
                
                # Average score
                try:
                    cursor.execute("SELECT AVG(score) as avg_score FROM test_results")
                    result = cursor.fetchone()
                    stats['average_score'] = result['avg_score'] if result and result['avg_score'] else None
                except Exception as e:
                    logger.error(f"Error getting average score: {e}")
                
                return stats
                
        except Error as e:
            logger.error(f"Error getting admin stats: {e}")
            return {}
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()