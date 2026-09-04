#!/usr/bin/env bash
set -euo pipefail

container_name="market-rotation-test-$$"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --rm --detach \
  --name "${container_name}" \
  --publish 127.0.0.1::3306 \
  --env MARIADB_ROOT_PASSWORD=test-password \
  --env MARIADB_DATABASE=market_rotation_test \
  mariadb:11.4 >/dev/null

ready=false
for _attempt in $(seq 1 60); do
  if docker exec "${container_name}" mariadb-admin ping --host=127.0.0.1 --user=root --password=test-password --silent >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "${ready}" != true ]]; then
  echo "Disposable MariaDB did not become ready" >&2
  exit 1
fi

mariadb_version="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password --execute="SELECT VERSION()")"
if [[ ! "${mariadb_version}" =~ ^11\.4\. ]]; then
  echo "MariaDB version mismatch: expected 11.4.x, got ${mariadb_version}" >&2
  exit 1
fi

mapped_port="$(docker port "${container_name}" 3306/tcp | awk -F: 'NR == 1 { print $NF }')"
if [[ -z "${mapped_port}" ]]; then
  echo "Could not resolve disposable MariaDB port" >&2
  exit 1
fi

test_database_url="mysql://root:test-password@127.0.0.1:${mapped_port}/market_rotation_test"
case "${test_database_url}" in
  mysql://root:test-password@127.0.0.1:*/market_rotation_test) ;;
  *)
    echo "Refusing non-disposable Market Rotation database URL" >&2
    exit 1
    ;;
esac

DATABASE_URL="${test_database_url}" npx prisma migrate deploy
MARKET_ROTATION_TEST_DATABASE_URL="${test_database_url}" \
DATABASE_URL="${test_database_url}" \
  npx vitest run tests/integration/market-rotation.mysql.test.ts
