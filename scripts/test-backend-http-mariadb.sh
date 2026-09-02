#!/usr/bin/env bash
set -euo pipefail

container_name="backend-http-test-$$"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

wait_ready() {
  local _attempt
  for _attempt in $(seq 1 60); do
    if docker exec "${container_name}" mariadb-admin ping --host=127.0.0.1 --user=root --password=test-password --silent >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Under a DooD CI runner this script executes inside a sibling job container:
# a port published on the host's loopback is unreachable from there, and a
# user-defined network is unreachable too because the job container itself is
# not attached to it. Sharing the job container's network namespace
# (--network container:<id>) makes 127.0.0.1:3306 work directly. If that is
# not possible (script on a plain host, e.g. a dev laptop), fall back to the
# loopback publish + dynamic port mapping.
db_host=""
db_port=""

job_container_id="$(hostname)"
if docker inspect "${job_container_id}" >/dev/null 2>&1; then
  docker run --rm --detach --name "${container_name}" \
    --network "container:${job_container_id}" \
    --env MARIADB_ROOT_PASSWORD=test-password \
    --env MARIADB_DATABASE=backend_http_test \
    mariadb:11.4 >/dev/null
  if wait_ready && node -e "const net=require('node:net');const s=net.connect(3306,'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),5000)" 2>/dev/null; then
    db_host="127.0.0.1"
    db_port="3306"
  else
    docker rm -f "${container_name}" >/dev/null 2>&1 || true
  fi
fi

if [[ -z "${db_host}" ]]; then
  docker run --rm --detach \
    --name "${container_name}" \
    --publish 127.0.0.1::3306 \
    --env MARIADB_ROOT_PASSWORD=test-password \
    --env MARIADB_DATABASE=backend_http_test \
    mariadb:11.4 >/dev/null
  wait_ready || { echo "Disposable MariaDB did not become ready" >&2; exit 1; }
  db_host="127.0.0.1"
  mapped_port="$(docker port "${container_name}" 3306/tcp | awk -F: 'NR == 1 { print $NF }')"
  if [[ -z "${mapped_port}" ]]; then
    echo "Could not resolve disposable MariaDB port" >&2
    exit 1
  fi
  db_port="${mapped_port}"
fi

test_database_url="mysql://root:test-password@${db_host}:${db_port}/backend_http_test"

# Prove legacy Web rows are deterministically backfilled, the documented
# operational rollback preserves them, and the forward migration is re-runnable.
docker exec "${container_name}" mariadb --user=root --password=test-password --execute="
  CREATE DATABASE native_session_migration_test;
  USE native_session_migration_test;
  CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY) ENGINE=InnoDB;
  CREATE TABLE refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX refresh_tokens_user_id_idx (user_id),
    INDEX refresh_tokens_token_idx (token),
    CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  INSERT INTO users (id) VALUES (1);
  INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ('legacy-hash', 1, DATE_ADD(NOW(3), INTERVAL 1 DAY));
"

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password native_session_migration_test \
  < prisma/migrations/20260901090000_add_native_refresh_sessions/migration.sql

backfill="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password native_session_migration_test --execute="SELECT CONCAT(client_type, ':', family_id, ':', token) FROM refresh_tokens WHERE id = 1")"
if [[ "${backfill}" != "WEB:legacy-web-1:legacy-hash" ]]; then
  echo "Legacy refresh-token backfill assertion failed: ${backfill}" >&2
  exit 1
fi

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password native_session_migration_test \
  < prisma/migrations/20260901090000_add_native_refresh_sessions/rollback.sql

preserved="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password native_session_migration_test --execute="SELECT token FROM refresh_tokens WHERE id = 1")"
if [[ "${preserved}" != "legacy-hash" ]]; then
  echo "Refresh-token rollback preservation assertion failed" >&2
  exit 1
fi

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password native_session_migration_test \
  < prisma/migrations/20260901090000_add_native_refresh_sessions/migration.sql

