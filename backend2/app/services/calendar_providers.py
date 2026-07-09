"""
Calendar Provider Integration Service
Handles Google Calendar and Microsoft Calendar OAuth2 and syncing
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import requests
from ..models import CalendarProvider


class CalendarProviderError(Exception):
    """Base exception for calendar provider errors"""
    pass


class CalendarProviderBase(ABC):
    """Abstract base class for calendar providers"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
    
    @abstractmethod
    def create_event(
        self,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a calendar event
        
        Returns:
            {
                "event_id": str,
                "html_link": Optional[str],
                "provider_data": Dict[str, Any]
            }
        """
        pass
    
    @abstractmethod
    def update_event(self, event_id: str, **kwargs) -> Dict[str, Any]:
        """Update calendar event"""
        pass
    
    @abstractmethod
    def delete_event(self, event_id: str) -> bool:
        """Delete calendar event"""
        pass
    
    @abstractmethod
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get calendar event details"""
        pass
    
    @abstractmethod
    def list_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List calendar events in time range"""
        pass
    
    @abstractmethod
    def check_availability(self, start_time: datetime, end_time: datetime) -> bool:
        """Check if user is available (no conflicting events)"""
        pass


class GoogleCalendarProvider(CalendarProviderBase):
    """Google Calendar provider using Calendar API v3"""
    
    BASE_URL = "https://www.googleapis.com/calendar/v3"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def create_event(
        self,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create Google Calendar event"""
        
        headers = self._get_headers()
        
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
            }
        }
        
        if location:
            payload["location"] = location
        
        if attendees:
            payload["attendees"] = [{"email": email} for email in attendees]
        
        # Add video conferencing if requested
        if kwargs.get("add_meet_link"):
            payload["conferenceData"] = {
                "createRequest": {
                    "requestId": f"meet-{int(start_time.timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }
        
        try:
            params = {}
            if kwargs.get("add_meet_link"):
                params["conferenceDataVersion"] = 1
            
            response = requests.post(
                f"{self.BASE_URL}/calendars/primary/events",
                headers=headers,
                json=payload,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "event_id": data.get("id"),
                "html_link": data.get("htmlLink"),
                "provider_data": data
            }
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Google Calendar API error: {str(e)}")
    
    def update_event(self, event_id: str, **kwargs) -> Dict[str, Any]:
        """Update Google Calendar event"""
        
        headers = self._get_headers()
        
        payload = {}
        if "title" in kwargs:
            payload["summary"] = kwargs["title"]
        if "description" in kwargs:
            payload["description"] = kwargs["description"]
        if "location" in kwargs:
            payload["location"] = kwargs["location"]
        if "start_time" in kwargs and "end_time" in kwargs:
            payload["start"] = {"dateTime": kwargs["start_time"].isoformat()}
            payload["end"] = {"dateTime": kwargs["end_time"].isoformat()}
        
        try:
            response = requests.patch(
                f"{self.BASE_URL}/calendars/primary/events/{event_id}",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Google Calendar API error: {str(e)}")
    
    def delete_event(self, event_id: str) -> bool:
        """Delete Google Calendar event"""
        
        headers = self._get_headers()
        
        try:
            response = requests.delete(
                f"{self.BASE_URL}/calendars/primary/events/{event_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Google Calendar API error: {str(e)}")
    
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get Google Calendar event"""
        
        headers = self._get_headers()
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/calendars/primary/events/{event_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Google Calendar API error: {str(e)}")
    
    def list_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List Google Calendar events"""
        
        headers = self._get_headers()
        
        params = {
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime"
        }
        
        if start_time:
            params["timeMin"] = start_time.isoformat() + "Z"
        if end_time:
            params["timeMax"] = end_time.isoformat() + "Z"
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/calendars/primary/events",
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Google Calendar API error: {str(e)}")
    
    def check_availability(self, start_time: datetime, end_time: datetime) -> bool:
        """Check if user is available (no events overlap)"""
        
        events = self.list_events(start_time=start_time, end_time=end_time, max_results=100)
        
        # Check for any events that overlap with the time range
        for event in events:
            # Skip all-day events and cancelled events
            if event.get("status") == "cancelled":
                continue
            
            event_start = event.get("start", {})
            event_end = event.get("end", {})
            
            # Skip if no datetime (all-day event)
            if "dateTime" not in event_start or "dateTime" not in event_end:
                continue
            
            event_start_dt = datetime.fromisoformat(event_start["dateTime"].replace("Z", "+00:00"))
            event_end_dt = datetime.fromisoformat(event_end["dateTime"].replace("Z", "+00:00"))
            
            # Check for overlap
            if event_start_dt < end_time and event_end_dt > start_time:
                return False  # Not available (conflict found)
        
        return True  # Available (no conflicts)


class MicrosoftCalendarProvider(CalendarProviderBase):
    """Microsoft Calendar provider using Graph API"""
    
    BASE_URL = "https://graph.microsoft.com/v1.0"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def create_event(
        self,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create Microsoft Calendar event"""
        
        headers = self._get_headers()
        
        payload = {
            "subject": title,
            "body": {
                "contentType": "HTML",
                "content": description or ""
            },
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": kwargs.get("timezone", "Eastern Standard Time")
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": kwargs.get("timezone", "Eastern Standard Time")
            }
        }
        
        if location:
            payload["location"] = {"displayName": location}
        
        if attendees:
            payload["attendees"] = [
                {
                    "emailAddress": {"address": email},
                    "type": "required"
                } for email in attendees
            ]
        
        # Add Teams meeting if requested
        if kwargs.get("add_teams_link"):
            payload["isOnlineMeeting"] = True
            payload["onlineMeetingProvider"] = "teamsForBusiness"
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/me/events",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "event_id": data.get("id"),
                "html_link": data.get("webLink"),
                "provider_data": data
            }
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Microsoft Calendar API error: {str(e)}")
    
    def update_event(self, event_id: str, **kwargs) -> Dict[str, Any]:
        """Update Microsoft Calendar event"""
        
        headers = self._get_headers()
        
        payload = {}
        if "title" in kwargs:
            payload["subject"] = kwargs["title"]
        if "description" in kwargs:
            payload["body"] = {"contentType": "HTML", "content": kwargs["description"]}
        if "location" in kwargs:
            payload["location"] = {"displayName": kwargs["location"]}
        if "start_time" in kwargs and "end_time" in kwargs:
            payload["start"] = {"dateTime": kwargs["start_time"].isoformat()}
            payload["end"] = {"dateTime": kwargs["end_time"].isoformat()}
        
        try:
            response = requests.patch(
                f"{self.BASE_URL}/me/events/{event_id}",
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Microsoft Calendar API error: {str(e)}")
    
    def delete_event(self, event_id: str) -> bool:
        """Delete Microsoft Calendar event"""
        
        headers = self._get_headers()
        
        try:
            response = requests.delete(
                f"{self.BASE_URL}/me/events/{event_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Microsoft Calendar API error: {str(e)}")
    
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get Microsoft Calendar event"""
        
        headers = self._get_headers()
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/me/events/{event_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Microsoft Calendar API error: {str(e)}")
    
    def list_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List Microsoft Calendar events"""
        
        headers = self._get_headers()
        
        params = {
            "$top": max_results,
            "$orderby": "start/dateTime"
        }
        
        # Build filter for time range
        filters = []
        if start_time:
            filters.append(f"start/dateTime ge '{start_time.isoformat()}'")
        if end_time:
            filters.append(f"end/dateTime le '{end_time.isoformat()}'")
        
        if filters:
            params["$filter"] = " and ".join(filters)
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/me/events",
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            return data.get("value", [])
        except requests.exceptions.RequestException as e:
            raise CalendarProviderError(f"Microsoft Calendar API error: {str(e)}")
    
    def check_availability(self, start_time: datetime, end_time: datetime) -> bool:
        """Check if user is available using Microsoft's findMeetingTimes API"""
        
        # Alternative: Use list_events and check manually
        events = self.list_events(start_time=start_time, end_time=end_time, max_results=100)
        
        for event in events:
            # Skip cancelled events
            if event.get("isCancelled"):
                continue
            
            event_start = event.get("start", {})
            event_end = event.get("end", {})
            
            event_start_dt = datetime.fromisoformat(event_start["dateTime"])
            event_end_dt = datetime.fromisoformat(event_end["dateTime"])
            
            # Check for overlap
            if event_start_dt < end_time and event_end_dt > start_time:
                return False  # Not available
        
        return True  # Available


class CalendarProviderFactory:
    """Factory to create calendar provider instances"""
    
    @staticmethod
    def get_provider(
        provider: CalendarProvider,
        access_token: str,
        refresh_token: Optional[str] = None
    ) -> CalendarProviderBase:
        """Get calendar provider instance based on type"""
        
        if provider == CalendarProvider.GOOGLE:
            return GoogleCalendarProvider(access_token=access_token, refresh_token=refresh_token)
        elif provider == CalendarProvider.MICROSOFT:
            return MicrosoftCalendarProvider(access_token=access_token, refresh_token=refresh_token)
        else:
            raise ValueError(f"Unknown calendar provider: {provider}")
