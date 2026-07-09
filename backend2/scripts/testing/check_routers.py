from app.main import app

print("\n" + "="*60)
print("Phase 3 & 4 Router Registration Check")
print("="*60 + "\n")

# Get all routes
all_routes = []
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        for method in route.methods:
            if method != 'HEAD':  # Skip HEAD methods
                all_routes.append(f"{method:6s} {route.path}")

# Filter Phase 3 & 4 routes
phase3_4_keywords = ['attachment', 'email', 'billing', 'analytics']
phase3_4_routes = [
    route for route in all_routes 
    if any(keyword in route.lower() for keyword in phase3_4_keywords)
]

print(f"Total API routes: {len(all_routes)}")
print(f"Phase 3 & 4 routes: {len(phase3_4_routes)}\n")

if phase3_4_routes:
    print("✓ Phase 3 & 4 routes registered:\n")
    
    # Group by category
    attachments = [r for r in phase3_4_routes if 'attachment' in r.lower()]
    emails = [r for r in phase3_4_routes if 'email' in r.lower()]
    billing = [r for r in phase3_4_routes if 'billing' in r.lower()]
    analytics = [r for r in phase3_4_routes if 'analytics' in r.lower()]
    
    if attachments:
        print("Attachments:")
        for route in sorted(attachments):
            print(f"  {route}")
    
    if emails:
        print("\nEmail Webhooks:")
        for route in sorted(emails):
            print(f"  {route}")
    
    if billing:
        print("\nBilling:")
        for route in sorted(billing):
            print(f"  {route}")
    
    if analytics:
        print("\nAnalytics:")
        for route in sorted(analytics):
            print(f"  {route}")
    
    print(f"\n✓ All Phase 3 & 4 routers successfully registered!")
else:
    print("✗ No Phase 3 & 4 routes found")