# Prove Diary review/owner remediation and constraints on MariaDB 11.4,
# including the documented rollback and a second forward application.
docker exec "${container_name}" mariadb --user=root --password=test-password --execute="
  CREATE DATABASE diary_contract_migration_test;
  USE diary_contract_migration_test;
  CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY) ENGINE=InnoDB;
  CREATE TABLE diaries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    review_due_at DATETIME(3) NULL,
    review_status VARCHAR(20) NULL DEFAULT 'none',
    reviewed_at DATETIME(3) NULL,
    review_outcome VARCHAR(20) NULL,
    review_summary TEXT NULL,
    review_learning TEXT NULL,
    review_adjustment TEXT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX diaries_user_id_fkey (user_id),
    CONSTRAINT diaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  CREATE TABLE transactions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    diary_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    INDEX transactions_diary_id_fkey (diary_id),
    CONSTRAINT transactions_diary_id_fkey FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB;
  INSERT INTO users (id) VALUES (1), (2);
  INSERT INTO diaries (id, user_id, review_status, reviewed_at, review_outcome, review_summary, updated_at) VALUES
    (10, 1, NULL, NULL, NULL, NULL, '2026-08-01 12:00:00.000'),
    (11, 2, 'broken', '2026-08-02 12:00:00.000', 'WRONG', 'legacy', '2026-08-02 12:00:00.000');
  INSERT INTO transactions (id, diary_id, user_id) VALUES (20, 10, 2);
"

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test \
  < prisma/migrations/20260901100000_diary_v1_contract/migration.sql

diary_backfill="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password diary_contract_migration_test --execute="SELECT CONCAT((SELECT review_status FROM diaries WHERE id=10), ':', (SELECT review_status FROM diaries WHERE id=11), ':', (SELECT IFNULL(review_outcome, 'NULL') FROM diaries WHERE id=11), ':', (SELECT user_id FROM transactions WHERE id=20))")"
if [[ "${diary_backfill}" != "none:reviewed:NULL:1" ]]; then
  echo "Diary contract backfill assertion failed: ${diary_backfill}" >&2
  exit 1
fi

if docker exec "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test --execute="UPDATE diaries SET review_status='illegal' WHERE id=10" >/dev/null 2>&1; then
  echo "Diary review status CHECK did not reject an illegal value" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test --execute="UPDATE transactions SET user_id=2 WHERE id=20" >/dev/null 2>&1; then
  echo "Diary/transaction composite owner FK did not reject owner drift" >&2
  exit 1
fi

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test \
  < prisma/migrations/20260901100000_diary_v1_contract/rollback.sql
docker exec "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test --execute="UPDATE diaries SET review_status='illegal' WHERE id=10; UPDATE transactions SET user_id=2 WHERE id=20"
docker exec --interactive "${container_name}" mariadb --user=root --password=test-password diary_contract_migration_test \
  < prisma/migrations/20260901100000_diary_v1_contract/migration.sql

second_forward="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password diary_contract_migration_test --execute="SELECT CONCAT((SELECT review_status FROM diaries WHERE id=10), ':', (SELECT user_id FROM transactions WHERE id=20))")"
if [[ "${second_forward}" != "none:1" ]]; then
  echo "Diary contract second-forward assertion failed: ${second_forward}" >&2
  exit 1
fi

