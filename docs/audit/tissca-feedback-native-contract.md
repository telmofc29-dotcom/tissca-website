# TISSCA Feedback — Native App Contract

**Version:** Phase 2  
**Date:** 2026-05-25  
**Applies to:** Android app, iOS app  
**Maintained by:** TISSCA Engineering

---

## Overview

Native Android and iOS apps submit user feedback to the same endpoint as the website.
The server handles all routing, storage, and admin triage via the Supabase `feedback` table.

---

## Endpoint

```
POST /api/feedback
```

Base URL: `https://tissca.com` (production)

---

## Authentication

| Scenario | Header | Behaviour |
|---|---|---|
| Authenticated user | `Authorization: Bearer <supabase_access_token>` | Server extracts `user_id` and `workspace_id` from token. Client MUST NOT send these fields — they are ignored from the body. |
| Anonymous / unauthenticated | Omit header | Submission is accepted. `user_id` and `workspace_id` will be `null` in DB. |

**Security rule:** `user_id` is **never** read from the request body. It is always derived server-side from the validated Supabase access token. Sending a `user_id` in the body has no effect.

---

## Rate Limit

- **10 submissions per IP per minute**
- Response on breach: `429 Too Many Requests`

---

## Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>   ← strongly recommended for authenticated users
```

---

## JSON Payload

### Required fields

| Field | Type | Description |
|---|---|---|
| `type` | `string` | `"help"` \| `"issue"` \| `"suggestion"` \| `"review"` \| `"cancellation"` |
| `headline` | `string` | Short title / summary. Max 500 chars recommended. |
| `description` | `string` | Full message body. Max 5000 chars recommended. |
| `platform` | `string` | Must be `"android"` or `"ios"`. |
| `appVersion` | `string` | Semantic version, e.g. `"2.1.0"` |
| `buildNumber` | `string` | Version code / build number, e.g. `"210"` |

### Optional fields

| Field | Type | Description |
|---|---|---|
| `url` | `string` | Screen name or deep-link path, e.g. `"/app/invoices"` or `"InvoiceDetailScreen"` |
| `section` | `string` | App section — see Section Values below. Defaults to path-derived value. |
| `rating` | `number` | Integer 1–5. Only used when `type` is `"review"`. |
| `userEmail` | `string` | User's email. Prefer omitting for authenticated users (server reads from profile). |
| `osVersion` | `string` | e.g. `"Android 14"` or `"iOS 17.4"` |
| `deviceModel` | `string` | e.g. `"Pixel 8"` or `"iPhone 15 Pro"` |
| `screenshots` | `string[]` | CDN/storage URLs. **Max 10 items.** Each URL ≤ 2048 chars. |
| `alphaTester` | `boolean` | Set `true` for internal alpha/beta builds. |

### Fields intentionally excluded from payload

| Field | Reason |
|---|---|
| `user_id` | Derived server-side from Bearer token. Sending it has no effect. |
| `workspace_id` | Derived server-side from user's profile. Sending it has no effect. |
| `status` | Always set to `"new"` by the server on creation. |
| `admin_reply` | Write-protected to staff only. |
| `triage_tags` | Write-protected to staff only. |
| `internal_notes` | Write-protected to staff only. |

---

## Android Example

```kotlin
// Kotlin / Retrofit

data class FeedbackPayload(
    val type: String,
    val headline: String,
    val description: String,
    val platform: String = "android",
    val appVersion: String,
    val buildNumber: String,
    val url: String? = null,
    val section: String? = null,
    val rating: Int? = null,
    val userEmail: String? = null,
    val osVersion: String? = null,
    val deviceModel: String? = null,
    val screenshots: List<String>? = null,
    val alphaTester: Boolean = false,
)

// Usage
val payload = FeedbackPayload(
    type = "issue",
    headline = "Invoice PDF not loading",
    description = "When I tap View PDF on invoice INV-0042, the app shows a blank screen.",
    platform = "android",
    appVersion = BuildConfig.VERSION_NAME,          // e.g. "2.1.0"
    buildNumber = BuildConfig.VERSION_CODE.toString(), // e.g. "210"
    url = "InvoiceDetailScreen",
    section = "quotes-invoices",
    osVersion = "Android ${Build.VERSION.RELEASE}",
    deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
    alphaTester = BuildConfig.IS_ALPHA_BUILD,
)

