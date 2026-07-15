# GesParc → Oracle Cloud (Always Free) — Data Migration Runbook

Goal of this document: get the **GesParc data** from the local Oracle XE 11.2
into an **Always Free Autonomous Database** in Oracle Cloud. The app deployment
is a separate, later step.

## What's already done (locally)

✅ A Data Pump dump of the whole `GESPARC` schema was created:
**`cloud/gesparc.dmp`** — 117 MB, 95 tables, no errors.

That's the only artifact you need to carry to the cloud. Everything below is
done in the browser (Oracle Cloud console) — **no Oracle client install
required on your PC.**

Everything you'll fill in as you go (write these down):

| Placeholder | Where you get it | Example |
|---|---|---|
| `<REGION>` | chosen at signup (home region) | `eu-marseille-1` |
| `<ADB_NAME>` | you choose when creating the DB | `gesparc` |
| `<ADMIN_PW>` | you set when creating the DB | `Str0ng#Admin_2026` |
| `<GESPARC_PW>` | you set in Phase 3 | `Str0ng#Gesparc_2026` |
| `<NAMESPACE>` | Object Storage tenancy namespace | `axk4z9...` |
| `<BUCKET>` | you create in Phase 4 | `gesparc-migration` |
| `<OCI_USER>` | your console login (email) | `you@example.com` |
| `<AUTH_TOKEN>` | generated in Phase 5 | (shown once) |

Passwords must be 12–30 chars with an uppercase, a lowercase, a number, and no
double-quote. Keep them somewhere safe.

---

## Phase 1 — Sign up for Oracle Cloud Free Tier

1. Go to **https://www.oracle.com/cloud/free/** → **Start for free**.
2. Fill in email / country, verify the email.
3. **Home region** — pick one close to Tunisia and **remember it**: it *cannot
   be changed later*, and Always Free resources live only in the home region.
   Good choices: **Marseille (`eu-marseille-1`)**, **Frankfurt**, or **Milan**.
