# Setting secrets for Render and Netlify

This project requires a `DATABASE_URL` environment variable for production. Do not store credentials in the repository.

Render
- Go to your service in the Render dashboard.
- In the service page, open the "Environment" or "Environment Variables" section.
- Add a variable named `DATABASE_URL` and paste the full connection string.
- Redeploy the service (Render will auto-deploy if `autoDeploy` is enabled).

Netlify
- Go to Site settings > Build & deploy > Environment > Environment variables.
- Add `DATABASE_URL` and paste the connection string.
- Trigger a deploy (via the Netlify UI or a new push).

Local development
- Create a local `.env` file or export the variable in your shell:

```powershell
# PowerShell
$env:DATABASE_URL = "postgresql://<DB_USER>:<DB_PASSWORD>@<HOST>/<DB_NAME>?sslmode=require"

# Bash
export DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<HOST>/<DB_NAME>?sslmode=require"
```

Security note
- Rotate credentials if they were committed to the repository previously. Remove them from the codebase and rotate the secret in the database provider.
- Consider using a vault or secrets manager for higher security.
