# Approved Milestone 9 production choices

Version: 1.0
Status: Approved for implementation; external certifications pending
Decision date: 2026-08-07
Approved at: 2026-08-07T15:05:23+03:30 (`Asia/Tehran`)
Approver: Product Owner, by explicit instruction in the Milestone 9 project thread
Authority: ADR-0005

## Approved choices

| Decision      | Approved product/authority                            | Technical contract                                                                                        | Accountable owner        |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| `OQ-002-PROD` | Vandar IPG v3 + Refund v3                             | IRR intent, transaction inquiry, server verify, idempotent full/partial refund and refund status callback | Payments & Finance Owner |
| `OQ-003-PROD` | Kavenegar REST v1 Verify Lookup                       | Approved `KeleOtp` Persian OTP template, provider message ID and bounded delivery status                  | Identity Owner           |
| `OQ-017`      | KELE-managed Grafana OSS 13 + Loki 3.7 + Prometheus 3 | Safe JSON log ingestion, protected Prometheus scrape and Alertmanager routing inside Iran                 | Platform/On-call Owner   |
| `OQ-018`      | ArvanCloud Object Storage Simin + CDN                 | Private S3-compatible origin in `ir-thr-at1`, signed URLs, version/lifecycle and CDN invalidation         | Platform Owner           |
| `OQ-022`      | First-party KELE PostgreSQL administration identity   | Pre-provisioned principals, Kavenegar OTP, opaque server sessions, DB roles and transactional revocation  | Security Owner           |

## Provider documentation baselines

- Vandar IPG v3 documentation dated 1401-10-10:
  <https://vandarpay.github.io/docs/ipg/>
- Vandar Refund v3 documentation dated 1400-08-01:
  <https://vandarpay.github.io/docs/refund/>
- Vandar access-token contract dated 1399-11-10:
  <https://vandarpay.github.io/docs/auth/>
- Kavenegar REST/Verify Lookup documentation reviewed 2026-08-07:
  <https://kavenegar.com/rest.html>
- ArvanCloud Object Storage/bucket and bucket-policy documentation reviewed
  2026-08-07:
  <https://docs.arvancloud.ir/fa/object-storage/buckets/> and
  <https://docs.arvancloud.ir/fa/object-storage/bucket-policy/>
- Grafana OSS 13 and Loki 3.7 documentation reviewed 2026-08-07:
  <https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v13-0/> and
  <https://grafana.com/docs/loki/latest/release-notes/v3-7/>

## Sandbox identifiers and production activation

Repository-safe identifiers are reserved as follows; the real provider account
IDs are recorded only in retained certification artifacts:

| Boundary                | Repository-safe sandbox identifier       | Production region                    |
| ----------------------- | ---------------------------------------- | ------------------------------------ |
| Vandar                  | `kele-m9-vandar-sandbox`                 | Iran / provider-managed IPG          |
| Kavenegar               | `kele-m9-kavenegar` / template `KeleOtp` | Iran / provider-managed SMS          |
| Observability           | `kele-m9-observability`                  | Iran / approved KELE private cluster |
| Arvan storage/CDN       | `kele-m9-media`                          | Simin `ir-thr-at1`, multi-zone       |
| Administration identity | `kele-m9-admin-identity`                 | Same region as KELE PostgreSQL       |

These are names, not evidence that external resources exist. Production
activation requires the actual tenant/project identifier, credential presence
check without values, commercial contract/plan, and a passing certification
record at the reviewed commit and immutable image digest.

The published Vandar Refund v3 `notify_url` contract does not document a
callback-authentication or authenticated status-inquiry mechanism. The provider
choice remains approved, but `CERT-M9-001` keeps Refund completion disabled
until that authority is proven or an ADR addendum is explicitly approved.

## Superseded open-question defaults

The five questions above are resolved by ADR-0005. Local Fake providers, MinIO,
structured-log-only monitoring and static administration tokens remain valid
only for development/test and do not become fallback production behavior.
