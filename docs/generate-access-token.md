# How to generate an access token

## Use case

Normally, the GCFF CLI uses the `gcloud` command to obtain an access token. However, if `gcloud` is not available on the current machine or an inappropriate account is used, the access token can be provided manually via the `--accessToken` argument.

This instruction describes how to generate an access token using OAuth2 Client Credentials, but there are other options available.

## Scopes for access token

The access token is used for two purposes:
1. Access to the [Google Cloud Functions REST API](https://cloud.google.com/functions/docs/reference/rest). For most operations, `client push` commands only require read-only access, while `server deploy` and `dependencies sync` commands require write access.
2. Access to [Google Cloud Storage](https://cloud.google.com/storage). Write access (role `objectAdmin`) is required for both client-side and server-side commands.

## Disadvantages of the described approach

The generated access token has a short lifetime (usually 1 hour), so the steps from the 'Obtain access token' section should be repeated periodically.

## Prerequisites

- Configured Google Cloud Project
- `curl` or other HTTP request library

## Initial setup

The following steps should be done only once during the initial setup.

### Step 1 - OAuth consent screen

The consent screen is shown to the user during authorization.

- Open the browser and go to https://console.cloud.google.com/apis/credentials/consent.
- Follow the instructions.
- Do not add any scopes.
- Add your account as a test user.

### Step 2 - Create OAuth2 Client

OAuth2 credentials are used in the next steps.

- Open the browser and go to https://console.cloud.google.com/apis/credentials.
- Create Credentials -> OAuth Client ID.
- Select the application type as "Desktop app".
- Save the Client ID and Client Secret in a safe place.

## Obtain access token

The following steps should be done each time an access token needs to be refreshed.

### Step 3 - Obtain authorization code

- Open the browser and go to `https://accounts.google.com/o/oauth2/v2/auth?client_id=<CLIENT_ID_FROM_STEP2>&response_type=code&scope=https://www.googleapis.com/auth/cloud-platform&access_type=offline&redirect_uri=urn:ietf:wg:oauth:2.0:oob`.
- Copy the authorization code from the page "Make sure you trust <your-app-name>".

### Step 4 - Exchange authorization code for an access token

Use the curl request:
```
curl \
  --data client_id="<CLIENT_ID_FROM_STEP2>" \
  --data client_secret="<CLIENT_SECRET_FROM_STEP2>" \
  --data code=<CODE_FROM_STEP3> \
  --data redirect_uri=urn:ietf:wg:oauth:2.0:oob \
  --data grant_type=authorization_code \
  https://www.googleapis.com/oauth2/v4/token
```

### Step 5 - Providing the access token to the CLI command

Add the following parameters to the CLI command:
- `--accessToken=<ACCESS_TOKEN_FROM_STEP4>`
- `--project=<YOUR_PROJECT_ID>`