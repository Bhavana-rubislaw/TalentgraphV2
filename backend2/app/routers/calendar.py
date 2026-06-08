"""
Calendar Integration Router
Google Calendar and Microsoft Calendar OAuth2 and management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional, List
import os
from datetime import datetime
import requests

from ..database import get_session
from ..security import get_current_user
from ..models import (
    User, CalendarAccount, CalendarProvider, 
    VideoProviderAccount, VideoProvider
)
from ..schemas import (
    CalendarAccountCreate, CalendarAccountRead,
    VideoProviderAccountCreate, VideoProviderAccountRead
)


router = APIRouter(prefix="/calendar", tags=["Calendar Integration"])


# OAuth Configuration - Should be in environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/calendar/google/callback")

MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
MICROSOFT_REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8001/calendar/microsoft/callback")


@router.get("/google/authorize")
async def google_authorize(
    current_user: User = Depends(get_current_user)
):
    """
    Initiate Google Calendar OAuth2 authorization flow
    Returns authorization URL to redirect user to
    """
    
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Define scopes for Google Calendar
    scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    # Build authorization URL
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={' '.join(scopes)}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={current_user["id"]}"  # Include user ID in state for security
    )
    
    return {
        "authorization_url": auth_url,
        "provider": "google"
    }


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    """
    Handle Google OAuth2 callback
    Exchange authorization code for access token
    """
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.post(token_url, data=token_data, timeout=10)
        response.raise_for_status()
        tokens = response.json()
        
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        
        # Get user email from Google
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        provider_email = user_info.get("email")
        
        # Get user ID from state parameter
        user_id = int(state) if state else None
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Check if account already exists
        existing_account = session.exec(
            select(CalendarAccount).where(
                CalendarAccount.user_id == user_id,
                CalendarAccount.provider == CalendarProvider.GOOGLE,
                CalendarAccount.provider_email == provider_email
            )
        ).first()
        
        if existing_account:
            # Update existing account
            existing_account.access_token = access_token
            existing_account.refresh_token = refresh_token or existing_account.refresh_token
            existing_account.token_expires_at = datetime.utcnow().timestamp() + expires_in
            existing_account.updated_at = datetime.utcnow()
            session.add(existing_account)
        else:
            # Create new account
            calendar_account = CalendarAccount(
                user_id=user_id,
                provider=CalendarProvider.GOOGLE,
                provider_account_id=user_info.get("id"),
                provider_email=provider_email,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=datetime.utcnow().timestamp() + expires_in,
                sync_enabled=True,
                is_primary=False  # User can set this later
            )
            session.add(calendar_account)
        
        session.commit()
        
        return {
            "success": True,
            "message": "Google Calendar connected successfully",
            "provider": "google",
            "email": provider_email
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")


@router.get("/microsoft/authorize")
async def microsoft_authorize(
    current_user: User = Depends(get_current_user)
):
    """
    Initiate Microsoft Calendar OAuth2 authorization flow
    Returns authorization URL to redirect user to
    """
    
    if not MICROSOFT_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Microsoft OAuth not configured")
    
    # Define scopes for Microsoft Calendar
    scopes = [
        "Calendars.ReadWrite",
        "Calendars.ReadWrite.Shared",
        "OnlineMeetings.ReadWrite",
        "User.Read"
    ]
    
    # Build authorization URL
    auth_url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        f"?client_id={MICROSOFT_CLIENT_ID}"
        f"&redirect_uri={MICROSOFT_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={' '.join(scopes)}"
        f"&response_mode=query"
        f"&state={current_user["id"]}"
    )
    
    return {
        "authorization_url": auth_url,
        "provider": "microsoft"
    }


@router.get("/microsoft/callback")
async def microsoft_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    """
    Handle Microsoft OAuth2 callback
    Exchange authorization code for access token
    """
    
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Microsoft OAuth not configured")
    
    # Exchange code for tokens
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    token_data = {
        "code": code,
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "grant_type": "authorization_code",
        "scope": "Calendars.ReadWrite User.Read"
    }
    
    try:
        response = requests.post(token_url, data=token_data, timeout=10)
        response.raise_for_status()
        tokens = response.json()
        
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        
        # Get user info from Microsoft Graph
        user_info_response = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        provider_email = user_info.get("userPrincipalName") or user_info.get("mail")
        
        # Get user ID from state parameter
        user_id = int(state) if state else None
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Check if account already exists
        existing_account = session.exec(
            select(CalendarAccount).where(
                CalendarAccount.user_id == user_id,
                CalendarAccount.provider == CalendarProvider.MICROSOFT,
                CalendarAccount.provider_email == provider_email
            )
        ).first()
        
        if existing_account:
            # Update existing account
            existing_account.access_token = access_token
            existing_account.refresh_token = refresh_token or existing_account.refresh_token
            existing_account.token_expires_at = datetime.utcnow().timestamp() + expires_in
            existing_account.updated_at = datetime.utcnow()
            session.add(existing_account)
        else:
            # Create new account
            calendar_account = CalendarAccount(
                user_id=user_id,
                provider=CalendarProvider.MICROSOFT,
                provider_account_id=user_info.get("id"),
                provider_email=provider_email,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=datetime.utcnow().timestamp() + expires_in,
                sync_enabled=True,
                is_primary=False
            )
            session.add(calendar_account)
        
        session.commit()
        
        return {
            "success": True,
            "message": "Microsoft Calendar connected successfully",
            "provider": "microsoft",
            "email": provider_email
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")


@router.get("/accounts", response_model=List[CalendarAccountRead])
async def list_calendar_accounts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List all connected calendar accounts for current user"""
    
    accounts = session.exec(
        select(CalendarAccount).where(CalendarAccount.user_id == current_user["id"])
    ).all()
    
    return accounts


