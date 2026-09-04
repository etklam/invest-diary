#!/usr/bin/env bash
set -euo pipefail

container_name="market-rotation-test-$$"

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
# a port published on the host's loopback is unreachable from there. Sharing
# the job container's network namespace makes 127.0.0.1:3306 reachable from
# the test process. On a plain host, where the current hostname is not a
# Docker container, retain the dynamic loopback-port fallback below.
db_host=""
db_port=""

job_container_id="$(hostname)"
if docker inspect "${job_container_id}" >/dev/null 2>&1; then
  docker run --rm --detach \
    --name "${container_name}" \
    --network "container:${job_container_id}" \
    --env MARIADB_ROOT_PASSWORD=test-password \
    --env MARIADB_DATABASE=market_rotation_test \
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
    --env MARIADB_DATABASE=market_rotation_test \
    mariadb:11.4 >/dev/null
  wait_ready || {
    echo "Disposable MariaDB did not become ready" >&2
    exit 1
  }
  db_host="127.0.0.1"
  mapped_port="$(docker port "${container_name}" 3306/tcp | awk -F: 'NR == 1 { print $NF }')"
  if [[ -z "${mapped_port}" ]]; then
    echo "Could not resolve disposable MariaDB port" >&2
    exit 1
  fi
  db_port="${mapped_port}"
fi

mariadb_version="$(docker exec "${container_name}" mariadb --batch --skip-column-names --user=root --password=test-password --execute="SELECT VERSION()")"
if [[ ! "${mariadb_version}" =~ ^11\.4\. ]]; then
  echo "MariaDB version mismatch: expected 11.4.x, got ${mariadb_version}" >&2
  exit 1
fi

test_database_url="mysql://root:test-password@${db_host}:${db_port}/market_rotation_test"
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
