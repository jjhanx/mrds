#!/bin/bash
# Ubuntu 서버에서 env:init 없이 .env 생성
# 실행: bash scripts/env-init-standalone.sh

cd "$(dirname "$0")/.."
SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

if [ -f .env ]; then
  echo ".env 파일이 이미 있습니다."
  exit 1
fi

cat > .env << EOF
# 미래도시 합창단 - 환경 변수

DATABASE_URL="file:./dev.db"
AUTH_SECRET="$SECRET"
NEXTAUTH_URL="http://localhost:3000"

AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_NAVER_ID=""
AUTH_NAVER_SECRET=""
AUTH_KAKAO_ID=""
AUTH_KAKAO_SECRET=""
EOF

echo "✅ .env 파일이 생성되었습니다."
echo "✅ AUTH_SECRET이 자동 생성되었습니다."
