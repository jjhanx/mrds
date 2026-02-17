#!/usr/bin/env node
/**
 * .env 생성 스크립트
 * 실행: node scripts/generate-env.js
 * 
 * AUTH_SECRET을 자동 생성하고 기본 .env 파일을 만듭니다.
 */

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const secret = crypto.randomBytes(32).toString("base64");
const envPath = path.join(__dirname, "..", ".env");

const template = `# 미래도시 합창단 - 환경 변수
# 이 파일은 scripts/generate-env.js로 생성되었습니다.

# === 필수 ===
DATABASE_URL="file:./dev.db"
AUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"

# === OAuth (사용할 것만 채우세요) ===
# Google: https://console.developers.google.com/apis/credentials
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Naver: https://developers.naver.com/apps
AUTH_NAVER_ID=""
AUTH_NAVER_SECRET=""

# Kakao: https://developers.kakao.com/console/app
AUTH_KAKAO_ID=""
AUTH_KAKAO_SECRET=""
`;

if (fs.existsSync(envPath)) {
  console.log(".env 파일이 이미 있습니다. 덮어쓰려면 기존 .env를 삭제한 후 다시 실행하세요.");
  process.exit(1);
}

fs.writeFileSync(envPath, template.trim() + "\n", "utf8");
console.log("✅ .env 파일이 생성되었습니다.");
console.log("✅ AUTH_SECRET이 자동 생성되었습니다.");
console.log("");
console.log("다음 단계:");
console.log("1. OAuth를 사용할 경우 .env에서 해당 ID/SECRET을 채우세요.");
console.log("2. 상세 설명: ENV_GUIDE.md 참고");
console.log("3. npm run dev로 실행");
process.exit(0);
