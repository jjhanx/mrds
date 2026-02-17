# .env 구성 가이드

`.env` 파일은 프로젝트 루트(`d:\mrds\.env`)에 생성합니다.

---

## 1. 필수 항목 (모든 환경)

### DATABASE_URL

SQLite 데이터베이스 파일 경로입니다.

| 환경 | 값 예시 |
|------|---------|
| 로컬 개발 | `file:./dev.db` |
| Ubuntu 서버 | `file:/home/ubuntu/mrds/data/dev.db` (절대 경로 권장) |

> 서버에서는 `mkdir -p data` 후 `data/dev.db` 경로를 사용하세요.

---

### AUTH_SECRET

암호화에 쓰이는 32자 이상 랜덤 문자열입니다. **절대 공개하지 마세요.**

**생성 방법 (터미널/PowerShell):**

```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# 또는 Git Bash / Mac / Linux
openssl rand -base64 32
```

예시 출력: `K7gNu3vQ1xY2pL9mZ4cR8sT6wE0fH5jA3bN1qD...`

`.env`에 넣을 때:

```env
AUTH_SECRET="K7gNu3vQ1xY2pL9mZ4cR8sT6wE0fH5jA3bN1qD"
```

---

### NEXTAUTH_URL

접속 주소입니다.

| 환경 | 값 예시 |
|------|---------|
| 로컬 개발 | `http://localhost:3000` |
| 실제 서버 (도메인 있음) | `https://your-domain.com` |
| 실제 서버 (IP만) | `http://123.45.67.89:3000` |

---

## 2. OAuth (선택)

OAuth를 **하나도 설정하지 않으면** 개발용 로그인(이메일 + 비밀번호 `test`)만 사용할 수 있습니다.

하나 이상 설정하면 해당 소셜 로그인이 활성화됩니다.

---

### Google (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET)

1. [Google Cloud Console](https://console.developers.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **API 및 서비스** → **사용자 인증 정보** → **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
4. 애플리케이션 유형: **웹 애플리케이션**
5. 승인된 리디렉션 URI 추가:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - 서버: `https://your-domain.com/api/auth/callback/google`
6. 생성 후 **클라이언트 ID** → `AUTH_GOOGLE_ID`
7. **클라이언트 보안 비밀** → `AUTH_GOOGLE_SECRET`

```env
AUTH_GOOGLE_ID="123456789-abcdefg.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
```

---

### Naver (AUTH_NAVER_ID, AUTH_NAVER_SECRET)

1. [네이버 개발자센터](https://developers.naver.com/apps) 접속
2. **애플리케이션 등록**
3. **네이버 로그인** API 사용 설정
4. **사용 API**: 프로필 정보, 이메일 주소 등 필요한 항목 선택
5. **Callback URL**:
   - 로컬: `http://localhost:3000/api/auth/callback/naver`
   - 서버: `https://your-domain.com/api/auth/callback/naver`
6. 등록 후 **Client ID** → `AUTH_NAVER_ID`
7. **Client Secret** → `AUTH_NAVER_SECRET`

```env
AUTH_NAVER_ID="abcd1234efgh5678"
AUTH_NAVER_SECRET="abcdefgh"
```

---

### Kakao (AUTH_KAKAO_ID, AUTH_KAKAO_SECRET)

1. [Kakao Developers](https://developers.kakao.com/console/app) 접속
2. **애플리케이션 추가**
3. **앱 설정** → **플랫폼** → **Web** 추가
4. **사이트 도메인**:
   - 로컬: `http://localhost:3000`
   - 서버: `https://your-domain.com`
5. **카카오 로그인** → **활성화**
6. **Redirect URI**:
   - 로컬: `http://localhost:3000/api/auth/callback/kakao`
   - 서버: `https://your-domain.com/api/auth/callback/kakao`
7. **요약정보** 탭의 **REST API 키** → `AUTH_KAKAO_ID`
8. **보안** 탭에서 **코드** 생성 → `AUTH_KAKAO_SECRET`

```env
AUTH_KAKAO_ID="1234567890abcdef1234567890abcdef"
AUTH_KAKAO_SECRET="abcdefghijklmnopqrstuvwxyz1234"
```

---

## 3. 최소 .env 템플릿

### 로컬 개발 (OAuth 없이, 테스트 로그인만)

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="여기에-above-명령으로-생성한-32자-문자열"
NEXTAUTH_URL="http://localhost:3000"
```

위 3개만 넣으면, 이메일 아무 값 + 비밀번호 `test` 로 로그인할 수 있습니다.

---

### 로컬 개발 (Google 로그인 추가)

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="생성한-시크릿-문자열"
NEXTAUTH_URL="http://localhost:3000"

AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

---

### 서버 배포 (전체 OAuth)

```env
DATABASE_URL="file:/home/ubuntu/mrds/data/dev.db"
AUTH_SECRET="서버용-다른-시크릿-문자열"
NEXTAUTH_URL="https://your-domain.com"

AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_NAVER_ID="..."
AUTH_NAVER_SECRET="..."
AUTH_KAKAO_ID="..."
AUTH_KAKAO_SECRET="..."
```

---

## 4. 자주 묻는 것

**Q. OAuth를 아예 안 쓸 수 있나요?**  
A. 가능합니다. 위 “최소 .env 템플릿”만 넣으면 테스트 로그인만 사용합니다.

**Q. 일부만 쓰고 싶어요 (예: Google만)**  
A. 해당 provider의 ID/Secret만 넣고, 나머지는 비우면 됩니다.

**Q. 로컬과 서버에서 같은 .env를 써도 되나요?**  
A. `NEXTAUTH_URL`은 환경별로 꼭 다르게 두고, `AUTH_SECRET`도 환경마다 별도로 두는 것이 좋습니다.

**Q. .env는 GitHub에 올려도 되나요?**  
A. 안 됩니다. `.gitignore`에 의해 제외됩니다. GitHub에는 올리지 말아야 합니다.
