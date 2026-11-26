# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Fixed Shared Room Path Isolation**: `/tripRooms` cannot be listed publicly (`allow list: if isSignedIn() && existing().ownerId == request.auth.uid;`). The family Europe trip lives at the fixed room `/tripRooms/EUROPE202701` (`2027-01-14` ~ `2027-01-28`) with no invite-code or login barrier for family members.
2. **Login-Free Family Access**: Family members (including elementary school kids) can initialize `EUROPE202701` if absent, read the map, itinerary, diary, and wishlist, update traveler status/GPS (within trip dates), vote, and add/edit/delete itinerary, diary, and wishlist entries without logging in.
3. **No Arbitrary Room Creation Spam**: Unauthenticated `create` on `/tripRooms/{roomId}` is strictly limited to `roomId == 'EUROPE202701'` with `ownerId == 'family_shared'`; any other room requires a verified Google account (`isVerified()`).
4. **No PII Exposure**: No email, phone number, or home address fields are stored in any shared `tripRooms` collection.
5. **Strict Schema & Size Guards**: Every create and update invokes a dedicated `isValid*` blueprint check enforcing exact keys (`hasAll` + `hasOnly`), string `.size()` limits, bounded arrays, and `request.time` timestamp integrity.

## 2. Adversarial Tests
- Listing `/tripRooms` while unauthenticated -> DENIED.
- Creating an arbitrary room `/tripRooms/SPAMROOM1` while unauthenticated -> DENIED.
- Shadow field injection (`isAdmin: true`) on any write -> DENIED (`keys().hasOnly(...)`).
- Oversized photo (`> 250000` chars) -> DENIED.
- Client-forged `createdAt` or `updatedAt` timestamps -> DENIED (`== request.time`).