// POST with auth header
val response = feedbackApi.submit(
    authorization = "Bearer $supabaseAccessToken",
    body = payload
)
```

**Raw JSON sent:**
```json
{
  "type": "issue",
  "headline": "Invoice PDF not loading",
  "description": "When I tap View PDF on invoice INV-0042, the app shows a blank screen.",
  "platform": "android",
  "appVersion": "2.1.0",
  "buildNumber": "210",
  "url": "InvoiceDetailScreen",
  "section": "quotes-invoices",
  "osVersion": "Android 14",
  "deviceModel": "Google Pixel 8",
  "alphaTester": false
}
```

---

## iOS Example

```swift
// Swift

struct FeedbackPayload: Encodable {
    let type: String
    let headline: String
    let description: String
    let platform: String
    let appVersion: String
    let buildNumber: String
    var url: String? = nil
    var section: String? = nil
    var rating: Int? = nil
    var userEmail: String? = nil
    var osVersion: String? = nil
    var deviceModel: String? = nil
    var screenshots: [String]? = nil
    var alphaTester: Bool = false
}

// Usage
let payload = FeedbackPayload(
    type: "suggestion",
    headline: "Add dark mode to planner",
    description: "The planner canvas is very bright at night. Dark mode would help.",
    platform: "ios",
    appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
    buildNumber: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "",
    url: "PlannerCanvasView",
    section: "member-app",
    osVersion: "iOS \(UIDevice.current.systemVersion)",
    deviceModel: UIDevice.current.model,
    alphaTester: false
)

