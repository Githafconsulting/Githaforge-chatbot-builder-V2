"""
Token encryption utilities for secure storage of OAuth tokens
Uses Fernet (symmetric encryption) from cryptography library
"""
from cryptography.fernet import Fernet
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_encryption_key() -> bytes:
    """
    Get encryption key from settings

    Returns:
        bytes: Fernet encryption key

    Raises:
        ValueError: If INTEGRATION_ENCRYPTION_KEY is not set
    """
    key = settings.INTEGRATION_ENCRYPTION_KEY

    if not key:
        raise ValueError(
            "INTEGRATION_ENCRYPTION_KEY environment variable not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )

    return key.encode()


def encrypt_token(token: str) -> str:
    """
    Encrypt an OAuth token for secure storage

    Args:
        token: Plain text OAuth token

    Returns:
        str: Encrypted token (base64 encoded)

    Example:
        >>> encrypted = encrypt_token("my_access_token_123")
        >>> print(encrypted)
        'gAAAAABl...'
    """
    try:
        key = get_encryption_key()
        cipher = Fernet(key)

        encrypted_bytes = cipher.encrypt(token.encode())
        encrypted_str = encrypted_bytes.decode()

        logger.debug("Token encrypted successfully")
        return encrypted_str

    except Exception as e:
        logger.error(f"Error encrypting token: {e}")
        raise


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt an OAuth token for use

    Args:
        encrypted_token: Encrypted token from database (base64 encoded)

    Returns:
        str: Plain text OAuth token

    Example:
        >>> decrypted = decrypt_token("gAAAAABl...")
        >>> print(decrypted)
        'my_access_token_123'
    """
    try:
        key = get_encryption_key()
        cipher = Fernet(key)

        decrypted_bytes = cipher.decrypt(encrypted_token.encode())
        decrypted_str = decrypted_bytes.decode()

        logger.debug("Token decrypted successfully")
        return decrypted_str

    except Exception as e:
        logger.error(f"Error decrypting token: {e}")
        raise


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key

    Returns:
        str: New encryption key (base64 encoded)

    Usage:
        Run this once and save the output to INTEGRATION_ENCRYPTION_KEY env var

    Example:
        >>> key = generate_encryption_key()
        >>> print(f"INTEGRATION_ENCRYPTION_KEY={key}")
    """
    key = Fernet.generate_key()
    return key.decode()


if __name__ == "__main__":
    # Generate a new encryption key
    print("Generated Encryption Key (save this to .env as INTEGRATION_ENCRYPTION_KEY):")
    print(generate_encryption_key())
