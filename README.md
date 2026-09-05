# TJ Secure AI Journal (JindalTechnik)

An enterprise-grade, user-authenticated AI Journaling and Multi-Turn Reflection application built for **JindalTechnik** (`JindalTechnik.com`), powered by **Google Gemini 3.6 Flash** and **Cloud Firestore**.

## 🛡️ Agentic Threat Summary Table

| Threat Zone | Identified Risk | Impact Level | Countermeasure / Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt Injection / XSS in Journal Entries | High | Input sanitization, length capping, React output encoding, schema validation |
| **Planning & Reasoning** | System Instruction Bypass in Gemini Chat | Critical | Rigid system instructions in server endpoint, model guardrails, response schema validation |
| **Tool Execution** | Unbounded Recursive Calls / Infinite Loops | High | Strict request rate-limiting, synchronous single-turn API responses |
| **Memory & State** | Cross-User Journal Entry Data Leaks | Critical | Firestore Security Rules enforcing `request.auth.uid == userId` for all document CRUD & queries |
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
        allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(entryId);

        match /messages/{messageId} {
          allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(entryId) && isValidId(messageId);
        }
      }
    }
  }
}
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

# 4. Create Service Account for Vercel
gcloud iam service-accounts create vercel-jindaltechnik-sa \
  --description="Service account for Vercel deployment of TJ Secure AI Journal" \
  --display-name="Vercel JindalTechnik Service Account"

# 5. Grant Secret Manager Accessor role
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:vercel-jindaltechnik-sa@jindaltechnik.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 6. Export JSON Key for Vercel Environment Variables
gcloud iam service-accounts keys create vercel-sa-key.json \
  --iam-account=vercel-jindaltechnik-sa@jindaltechnik.iam.gserviceaccount.com
```

---

## 🚀 Vercel Deployment for JindalTechnik.com

- **Git Account**: `laxmijindal634@gmail.com/jindaltechnik`
- **Git Repository**: `googl-lab1-tjindal2026`
- **Vercel Hobby Hosting**: Free hosting linked to domain `JindalTechnik.com`

### Required Vercel Environment Variables

In Vercel Dashboard → **Project Settings** → **Environment Variables**, add:

| Variable Name | Description | Value |
| :--- | :--- | :--- |
| `GCP_SECRET_NAME` | Secret Manager resource path | `projects/jindaltechnik/secrets/GEMINI_API_KEY/versions/latest` |
| `GCP_SERVICE_ACCOUNT_KEY` | Service Account JSON contents | Raw contents of `vercel-sa-key.json` |
| `GEMINI_API_KEY` | Direct fallback API Key | Your Gemini API Key string |
| `NODE_ENV` | Runtime environment | `production` |

---

## ☁️ Google Cloud Run Deployment & Campaign Labeling

```bash
# Build and deploy to Cloud Run
gcloud run deploy tj-secure-ai-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated

# Apply mandatory campaign verification label
gcloud run services update tj-secure-ai-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Verification Steps

1. **User Authentication**:
   - Navigate to the landing page. Click **Sign in with Google**.
   - Verify popup completes authentication and takes you to the private dashboard.

2. **Creating a Reflection Entry**:
   - Click **New Reflection**. Enter a title (e.g. "Product Strategy"), select category **Work**, enter initial prompt.
   - Verify entry document is created in Firestore under `/users/{uid}/entries/{entryId}`.

3. **Multi-turn AI Conversation**:
   - Type follow-up prompts to Gemini 3.6 Flash.
   - Verify messages are saved under subcollection `/users/{uid}/entries/{entryId}/messages`.

4. **Executive AI Summarizer**:
   - Click **AI Executive Summary**.
   - Verify Gemini generates structured takeaways and persists the summary on the entry in Firestore.

5. **Security Verification**:
   - Attempting to access another user's entry path returns `PERMISSION_DENIED` via deployed `firestore.rules`.
