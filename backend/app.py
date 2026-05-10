from fastapi import FastAPI, HTTPException, Depends, status, Request, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import secrets
import logging
from functools import wraps
import hashlib
import jwt
from database import Database
from models import CandidateInfo
import asyncio
from typing import Set

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_sessions: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.user_sessions[id(websocket)] = user_id
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        user_id = self.user_sessions.get(id(websocket))
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        self.user_sessions.pop(id(websocket), None)
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def broadcast(self, message: dict, user_id: str = None):
        if user_id and user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
        elif user_id is None:
            for user_connections in self.active_connections.values():
                for connection in user_connections:
                    try:
                        await connection.send_json(message)
                    except:
                        pass

manager = ConnectionManager()

# Pydantic models for request/response
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    session_id: Optional[str] = None
    user_type: Optional[str] = None

class PinVerificationRequest(BaseModel):
    pin: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class CandidateInfoRequest(BaseModel):
    full_name: str
    work_experience: str
    company_name: Optional[str] = None
    total_experience: Optional[str] = None
    current_salary: Optional[str] = None
    contact_number: str
    alternate_contact: Optional[str] = None
    email_id: str
    address: str

    @field_validator('work_experience')
    @classmethod
    def validate_work_experience(cls, v: str) -> str:
        if v not in ['yes', 'no']:
            raise ValueError('Work experience must be yes or no')
        return v

    @field_validator('contact_number')
    @classmethod
    def validate_contact(cls, v: str) -> str:
        if not v or len(v) < 10:
            raise ValueError('Valid contact number is required')
        return v

    @field_validator('email_id')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or '@' not in v:
            raise ValueError('Valid email is required')
        return v

class UpdatePinRequest(BaseModel):
    new_pin: str
    
    @field_validator('new_pin')
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v or len(v) != 6:
            raise ValueError('PIN must be 6 digits')
        return v

class TestSubmissionRequest(BaseModel):
    answers: List[Dict[str, Any]]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# JWT Helper Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access"):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