# Prove Thesis lifecycle/owner remediation and constraints on MariaDB 11.4,
# including rollback and a second forward application. This is a separate
# fixture because the Thesis migration is intentionally independent from the
# Diary/Trade Plan/Alert integrity migration below.
docker exec "${container_name}" mariadb --user=root --password=test-password --execute="
  CREATE DATABASE thesis_contract_migration_test;
  USE thesis_contract_migration_test;
  CREATE TABLE users (
    id BIGINT NOT NULL PRIMARY KEY
  ) ENGINE=InnoDB;
  CREATE TABLE stocks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL UNIQUE
  ) ENGINE=InnoDB;
  CREATE TABLE investment_theses (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    stock_id BIGINT NOT NULL,
    status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    summary TEXT NULL,
    why_i_own_it TEXT NULL,
    growth_drivers TEXT NULL,
    risks TEXT NULL,
    invalidation_conditions TEXT NULL,
    expected_holding_period VARCHAR(255) NULL,
    review_due_at DATETIME(3) NULL,
    last_reviewed_at DATETIME(3) NULL,
    latest_review_outcome ENUM('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR') NULL,
    activated_at DATETIME(3) NULL,
    archived_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    UNIQUE INDEX investment_theses_user_stock_key (user_id, stock_id),
    CONSTRAINT investment_theses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT investment_theses_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  CREATE TABLE thesis_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    thesis_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reviewed_at DATETIME(3) NOT NULL,
    outcome ENUM('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR') NOT NULL,
    what_improved TEXT NULL,
    what_deteriorated TEXT NULL,
    what_changed TEXT NULL,
    invalidation_triggered BOOLEAN NOT NULL DEFAULT false,
    portfolio_decision ENUM('HOLD', 'ADD', 'REDUCE', 'EXIT', 'CONTINUE_WATCHING') NOT NULL,
    snapshot_status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL,
    snapshot_summary TEXT NULL,
    snapshot_why_i_own_it TEXT NULL,
    snapshot_growth_drivers TEXT NULL,
    snapshot_risks TEXT NULL,
    snapshot_invalidation_conditions TEXT NULL,
    snapshot_expected_holding_period VARCHAR(255) NULL,
    snapshot_review_due_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT thesis_reviews_thesis_id_fkey FOREIGN KEY (thesis_id) REFERENCES investment_theses(id) ON DELETE CASCADE,
    CONSTRAINT thesis_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  INSERT INTO users (id) VALUES (1), (2);
  INSERT INTO stocks (id, symbol) VALUES (10, 'THESIS-A'), (11, 'THESIS-B'), (12, 'THESIS-C'), (13, 'THESIS-D'), (14, 'THESIS-E');
  INSERT INTO investment_theses
    (id, user_id, stock_id, status, summary, why_i_own_it, latest_review_outcome, created_at, updated_at)
  VALUES
    (100, 1, 10, 'ACTIVE', NULL, NULL, NULL, '2026-08-01 12:00:00.000', '2026-08-01 12:00:00.000'),
    (101, 1, 11, 'ACTIVE', 'Durable demand', 'Platform moat', NULL, '2026-08-01 12:00:00.000', '2026-08-02 12:00:00.000'),
    (102, 1, 12, 'ARCHIVED', 'Old thesis', 'Old moat', NULL, '2026-08-01 12:00:00.000', '2026-08-03 12:00:00.000'),
    (103, 1, 13, 'DRAFT', NULL, NULL, 'PARTIAL', '2026-08-01 12:00:00.000', '2026-08-04 12:00:00.000'),
    (104, 1, 14, 'ACTIVE', 'Valid thesis', 'Valid rationale', 'INTACT', '2026-08-01 12:00:00.000', '2026-08-05 12:00:00.000');
  UPDATE investment_theses
  SET last_reviewed_at = '2026-08-05 11:00:00.000'
  WHERE id = 104;
  INSERT INTO thesis_reviews
    (id, thesis_id, user_id, reviewed_at, outcome, what_changed, portfolio_decision, snapshot_status, snapshot_summary, created_at)
  VALUES
    (201, 104, 2, '2026-08-05 11:00:00.000', 'INTACT', 'Legacy owner drift', 'HOLD', 'ACTIVE', 'Valid thesis', '2026-08-05 11:00:00.000');
"

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test \
  < prisma/migrations/20260902100000_thesis_contract_constraints/migration.sql

thesis_backfill="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password thesis_contract_migration_test --execute="SELECT CONCAT(
  (SELECT status FROM investment_theses WHERE id = 100), ':',
  (SELECT activated_at IS NOT NULL FROM investment_theses WHERE id = 101), ':',
  (SELECT status FROM investment_theses WHERE id = 102), ':',
  (SELECT archived_at IS NOT NULL FROM investment_theses WHERE id = 102), ':',
  (SELECT IFNULL(latest_review_outcome, 'NULL') FROM investment_theses WHERE id = 103), ':',
  (SELECT user_id FROM thesis_reviews WHERE id = 201)
)")"
if [[ "${thesis_backfill}" != "DRAFT:1:ARCHIVED:1:NULL:1" ]]; then
  echo "Thesis contract backfill assertion failed: ${thesis_backfill}" >&2
  exit 1
fi

if docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="UPDATE investment_theses SET status='ACTIVE', summary=NULL, why_i_own_it='Rationale', activated_at=NOW(3) WHERE id=100" >/dev/null 2>&1; then
  echo "Thesis ACTIVE required-fields CHECK did not reject an invalid value" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="UPDATE investment_theses SET status='ACTIVE', summary='Valid', why_i_own_it='Rationale', activated_at=NULL WHERE id=100" >/dev/null 2>&1; then
  echo "Thesis ACTIVE timestamp CHECK did not reject a missing activation time" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="UPDATE investment_theses SET last_reviewed_at=NULL WHERE id=104" >/dev/null 2>&1; then
  echo "Thesis review timestamp CHECK did not reject an inconsistent state" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="INSERT INTO thesis_reviews (thesis_id, user_id, reviewed_at, outcome, what_changed, portfolio_decision, snapshot_status, created_at) VALUES (104, 2, NOW(3), 'INTACT', 'Owner mismatch', 'HOLD', 'ACTIVE', NOW(3))" >/dev/null 2>&1; then
  echo "Thesis/review composite owner FK did not reject owner drift" >&2
  exit 1
fi

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test \
  < prisma/migrations/20260902100000_thesis_contract_constraints/rollback.sql
docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="UPDATE investment_theses SET status='ACTIVE', summary=NULL, why_i_own_it=NULL, activated_at=NULL WHERE id=100; UPDATE thesis_reviews SET user_id=2 WHERE id=201"

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test \
  < prisma/migrations/20260902100000_thesis_contract_constraints/migration.sql

thesis_second_forward="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password thesis_contract_migration_test --execute="SELECT CONCAT(
  (SELECT status FROM investment_theses WHERE id = 100), ':',
  (SELECT user_id FROM thesis_reviews WHERE id = 201)
)")"
if [[ "${thesis_second_forward}" != "DRAFT:1" ]]; then
  echo "Thesis contract second-forward assertion failed: ${thesis_second_forward}" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password thesis_contract_migration_test --execute="UPDATE thesis_reviews SET user_id=2 WHERE id=201" >/dev/null 2>&1; then
  echo "Thesis contract second-forward owner FK assertion failed" >&2
  exit 1
fi

# Prove the 04–05 integrity migration remediates legacy Diary Review, Trade
# Plan, recurring Alert and Price Alert rows, then rejects invalid states.
docker exec "${container_name}" mariadb --user=root --password=test-password --execute="
  CREATE DATABASE backend_integrity_migration_test;
  USE backend_integrity_migration_test;
  CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY) ENGINE=InnoDB;
  CREATE TABLE diaries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    review_due_at DATETIME(3) NULL,
    review_status VARCHAR(20) NULL DEFAULT 'none',
    reviewed_at DATETIME(3) NULL,
    review_outcome VARCHAR(20) NULL,
    review_summary TEXT NULL,
    review_learning TEXT NULL,
    review_adjustment TEXT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX diaries_user_id_fkey (user_id),
    CONSTRAINT diaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  CREATE TABLE trade_plans (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    diary_id BIGINT NULL,
    symbol VARCHAR(32) NOT NULL,
    entry_zone_low DECIMAL(18, 6) NULL,
    entry_zone_high DECIMAL(18, 6) NULL,
    status VARCHAR(32) NULL DEFAULT 'draft',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX trade_plans_user_status_idx (user_id, status),
    INDEX trade_plans_user_symbol_idx (user_id, symbol),
    INDEX trade_plans_diary_id_idx (diary_id),
    CONSTRAINT trade_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT trade_plans_diary_id_fkey FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;
  CREATE TABLE alerts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    diary_id BIGINT NOT NULL,
    message VARCHAR(500) NOT NULL,
    trigger_at DATETIME(3) NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    recurring_mode VARCHAR(20) NULL,
    parent_id BIGINT NULL,
    instance_number INTEGER NULL DEFAULT 1,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    created_at DATETIME(3) NOT NULL,
    INDEX alerts_diary_id_fkey (diary_id),
    INDEX alerts_parent_id_idx (parent_id),
    CONSTRAINT alerts_diary_id_fkey FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  CREATE TABLE price_alerts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    type ENUM('PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG') NOT NULL,
    threshold DECIMAL(10, 4) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX price_alerts_user_id_is_triggered_idx (user_id, is_triggered),
    INDEX price_alerts_symbol_is_triggered_idx (symbol, is_triggered),
    CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  INSERT INTO users (id) VALUES (1), (2);
  INSERT INTO diaries (id, user_id, review_status, reviewed_at, review_outcome, review_summary, updated_at) VALUES
    (101, 1, 'broken', NULL, 'WRONG', 'Legacy text', '2026-08-01 12:00:00.000'),
    (102, 2, 'reviewed', NULL, 'WRONG', 'Legacy text', '2026-08-02 12:00:00.000');
  INSERT INTO trade_plans (id, user_id, diary_id, symbol, entry_zone_low, entry_zone_high, status, created_at, updated_at) VALUES
    (201, 1, 101, 'LUNA04A', 10, 20, 'legacy', '2026-08-01 12:00:00.000', '2026-08-01 12:00:00.000'),
    (202, 2, 102, 'LUNA04B', 10, 20, NULL, '2026-08-02 12:00:00.000', '2026-08-02 12:00:00.000');
  INSERT INTO alerts (id, diary_id, message, trigger_at, recurring_mode, parent_id, instance_number, created_at) VALUES
    (301, 101, 'Series root', '2026-09-07 01:00:00.000', 'WEEK', NULL, 1, '2026-08-01 12:00:00.000'),
    (302, 101, 'Orphan child', '2026-09-08 01:00:00.000', 'WEEK', 999, 2, '2026-08-01 12:00:00.000'),
    (303, 102, 'Mismatched child', '2026-09-08 01:00:00.000', 'WEEK', 301, 2, '2026-08-02 12:00:00.000'),
    (304, 101, 'Invalid mode', '2026-09-08 01:00:00.000', 'BAD', NULL, 1, '2026-08-01 12:00:00.000'),
    (305, 101, 'Null series', '2026-09-08 01:00:00.000', NULL, 0, 7, '2026-08-01 12:00:00.000');
  INSERT INTO price_alerts (id, user_id, symbol, type, threshold, message, is_triggered, triggered_at, created_at, updated_at) VALUES
    (401, 1, 'LUNA05', 'PRICE_ABOVE', 100, 'Triggered legacy row', true, NULL, '2026-08-01 12:00:00.000', '2026-08-02 12:00:00.000'),
    (402, 1, 'LUNA05', 'PRICE_BELOW', 80, 'Untriggered legacy row', false, '2026-08-02 12:00:00.000', '2026-08-01 12:00:00.000', '2026-08-03 12:00:00.000');
"

# Prisma migration files contain compound trigger bodies; the mysql client
# needs a delimiter wrapper to execute those same checked-in statements.
awk '
/^CREATE TRIGGER/ {
  print "delimiter //"
  in_trigger = 1
}
in_trigger && /^END;$/ {
  print "END//"
  print "delimiter ;"
  in_trigger = 0
  next
}
{ print }
' prisma/migrations/20260902110000_backend_v1_integrity/migration.sql \
  | docker exec --interactive "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test

integrity_backfill="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_integrity_migration_test --execute="SELECT CONCAT(
  (SELECT review_status FROM diaries WHERE id = 101), ':',
  (SELECT status FROM trade_plans WHERE id = 201), ':',
  (SELECT status FROM trade_plans WHERE id = 202), ':',
  (SELECT IFNULL(parent_id, 'NULL') FROM alerts WHERE id = 301), ':',
  (SELECT IFNULL(recurring_mode, 'NULL') FROM alerts WHERE id = 302), ':',
  (SELECT instance_number FROM alerts WHERE id = 303), ':',
  (SELECT is_triggered FROM price_alerts WHERE id = 401), ':',
  (SELECT triggered_at IS NOT NULL FROM price_alerts WHERE id = 401), ':',
  (SELECT triggered_at IS NULL FROM price_alerts WHERE id = 402)
)")"
if [[ "${integrity_backfill}" != "none:draft:draft:301:NULL:1:1:1:1" ]]; then
  echo "Backend integrity backfill assertion failed: ${integrity_backfill}" >&2
  exit 1
fi

if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE trade_plans SET entry_zone_low=20, entry_zone_high=10 WHERE id=201" >/dev/null 2>&1; then
  echo "Trade Plan entry-zone CHECK did not reject reversed bounds" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="INSERT INTO trade_plans (user_id, diary_id, symbol, entry_zone_low, entry_zone_high, status, created_at, updated_at) VALUES (1, 102, 'OWNER-DRIFT', 1, 2, 'draft', NOW(3), NOW(3))" >/dev/null 2>&1; then
  echo "Trade Plan diary owner trigger did not reject an insert mismatch" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE trade_plans SET user_id=1 WHERE id=202" >/dev/null 2>&1; then
  echo "Trade Plan diary owner trigger did not reject an update mismatch" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE alerts SET recurring_mode='WEEK', parent_id=NULL, instance_number=2 WHERE id=302" >/dev/null 2>&1; then
  echo "Alert series CHECK did not reject a child without a parent" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE alerts SET diary_id=102, recurring_mode='WEEK', parent_id=301, instance_number=2 WHERE id=302" >/dev/null 2>&1; then
  echo "Alert parent/diary composite FK did not reject a cross-diary series" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE price_alerts SET is_triggered=true, triggered_at=NULL WHERE id=402" >/dev/null 2>&1; then
  echo "Price Alert trigger CHECK did not reject a missing triggeredAt" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE price_alerts SET is_triggered=false, triggered_at=NOW(3) WHERE id=401" >/dev/null 2>&1; then
  echo "Price Alert trigger CHECK did not reject an inconsistent false state" >&2
  exit 1
fi

docker exec --interactive "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test \
  < prisma/migrations/20260902110000_backend_v1_integrity/rollback.sql
docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE diaries SET review_status='illegal', reviewed_at=NULL, review_outcome='WRONG' WHERE id=101; UPDATE trade_plans SET status='illegal', entry_zone_low=20, entry_zone_high=10 WHERE id=201; UPDATE alerts SET recurring_mode='BAD', parent_id=999, instance_number=0 WHERE id=302; UPDATE price_alerts SET is_triggered=false, triggered_at='2026-08-04 12:00:00.000' WHERE id=401"

rollback_writes="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_integrity_migration_test --execute="SELECT CONCAT(
  (SELECT review_status FROM diaries WHERE id = 101), ':',
  (SELECT status FROM trade_plans WHERE id = 201), ':',
  (SELECT recurring_mode FROM alerts WHERE id = 302), ':',
  (SELECT instance_number FROM alerts WHERE id = 302), ':',
  (SELECT is_triggered FROM price_alerts WHERE id = 401), ':',
  (SELECT triggered_at IS NOT NULL FROM price_alerts WHERE id = 401)
)")"
if [[ "${rollback_writes}" != "illegal:illegal:BAD:0:0:1" ]]; then
  echo "Backend integrity rollback assertion failed: ${rollback_writes}" >&2
  exit 1
fi

# The migration remediates lifecycle/trigger/series values, but it does not
# invent a safe meaning for reversed price zones. Repair that one field before
# proving the forward migration can be re-applied to the rolled-back fixture.
docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE trade_plans SET entry_zone_low=10, entry_zone_high=20 WHERE id=201"
# Keep the same delimiter wrapper for re-forward.
awk '
/^CREATE TRIGGER/ {
  print "delimiter //"
  in_trigger = 1
}
in_trigger && /^END;$/ {
  print "END//"
  print "delimiter ;"
  in_trigger = 0
  next
}
{ print }
' prisma/migrations/20260902110000_backend_v1_integrity/migration.sql \
  | docker exec --interactive "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test

integrity_second_forward="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_integrity_migration_test --execute="SELECT CONCAT(
  (SELECT review_status FROM diaries WHERE id = 101), ':',
  (SELECT status FROM trade_plans WHERE id = 201), ':',
  (SELECT IFNULL(recurring_mode, 'NULL') FROM alerts WHERE id = 302), ':',
  (SELECT instance_number FROM alerts WHERE id = 302), ':',
  (SELECT is_triggered FROM price_alerts WHERE id = 401), ':',
  (SELECT triggered_at IS NULL FROM price_alerts WHERE id = 401)
)")"
if [[ "${integrity_second_forward}" != "none:draft:NULL:1:0:1" ]]; then
  echo "Backend integrity second-forward assertion failed: ${integrity_second_forward}" >&2
  exit 1
fi
if docker exec "${container_name}" mariadb --user=root --password=test-password backend_integrity_migration_test --execute="UPDATE price_alerts SET is_triggered=true, triggered_at=NULL WHERE id=401" >/dev/null 2>&1; then
  echo "Backend integrity second-forward price trigger CHECK assertion failed" >&2
  exit 1
fi

DATABASE_URL="${test_database_url}" npx prisma migrate deploy

# Ticket 06 has no new 202609 migration: its stock/watchlist/notes/timeline
# tables and research source enum are additive migrations already in the
# deploy chain. Assert their final MariaDB shape here instead of inventing a
# destructive rollback for historical migrations outside this slice.
stock_tables="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_http_test --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='backend_http_test' AND table_name IN ('stocks', 'stock_watchlists', 'stock_notes', 'stock_timeline_records')")"
if [[ "${stock_tables}" != "4" ]]; then
  echo "Stock contract table assertion failed: ${stock_tables}" >&2
  exit 1
