# UniCharge Firestore Security Specification

## 1. Data Invariants
1. Every notification under `/notifications/{notificationId}` must be owned by a verified authenticated user (`userUid == request.auth.uid`, `email_verified == true`) and use a bounded alphanumeric/hyphen/underscore ID (`^[a-zA-Z0-9_\\-]+$`, <= 128 chars).
2. A notification cannot contain extra shadow keys (`hasOnly` enforced) or exceed volumetric limits (`stationName <= 120`, `title <= 120`, `message <= 400`, `slotNumber` in `1..64`).
3. New notifications must start unread (`read == false`) with server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
4. Standard owners can only transition an unread notification (`existing().read == false`) to read (`incoming().read == true`) touching strictly `['read', 'updatedAt']` with `updatedAt == request.time`. Terminal read notifications cannot be reverted back to unread by non-admins.
5. `list` queries strictly enforce `resource.data.userUid == request.auth.uid` with zero `get()`/`exists()` calls.
6. Admin markers under `/admins/{adminId}` are never writable by clients and cannot be listed.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read/list on `/notifications` -> `PERMISSION_DENIED`.
2. Verified user creating notification with `userUid` spoofed to another student -> `PERMISSION_DENIED`.
3. Unverified email (`email_verified == false`) creating or reading notification -> `PERMISSION_DENIED`.
4. Shadow field injection (`{ ..., isAdmin: true }`) on create -> `PERMISSION_DENIED`.
5. Oversized `message` (> 400 chars) or `title` (> 120 chars) -> `PERMISSION_DENIED`.
6. Invalid `type: "promo_spam"` outside `['charge_complete', 'unexpected_door_open']` -> `PERMISSION_DENIED`.
7. Client-forged `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
8. Document ID poisoning (`notificationId` > 128 chars or containing invalid symbols) -> `PERMISSION_DENIED`.
9. Non-owner student reading or deleting another student's `/notifications/{id}` -> `PERMISSION_DENIED`.
10. Unfiltered `list` query missing `where('userUid', '==', uid)` -> `PERMISSION_DENIED`.
11. Owner attempting to modify `type`, `severity`, or `message` on update -> `PERMISSION_DENIED`.
12. Owner attempting to revert a terminal `read: true` notification back to `read: false` -> `PERMISSION_DENIED`.
