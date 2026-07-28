import React from 'react';
import HRAnalyticsTab from '../hr/HRAnalyticsTab';

// Reuses HRAnalyticsTab's exact markup/styling and metric categories
// (Total Jobs, Pending Approval, Job Status Breakdown, Hiring Funnel
// Rates, Meetings Scheduled) so the UI is identical to HR's Analytics
// page — GET /analytics/recruiter now returns the same response shape
// as /analytics/hr, just scoped to this recruiter's own job postings
// instead of the whole company.

interface RecruiterAnalyticsTabProps {
  analyticsLoading: boolean;
  analyticsRange: number;
  setAnalyticsRange: (value: number) => void;
  recruiterAnalytics: any;
}

const RecruiterAnalyticsTab: React.FC<RecruiterAnalyticsTabProps> = ({
  analyticsLoading, analyticsRange, setAnalyticsRange, recruiterAnalytics,
}) => (
  <HRAnalyticsTab
    analyticsLoading={analyticsLoading}
    analyticsRange={analyticsRange}
    setAnalyticsRange={setAnalyticsRange}
    hrAnalytics={recruiterAnalytics}
    title="My Analytics"
    subtitle="Hiring funnel and job performance metrics for your own postings."
  />
);

export default RecruiterAnalyticsTab;
