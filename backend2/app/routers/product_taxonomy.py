"""
Product Taxonomy Router - Vendor/Product/Role Management
=========================================================

Provides APIs for accessing and managing the product taxonomy system.
Used by both candidate job preferences and recruiter job postings.

Endpoints:
- GET /vendors - List all vendors (searchable)
- GET /vendors/{vendor_id}/product-types - Get product types for a vendor
- GET /product-types/{type_id}/roles - Get roles for a product type
- POST /vendors/custom - Create custom vendor
- POST /product-types/custom - Create custom product type
- POST /roles/custom - Create custom role
- GET /search - Global search across taxonomy
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_, func
from app.database import get_session
from app.models import ProductVendor, ProductType, ProductRole, User
from app.security import get_current_user
from pydantic import BaseModel


router = APIRouter(prefix="/product-taxonomy", tags=["Product Taxonomy"])


# ============ RESPONSE SCHEMAS ============

class VendorResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_custom: bool
    usage_count: int
    
    class Config:
        from_attributes = True


class ProductTypeResponse(BaseModel):
    id: int
    vendor_id: int
    name: str
    description: Optional[str]
    is_custom: bool
    usage_count: int
    
    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    product_type_id: int
    name: str
    description: Optional[str]
    is_custom: bool
    usage_count: int
    
    class Config:
        from_attributes = True


class VendorWithTypesResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    product_types: List[ProductTypeResponse]
    
    class Config:
        from_attributes = True


class ProductTypeWithRolesResponse(BaseModel):
    id: int
    vendor_id: int
    name: str
    description: Optional[str]
    roles: List[RoleResponse]
    
    class Config:
        from_attributes = True


class CustomVendorCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CustomProductTypeCreate(BaseModel):
    vendor_id: int
    name: str
    description: Optional[str] = None


class CustomRoleCreate(BaseModel):
    product_type_id: int
    name: str
    description: Optional[str] = None


class TaxonomySearchResult(BaseModel):
    vendors: List[VendorResponse]
    product_types: List[ProductTypeResponse]
    roles: List[RoleResponse]


# ============ ENDPOINTS ============

@router.get("/vendors", response_model=List[VendorResponse])
def get_vendors(
    search: Optional[str] = Query(None, description="Search vendors by name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session)
):
    """
    Get list of product vendors
    
    - Supports search by name
    - Returns most popular vendors first (by usage_count)
    - Only returns active vendors
    """
    query = select(ProductVendor).where(ProductVendor.is_active == True)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(ProductVendor.name.ilike(search_pattern))
    
    query = query.order_by(ProductVendor.usage_count.desc(), ProductVendor.name).limit(limit).offset(offset)
    
    vendors = session.exec(query).all()
    return vendors


@router.get("/vendors/{vendor_id}", response_model=VendorWithTypesResponse)
def get_vendor_with_types(
    vendor_id: int,
    session: Session = Depends(get_session)
):
    """
    Get a specific vendor with all its product types
    """
    vendor = session.get(ProductVendor, vendor_id)
    if not vendor or not vendor.is_active:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Load product types
    product_types = session.exec(
        select(ProductType)
        .where(ProductType.vendor_id == vendor_id)
        .where(ProductType.is_active == True)
        .order_by(ProductType.usage_count.desc(), ProductType.name)
    ).all()
    
    return VendorWithTypesResponse(
        id=vendor.id,
        name=vendor.name,
        description=vendor.description,
        product_types=[
            ProductTypeResponse(
                id=pt.id,
                vendor_id=pt.vendor_id,
                name=pt.name,
                description=pt.description,
                is_custom=pt.is_custom,
                usage_count=pt.usage_count
            ) for pt in product_types
        ]
    )


@router.get("/vendors/{vendor_id}/product-types", response_model=List[ProductTypeResponse])
def get_product_types_for_vendor(
    vendor_id: int,
    search: Optional[str] = Query(None, description="Search product types by name"),
    session: Session = Depends(get_session)
):
    """
    Get all product types for a specific vendor
    
    - Supports search by name
    - Returns most popular types first
    """
    vendor = session.get(ProductVendor, vendor_id)
    if not vendor or not vendor.is_active:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    query = select(ProductType).where(
        ProductType.vendor_id == vendor_id,
        ProductType.is_active == True
    )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(ProductType.name.ilike(search_pattern))
    
    query = query.order_by(ProductType.usage_count.desc(), ProductType.name)
    
    product_types = session.exec(query).all()
    return product_types


@router.get("/product-types/{type_id}", response_model=ProductTypeWithRolesResponse)
def get_product_type_with_roles(
    type_id: int,
    session: Session = Depends(get_session)
):
    """
    Get a specific product type with all its roles
    """
    product_type = session.get(ProductType, type_id)
    if not product_type or not product_type.is_active:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Load roles
    roles = session.exec(
        select(ProductRole)
        .where(ProductRole.product_type_id == type_id)
        .where(ProductRole.is_active == True)
        .order_by(ProductRole.usage_count.desc(), ProductRole.name)
    ).all()
    
    return ProductTypeWithRolesResponse(
        id=product_type.id,
        vendor_id=product_type.vendor_id,
        name=product_type.name,
        description=product_type.description,
        roles=[
            RoleResponse(
                id=role.id,
                product_type_id=role.product_type_id,
                name=role.name,
                description=role.description,
                is_custom=role.is_custom,
                usage_count=role.usage_count
            ) for role in roles
        ]
    )


@router.get("/product-types/{type_id}/roles", response_model=List[RoleResponse])
def get_roles_for_product_type(
    type_id: int,
    search: Optional[str] = Query(None, description="Search roles by name"),
    session: Session = Depends(get_session)
):
    """
    Get all roles for a specific product type
    
    - Supports search by name
    - Returns most popular roles first
    """
    product_type = session.get(ProductType, type_id)
    if not product_type or not product_type.is_active:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    query = select(ProductRole).where(
        ProductRole.product_type_id == type_id,
        ProductRole.is_active == True
    )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(ProductRole.name.ilike(search_pattern))
    
    query = query.order_by(ProductRole.usage_count.desc(), ProductRole.name)
    
    roles = session.exec(query).all()
    return roles


@router.get("/search", response_model=TaxonomySearchResult)
def search_taxonomy(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Global search across vendors, product types, and roles
    
    Returns matching results from all three tables
    """
    search_pattern = f"%{q}%"
    
    # Search vendors
    vendors = session.exec(
        select(ProductVendor)
        .where(ProductVendor.is_active == True)
        .where(ProductVendor.name.ilike(search_pattern))
        .order_by(ProductVendor.usage_count.desc())
        .limit(limit)
    ).all()
    
    # Search product types
    product_types = session.exec(
        select(ProductType)
        .where(ProductType.is_active == True)
        .where(ProductType.name.ilike(search_pattern))
        .order_by(ProductType.usage_count.desc())
        .limit(limit)
    ).all()
    
    # Search roles
    roles = session.exec(
        select(ProductRole)
        .where(ProductRole.is_active == True)
        .where(ProductRole.name.ilike(search_pattern))
        .order_by(ProductRole.usage_count.desc())
        .limit(limit)
    ).all()
    
    return TaxonomySearchResult(
        vendors=[VendorResponse.model_validate(v) for v in vendors],
        product_types=[ProductTypeResponse.model_validate(pt) for pt in product_types],
        roles=[RoleResponse.model_validate(r) for r in roles]
    )


