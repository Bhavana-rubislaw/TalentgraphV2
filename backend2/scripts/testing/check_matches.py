"""Quick diagnostic: check matches and swipes for Lisa's company"""
from app.database import engine
from sqlmodel import Session, select
from app.models import Match, Swipe, Company, User

with Session(engine) as s:
    lisa = s.exec(select(User).where(User.email == "admin.lisa@globalsystems.com")).first()
    if lisa:
        comp = s.exec(select(Company).where(Company.user_id == lisa.id)).first()
        print(f"Lisa user_id={lisa.id}, company={comp.company_name}, company_id={comp.id}")
        all_comps = s.exec(select(Company).where(Company.company_name == comp.company_name)).all()
        comp_ids = [c.id for c in all_comps]
        print(f"All company_ids: {comp_ids}")

        swipes = s.exec(select(Swipe).where(Swipe.company_id.in_(comp_ids))).all()
        print(f"\nSwipes for Global Systems: {len(swipes)}")
        for sw in swipes:
            print(f"  cand={sw.candidate_id}, action={sw.action}, by={sw.action_by}, comp_id={sw.company_id}")

        matches = s.exec(select(Match).where(Match.company_id.in_(comp_ids))).all()
        print(f"\nMatches for Global Systems: {len(matches)}")
        for m in matches:
            print(f"  cand={m.candidate_id}, cand_liked={m.candidate_liked}, comp_liked={m.company_liked}, match%={m.match_percentage}")

    all_matches = s.exec(select(Match)).all()
    print(f"\n--- All matches in DB: {len(all_matches)} ---")
    for m in all_matches:
        c = s.get(Company, m.company_id)
        cname = c.company_name if c else "?"
        print(f"  id={m.id} cand={m.candidate_id} comp_id={m.company_id}({cname}) cand_liked={m.candidate_liked} comp_liked={m.company_liked}")

    all_swipes = s.exec(select(Swipe)).all()
    print(f"\n--- All swipes in DB: {len(all_swipes)} ---")
    for sw in all_swipes:
        c = s.get(Company, sw.company_id) if sw.company_id else None
        cname = c.company_name if c else "?"
        print(f"  cand={sw.candidate_id} comp={sw.company_id}({cname}) action={sw.action} by={sw.action_by}")
