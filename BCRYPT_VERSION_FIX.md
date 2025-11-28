# Bcrypt Version Compatibility Fix

## Issue

**Error:** `AttributeError: module 'bcrypt' has no attribute '__about__'`

**Cause:** Version incompatibility between `passlib` and `bcrypt`

- **bcrypt 4.0.0+** removed the `__about__` module
- **passlib 1.7.4** (current stable) still tries to access `bcrypt.__about__`

## Solution

**Downgrade bcrypt to 3.x series** which is compatible with passlib 1.7.4

### Fixed in requirements.txt

```python
# Before (causing error)
bcrypt>=4.0.0,<5.0.0

# After (working)
bcrypt>=3.2.0,<4.0.0  # Pin to 3.x for passlib 1.7.4 compatibility
```

### Installation Command

```bash
cd backend
pip install "bcrypt==3.2.2"
```

## Why This Works

| Package | Version | Status |
|---------|---------|--------|
| passlib | 1.7.4 | Latest stable (released 2020) |
| bcrypt | 3.2.2 | Compatible with passlib 1.7.4 |
| bcrypt | 4.x | **NOT compatible** with passlib 1.7.4 |

## Alternative Solutions

### Option 1: Wait for passlib update (Not recommended)
- passlib development is slow (last release: 2020)
- No timeline for bcrypt 4.x support

### Option 2: Use bcrypt-cffi (Not tested)
```bash
pip install bcrypt-cffi
```

### Option 3: Switch to argon2 (Future consideration)
```python
# In requirements.txt
argon2-cffi>=23.1.0,<24.0.0

# In code
from passlib.hash import argon2
hash = argon2.hash("password")
```

## Verification

Test that password hashing works:

```bash
cd backend
python -c "from app.core.security import get_password_hash, verify_password; h = get_password_hash('test'); print('Working:', verify_password('test', h))"
```

Expected output: `Working: True`

## Files Modified

1. **backend/requirements.txt** - Updated bcrypt version constraint
2. **Installed packages** - Downgraded bcrypt from 4.3.0 to 3.2.2

## Status

✅ **FIXED** - All password hashing operations working correctly

---

*Date: January 28, 2025*
*Related to: Service Role Key Fix*
