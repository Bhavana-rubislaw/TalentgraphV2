"""
Video Provider Integration Service
Abstracts Zoom, Microsoft Teams, and Google Meet meeting creation
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from datetime import datetime
import os
import jwt
import time
import requests
from ..models import VideoProvider


class VideoProviderError(Exception):
    """Base exception for video provider errors"""
    pass


class VideoProviderBase(ABC):
    """Abstract base class for video meeting providers"""
    
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None, 
                 access_token: Optional[str] = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
    
    @abstractmethod
    def create_meeting(
        self,
        title: str,
        start_time: datetime,
        duration_minutes: int,
        description: Optional[str] = None,
        waiting_room: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a video meeting and return meeting details
        
        Returns:
            {
                "meeting_url": str,  # Join URL for participants
                "meeting_id": str,   # Provider's meeting ID
                "host_url": Optional[str],  # Host-specific URL (if different)
                "password": Optional[str],  # Meeting password
                "provider_data": Dict[str, Any]  # Full response from provider
            }
        """
        pass
    
    @abstractmethod
    def delete_meeting(self, meeting_id: str) -> bool:
        """Delete/cancel a meeting"""
        pass
    
    @abstractmethod
    def update_meeting(self, meeting_id: str, **kwargs) -> Dict[str, Any]:
        """Update meeting details"""
        pass


