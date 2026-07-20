"""Router registration helpers for app composition."""


def register_api_routers(app, logger, log_change_func) -> None:
    from app.routers import (
        auth,
        candidates,
        company,
        job_postings,
        matches,
        recommendations,
        swipes,
        dashboard_candidate,
        dashboard_recruiter,
        applications,
        notifications,
        activity_feed,
        messages,
        meetings,
        calendar,
        analytics,
        logs,
        notification_preferences,
        onboarding,
        product_taxonomy,
        admin,
    )
    from app.routers.admin_extended import (
        router as admin_extended_router,
        accept_router as invitations_router,
    )
    from app.routers.subscriptions import router as subscriptions_router
    from app.routers.credits import router as credits_router
    from app.routers.team import router as team_router
    from app.routers.recommendations_v2 import router as recommendations_v2_router
    from app.routers.admin_recommendations import router as admin_recommendations_router

    log_change_func(
        logger,
        action="startup",
        entity_type="application",
        message="Registering API routers",
    )

    # Core routers
    app.include_router(auth.router)
    app.include_router(candidates.router)
    app.include_router(onboarding.router)  # Resume-assisted candidate onboarding
    app.include_router(company.router)
    app.include_router(job_postings.router)
    app.include_router(matches.router)
    app.include_router(recommendations.router)
    app.include_router(swipes.router)
    app.include_router(dashboard_candidate.router)
    app.include_router(dashboard_recruiter.router)
    app.include_router(applications.router)
    app.include_router(notifications.router)
    app.include_router(notification_preferences.router)  # Notification preference settings
    app.include_router(activity_feed.router)
    app.include_router(messages.router)  # Direct messaging system
    app.include_router(meetings.router)  # Meeting scheduler with email notifications
    app.include_router(calendar.router)  # Calendar & video provider OAuth integration
    app.include_router(analytics.router)  # Analytics & funnel metrics (no external deps)
    app.include_router(logs.router)  # Comprehensive logging system
    app.include_router(product_taxonomy.router)  # Product taxonomy for job postings/preferences
    app.include_router(admin_extended_router)  # Admin portal — extended features (Phase 2-7)
    app.include_router(admin.router)  # Admin portal management APIs
    app.include_router(invitations_router)  # Public invitation acceptance
    app.include_router(subscriptions_router)  # Subscription plans & purchases
    app.include_router(credits_router)  # Credits balance & transactions
    app.include_router(team_router)  # Team invitations & member management
    app.include_router(recommendations_v2_router)  # Recommendations V2 (gateway-backed)
    app.include_router(admin_recommendations_router)  # Admin: algorithm config & ops

    log_change_func(
        logger,
        action="startup_complete",
        entity_type="application",
        message="All routers registered successfully",
    )