# Initialize FastAPI with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        Database.initialize_all_tables()
        logger.info("All database tables initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    yield
    # Shutdown
    await manager.broadcast({"type": "shutdown", "message": "Server is shutting down"})

app = FastAPI(title="Candidate Test System API", lifespan=lifespan)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React default port
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Session storage (in production, use Redis or database)
session_storage = {}

# Admin authentication dependency
async def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin token"""
    token = credentials.credentials
    payload = verify_token(token, "access")
    if not payload or payload.get('user_type') != 'admin':
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

# WebSocket endpoints
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            message_type = data.get("type")
            
            if message_type == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "test_progress":
                # Update test progress in database
                candidate_session = session_id
                progress = data.get("progress", {})
                # Database.update_test_progress(candidate_session, progress)
                
                await manager.send_personal_message({
                    "type": "progress_saved",
                    "progress": progress,
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "get_status":
                # Get current test status
                status = Database.get_test_status(session_id)
                await manager.send_personal_message({
                    "type": "status",
                    "data": status,
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "auto_save":
                # Auto-save answers
                answers = data.get("answers", [])
                # Database.auto_save_answers(session_id, answers)
                await manager.send_personal_message({
                    "type": "auto_save_confirmed",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"Session {session_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        manager.disconnect(websocket)

# API Routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/verify-pin")
async def verify_pin(request: Request, pin_request: PinVerificationRequest):
    """Verify the entered PIN against database with JWT"""
    try:
        entered_pin = pin_request.pin
        ip_address = request.client.host
        
        # Generate session ID for this attempt
        session_id = secrets.token_hex(16)
        
        # Verify PIN from database
        is_valid = Database.verify_pin(entered_pin)
        
        # Log the attempt with session_id
        Database.log_pin_attempt(entered_pin, is_valid, ip_address, session_id)
        
        if is_valid:
            # Create JWT tokens
            access_token = create_access_token(
                data={"session_id": session_id, "user_type": "candidate"},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            refresh_token = create_refresh_token(
                data={"session_id": session_id, "user_type": "candidate"}
            )
            
            # Store in session storage
            session_storage[access_token] = {
                'pin_verified': True,
                'candidate_session': session_id,
                'form_completed': False,
                'test_started': False,
                'test_completed': False,
                'refresh_token': refresh_token
            }
            
            return JSONResponse({
                'success': True,
                'message': 'PIN verified successfully!',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'bearer',
                'session_id': session_id
            })
        else:
            return JSONResponse({
                'success': False,
                'message': 'Invalid PIN. Please try again.'
            }, status_code=401)
            
    except Exception as e:
        logger.error(f"Error in verify_pin: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@app.post("/api/refresh-token")
async def refresh_token(refresh_request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        refresh_token = refresh_request.refresh_token
        payload = verify_token(refresh_token, "refresh")
        
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        session_id = payload.get("session_id")
        user_type = payload.get("user_type")
        
        # Check if session exists
        token_exists = False
        for token, session in session_storage.items():
            if session.get('refresh_token') == refresh_token:
                token_exists = True
                break
        
        if not token_exists:
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Create new access token
        new_access_token = create_access_token(
            data={"session_id": session_id, "user_type": user_type},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return JSONResponse({
            'access_token': new_access_token,
            'token_type': 'bearer'
        })
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/api/save-candidate-info")
async def save_candidate_info(
    candidate_data: CandidateInfoRequest,
    authorization: Optional[str] = Header(None)
):
    """Save candidate information with JWT validation"""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = verify_token(token, "access")
    if not payload or payload.get('user_type') != 'candidate':
        raise HTTPException(status_code=401, detail="Invalid token")
    
    session = session_storage.get(token, {})
    
    if not session.get('pin_verified'):
        raise HTTPException(status_code=403, detail="Please verify PIN first")
    
    try:
        candidate_session = session.get('candidate_session')
        
        if not candidate_session:
            raise HTTPException(status_code=400, detail="Session expired")
        
        # Save to database
        form_data = {
            'full_name': candidate_data.full_name,
            'contact_number': candidate_data.contact_number,
            'alternate_contact': candidate_data.alternate_contact,
            'email_id': candidate_data.email_id,
            'address': candidate_data.address,
            'work_experience': candidate_data.work_experience == 'yes',
            'company_name': candidate_data.company_name,
            'total_experience': candidate_data.total_experience,
            'current_salary': candidate_data.current_salary,
            'form_completed': True
        }
        
        if Database.save_candidate_info(candidate_session, form_data):
            # Update session
            session_storage[token].update({
                'form_completed': True,
                'test_started': True
            })
            
            # Notify via WebSocket
            await manager.broadcast({
                "type": "form_completed",
                "session_id": candidate_session,
                "timestamp": datetime.now().isoformat()
            }, candidate_session)
            
            return JSONResponse({
                'success': True,
                'message': 'Information saved successfully!',
                'redirect': '/test-page'
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to save information")
            
    except Exception as e:
        logger.error(f"Error saving candidate info: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@app.post("/api/submit-test")
async def submit_test(
    test_data: TestSubmissionRequest,
    authorization: Optional[str] = Header(None)
):
    """Submit test answers with JWT validation"""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = verify_token(token, "access")
    if not payload or payload.get('user_type') != 'candidate':
        raise HTTPException(status_code=401, detail="Invalid token")
    
    session = session_storage.get(token, {})
    
    if not session.get('pin_verified') or not session.get('form_completed'):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        candidate_session = session.get('candidate_session')
        answers = test_data.answers
        
        # Calculate score (implement your scoring logic)
        score = calculate_score(answers)
        
        # Save test results
        if Database.save_test_results(candidate_session, answers, score):
            session_storage[token].update({'test_completed': True})
            
            # Notify via WebSocket
            await manager.broadcast({
                "type": "test_completed",
                "session_id": candidate_session,
                "score": score,
                "timestamp": datetime.now().isoformat()
            }, candidate_session)
            
            return JSONResponse({
                'success': True,
                'message': 'Test submitted successfully',
                'score': score
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to submit test")
            
    except Exception as e:
        logger.error(f"Error submitting test: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@app.post("/api/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Clear the session and invalidate tokens"""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    if token and token in session_storage:
        session_storage.pop(token, None)
    
    return JSONResponse({'success': True})

# Admin API routes
@app.post("/api/admin/login")
async def admin_login(request: Request, login_data: AdminLoginRequest):
    """Admin login API with JWT"""
    try:
        username = login_data.username
        password = login_data.password
        
        # Verify admin from database
        admin = Database.verify_admin(username, password)
        
        if admin:
            # Create JWT tokens
            access_token = create_access_token(
                data={"admin_id": admin['id'], "user_type": "admin"},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            refresh_token = create_refresh_token(
                data={"admin_id": admin['id'], "user_type": "admin"}
            )
            
            # Store in session
            session_storage[access_token] = {
                'admin_logged_in': True,
                'admin_id': admin['id'],
                'admin_name': admin['full_name'],
                'admin_username': admin['username'],
                'refresh_token': refresh_token
            }
            
            # Log login
            Database.update_admin_login(
                admin['id'], 
                request.client.host,
                request.headers.get('user-agent', '')
            )
            
            return JSONResponse({
                'success': True,
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'bearer',
                'admin': {
                    'id': admin['id'],
                    'name': admin['full_name'],
                    'username': admin['username']
                }
            })
        else:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@app.get("/api/admin/candidates")
async def get_candidates(admin_session: dict = Depends(verify_admin)):
    """Get all candidates with status"""
    candidates = Database.get_all_candidates_with_status()
    return JSONResponse({
        'success': True,
        'candidates': candidates
    })

@app.get("/api/admin/stats")
async def get_admin_stats(admin_session: dict = Depends(verify_admin)):
    """Get admin statistics"""
    stats = Database.get_admin_stats()
    return JSONResponse({
        'success': True,
        'stats': stats
    })

@app.get("/api/admin/candidate/{session_id}")
async def get_candidate_details(session_id: str, admin_session: dict = Depends(verify_admin)):
    """Get candidate details"""
    candidate = Database.get_candidate_details(session_id)
    if candidate:
        return JSONResponse({
            'success': True,
            'candidate': candidate
        })
    else:
        raise HTTPException(status_code=404, detail="Candidate not found")

@app.post("/api/admin/update-pin")
async def admin_update_pin(pin_data: UpdatePinRequest, admin_session: dict = Depends(verify_admin)):
    """Update application PIN"""
    try:
        new_pin = pin_data.new_pin
        
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
            
            return JSONResponse({
                'success': True,
                'message': 'PIN updated successfully'
            })
        else:
            raise HTTPException(status_code=500, detail="Database error")
            
    except Exception as e:
        logger.error(f"Error updating PIN: {e}")
        raise HTTPException(status_code=500, detail="Server error")

def calculate_score(answers: List[Dict[str, Any]]) -> float:
    """Calculate test score"""
    total_questions = len(answers)
    correct_answers = sum(1 for answer in answers if answer.get('correct', False))
    return (correct_answers / total_questions) * 100 if total_questions > 0 else 0

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)