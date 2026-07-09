# Design Document: Credits, Subscription, and Team Management

## 1. Introduction

This document outlines the proposed design for integrating a credits and subscription model, along with enhanced team management features, into the TalentgraphV2 platform. The current system primarily relies on individual user accounts with a `UserRole` and infers company affiliation through a shared `company_name` in the `Company` model. This design aims to introduce a more robust and scalable solution for company-level features.

## 2. Current System Overview

Based on the exploration of the `TalentgraphV2` repository, the following key observations are relevant:

*   **User Model (`app/models.py`):** The `User` model includes `id`, `email`, `full_name`, `password_hash`, `role` (CANDIDATE, ADMIN, HR, RECRUITER), and `is_active`.
*   **Company Model (`app/models.py`):** The `Company` model is linked to a `User` via `user_id` and includes `company_name`, `company_email`, and `employee_type`. Crucially, team members within the same company are currently identified by having the same `company_name`.
*   **Authentication (`app/routers/auth.py`):** Company sign-up creates a `User` and a `Company` record. Each company user (ADMIN, HR, RECRUITER) gets their own `Company` entry, with `company_name` initially blank and `employee_type` set based on the chosen role.
*   **Dashboard (`app/routers/dashboard.py`):** The backend dashboard logic for company users aggregates data by `company_name`, allowing cross-user access for job postings, recommendations, etc. The existing team management endpoint (`/dashboard/team-members`) also relies on `company_name` to list team members.
*   **Frontend (`frontend2/src/App.tsx`, `frontend2/src/pages/RecruiterDashboardNew.tsx`):** The frontend uses `localStorage` to store user role and `company_name` for routing and displaying content. The `RecruiterDashboardNew.tsx` has a partial team section that displays members based on the `canManageTeam` flag derived from `isAdmin` or `isHR`.

## 3. Proposed Database Schema Changes

To support the new features, the following additions and modifications to the database schema are proposed:

### 3.1. New Tables for Credits and Subscriptions

**`SubscriptionPlan` Table:**

| Field Name        | Data Type | Description                                        | Constraints          |
| :---------------- | :-------- | :------------------------------------------------- | :------------------- |
| `id`              | INT       | Primary Key                                        | AUTO_INCREMENT, PK   |
| `name`            | VARCHAR   | Name of the subscription plan (e.g., "Basic", "Pro") | UNIQUE, NOT NULL     |
| `description`     | TEXT      | Description of the plan                            |                      |
| `price`           | DECIMAL   | Monthly/Annual price of the plan                   | NOT NULL             |
| `currency`        | VARCHAR   | Currency of the price (e.g., "USD")                | NOT NULL             |
| `credits_included`| INT       | Number of credits included in the plan             | NOT NULL, DEFAULT 0  |
| `job_post_limit`  | INT       | Maximum job postings allowed                       | NOT NULL, DEFAULT 0  |
| `team_member_limit`| INT       | Maximum team members allowed                       | NOT NULL, DEFAULT 1  |
| `is_active`       | BOOLEAN   | Whether the plan is currently active               | NOT NULL, DEFAULT TRUE|
| `created_at`      | DATETIME  | Timestamp of creation                              | DEFAULT CURRENT_TIMESTAMP |
| `updated_at`      | DATETIME  | Timestamp of last update                           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

**`CompanySubscription` Table:**

| Field Name        | Data Type | Description                                        | Constraints          |
| :---------------- | :-------- | :------------------------------------------------- | :------------------- |
| `id`              | INT       | Primary Key                                        | AUTO_INCREMENT, PK   |
| `company_id`      | INT       | Foreign key to the `Company` table                 | FK (`Company.id`), NOT NULL |
| `plan_id`         | INT       | Foreign key to the `SubscriptionPlan` table        | FK (`SubscriptionPlan.id`), NOT NULL |
| `start_date`      | DATETIME  | Subscription start date                            | NOT NULL             |
| `end_date`        | DATETIME  | Subscription end date                              | NOT NULL             |
| `status`          | VARCHAR   | Subscription status (e.g., "active", "cancelled", "expired") | NOT NULL             |
| `auto_renew`      | BOOLEAN   | Whether the subscription auto-renews               | NOT NULL, DEFAULT TRUE|
| `created_at`      | DATETIME  | Timestamp of creation                              | DEFAULT CURRENT_TIMESTAMP |
| `updated_at`      | DATETIME  | Timestamp of last update                           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

**`CreditTransaction` Table:**

| Field Name        | Data Type | Description                                        | Constraints          |
| :---------------- | :-------- | :------------------------------------------------- | :------------------- |
| `id`              | INT       | Primary Key                                        | AUTO_INCREMENT, PK   |
| `company_id`      | INT       | Foreign key to the `Company` table                 | FK (`Company.id`), NOT NULL |
| `type`            | VARCHAR   | Type of transaction (e.g., "purchase", "usage", "bonus") | NOT NULL             |
| `amount`          | INT       | Number of credits added or deducted                | NOT NULL             |
| `description`     | TEXT      | Description of the transaction                     |                      |
| `transaction_date`| DATETIME  | Timestamp of the transaction                       | DEFAULT CURRENT_TIMESTAMP |

### 3.2. Modifications to Existing Tables

**`Company` Table:**

