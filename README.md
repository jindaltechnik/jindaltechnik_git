# TJ Secure AI Journal (JindalTechnik)

An enterprise-grade, user-authenticated AI Journaling and Multi-Turn Reflection application built for **JindalTechnik** (`JindalTechnik.com`), powered by **Google Gemini 3.6 Flash** and **Cloud Firestore**.

## 🛡️ Agentic Threat Summary Table

| Threat Zone | Identified Risk | Impact Level | Countermeasure / Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt Injection / XSS / Payload Overuse | High | Strict input length capping (max 4,000 chars), React output encoding, schema validation |
| **Planning & Reasoning** | System Instruction Bypass in Gemini Chat | Critical | Rigid system instructions in server endpoint, model guardrails, response schema validation |
| **Tool Execution** | Unbounded Recursive Calls / Infinite Loops | High | Strict request rate-limiting, daily quota capping (max 10 entries/day), synchronous single-turn API responses |
| **Memory & State** | Cross-User Journal Entry Data Leaks | Critical | Firestore Security Rules enforcing `request.auth.uid == userId` and `<= 4000` char bounds for all CRUD |
| **Inter-System** | Credential Exposure / API Key Leakage | Critical | Full-stack architecture; Gemini API key handled strictly server-side; Firebase Auth JWT verification |

---

## 🔒 Firestore Security Rules (`firestore.rules`)

Every user's journal entries are strictly isolated under path `/users/{userId}/entries/{entryId}`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    match /{document=**} {
      allow read, write: if false;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId) && isValidId(userId);

      match /entries/{entryId} {
        allow read: if isOwner(userId) && isValidId(userId) && isValidId(entryId);
        allow create, update: if isOwner(userId) && isValidId(userId) && isValidId(entryId) &&
          (request.resource.data.content is string && request.resource.data.content.size() <= 4000);
        allow delete: if isOwner(userId) && isValidId(userId) && isValidId(entryId);

        match /messages/{messageId} {
          allow read: if isOwner(userId) && isValidId(userId) && isValidId(entryId) && isValidId(messageId);
          allow create, update: if isOwner(userId) && isValidId(userId) && isValidId(entryId) && isValidId(messageId) &&
            (request.resource.data.content is string && request.resource.data.content.size() <= 4000);
          allow delete: if isOwner(userId) && isValidId(userId) && isValidId(entryId) && isValidId(messageId);
        }
      }
    }
  }
}
```

---

## ☁️ Google Cloud Run Deployment & Mandatory Campaign Labeling

To meet the Cloud Run challenge labeling requirements:
- **Key**: `dev-tutorial`
- **Value**: `cloud-run-ai-challenge`

Execute the following `gcloud` command:

```bash
# Apply mandatory campaign verification label to Cloud Run service
gcloud run services update tj-secure-ai-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

Or deploy directly with labels applied:

```bash
gcloud run deploy tj-secure-ai-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 🔑 GCP Secret Manager Configuration (Project `jindaltechnik`)

Run the following Google Cloud CLI commands to set up Secret Manager in GCP project `jindaltechnik`:

```bash
# 1. Select JindalTechnik GCP project
gcloud config set project jindaltechnik

# 2. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 3. Create GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 4. Create Service Account for Vercel / Cloud Run
gcloud iam service-accounts create vercel-jindaltechnik-sa \
  --description="Service account for deployment of TJ Secure AI Journal" \
  --display-name="Vercel JindalTechnik Service Account"

# 5. Grant Secret Manager Accessor role
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:vercel-jindaltechnik-sa@jindaltechnik.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🧪 Functional Walkthrough & Verification Steps

1. **User Authentication**:
   - Navigate to the landing page. Click **Sign in with Google**.
   - Verify GIS popup completes authentication and restores session via `tj_google_user_session` in `localStorage`.

2. **Creating a Reflection Entry**:
   - Click **New Reflection**. Enter a title, select category, enter initial prompt (character limit enforced at 4,000 max).
   - Verify entry document is created in Firestore under `/users/{uid}/entries/{entryId}`.

3. **Daily Entry Quota Enforcement**:
   - Users are capped at 10 entries per day to prevent system abuse.
   - Creating an 11th entry triggers an informative error toast preventing write.

4. **Multi-turn AI Conversation**:
   - Type follow-up prompts to Gemini 3.6 Flash (4,000 char limit enforced with real-time counter).
   - Messages are persisted in subcollection `/users/{uid}/entries/{entryId}/messages`.

5. **Security Verification**:
   - Attempting to access another user's entry path returns `PERMISSION_DENIED` via deployed `firestore.rules`.

