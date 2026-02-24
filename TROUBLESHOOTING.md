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

## 2-1. 로그인 후 다시 로그인 페이지로 돌아옴 (세션 미유지)

OAuth 로그인 완료 후 곧바로 로그인 화면으로 돌아가면 **세션 쿠키**가 설정되지 않은 상태입니다.

### 서버 .env 확인 (필수)

```bash
grep -E "NEXTAUTH_URL|AUTH_TRUST_HOST" ~/mrds/.env
```

**반드시** 아래처럼 설정되어 있어야 합니다:

```env
NEXTAUTH_URL="https://mrds215.duckdns.org"
AUTH_TRUST_HOST="true"
```

잘못된 예:
- `NEXTAUTH_URL="http://59.10.149.18:3001"` → **절대 사용 금지** (접속 도메인과 다름)
- `NEXTAUTH_URL="http://mrds215.duckdns.org"` → http가 아닌 **https** 사용

### nginx 프록시 헤더 확인

`/etc/nginx/sites-available/mrds`의 `location /`에 다음이 있어야 합니다:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### useSecureCookies

코드에 `useSecureCookies: true`가 NEXTAUTH_URL이 https일 때 자동 설정됩니다. nginx 뒤에서는 앱이 HTTP로 받지만 브라우저는 HTTPS이므로 Secure 쿠키가 필요합니다.

### 수정 후

```bash
pm2 restart mrds
# nginx 수정 시
sudo systemctl reload nginx
```

브라우저에서 **시크릿 창**으로 다시 접속해 테스트하세요.

### 디버그: 세션 확인

`https://mrds215.duckdns.org/api/debug-auth` 접속 시 `hasSession: true`이면 세션 정상, `false`이면 쿠키 미설정입니다.

### API에는 세션 있는데 `/` 접속 시 로그인 화면만 보임

**원인**: Next.js 미들웨어는 Edge 런타임에서 실행되는데, **SQLite는 Edge에서 지원되지 않음**. DB 세션 조회가 불가해 미들웨어에서 항상 비로그인으로 처리됨.

**해결**: 세션 전략을 **JWT**로 변경 (코드에 반영됨). JWT는 쿠키에 저장되어 Edge에서도 동작합니다.

---

## 2-2. /api/auth/session 500 에러 (Auth.js v5)

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

---

## 7. 413 Request Entity Too Large (이미지/파일 업로드 실패)

게시글에 이미지 붙여넣기 후 등록 시 **413** 에러가 나면 nginx의 업로드 용량 제한 때문입니다.

### 해결 방법

**1) nginx 설정 파일 확인**

```bash
sudo nano /etc/nginx/sites-available/mrds
```

**2) `client_max_body_size 50M;` 추가**

`server {` 블록 **안쪽**에 다음 한 줄을 추가합니다 (location 위에 두어도 됨):

```nginx
server {
    listen 80;
    server_name mrds215.duckdns.org;   # 본인 도메인

    client_max_body_size 50M;          # ← 이 줄 추가

    location / {
        proxy_pass http://127.0.0.1:3001;
        # ... 기존 proxy_set_header 등
    }
}
```

**3) nginx 설정 검사 및 적용**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**4) 다시 업로드 시도**

브라우저에서 캐시 새로고침(Ctrl+Shift+R) 후 이미지 붙여넣기·등록을 다시 시도하세요.

---

## 8. 악보 자료실 동영상 업로드 504 (Gateway Timeout)

동영상 업로드 시 **504 Bad Gateway**가 나면, nginx의 프록시 타임아웃(기본 60초)에 걸린 것입니다. ffmpeg 트랜스코딩은 수 분 걸릴 수 있습니다.

### 해결 방법

**1) nginx 설정 파일 수정**

```bash
sudo nano /etc/nginx/sites-available/mrds
```

`location /` 블록 안에 다음을 추가합니다:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # 동영상 업로드·트랜스코딩 대기 (10분)
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
}
```

**2) nginx 적용**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**3) 다시 업로드 시도**

---

## 9. 동영상 업로드됐지만 "재생할 수 없습니다" (ffmpeg 있음)

ffmpeg이 설치되어 있는데도 동영상이 재생되지 않으면, **PM2 환경에서 ffmpeg 실행 파일을 찾지 못하는 경우**입니다.

### 해결 방법

**1) .env에 ffmpeg 절대 경로 추가**

```bash
nano ~/mrds/.env
```

맨 아래에 추가:
```env
FFMPEG_PATH="/usr/bin/ffmpeg"
```

(경로 확인: `which ffmpeg`)

**2) ecosystem.config.cjs에 PATH 추가** (이미 반영됨)

`env`에 `PATH: "/usr/bin:/usr/local/bin:..."`가 있으면 ffmpeg을 찾을 수 있습니다.

**3) PM2 재시작**

```bash
pm2 restart mrds
```

**4) 동영상 다시 업로드**

기존에 업로드된 파일은 원본 형식이므로, 수정 후 **새로 업로드**해야 H.264로 변환됩니다.

---

## 10. Failed to parse body as FormData

이미지 붙여넣기 후 등록 시 **Failed to parse body as FormData** 에러가 나면, Next.js가 body를 버퍼링할 때 크기 제한(기본 10MB)에 걸린 것입니다.

### 해결 방법

`next.config.ts`에 `proxyClientMaxBodySize: "50mb"`가 설정되어 있는지 확인하세요 (코드에 이미 반영됨). 설정 후 재빌드:

```bash
cd ~/mrds
git pull
npm run build
pm2 restart mrds
```
