# BE-17 — VPS Hardening + Backups Runbook

## 1) Security baseline checklist (single VPS)

### OS / Access
- [ ] SSH key-only auth enabled (`PasswordAuthentication no`)
- [ ] Root login disabled (`PermitRootLogin no`)
- [ ] Non-root deploy user with `sudo`
- [ ] Automatic security updates enabled
- [ ] Host firewall enabled (UFW/iptables) with least privilege

### Network / Reverse proxy / TLS
- [ ] Reverse proxy terminates TLS (Nginx/Caddy)
- [ ] TLS cert auto-renewal verified
- [ ] HTTP -> HTTPS redirect enabled
- [ ] API only exposed on required ports
- [ ] Internal DB port not publicly exposed

### Application runtime
- [ ] Secrets from env or vault, never in git
- [ ] `JWT_SECRET` rotated and strong
- [ ] Rate-limits enabled on auth-sensitive routes
- [ ] Health endpoint monitored (`/api/system/health`)
- [ ] Metrics endpoint monitored (`/api/system/metrics`)

### Data & backups
- [ ] Automated Mongo backup job scheduled
- [ ] Retention policy applied (daily/weekly)
- [ ] Off-host copy configured (remote host/object storage)
- [ ] Restore drill performed and documented

---

## 2) Backup strategy

### Policy
- Daily logical backups via `mongodump`
- Retention:
  - Keep last 7 daily backups
  - Keep last 4 weekly backups (if available)
- Compression enabled (`.gz` archive)

### Backup location
- Local spool: `/var/backups/abc2sense`
- Optional remote mirror: rsync/S3-compatible bucket

---

## 3) Scripts

Scripts added under `scripts/`:
- `backup_mongo.sh`
- `restore_mongo.sh`

### Example cron (daily 02:30)
```bash
30 2 * * * /bin/bash /opt/abc2sense/scripts/backup_mongo.sh >> /var/log/abc2sense-backup.log 2>&1
```

---

## 4) Restore drill (must be reproducible)

1. Pick a backup archive:
   - `/var/backups/abc2sense/abc2sense-YYYYmmdd-HHMMSS.archive.gz`
2. Restore into test DB:
   ```bash
   MONGO_URI="mongodb://127.0.0.1:27017" \
   DB_NAME="abc2sense_restore_test" \
   BACKUP_FILE="/var/backups/abc2sense/abc2sense-YYYYmmdd-HHMMSS.archive.gz" \
   /bin/bash scripts/restore_mongo.sh
   ```
3. Validate minimum checks:
   - App starts and connects
   - Key collections exist (`users`, `measurements`, etc.)
   - Smoke API call passes
4. Document result date/time and operator.

---

## 5) Incident quick actions

### Suspected compromise
1. Rotate credentials (`JWT_SECRET`, DB user/password, API keys)
2. Revoke active sessions/tokens
3. Restrict ingress (firewall/allowlists)
4. Capture logs and timeline
5. Restore known-good state if needed

### Failed deploy
1. Roll back app version
2. Verify `/api/system/health`
3. Confirm DB connectivity and migration status

---

## 6) Operational verification commands

```bash
# API liveness
curl -sS http://127.0.0.1:5000/api/system/health

# Runtime metrics
curl -sS http://127.0.0.1:5000/api/system/metrics

# Mongo connectivity
mongosh --quiet "$MONGO_URI" --eval 'db.runCommand({ ping: 1 })'
```
