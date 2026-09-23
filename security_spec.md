# Security Specification & "Dirty Dozen" Test Spec

This document details the critical data invariants, access policies, and validation gates designed to protect the **Feira Fácil** Firestore database from unauthorized operations, data tampering, and "Denial of Wallet" resource exhaustion attacks.

## 1. Core Data Invariants

1. **User Ownership Isolation (Row-Level Security):**
   - Users can only read, create, update, or delete their own data (`userId == request.auth.uid`).
   - A user profile must match the user's authentic `request.auth.uid`.

2. **Temporal Integrity (Strict Timestamps):**
   - The creation and last modification timestamps (`createdAt`, `updatedAt`) must strictly match `request.time` (server-side evaluation) on creation or mutation.

3. **Data Shape Integrity (Type & Value Bounds):**
   - Product titles must be string of maximum length 100 to prevent oversized string attacks.
   - Prices, quantities, and other numerical values must be valid, non-negative numbers.

---

## 2. The "Dirty Dozen" Vulnerability Attacks (Strictly Rejected)

The following malicious payloads must be strictly blocked and return `PERMISSION_DENIED`:

### Identity Spoofing & Ownership Attacks
1. **The Hijacker (Product Creation):** Attempting to register a product with a `userId` belonging to another user.
2. **The Silhouette (User Profile Mutation):** Authenticated user `A` trying to update user profile `B`'s email address or details.
3. **The Interceptor (Purchase List Query):** Attempting to perform a list/get query for shopping lists that belong to a different `userId`.

### Schema & Structural Violations
4. **The Ghost Field (Extra fields):** Attempting to insert unapproved shadow/system fields inside products or purchases (e.g., `isVerified: true`).
5. **The Titan Payload (ID Poisoning / Buffer Overflow):** Sending a 1.5KB string as a Document ID or using invalid characters (`$`, `*`, `?`) to disrupt index query patterns.
6. **Negative Value Poisoning:** Trying to create or update an item with a negative quantity (`quantity: -10`) or negative unit price.

### Temporal & State Lock Attacks
7. **The Time Traveler:** Client trying to hardcode custom creation timestamps (`createdAt` in the past or future) instead of using the server's `request.time`.
8. **The Immutable Mutator:** Attempting to alter immutable system fields (e.g., `createdAt` during a product or purchase update).
9. **Terminal State Locking Bypass:** Attempting to update or add items to a shopping list after its status is marked as `completed` (finalized list lock).

### Relation Sync & Nested Write Violations
1. **The Orphan Maker (Subcollection Isolation):** Attempting to add item entries under a purchase subcollection where the parent purchase record belongs to another user.
2. **Privilege Escalation (Self-Assigned Admin):** Adding an `role: "admin"` field or similar flag directly in the user document to elevate platform rights.
3. **The Blank Card Attack:** Sending an empty name or missing required fields in categories or products.

---

## 3. Secure Firestore Rules Definition

Let's now generate the corresponding `firestore.rules` file to prevent every attack from the "Dirty Dozen".
