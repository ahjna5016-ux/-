# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Invite-Code Path Isolation**: `/tripRooms/{inviteCode}` cannot be listed (`allow list: if false`). Access to any room or subcollection requires knowing the exact 6–12 character uppercase alphanumeric `inviteCode` in the document path (`^[A-Z0-9]{6,12}$`).
2. **Login-Free Family Access**: Family members (including elementary school kids and relatives at home) who have the invite code can read the map, itinerary, diary, and wishlist, update traveler locations, vote, and add itinerary/diary/wishlist entries without logging in.
3. **Owner-Protected Creation & Deletion**: Creating a new trip room and deleting a trip room or its items/entries/wishlist requires an authenticated Google user whose `uid` matches `tripRooms/{inviteCode}.ownerId`.
4. **No PII Exposure**: No email, phone number, or home address fields are stored in any shared `tripRooms` collection.
5. **Strict Schema & Size Guards**: Every create and update invokes a dedicated `isValid*` blueprint check enforcing exact keys (`hasAll` + `hasOnly`), string `.size()` limits, bounded arrays, and `request.time` timestamp integrity.

## 2. Adversarial Tests
- Listing `/tripRooms` directly -> DENIED (`allow list: if false`).
- Reading `/tripRooms/BAD` (invalid short invite code) -> DENIED (`isValidInviteCode`).
- Deleting a diary entry or itinerary item without being the signed-in owner -> DENIED.
- Shadow field injection (`isAdmin: true`) on any write -> DENIED (`keys().hasOnly(...)`).
- Oversized photo (`> 250000` chars) -> DENIED.