class ZoomProvider(VideoProviderBase):
    """Zoom meeting provider using JWT or OAuth"""
    
    BASE_URL = "https://api.zoom.us/v2"
    
    def _generate_jwt_token(self) -> str:
        """Generate JWT token for Zoom API authentication"""
        if not self.api_key or not self.api_secret:
            raise VideoProviderError("Zoom API key and secret required")
        
        payload = {
            "iss": self.api_key,
            "exp": int(time.time()) + 3600  # Token valid for 1 hour
        }
        return jwt.encode(payload, self.api_secret, algorithm="HS256")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if self.access_token:
            # OAuth token
            return {"Authorization": f"Bearer {self.access_token}"}
        else:
            # JWT token
            token = self._generate_jwt_token()
            return {"Authorization": f"Bearer {token}"}
    
    def create_meeting(
        self,
        title: str,
        start_time: datetime,
        duration_minutes: int,
        description: Optional[str] = None,
        waiting_room: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Create Zoom meeting"""
        
        headers = self._get_headers()
        headers["Content-Type"] = "application/json"
        
        # Default to "me" (the authenticated user) as host
        user_id = kwargs.get("user_id", "me")
        
        payload = {
            "topic": title,
            "type": 2,  # Scheduled meeting
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "duration": duration_minutes,
            "timezone": kwargs.get("timezone", "America/New_York"),
            "agenda": description or "",
            "settings": {
                "host_video": kwargs.get("host_video", True),
                "participant_video": kwargs.get("participant_video", True),
                "join_before_host": kwargs.get("join_before_host", False),
                "mute_upon_entry": kwargs.get("mute_upon_entry", False),
                "waiting_room": waiting_room,
                "audio": "both",
                "auto_recording": kwargs.get("auto_recording", "none")
            }
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/users/{user_id}/meetings",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "meeting_url": data.get("join_url"),
                "meeting_id": str(data.get("id")),
                "host_url": data.get("start_url"),
                "password": data.get("password"),
                "provider_data": data
            }
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Zoom API error: {str(e)}")
    
    def delete_meeting(self, meeting_id: str) -> bool:
        """Delete Zoom meeting"""
        headers = self._get_headers()
        
        try:
            response = requests.delete(
                f"{self.BASE_URL}/meetings/{meeting_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Zoom API error: {str(e)}")
    
    def update_meeting(self, meeting_id: str, **kwargs) -> Dict[str, Any]:
        """Update Zoom meeting"""
        headers = self._get_headers()
        headers["Content-Type"] = "application/json"
        
        payload = {}
        if "title" in kwargs:
            payload["topic"] = kwargs["title"]
        if "start_time" in kwargs:
            payload["start_time"] = kwargs["start_time"].strftime("%Y-%m-%dT%H:%M:%S")
        if "duration_minutes" in kwargs:
            payload["duration"] = kwargs["duration_minutes"]
        if "description" in kwargs:
            payload["agenda"] = kwargs["description"]
        
        try:
            response = requests.patch(
                f"{self.BASE_URL}/meetings/{meeting_id}",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Zoom API error: {str(e)}")


class MicrosoftTeamsProvider(VideoProviderBase):
    """Microsoft Teams meeting provider using Graph API"""
    
    BASE_URL = "https://graph.microsoft.com/v1.0"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.access_token:
            raise VideoProviderError("Microsoft Teams access token required")
        
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def create_meeting(
        self,
        title: str,
        start_time: datetime,
        duration_minutes: int,
        description: Optional[str] = None,
        waiting_room: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Create Microsoft Teams online meeting"""
        
        headers = self._get_headers()
        
        # Calculate end time
        from datetime import timedelta
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Create online meeting via Graph API
        payload = {
            "startDateTime": start_time.isoformat(),
            "endDateTime": end_time.isoformat(),
            "subject": title
        }
        
        try:
            # First create an online meeting
            response = requests.post(
                f"{self.BASE_URL}/me/onlineMeetings",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "meeting_url": data.get("joinUrl") or data.get("joinWebUrl"),
                "meeting_id": data.get("id"),
                "host_url": None,  # Teams doesn't have separate host URL
                "password": None,  # Teams uses auth instead of password
                "provider_data": data
            }
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Microsoft Teams API error: {str(e)}")
    
    def delete_meeting(self, meeting_id: str) -> bool:
        """Delete Microsoft Teams meeting"""
        headers = self._get_headers()
        
        try:
            response = requests.delete(
                f"{self.BASE_URL}/me/onlineMeetings/{meeting_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Microsoft Teams API error: {str(e)}")
    
    def update_meeting(self, meeting_id: str, **kwargs) -> Dict[str, Any]:
        """Update Microsoft Teams meeting"""
        # Note: Microsoft Graph API has limited support for updating online meetings
        # You may need to delete and recreate, or update the calendar event instead
        raise NotImplementedError("Teams meeting updates should be done via calendar events")


class GoogleMeetProvider(VideoProviderBase):
    """Google Meet meeting provider"""
    
    BASE_URL = "https://www.googleapis.com/calendar/v3"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.access_token:
            raise VideoProviderError("Google Meet access token required")
        
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def create_meeting(
        self,
        title: str,
        start_time: datetime,
        duration_minutes: int,
        description: Optional[str] = None,
        waiting_room: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create Google Meet by creating a Calendar event with conferencing
        """
        
        headers = self._get_headers()
        
        # Calculate end time
        from datetime import timedelta
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Create calendar event with Meet link
        payload = {
            "summary": title,
            "description": description or "",
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": kwargs.get("timezone", "America/New_York")
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": kwargs.get("timezone", "America/New_York")
            },
            "conferenceData": {
                "createRequest": {
                    "requestId": f"meet-{int(time.time())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/calendars/primary/events",
                headers=headers,
                json=payload,
                params={"conferenceDataVersion": 1},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract Meet link from conference data
            conference_data = data.get("conferenceData", {})
            entry_points = conference_data.get("entryPoints", [])
            meet_url = None
            for entry in entry_points:
                if entry.get("entryPointType") == "video":
                    meet_url = entry.get("uri")
                    break
            
            return {
                "meeting_url": meet_url,
                "meeting_id": data.get("id"),
                "host_url": None,  # Google Meet doesn't have separate host URL
                "password": None,  # Google Meet uses auth
                "provider_data": data
            }
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Google Meet API error: {str(e)}")
    
    def delete_meeting(self, meeting_id: str) -> bool:
        """Delete Google Calendar event (and associated Meet)"""
        headers = self._get_headers()
        
        try:
            response = requests.delete(
                f"{self.BASE_URL}/calendars/primary/events/{meeting_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Google Meet API error: {str(e)}")
    
    def update_meeting(self, meeting_id: str, **kwargs) -> Dict[str, Any]:
        """Update Google Calendar event"""
        headers = self._get_headers()
        
        payload = {}
        if "title" in kwargs:
            payload["summary"] = kwargs["title"]
        if "description" in kwargs:
            payload["description"] = kwargs["description"]
        if "start_time" in kwargs and "duration_minutes" in kwargs:
            from datetime import timedelta
            start = kwargs["start_time"]
            end = start + timedelta(minutes=kwargs["duration_minutes"])
            payload["start"] = {"dateTime": start.isoformat()}
            payload["end"] = {"dateTime": end.isoformat()}
        
        try:
            response = requests.patch(
                f"{self.BASE_URL}/calendars/primary/events/{meeting_id}",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise VideoProviderError(f"Google Meet API error: {str(e)}")


class VideoProviderFactory:
    """Factory to create video provider instances"""
    
    @staticmethod
    def get_provider(
        provider: VideoProvider,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        access_token: Optional[str] = None
    ) -> VideoProviderBase:
        """Get video provider instance based on type"""
        
        if provider == VideoProvider.ZOOM:
            return ZoomProvider(api_key=api_key, api_secret=api_secret, access_token=access_token)
        elif provider == VideoProvider.MICROSOFT_TEAMS:
            return MicrosoftTeamsProvider(access_token=access_token)
        elif provider == VideoProvider.GOOGLE_MEET:
            return GoogleMeetProvider(access_token=access_token)
        elif provider == VideoProvider.OTHER:
            # For "other" provider, return None (use manual URL)
            return None
        else:
            raise ValueError(f"Unknown video provider: {provider}")