4. Identity check needs a **credit/debit card** — it is a verification only;
   Always Free resources are never charged. (You'll also do a phone verify.)
5. Finish; you land in the **OCI Console** (cloud.oracle.com).

---

## Phase 2 — Create the Always Free Autonomous Database

1. Console → hamburger menu (☰) → **Oracle Database** → **Autonomous Database**.
2. Make sure the **Compartment** (top-left) is your root compartment (or create
   one — root is fine to start).
3. Click **Create Autonomous Database**.
   - **Display name** and **Database name**: `<ADB_NAME>` (e.g. `gesparc`).
   - **Workload type**: **Transaction Processing** (ATP — right for an OLTP app).
   - **Deployment**: Serverless.
   - Toggle **Always Free**: **ON** (this caps it to the free shape: 1 OCPU, 20 GB).
   - **Database version**: 19c or 23ai — either is fine (both support thin-mode
     drivers, so the app gets simpler later).
   - **Create administrator credentials**: set the **ADMIN** password → `<ADMIN_PW>`.
   - **Network access**: **Secure access from everywhere** (simplest; mTLS wallet).
   - **License**: License included.
4. **Create**. Wait ~1–3 min until the status is **AVAILABLE** (green).

---

## Phase 3 — Open the browser SQL tool and create the GESPARC user

You'll run all SQL from the browser — no install.

1. On your ADB's page → **Database actions** (button) → **SQL**.
   (Log in as `ADMIN` / `<ADMIN_PW>` if prompted.)
2. In the SQL worksheet, run this to create the target schema (paste, then click
   **Run Script** — the ▶▶ icon):

   ```sql
   CREATE USER GESPARC IDENTIFIED BY "<GESPARC_PW>";
   GRANT CREATE SESSION, RESOURCE, CREATE VIEW, CREATE MATERIALIZED VIEW,
         CREATE PROCEDURE, CREATE SEQUENCE, CREATE TRIGGER, CREATE TABLE,
         CREATE SYNONYM TO GESPARC;
   ALTER USER GESPARC QUOTA UNLIMITED ON DATA;
   ```

   Keep this SQL tab open — you'll come back to it in Phase 5 and Phase 7.

---

## Phase 4 — Upload the dump to Object Storage

1. Console → ☰ → **Storage** → **Buckets** → **Create Bucket**.
   - Name: `<BUCKET>` (e.g. `gesparc-migration`). Defaults are fine. **Create**.
2. Open the bucket → **Upload** → drag in **`cloud/gesparc.dmp`** → **Upload**.
   (117 MB — a couple of minutes.)
3. Note your **namespace**: bucket page shows *Namespace: `<NAMESPACE>`*. Write it down.

Your dump's Object Storage URL will be:

```
https://objectstorage.<REGION>.oraclecloud.com/n/<NAMESPACE>/b/<BUCKET>/o/gesparc.dmp
```

---

## Phase 5 — Create an Auth Token and a database credential

The database needs permission to read the bucket. This uses an **Auth Token**.

1. Console → top-right **profile icon** → **My profile** → left menu **Auth
   tokens** → **Generate token**. Description: `gesparc-dp`. **Copy the token
   now** (`<AUTH_TOKEN>`) — it is shown only once.
2. Back in the **Database actions → SQL** worksheet (as ADMIN), create the
   credential (username is your console login email):

   ```sql
   BEGIN
     DBMS_CLOUD.CREATE_CREDENTIAL(
       credential_name => 'GESPARC_CRED',
       username        => '<OCI_USER>',
       password        => '<AUTH_TOKEN>'
     );
   END;
   /
   ```

   > If your tenancy uses Identity Domains, `<OCI_USER>` may need to be
   > `oracleidentitycloudservice/<OCI_USER>`. If the import later fails auth,
   > drop and recreate the credential with that prefixed form:
   > `BEGIN DBMS_CLOUD.DROP_CREDENTIAL('GESPARC_CRED'); END; /`

---

## Phase 6 — Import the dump (Cloud Shell + impdp)

**Cloud Shell** is a browser terminal, already authenticated, with the right
Oracle tools — no local install.

1. Console → top-right **>_ (Cloud Shell)** icon. Wait for the prompt.
2. Download the DB wallet and point the tools at it (replace `<ADB_OCID>` — copy
   it from your ADB's page, "OCID: … Copy"):

   ```bash
   oci db autonomous-database generate-wallet \
     --autonomous-database-id <ADB_OCID> \
     --file wallet.zip --password Wallet#2026
   mkdir -p ~/wallet && unzip -o wallet.zip -d ~/wallet
   export TNS_ADMIN=~/wallet
   ```

3. Run the import (one command). Connect **as ADMIN**; it loads the objects into
   the GESPARC schema. The TNS alias is `<adb_name>_high` (lowercase db name):

   ```bash
   impdp admin/'<ADMIN_PW>'@<adb_name>_high \
     credential=GESPARC_CRED \
     dumpfile='https://objectstorage.<REGION>.oraclecloud.com/n/<NAMESPACE>/b/<BUCKET>/o/gesparc.dmp' \
     directory=DATA_PUMP_DIR \
     schemas=GESPARC \
     exclude=user,db_link,statistics \
     transform=segment_attributes:n \
     parallel=1 \
     logfile=DATA_PUMP_DIR:gesparc_imp.log
   ```

   Notes:
   - `exclude=user` — the GESPARC user already exists (Phase 3), so skip its DDL.
   - `exclude=db_link` — the 2 legacy DB links point to servers that don't exist here.
   - `transform=segment_attributes:n` — strips XE tablespace/storage clauses so
     everything lands in the Autonomous `DATA` tablespace.
   - You **will** see a few non-fatal `ORA-` lines (grants to schemas that don't
     exist on ADB, the mail procedures compiling INVALID). That's expected — the
     job still reports **"successfully completed"**. The data is what matters.

---

## Phase 7 — Verify the data landed

Back in **Database actions → SQL** (you can log in as GESPARC / `<GESPARC_PW>`,
or stay ADMIN and prefix table names with `GESPARC.`):

```sql
SELECT COUNT(*) AS tables_loaded FROM all_tables WHERE owner = 'GESPARC';
-- expect: 95

SELECT 'vehicule'        t, COUNT(*) n FROM gesparc.vehicule
UNION ALL SELECT 'bon_travail',       COUNT(*) FROM gesparc.bon_travail
UNION ALL SELECT 'dem_intervention',  COUNT(*) FROM gesparc.dem_intervention
UNION ALL SELECT 'ligne_carburant',   COUNT(*) FROM gesparc.ligne_carburant
UNION ALL SELECT 'ordre_mission',     COUNT(*) FROM gesparc.ordre_mission
UNION ALL SELECT 'exploitation',      COUNT(*) FROM gesparc.exploitation
UNION ALL SELECT 'tra_exploitation',  COUNT(*) FROM gesparc.tra_exploitation;
```

**Expected counts** (from the local DB):

| table | rows |
|---|---|
| vehicule | 4 079 |
| bon_travail | 38 627 |
| dem_intervention | 39 970 |
| ligne_carburant | 218 160 |
| ordre_mission | 58 159 |
| exploitation | 182 097 |
| tra_exploitation | 271 609 |

If these match, the data migration is **done**. 🎉

> The app reads through views like `V_GESPARC_VEHICULE` and
> `V_GESPARC_BON_TRAVAIL` — those are in the dump too. If any view shows as
> INVALID, run `ALTER VIEW gesparc.<name> COMPILE;` (usually they self-heal on
> first query).

---

## What this unlocks for the app phase (later)

Because the cloud DB is **19c/23ai**, the backend gets simpler than the local
setup:

- **python-oracledb can use *thin mode*** (pure Python, no Oracle client libs to
  install) — connect with the wallet + `<GESPARC_PW>`.
- The `oracledb==2.5.1` pin and thick-mode `init_oracle_client(...)` are **only
  needed for the local XE 11.2** DB. Against the cloud DB you can drop both.
- We'll set the backend's `.env` to the cloud DSN (from the wallet's
  `tnsnames.ora`, the `<adb_name>_low` alias is fine for a small app) and point
  `ORACLE_USER/PASSWORD` at `GESPARC` / `<GESPARC_PW>`.

Keep the **wallet.zip** and the `<GESPARC_PW>` — the app will need them.
