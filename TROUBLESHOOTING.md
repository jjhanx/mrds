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

- Google: `https://your-domain.com/api/auth/callback/google`
- Naver: `https://your-domain.com/api/auth/callback/naver`
- Kakao: `https://your-domain.com/api/auth/callback/kakao`

---

## 6. PM2 로그

```bash
pm2 logs mrds --lines 30
```

여기서 스택 트레이스나 에러 메시지를 확인합니다.