fi

stock_unique_indexes="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_http_test --execute="SELECT COUNT(DISTINCT CONCAT(table_name, ':', index_name)) FROM information_schema.statistics WHERE table_schema='backend_http_test' AND ((table_name='stocks' AND index_name='stocks_symbol_key') OR (table_name='stock_watchlists' AND index_name='stock_watchlists_user_stock_key') OR (table_name='stock_timeline_records' AND index_name='stock_timeline_records_user_stock_idempotency_key'))")"
if [[ "${stock_unique_indexes}" != "3" ]]; then
  echo "Stock contract unique-index assertion failed: ${stock_unique_indexes}" >&2
  exit 1
fi

stock_contract_columns="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_http_test --execute="SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='backend_http_test' AND ((table_name='stock_notes' AND column_name='created_via') OR (table_name='stock_timeline_records' AND column_name IN ('idempotency_key', 'occurred_at', 'created_via')) OR (table_name='stock_watchlists' AND column_name='status') OR (table_name='stocks' AND column_name='symbol'))")"
if [[ "${stock_contract_columns}" != "6" ]]; then
  echo "Stock contract column assertion failed: ${stock_contract_columns}" >&2
  exit 1
fi

stock_source_type="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password backend_http_test --execute="SELECT column_type FROM information_schema.columns WHERE table_schema='backend_http_test' AND table_name='stock_timeline_records' AND column_name='source_type'")"
if [[ "${stock_source_type}" != *"SEC_FILING"* || "${stock_source_type}" != *"RELATIVE_VALUE"* || "${stock_source_type}" != *"SEASONALITY"* ]]; then
  echo "Stock research source enum assertion failed: ${stock_source_type}" >&2
  exit 1
fi

BACKEND_HTTP_TEST_DATABASE_URL="${test_database_url}" \
DATABASE_URL="${test_database_url}" \
JWT_SECRET="backend-http-contract-secret-not-placeholder" \
  npx vitest run tests/integration/http/auth.contract.test.ts

BACKEND_HTTP_TEST_DATABASE_URL="${test_database_url}" \
DATABASE_URL="${test_database_url}" \
JWT_SECRET="backend-http-contract-secret-not-placeholder" \
  npx vitest run tests/integration/http/core.contract.test.ts