// POST with auth header
var request = URLRequest(url: URL(string: "https://tissca.com/api/feedback")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("Bearer \(supabaseSession.accessToken)", forHTTPHeaderField: "Authorization")
request.httpBody = try JSONEncoder().encode(payload)
```

**Raw JSON sent:**
```json
{
  "type": "suggestion",
  "headline": "Add dark mode to planner",
  "description": "The planner canvas is very bright at night. Dark mode would help.",
  "platform": "ios",
  "appVersion": "2.1.0",
  "buildNumber": "210",
  "url": "PlannerCanvasView",
  "section": "member-app",
  "osVersion": "iOS 17.4",
  "deviceModel": "iPhone",
  "alphaTester": false
}
```

---

## Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "id": "FB-1716624000000-abc1234",
  "message": "Feedback submitted successfully"
}
```

---

## Error Responses

| Status | `error` value | Cause |
|---|---|---|
| `400` | `"Missing required fields"` | `type`, `headline`, or `description` absent |
| `400` | `"Invalid type"` | `type` is not one of the 5 allowed values |
| `400` | `"Invalid platform"` | `platform` is not `web`, `android`, `ios`, or `api` |
| `400` | `"screenshots must be an array"` | `screenshots` field is not a JSON array |
| `400` | `"screenshots: max 10 items allowed"` | Array has more than 10 elements |
| `400` | `"screenshots: each item must be a string ≤ 2048 chars"` | An item is too long or not a string |
| `429` | `"Too many requests"` | Rate limit exceeded (10/min/IP) |
| `500` | `"Failed to submit feedback"` | Server error — retry with exponential back-off |

---

## Section Values

Use the `section` field to classify where in the app the feedback was triggered:

| Value | When to use |
|---|---|
| `"member-app"` | General in-app screens |
| `"quotes-invoices"` | Quotes or invoices screens |
| `"leads-jobs"` | Leads or jobs screens |
| `"billing"` | Subscription / billing screens |
| `"settings"` | Settings screen |
| `"planner"` | Planner / scan-to-layout |
| `"support"` | Help / support flow |
| `"other"` | Default fallback |

---

## Supabase Fields Stored

All columns written on a native submission:

| DB Column | Source |
|---|---|
| `id` | Server-generated (`FB-<ts>-<random>`) |
| `type` | From payload |
| `status` | Always `new` |
| `section` | From payload, or derived from `url` |
| `headline` | From payload |
| `description` | From payload |
| `user_email` | From payload (or empty) |
| `url` | From payload |
| `device_type` | Derived from `User-Agent` header |
| `user_agent` | From `User-Agent` header |
| `rating` | From payload (reviews only) |
| `platform` | From payload |
| `app_version` | From payload `appVersion` |
| `build_number` | From payload `buildNumber` |
| `os_version` | From payload |
| `device_model` | From payload |
| `screenshots` | From payload |
| `alpha_tester` | From payload |
| `user_id` | From Bearer token (server-side, never from body) |
| `workspace_id` | Derived from user profile (server-side) |
| `created_at` | Server timestamp |
| `updated_at` | Server timestamp |

---

## Privacy & Safety Notes

1. **Do not include personally identifiable information in `headline` or `description` beyond what the user deliberately types.** Do not auto-populate names, phone numbers, or addresses.
2. **`user_id` is always server-derived.** A malicious client cannot spoof attribution.
3. **`screenshots` must be pre-uploaded CDN URLs.** The `/api/feedback` endpoint does not accept file uploads. See Screenshot Upload Plan below.
4. **Rate limiting is per-IP** (10/min). Mobile apps sharing a NAT IP are unlikely to hit this under normal use; if hit, apply client-side back-off and retry after 60 seconds.
5. **Access tokens expire.** Refresh the Supabase session before submitting if the token may have expired. The server will still accept the submission anonymously if the token is missing or expired.

---

## Screenshot Upload Flow

Screenshots are uploaded **before** submitting feedback. The client uploads each image separately, receives a CDN URL, then includes that URL in `screenshots[]` when calling `POST /api/feedback`.

### Upload Endpoint

```
POST /api/feedback/upload-screenshot
Content-Type: multipart/form-data
Authorization: Bearer <access_token>   ← optional, same policy as feedback POST
```

**Form field:** `file` — a single image file.

**Limits:**

| Property | Limit |
|---|---|
| Max file size | 5 MB |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Rate limit | 20 uploads per IP per minute |
| Max screenshots per feedback | 10 (enforced by `POST /api/feedback`) |

**Success response (201):**

```json
{
  "success": true,
  "url": "https://<project>.supabase.co/storage/v1/object/public/feedback-screenshots/a1b2c3d4-uuid.webp",
  "path": "a1b2c3d4-uuid.webp",
  "size": 94321
}
```

Use the returned `url` in `screenshots[]` when calling `POST /api/feedback`.

**Error responses:**

| Status | `error` value | Cause |
|---|---|---|
| `400` | `"file field required (multipart/form-data)"` | No `file` field |
| `400` | `"Empty file not allowed"` | Zero-byte file |
| `400` | `"Invalid file type: …"` | MIME not jpeg/png/webp |
| `400` | `"File too large: …"` | Exceeds 5 MB |
| `429` | `"Too many requests"` | Rate limit exceeded |
| `503` | `"Screenshot storage not configured…"` | Bucket not yet created in Supabase |
| `500` | `"Upload failed"` | Storage error |

---

### Android Kotlin — Multipart Upload

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

fun uploadScreenshot(
    imageFile: File,
    mimeType: String,           // "image/jpeg", "image/png", or "image/webp"
    accessToken: String?,       // pass null for anonymous
): String {                     // returns CDN URL
    val client = OkHttpClient()

    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "file",
            imageFile.name,
            imageFile.asRequestBody(mimeType.toMediaType()),
        )
        .build()

    val requestBuilder = Request.Builder()
        .url("https://tissca.com/api/feedback/upload-screenshot")
        .post(requestBody)

    if (accessToken != null) {
        requestBuilder.addHeader("Authorization", "Bearer $accessToken")
    }

    val response = client.newCall(requestBuilder.build()).execute()
    val body = response.body?.string() ?: error("Empty response")

    if (!response.isSuccessful) error("Upload failed: $body")

    val json = org.json.JSONObject(body)
    return json.getString("url")
}

// Usage — upload then submit
val screenshotUrl = uploadScreenshot(capturedFile, "image/webp", supabaseSession.accessToken)

val payload = FeedbackPayload(
    type = "issue",
    headline = "PDF not loading",
    description = "Blank screen on invoice PDF",
    platform = "android",
    appVersion = BuildConfig.VERSION_NAME,
    buildNumber = BuildConfig.VERSION_CODE.toString(),
    screenshots = listOf(screenshotUrl),
)
```

---

### iOS Swift — Multipart Upload

```swift
import Foundation