@router.post("/accounts/{account_id}/sync")
async def toggle_sync(
    account_id: int,
    enabled: bool = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Enable or disable calendar sync for an account"""
    
    account = session.get(CalendarAccount, account_id)
    
    if not account or account.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Calendar account not found")
    
    account.sync_enabled = enabled
    account.updated_at = datetime.utcnow()
    session.add(account)
    session.commit()
    session.refresh(account)
    
    return account


@router.post("/accounts/{account_id}/primary")
async def set_primary_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Set an account as the primary calendar"""
    
    account = session.get(CalendarAccount, account_id)
    
    if not account or account.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Calendar account not found")
    
    # Unset any other primary accounts
    other_accounts = session.exec(
        select(CalendarAccount).where(
            CalendarAccount.user_id == current_user["id"],
            CalendarAccount.id != account_id
        )
    ).all()
    
    for other in other_accounts:
        other.is_primary = False
        session.add(other)
    
    account.is_primary = True
    account.updated_at = datetime.utcnow()
    session.add(account)
    session.commit()
    session.refresh(account)
    
    return account


@router.delete("/accounts/{account_id}")
async def disconnect_calendar(
    account_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Disconnect a calendar account"""
    
    account = session.get(CalendarAccount, account_id)
    
    if not account or account.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Calendar account not found")
    
    session.delete(account)
    session.commit()
    
    return {"success": True, "message": "Calendar account disconnected"}


# Video Provider Account Management

@router.post("/video-providers", response_model=VideoProviderAccountRead)
async def create_video_provider_account(
    data: VideoProviderAccountCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add video provider account credentials"""
    
    # Check if account already exists
    existing = session.exec(
        select(VideoProviderAccount).where(
            VideoProviderAccount.user_id == current_user["id"],
            VideoProviderAccount.provider == data.provider
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"{data.provider.value} account already configured"
        )
    
    account = VideoProviderAccount(
        user_id=current_user["id"],
        **data.model_dump()
    )
    
    session.add(account)
    session.commit()
    session.refresh(account)
    
    return account


@router.get("/video-providers", response_model=List[VideoProviderAccountRead])
async def list_video_provider_accounts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List all video provider accounts for current user"""
    
    accounts = session.exec(
        select(VideoProviderAccount).where(VideoProviderAccount.user_id == current_user["id"])
    ).all()
    
    return accounts


@router.patch("/video-providers/{account_id}", response_model=VideoProviderAccountRead)
async def update_video_provider_account(
    account_id: int,
    api_key: Optional[str] = None,
    api_secret: Optional[str] = None,
    auto_generate_links: Optional[bool] = None,
    waiting_room_enabled: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update video provider account settings"""
    
    account = session.get(VideoProviderAccount, account_id)
    
    if not account or account.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Video provider account not found")
    
    if api_key is not None:
        account.api_key = api_key
    if api_secret is not None:
        account.api_secret = api_secret
    if auto_generate_links is not None:
        account.auto_generate_links = auto_generate_links
    if waiting_room_enabled is not None:
        account.waiting_room_enabled = waiting_room_enabled
    
    account.updated_at = datetime.utcnow()
    session.add(account)
    session.commit()
    session.refresh(account)
    
    return account


@router.delete("/video-providers/{account_id}")
async def delete_video_provider_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove video provider account"""
    
    account = session.get(VideoProviderAccount, account_id)
    
    if not account or account.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Video provider account not found")
    
    session.delete(account)
    session.commit()
    
    return {"success": True, "message": "Video provider account removed"}

