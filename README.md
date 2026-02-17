# 합창 모임 홈페이지

회원 전용 합창 모임 홈페이지입니다. 소셜 로그인, 게시판, 악보 자료실 기능을 제공합니다.

## 기능

1. **회원 인증**: Google, Naver, Kakao 소셜 로그인 (가입 절차 없이 간편 로그인)
2. **게시판**: 글, 이미지, 동영상(YouTube/Vimeo URL), 첨부파일
3. **악보 자료실**: 악보 보기, 파트별(소프라노/알토/테너/베이스/전체) 연습 영상 링크

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

**방법 1 (권장)**: AUTH_SECRET 자동 생성 포함
```bash
npm run env:init
```

**방법 2**: 직접 작성  
상세 가이드: [ENV_GUIDE.md](./ENV_GUIDE.md)

`.env` 예시:

```env
# 데이터베이스 (SQLite, 기본 설정)
DATABASE_URL="file:./dev.db"

# Auth.js 시크릿 (필수)
# 생성: openssl rand -base64 32
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth - Google
# https://console.developers.google.com/apis/credentials
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# OAuth - Naver
# https://developers.naver.com/apps
AUTH_NAVER_ID=""
AUTH_NAVER_SECRET=""

# OAuth - Kakao
# https://developers.kakao.com/console/app
AUTH_KAKAO_ID=""
AUTH_KAKAO_SECRET=""
```

### 3. OAuth 설정 가이드

#### Google
1. [Google Cloud Console](https://console.developers.google.com/) 접속
2. 프로젝트 생성 → API 및 서비스 → 사용자 인증 정보
3. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
4. 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`

#### Naver
1. [네이버 개발자센터](https://developers.naver.com/apps) 접속
2. 애플리케이션 등록
3. 네이버 로그인 API 사용
4. Callback URL: `http://localhost:3000/api/auth/callback/naver`

#### Kakao
1. [Kakao Developers](https://developers.kakao.com/console/app) 접속
2. 애플리케이션 추가
3. 카카오 로그인 → 웹 → Redirect URI: `http://localhost:3000/api/auth/callback/kakao`
4. 보안 설정에서 Client Secret 활성화

### 4. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 접속하세요. 로그인하지 않으면 로그인 페이지로 리디렉션됩니다.

## 디렉토리 구조

- `src/app/` - 페이지 및 API 라우트
- `src/components/` - React 컴포넌트
- `src/lib/` - 유틸리티 (Prisma 클라이언트)
- `prisma/` - 데이터베이스 스키마
- `public/uploads/` - 업로드된 파일 (게시물 첨부, 악보)

## 배포

- Vercel, Railway 등 Next.js를 지원하는 플랫폼에 배포 가능
- **Ubuntu 서버 배포**: [DEPLOYMENT.md](./DEPLOYMENT.md) 참고 (GitHub 푸시 → Ubuntu 서버에서 클론 → PM2 실행)
- 배포 시 `DATABASE_URL`을 절대 경로로 설정 권장 (예: `file:/home/ubuntu/mrds/data/dev.db`)
- `NEXTAUTH_URL`을 실제 도메인으로 설정
- OAuth 콜백 URL을 프로덕션 URL로 등록
