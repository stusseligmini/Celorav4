# 🗄️ Neon Database GitHub Actions Setup

This repository includes comprehensive GitHub Actions workflows for managing Neon database branches and monitoring database health.

## 🚀 Setup Instructions

### 1. Required GitHub Secrets

Add these secrets to your GitHub repository (`Settings` → `Secrets and Variables` → `Actions`):

```bash
# Neon Database Configuration
NEON_API_KEY=your_neon_api_key_here
NEON_PROJECT_ID=your_neon_project_id_here

# Database URLs (from Netlify)
NETLIFY_DATABASE_URL=postgresql://royal-leaf-98992154-owner:YOZZJPWsqQqW@ep-wild-darkness-a5aqjqfn.us-east-2.aws.neon.tech/royal-leaf-98992154?sslmode=require
NETLIFY_DATABASE_URL_UNPOOLED=postgresql://royal-leaf-98992154-owner:YOZZJPWsqQqW@ep-wild-darkness-a5aqjqfn.us-east-2.aws.neon.tech/royal-leaf-98992154?sslmode=require

# Optional: Discord notifications
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
```

### 2. Get Your Neon API Key

1. Visit [Neon Console](https://console.neon.tech)
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Copy the key and add it as `NEON_API_KEY` secret

### 3. Get Your Neon Project ID

1. In Neon Console, go to your project dashboard
2. The Project ID is in the URL: `https://console.neon.tech/app/projects/{PROJECT_ID}`
3. Add it as `NEON_PROJECT_ID` secret

### 4. Database Expiry Warning ⚠️

Your current database expires on **September 14, 2025**. To keep it active:

1. Visit [Neon Console](https://console.neon.tech/app/projects)
2. Click **Connect Neon** to claim your database
3. This will convert the temporary database to a permanent one

## 🔄 Workflow Features

### Database Branching (`neon_workflow.yml`)

**Triggers:**
- **Pull Request opened/updated**: Creates isolated database branch
- **Pull Request closed**: Automatically cleans up database branch
- **Push to main**: Deploys to production with database migrations

**Features:**
- 🌿 Automatic database branch creation for each PR
- 🧪 Automated testing against preview database
- 🚀 Preview environment deployment
- 🧹 Automatic cleanup when PR is closed
- 📝 PR comments with database information

### Database Monitoring (`database_monitoring.yml`)

**Triggers:**
- **Schedule**: Every hour during business hours + daily health checks
- **Manual**: Can be triggered manually via GitHub Actions
- **Push**: When database-related files are modified

**Features:**
- 🏥 Comprehensive health checks
- 📊 Performance metrics and statistics
- ⚠️ Expiry warnings (7 days before expiration)
- 🚨 Discord alerts for critical issues
- 💾 Daily backup information generation
- 📈 Query performance monitoring

## 📊 Monitoring Dashboard

The workflows provide detailed monitoring:

### Health Metrics
- Database connectivity status
- Query performance times
- Active connection pool status
- User and transaction counts

### Alerts
- **Critical**: Database connectivity failures
- **Warning**: Database expires in < 7 days
- **Info**: Daily health reports

### Reports
- Daily health reports (downloadable artifacts)
- Backup manifests with table information
- Performance metrics over time

## 🔧 Workflow Customization

### Modify Schedule
Edit the cron expressions in `database_monitoring.yml`:

```yaml
schedule:
  # Business hours monitoring (9 AM - 6 PM UTC, weekdays)
  - cron: '0 9-18 * * 1-5'
  # Daily health check (midnight UTC)
  - cron: '0 0 * * *'
```

### Add Custom Checks
Extend the health check in `database_monitoring.yml`:

```javascript
// Add your custom database checks
const customCheck = await netlifyDatabase.query('SELECT your_custom_query');
console.log('Custom metric:', customCheck);
```

### Discord Notifications
Set up Discord webhook for alerts:

1. Create Discord webhook in your server
2. Add webhook URL as `DISCORD_WEBHOOK_URL` secret
3. Workflows will automatically send alerts for:
   - Database failures
   - Expiry warnings
   - Performance issues

## 🎯 Database Branch Workflow

### For Each Pull Request:

1. **Branch Created**: `preview/pr-{number}`
   - Isolated database environment
   - Fresh schema migration
   - Independent testing

2. **Tests Run**: Automated validation
   - Database connectivity
   - Schema integrity
   - Basic functionality tests

3. **Preview Deployed**: Ready for review
   - Full application with isolated data
   - Safe testing environment
   - No impact on production

4. **PR Closed**: Automatic cleanup
   - Database branch deleted
   - Resources cleaned up
   - Cost optimization

### For Production (main branch):

1. **Migrations**: Production database updates
2. **Tests**: Comprehensive production testing
3. **Deployment**: Live environment update
4. **Monitoring**: Continuous health checks

## 🔒 Security Considerations

- All database credentials stored as encrypted secrets
- Branch databases are automatically cleaned up
- Preview environments are isolated from production
- Monitoring includes security-focused health checks

## 📚 Useful Links

- [Neon Console](https://console.neon.tech)
- [Neon GitHub Integration Guide](https://neon.tech/docs/guides/neon-github-integration)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Prisma Database Documentation](https://www.prisma.io/docs)

## 🆘 Troubleshooting

### Common Issues

**"Database connection failed"**
- Check `NETLIFY_DATABASE_URL` secret is correctly set
- Verify database hasn't expired (Sept 14, 2025)
- Confirm IP restrictions in Neon console

**"Branch creation failed"**
- Verify `NEON_API_KEY` has proper permissions
- Check `NEON_PROJECT_ID` is correct
- Ensure you haven't hit branch limits

**"Migration errors"**
- Check Prisma schema is valid
- Verify database schema is compatible
- Review migration files for conflicts

### Getting Help

1. Check GitHub Actions logs for detailed error messages
2. Visit Neon Console for database status
3. Review Discord alerts if configured
4. Check database health artifacts for insights

---

**⚠️ Important**: Remember to claim your database before September 14, 2025, to prevent data loss!
