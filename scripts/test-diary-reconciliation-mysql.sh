#!/usr/bin/env bash
set -euo pipefail

container_name="diary-reconciliation-test-$$"

cleanup() {
  docker stop "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --rm --detach \
  --name "${container_name}" \
  --publish 127.0.0.1::3306 \
  --env MARIADB_ROOT_PASSWORD=test-password \
  --env MARIADB_DATABASE=diary_reconciliation_test \
  mariadb:11 >/dev/null

for _attempt in $(seq 1 60); do
  if docker exec "${container_name}" mariadb-admin ping --host=127.0.0.1 --user=root --password=test-password --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "${container_name}" mariadb-admin ping --host=127.0.0.1 --user=root --password=test-password --silent >/dev/null 2>&1; then
  echo "Disposable MariaDB did not become ready" >&2
  exit 1
fi

mapped_port="$(docker port "${container_name}" 3306/tcp | awk -F: 'NR == 1 { print $NF }')"
if [[ -z "${mapped_port}" ]]; then
  echo "Could not resolve disposable MariaDB port" >&2
  exit 1
fi

DIARY_RECONCILIATION_TEST_DATABASE_URL="mysql://root:test-password@127.0.0.1:${mapped_port}/diary_reconciliation_test" \
  npx vitest run tests/integration/diary-reconciliation.mysql.test.ts
