# Security and Vault Management

## Overview

This document outlines the security practices and vault management for the SketchyAF timer monitoring system, focusing on secure service key storage and environment-aware configuration.

## Security Architecture

### Vault-Based Key Management

The system uses Supabase Vault for secure storage of sensitive credentials:

- **Production Service Role Key**: Stored in vault as `DATABASE_SERVICE_ROLE_KEY`
- **Environment Detection**: Automatic detection of local vs production environments
- **Fallback Security**: Local development uses hardcoded local keys only

### Key Security Features

1. **No Hardcoded Production Keys**: All production secrets stored in Supabase Vault
2. **Environment Isolation**: Automatic environment detection prevents key leakage
3. **Graceful Degradation**: System continues to function without vault access (local dev)
4. **Audit Trail**: All vault access attempts are logged

## Vault Configuration

### Setting Up Production Secrets

```bash
# Store production service role key
npx supabase secrets set DATABASE_SERVICE_ROLE_KEY="your-production-service-role-key"

# Verify secret storage
npx supabase secrets list
```

### Accessing Vault in Database Functions

```sql
-- Helper function to securely access vault
CREATE OR REPLACE FUNCTION get_service_role_key() 
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Try to get the key from vault
  BEGIN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets 
    WHERE name = 'DATABASE_SERVICE_ROLE_KEY';
    
    RETURN service_key;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If vault access fails, return NULL
      RAISE WARNING 'Could not access service key from vault: %', SQLERRM;
      RETURN NULL;
  END;
END;
$$;
```

## Environment Detection

### Automatic Environment Detection

The system automatically detects the environment to use appropriate configurations:

```sql
-- Environment detection function
CREATE OR REPLACE FUNCTION get_supabase_url() 
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Detect environment based on database characteristics
  IF current_database() = 'postgres' AND 
     EXISTS (SELECT 1 FROM pg_settings WHERE name = 'port' AND setting = '54322') THEN
    -- Local development
    RETURN 'http://127.0.0.1:54321';
  ELSE
    -- Production
    RETURN 'https://uzcnqkpartttbstfjxln.supabase.co';
  END IF;
END;
$$;
```

### Environment-Specific Behavior

| Environment | Service Key Source | Supabase URL | Behavior |
|-------------|-------------------|--------------|----------|
| **Local Development** | Hardcoded local key (if vault unavailable) | `http://127.0.0.1:54321` | Full functionality with local services |
| **Production** | Supabase Vault | `https://project.supabase.co` | Secure vault-based authentication |

## Security Best Practices

### 1. Secret Management

- ✅ **Use Supabase Vault** for all production secrets
- ✅ **Never commit secrets** to version control
- ✅ **Rotate keys regularly** using vault management
- ✅ **Use environment detection** to prevent key leakage

### 2. Database Function Security

- ✅ **SECURITY DEFINER** functions for controlled access
- ✅ **Exception handling** to prevent information disclosure
- ✅ **Logging warnings** for security events
- ✅ **Graceful degradation** when vault is unavailable

### 3. Migration Security

- ✅ **No hardcoded production keys** in migration files
- ✅ **Environment-aware functions** that adapt to context
- ✅ **Secure defaults** that fail safely
- ✅ **Audit logging** for all security-related operations

## Verification and Monitoring

### Security Verification

```sql
-- Check vault configuration
SELECT get_service_role_key() IS NOT NULL as vault_configured;

-- Verify environment detection
SELECT get_supabase_url() as detected_environment;

-- Full security audit
SELECT * FROM verify_production_deployment();
```

### Security Monitoring

The system includes built-in security monitoring:

- **Vault Access Failures**: Logged as warnings
- **Environment Mismatches**: Detected and logged
- **Authentication Failures**: HTTP errors logged with context
- **Configuration Issues**: Reported in deployment verification

## Troubleshooting

### Common Security Issues

1. **Vault Key Not Found**
   ```sql
   -- Check if key exists in vault
   SELECT name FROM vault.decrypted_secrets WHERE name = 'DATABASE_SERVICE_ROLE_KEY';
   ```

2. **Environment Detection Issues**
   ```sql
   -- Debug environment detection
   SELECT 
     current_database() as db_name,
     (SELECT setting FROM pg_settings WHERE name = 'port') as db_port,
     get_supabase_url() as detected_url;
   ```

3. **Permission Issues**
   ```sql
   -- Check function permissions
   SELECT proname, proowner, proacl FROM pg_proc WHERE proname LIKE '%service_role%';
   ```

### Recovery Procedures

If vault access is compromised:

1. **Immediate**: Functions will fall back to logging-only mode
2. **Short-term**: Restore vault access via CLI
3. **Long-term**: Rotate all affected keys

## Compliance and Auditing

### Audit Trail

All security-related operations are logged:

- Vault access attempts (success/failure)
- Environment detection results
- Authentication failures
- Configuration changes

### Compliance Features

- **Encryption at Rest**: Vault provides encrypted storage
- **Access Control**: SECURITY DEFINER functions control access
- **Audit Logging**: All operations logged for compliance
- **Key Rotation**: Supported via vault management

## Migration from Legacy Configuration

### Before (Insecure)

```sql
-- Old approach with hardcoded keys
SELECT configure_timer_monitoring_production(
  'https://project.supabase.co',
  'hardcoded-service-role-key'  -- ❌ Security risk
);
```

### After (Secure)

```bash
# New approach with vault
npx supabase secrets set DATABASE_SERVICE_ROLE_KEY="service-role-key"
```

```sql
-- Secure vault-based access
SELECT get_service_role_key() IS NOT NULL as vault_configured;
```

This migration ensures that no production secrets are stored in version control or database migrations, significantly improving the security posture of the application.
