"""
Recommender sub-package for TalentGraph V2.

This package encapsulates everything related to recommendation scoring,
feature caching, feedback, and observability. It is the sole owner of
the recommender database schema.

Public API for the rest of the application:

    from app.recommender.gateway import get_gateway
    gateway = get_gateway()               # returns current active adapter
    results = await gateway.rank_candidates_for_job(job_id, company_id, session)
"""
