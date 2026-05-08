# StyleMate Security Specification

## Data Invariants
1. A clothing item must belong to the authenticated user (`userId` match).
2. An outfit must contain at least one item and belong to the user.
3. Users cannot modify global `inspiration` documents.
4. Timestamps (`createdAt`) must be server-generated.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a clothing item with `userId` of another user.
2. **Shadow Field**: Adding `isAdmin: true` to a user profile.
3. **Resource Exhaustion**: Sending a 1MB string as a category name.
4. **Invalid ID**: Using `../illegal/path` as a document ID.
5. **PII Leak**: Attempting to read another user's private preferences.
6. **Relation Orphan**: Creating an outfit referencing a non-existent clothing item (logic-side check needed, rules can check user ownership).
7. **Immutability Breach**: Changing the `createdAt` timestamp of a clothing item.
8. **Type Mismatch**: Sending `styles: "casual"` (string instead of array).
9. **Global Write**: Attempting to `set` a document in `/inspiration/`.
10. **State Shortcut**: Forcing an outfit to be "saved" without proper validation.
11. **Null ID**: Creating a record with an empty string ID.
12. **Batch Injection**: Attempting to update a user's `email` through a subcollection write (if incorrectly nested).

## Firestore Rules Logic
The rules will implement:
- `isValidId(id)`
- `isValidUser(data)`
- `isValidClothing(data)`
- `isValidOutfit(data)`
- Strict `affectedKeys().hasOnly()` for updates.