@router.post("/vendors/custom", response_model=VendorResponse)
def create_custom_vendor(
    vendor_data: CustomVendorCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a custom vendor (user-generated)
    
    Requires authentication. Sets is_custom=True and tracks creator.
    """
    # Check if vendor already exists
    existing = session.exec(
        select(ProductVendor).where(ProductVendor.name == vendor_data.name)
    ).first()
    
    if existing:
        if not existing.is_active:
            # Reactivate if it was soft-deleted
            existing.is_active = True
            session.commit()
            session.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="Vendor already exists")
    
    vendor = ProductVendor(
        name=vendor_data.name,
        description=vendor_data.description,
        is_custom=True,
        created_by=current_user.id,
        is_active=True
    )
    session.add(vendor)
    session.commit()
    session.refresh(vendor)
    
    return vendor


@router.post("/product-types/custom", response_model=ProductTypeResponse)
def create_custom_product_type(
    type_data: CustomProductTypeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a custom product type (user-generated)
    
    Requires authentication. Sets is_custom=True and tracks creator.
    """
    # Verify vendor exists
    vendor = session.get(ProductVendor, type_data.vendor_id)
    if not vendor or not vendor.is_active:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if product type already exists
    existing = session.exec(
        select(ProductType).where(
            ProductType.vendor_id == type_data.vendor_id,
            ProductType.name == type_data.name
        )
    ).first()
    
    if existing:
        if not existing.is_active:
            existing.is_active = True
            session.commit()
            session.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="Product type already exists")
    
    product_type = ProductType(
        vendor_id=type_data.vendor_id,
        name=type_data.name,
        description=type_data.description,
        is_custom=True,
        created_by=current_user.id,
        is_active=True
    )
    session.add(product_type)
    session.commit()
    session.refresh(product_type)
    
    return product_type


@router.post("/roles/custom", response_model=RoleResponse)
def create_custom_role(
    role_data: CustomRoleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a custom role (user-generated)
    
    Requires authentication. Sets is_custom=True and tracks creator.
    """
    # Verify product type exists
    product_type = session.get(ProductType, role_data.product_type_id)
    if not product_type or not product_type.is_active:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Check if role already exists
    existing = session.exec(
        select(ProductRole).where(
            ProductRole.product_type_id == role_data.product_type_id,
            ProductRole.name == role_data.name
        )
    ).first()
    
    if existing:
        if not existing.is_active:
            existing.is_active = True
            session.commit()
            session.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="Role already exists")
    
    role = ProductRole(
        product_type_id=role_data.product_type_id,
        name=role_data.name,
        description=role_data.description,
        is_custom=True,
        created_by=current_user.id,
        is_active=True
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    
    return role


@router.post("/vendors/{vendor_id}/increment-usage")
def increment_vendor_usage(
    vendor_id: int,
    session: Session = Depends(get_session)
):
    """
    Increment usage count for a vendor (called when used in job posting/preference)
    """
    vendor = session.get(ProductVendor, vendor_id)
    if vendor:
        vendor.usage_count += 1
        session.commit()
    return {"message": "Usage count incremented"}


@router.post("/product-types/{type_id}/increment-usage")
def increment_product_type_usage(
    type_id: int,
    session: Session = Depends(get_session)
):
    """
    Increment usage count for a product type
    """
    product_type = session.get(ProductType, type_id)
    if product_type:
        product_type.usage_count += 1
        session.commit()
    return {"message": "Usage count incremented"}


@router.post("/roles/{role_id}/increment-usage")
def increment_role_usage(
    role_id: int,
    session: Session = Depends(get_session)
):
    """
    Increment usage count for a role
    """
    role = session.get(ProductRole, role_id)
    if role:
        role.usage_count += 1
        session.commit()
    return {"message": "Usage count incremented"}
