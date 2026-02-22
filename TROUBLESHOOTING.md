# 페이지가 보이지 않을 때 점검 사항

## 1. 서버 응답 확인

브라우저에서 접속:

```
http://서버IP:3001/api/health
```

또는 (Nginx 사용 시)
```
https://choir.your-domain.com/api/health
```

**정상 응답 예시:** `{"ok":true,"timestamp":"..."}`

- 응답이 있으면 → 서버는 동작 중. 2번으로.
- 응답이 없으면 → PM2/방화벽/포트 확인.

---

## 2. NEXTAUTH_URL 확인 (가장 흔한 원인)

`.env`의 `NEXTAUTH_URL`이 **실제 접속 주소와 정확히 같아야** 합니다.

| 접속 주소 | NEXTAUTH_URL (올바른 예) |
|-----------|--------------------------|
| http://123.45.67.89:3001 | `http://123.45.67.89:3001` |
| https://choir.example.com | `https://choir.example.com` |
| http://localhost:3001 | `http://localhost:3001` |

**잘못된 예:**  
서버에서 `https://choir.example.com`으로 접속하는데  
`NEXTAUTH_URL="http://localhost:3000"`이면 로그인·페이지가 정상 동작하지 않습니다.

수정 후 PM2 재시작:
```bash
pm2 restart mrds
```

---

## 2-1. /api/auth/session 500 에러 (Auth.js v5)

콘솔에 `"There was a problem with the server configuration"` / `autherror` 표시 시:

`.env`에 다음 추가 후 PM2 재시작:

```env
AUTH_TRUST_HOST="true"
```

배포 환경(역방향 프록시, 포트 3001 등)에서는 Auth.js v5가 호스트 검증을 위해 이 값이 필요합니다.

---

## 3. 로그인 페이지 확인

`/login`으로 직접 접속:

```
http://서버IP:3001/login
```

- 로그인 페이지가 보이면 → 로그인 후 리다이렉트 문제 가능성 (2번 NEXTAUTH_URL 확인).
- 빈 화면이면 → 4번 확인.

---

## 4. 콘솔 에러 확인

브라우저에서 **F12** → **Console** 탭을 연 뒤 페이지 새로고침.

- `Failed to load resource` (404) → 정적 파일/이미지 경로 문제. `public/hero.jpg` 등이 서버에 있는지 확인. 최신 커밋 `git pull` 후 `npm run build` 재실행.
- ` hydration` / `Mismatch` → SSR 관련 문제.
- `Auth` / `Session` / `NEXTAUTH` 관련 메시지 → 인증 설정 문제.

---

## 5. OAuth vs 테스트 로그인

**OAuth(Google/Naver/Kakao) 미설정 시:**

로그인 페이지 아래 **"개발용 로그인 (OAuth 미설정 시)"** 를 펼친 뒤:

- 이메일: 아무 값 (예: `test@test.com`)
- 비밀번호: `test`

로 로그인 가능합니다.

**OAuth 사용 시:**  
각 서비스 개발자 콘솔에서 **Callback URL**을 실제 접속 주소로 설정했는지 확인하세요.

---

## 5-1. OAuth(Google/Naver/Kakao) 로그인이 안 될 때

버튼은 보이는데 클릭 후 실패·리다이렉트 오류·`redirect_uri_mismatch`가 나면, 아래를 순서대로 확인하세요.

### 0) 환경 변수 확인

`.env`에 해당 제공자의 ID/Secret이 모두 있어야 합니다.

- Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- Naver: `AUTH_NAVER_ID`, `AUTH_NAVER_SECRET`
- Kakao: `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`

하나라도 비어 있으면 해당 제공자는 사용 불가입니다.

### 1) NEXTAUTH_URL 확인

`.env`의 `NEXTAUTH_URL`이 실제 접속 주소와 **완전히** 같아야 합니다.

| 실제 접속 URL | NEXTAUTH_URL |
|---------------|--------------|
| http://123.45.67.89:3001 | `http://123.45.67.89:3001` |
| http://localhost:3001 | `http://localhost:3001` |
| https://choir.example.com | `https://choir.example.com` |

> 이 앱은 **3001** 포트 사용. `localhost:3000`이면 안 됩니다.

### 2) 각 OAuth 콘솔에 등록할 콜백 URL

**NEXTAUTH_URL 끝에 `/api/auth/callback/{provider}` 를 붙인 값**을 등록합니다.

| 환경 | Google | Naver | Kakao |
|------|--------|-------|-------|
| 로컬 (3001) | `http://localhost:3001/api/auth/callback/google` | `http://localhost:3001/api/auth/callback/naver` | `http://localhost:3001/api/auth/callback/kakao` |
| 서버 (IP) | `http://서버IP:3001/api/auth/callback/google` | `http://서버IP:3001/api/auth/callback/naver` | `http://서버IP:3001/api/auth/callback/kakao` |
| 서버 (도메인) | `https://도메인/api/auth/callback/google` | `https://도메인/api/auth/callback/naver` | `https://도메인/api/auth/callback/kakao` |

### 3) 제공자별 체크

- **Google**  
  [API 및 서비스 → 사용자 인증 정보](https://console.cloud.google.com/apis/credentials) → OAuth 클라이언트 → **승인된 리디렉션 URI**에 위 URL **정확히** 추가

- **Naver**  
  [네이버 개발자센터](https://developers.naver.com/apps) → 앱 선택 → **API 설정** → **Callback URL**에 위 URL 추가

- **Kakao**  
  [Kakao Developers](https://developers.kakao.com/console/app) → 앱 선택 →  
  - **플랫폼** → Web → **사이트 도메인**: `http://localhost:3001` 또는 `http://서버IP:3001`  
  - **카카오 로그인** → **Redirect URI**: 위 표의 Kakao URL 추가

### 4) Google 전용: "doesn't comply with OAuth 2.0 policy" / 400 invalid_request

`You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy` 오류가 나면:

**원인 1: 테스트 모드 + 테스트 사용자 미등록**

앱이 **테스트** 모드일 때는 **테스트 사용자 목록에 등록된 Google 계정**만 로그인할 수 있습니다.

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택
2. **API 및 서비스** → **OAuth 동의 화면**
3. 아래로 스크롤하여 **테스트 사용자** 섹션 확인
4. **+ ADD USERS** 클릭 → 로그인 허용할 Google 이메일 주소 추가 (최대 100명)
5. 저장

**원인 2: 프로덕션 발행 필요**

테스트 사용자 외 모든 사용자가 로그인하려면:

- **OAuth 동의 화면** → **앱 게시** → **앱을 프로덕션으로 이동** 선택
- (민감 범위 사용 시) Google 검증 신청 필요

**원인 3: HTTPS**

프로덕션 도메인(mrds215.duckdns.org 등)은 **HTTPS**여야 합니다. HTTP 리디렉션 URI는 localhost만 허용됩니다.

### 5) 변경 후

`.env` 또는 OAuth 콘솔 수정 후:

```bash
pm2 restart mrds
```

브라우저 캐시 삭제 후 다시 시도하세요.

---

## 6. PM2 로그

```bash
pm2 logs mrds --lines 30
```

여기서 스택 트레이스나 에러 메시지를 확인합니다.