func uploadScreenshot(
    imageData: Data,
    mimeType: String,           // "image/jpeg", "image/png", or "image/webp"
    accessToken: String?        // pass nil for anonymous
) async throws -> String {      // returns CDN URL
    let url = URL(string: "https://tissca.com/api/feedback/upload-screenshot")!
    let boundary = UUID().uuidString

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    if let token = accessToken {
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    // Build multipart body
    let ext: String
    switch mimeType {
    case "image/png":  ext = "png"
    case "image/webp": ext = "webp"
    default:           ext = "jpg"
    }

    var body = Data()
    body.append("--\(boundary)\r\n".data(using: .utf8)!)
    body.append("Content-Disposition: form-data; name=\"file\"; filename=\"screenshot.\(ext)\"\r\n".data(using: .utf8)!)
    body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
    body.append(imageData)
    body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

    request.httpBody = body

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, http.statusCode == 201 else {
        throw URLError(.badServerResponse)
    }

    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    return json["url"] as! String
}

// Usage — upload then submit
let screenshotUrl = try await uploadScreenshot(
    imageData: uiImage.jpegData(compressionQuality: 0.8)!,
    mimeType: "image/jpeg",
    accessToken: supabaseSession.accessToken
)

let payload = FeedbackPayload(
    type: "issue",
    headline: "PDF not loading",
    description: "Blank screen on invoice PDF",
    platform: "ios",
    appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
    buildNumber: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "",
    screenshots: [screenshotUrl]
)
```

---

### Storage Bucket — Configuration

Bucket name: **`feedback-screenshots`**

| Property | Value |
|---|---|
| Visibility | Public (CDN URLs, no signing required) |
| Write access | Service-role only (API route handles writes) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Max object size | 5 MB |

**Recommended Supabase Storage Policies:**

```sql
-- Allow public read (SELECT) on all objects
CREATE POLICY "feedback_screenshots_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'feedback-screenshots');

-- Deny direct INSERT/UPDATE/DELETE — all writes go through the service-role API route.
-- No additional policies needed: service-role bypasses RLS.
```

**Storage lifecycle:** Screenshots are currently retained indefinitely. A future cleanup job can delete objects older than 90 days that are no longer referenced in `feedback.screenshots[]`.

---

### Privacy Considerations

1. **No PII in storage paths.** The path is a random UUID — no user ID, email, or workspace ID is embedded.
2. **Public read = URLs are permanent.** Do not include sensitive content in screenshots. Consider adding a warning to the UI before users attach images.
3. **Server-generated paths only.** The client never specifies a storage path. The server generates a UUID-based path — path traversal is not possible.
4. **MIME validation.** Extension is derived from the server-validated MIME type, never from the client-supplied filename.

---

## Manual Test Cases

### 1 — Anonymous web feedback
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"help","headline":"Test anon","description":"Anonymous web feedback","platform":"web"}'
# Expect: 200 {"success":true,"id":"FB-..."}
```

### 2 — Authenticated member feedback
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <member_access_token>" \
  -d '{"type":"suggestion","headline":"Test auth","description":"Auth member feedback","platform":"web"}'
# Expect: 200, user_id populated in DB row
```

### 3 — Android-style payload
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "type":"issue",
    "headline":"Camera crash",
    "description":"App crashes on scan screen",
    "platform":"android",
    "appVersion":"2.1.0",
    "buildNumber":"210",
    "osVersion":"Android 14",
    "deviceModel":"Pixel 8",
    "alphaTester":true
  }'
# Expect: 200, platform=android, alpha_tester=true in DB
```

### 4 — iOS-style payload
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "type":"review",
    "headline":"Love the app",
    "description":"Really smooth experience",
    "platform":"ios",
    "appVersion":"2.1.0",
    "buildNumber":"210",
    "rating":5,
    "osVersion":"iOS 17.4",
    "deviceModel":"iPhone 15 Pro"
  }'
# Expect: 200, platform=ios, rating=5 in DB
```

### 5 — Admin GET rejected without staff token
```bash
curl https://tissca.com/api/feedback
# Expect: 401 {"error":"Unauthorized"}
```

### 6 — Admin PATCH updates reply/status
```bash
curl -X PATCH https://tissca.com/api/feedback/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_access_token>" \
  -d '{"status":"in-progress","admin_reply":"Thanks, investigating now.","triage_tags":["android","billing"]}'
# Expect: 200, replied_at populated in DB
```

### 7 — Invalid platform rejected
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"help","headline":"x","description":"y","platform":"windows"}'
# Expect: 400 {"error":"Invalid platform"}
```

### 8 — Screenshots over limit rejected
```bash
curl -X POST https://tissca.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"issue","headline":"x","description":"y","platform":"ios","appVersion":"1","buildNumber":"1","screenshots":["a","b","c","d","e","f","g","h","i","j","k"]}'
# Expect: 400 {"error":"screenshots: max 10 items allowed"}
```