*   **Add `current_credits`:** An integer field to store the current credit balance for the company. Default to 0.
*   **Add `parent_company_id`:** An optional integer field, foreign key to `Company.id`, to link team members to a primary company account. This will replace the reliance on `company_name` for team affiliation. If `parent_company_id` is NULL, the `Company` record itself is considered the primary company account.
*   **Add `is_primary_account`:** A boolean field, default to FALSE, to explicitly mark if this `Company` record represents the primary account for a company (i.e., the one holding the subscription and credits). This would be TRUE if `parent_company_id` is NULL.

| Field Name        | Data Type | Description                                        | Constraints          |
| :---------------- | :-------- | :------------------------------------------------- | :------------------- |
| `current_credits` | INT       | Current credit balance for the company             | NOT NULL, DEFAULT 0  |
| `parent_company_id`| INT       | FK to `Company.id` (self-referencing)              | NULLABLE             |
| `is_primary_account`| BOOLEAN   | Indicates if this is the primary company account   | NOT NULL, DEFAULT FALSE |

**`User` Table:**

*   No direct changes to the `User` table are strictly necessary for credits/subscriptions, but the `role` field will be crucial for team management permissions.

## 4. Proposed API Endpoints

### 4.1. Credits and Subscription Endpoints

*   **`POST /subscriptions/plans`:** Create a new subscription plan (Admin only).
*   **`GET /subscriptions/plans`:** Get all available subscription plans.
*   **`GET /subscriptions/my`:** Get the current company's subscription details.
*   **`POST /subscriptions/purchase`:** Purchase a new subscription for the company.
*   **`POST /subscriptions/cancel`:** Cancel the current company's subscription.
*   **`GET /credits/balance`:** Get the current company's credit balance.
*   **`POST /credits/purchase`:** Purchase additional credits for the company.
*   **`GET /credits/transactions`:** Get the credit transaction history for the company.

### 4.2. Team Management Endpoints

*   **`POST /company/team/invite`:** Invite a new user to join the company's team (Admin/HR only). This would generate an invitation token.
*   **`POST /company/team/accept-invite`:** A new user accepts an invitation to join a company.
*   **`GET /company/team/members`:** Get a list of all team members for the current company (Admin/HR only).
*   **`PUT /company/team/members/{user_id}/role`:** Update a team member's role (Admin only).
*   **`DELETE /company/team/members/{user_id}`:** Remove a team member from the company (Admin only).

## 5. Team Management Architecture

The core change for team management is to move away from `company_name` inference to an explicit `parent_company_id` relationship. When a new company signs up, the first user (e.g., an Admin) will create a `Company` record with `is_primary_account = TRUE` and `parent_company_id = NULL`. Subsequent team members invited by this primary account will have their `Company` records linked to this primary account via `parent_company_id`.

### 5.1. User Roles and Permissions

*   **Admin:** Full control over subscriptions, credits, and team members (invite, remove, change roles). Can view all company data.
*   **HR:** Can invite and remove team members (excluding other Admins), view team member details, and potentially view credit usage (but not purchase/manage subscriptions).
*   **Recruiter:** Can view their own job postings and related data. Cannot manage team members or subscriptions.

### 5.2. HR Dashboard Enhancements

The HR dashboard will be extended to include:

*   **Team Member List:** Display all team members, their roles, and status (active/inactive).
*   **Invite Team Member:** A form to send invitations to new team members.
*   **Manage Team Member:** Options to change a team member's role or remove them from the team.
*   **Credit Usage Overview:** A read-only view of credit consumption for job postings and other features.

### 5.3. Admin Dashboard Enhancements

The Admin dashboard will encompass all HR functionalities and additionally include:

*   **Subscription Management:** View, purchase, and cancel subscription plans.
*   **Credit Management:** View balance, purchase credits, and view transaction history.
*   **Full Team Management:** Complete control over all team members, including other Admins.
*   **Company Settings:** Manage primary company details.

## 6. Frontend Integration

*   **`RecruiterDashboardNew.tsx`:** This component will be updated to conditionally render the new HR/Admin specific sections based on the `userRole` and `is_primary_account` status.
*   **New Components:** Dedicated React components will be created for subscription management, credit management, and team member invitation/management forms.
*   **API Client (`src/api/client.ts`):** New functions will be added to interact with the proposed backend API endpoints.

## 7. Migration Strategy

Existing company users will need a migration strategy. One approach is to:

1.  Identify all `Company` records with the same `company_name`.
2.  Designate one of them (e.g., the oldest `ADMIN` user) as the `is_primary_account = TRUE` and set its `parent_company_id = NULL`.
3.  Link all other `Company` records with the same `company_name` to this primary account by setting their `parent_company_id` to the `id` of the primary company account.
4.  The `current_credits` for the primary account can be initialized to a default value or zero.

## 8. Future Considerations

*   **Payment Gateway Integration:** Integration with a payment gateway (e.g., Stripe) for subscription and credit purchases.
*   **Usage Tracking:** Detailed tracking of credit consumption for various actions (e.g., job posting views, candidate contact).
*   **Audit Logs:** Implement audit logs for critical actions like subscription changes, credit adjustments, and team member modifications.

This design provides a comprehensive framework for implementing the requested features. The next steps will involve refining these designs and proceeding with backend and frontend implementation.
