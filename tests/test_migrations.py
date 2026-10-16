from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_runtime_migration_uses_idempotent_ddl_and_atomic_claims():
    sql = (ROOT / "migrations" / "20261016_agropython_runtime.sql").read_text(encoding="utf-8").lower()
    assert "if not exists" in sql
    assert "create or replace function public.claim_whatsapp_inbound" in sql
    assert "for update skip locked" in sql
    assert "security definer" in sql and "set search_path = public" in sql


def test_staging_rls_is_transactional_and_has_rollback():
    folder = ROOT / "migrations" / "staging"
    apply_sql = (folder / "20261016_rls_restrictive_staging.sql").read_text(encoding="utf-8").lower()
    rollback = (folder / "20261016_rls_restrictive_staging_rollback.sql").read_text(encoding="utf-8").lower()
    assert apply_sql.startswith("-- staging only")
    assert "begin;" in apply_sql and "commit;" in apply_sql
    assert "revoke all" in apply_sql and "enable row level security" in apply_sql
    assert "disable row level security" in rollback and "grant select, insert, update, delete" in rollback

