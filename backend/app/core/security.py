import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hashed password string."""
    try:
        if not plain_password or not hashed_password:
            return False

        if isinstance(hashed_password, str):
            hash_bytes = hashed_password.strip().encode('utf-8')
        else:
            hash_bytes = hashed_password

        # Test original and trimmed candidate passwords to protect against accidental copy-paste whitespace
        candidates = [plain_password]
        if isinstance(plain_password, str):
            trimmed = plain_password.strip()
            if trimmed != plain_password and trimmed:
                candidates.append(trimmed)

        for cand in candidates:
            pwd_bytes = cand.encode('utf-8')[:72] if isinstance(cand, str) else cand[:72]
            if bcrypt.checkpw(pwd_bytes, hash_bytes):
                return True

        return False
    except Exception as e:
        print(f"[Security Warning] Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password securely using bcrypt directly."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token with role and user ID payload."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
