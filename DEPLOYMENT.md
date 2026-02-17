# GitHub 업로드 및 Ubuntu 서버 배포 가이드

## 1단계: GitHub에 올리기

### 1-1. GitHub 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. 우측 상단 **+** → **New repository**
3. Repository name 입력 (예: `mirae-dosi`)
4. Public 선택, **Create repository** 클릭

### 1-2. Git 초기화 및 푸시

로컬 프로젝트 폴더(`d:\mrds`)에서:

```bash
# Git 초기화 (이미 되어 있으면 생략)
git init

# 원격 저장소 추가 (YOUR_USERNAME, YOUR_REPO를 본인 것으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 파일 스테이징
git add .

# 커밋
git commit -m "Initial commit: 미래도시 합창단 홈페이지"

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

> **참고**: `.env`, `dev.db`, `public/uploads`는 `.gitignore`에 있어서 올라가지 않습니다.

---

## 2단계: Ubuntu 서버 준비

### 2-1. 서버 요구사항

- Ubuntu 20.04 또는 22.04 LTS
- 최소 1GB RAM (권장 2GB)
- Node.js 18 이상

### 2-2. Node.js 설치

```bash
# Ubuntu에 Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 확인
node -v   # v20.x.x
npm -v
```

### 2-3. Git 설치

```bash
sudo apt update
sudo apt install -y git
```

---

## 3단계: 서버에서 프로젝트 가져오기

### 3-1. 프로젝트 클론

```bash
# 배포용 디렉토리로 이동
cd /home/ubuntu   # 또는 원하는 경로

# GitHub에서 클론 (YOUR_USERNAME, YOUR_REPO 변경)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git mrds
cd mrds
```

### 3-2. 의존성 설치 및 빌드

```bash
npm install
npm run build
```

### 3-3. 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

다음 내용 입력 (실제 값으로 변경):

```env
# 데이터베이스 - 서버에서는 절대 경로 권장
DATABASE_URL="file:/home/ubuntu/mrds/data/dev.db"

# Auth.js (openssl rand -base64 32 로 생성)
AUTH_SECRET="여기에-32자-이상-랜덤-문자열"
NEXTAUTH_URL="https://your-domain.com"

# OAuth - 프로덕션 도메인으로 콜백 URL 등록 후
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_NAVER_ID="..."
AUTH_NAVER_SECRET="..."
AUTH_KAKAO_ID="..."
AUTH_KAKAO_SECRET="..."
```

### 3-4. 데이터 디렉토리 및 마이그레이션

```bash
# data 디렉토리 생성 (DB 저장용)
mkdir -p data
# DATABASE_URL에 file:/home/ubuntu/mrds/data/dev.db 로 설정했다면

# 마이그레이션 실행
npx prisma migrate deploy
```

> `DATABASE_URL`이 `file:./dev.db`이면 프로젝트 루트에 생성됩니다.

### 3-5. 업로드 디렉토리 생성

```bash
mkdir -p public/uploads/posts public/uploads/attachments public/uploads/sheet-music
```

---

## 4단계: PM2로 서비스 실행

### 4-1. PM2 설치

```bash
sudo npm install -g pm2
```

### 4-2. 애플리케이션 실행

```bash
# 프로젝트 폴더에서 (ecosystem.config.cjs 사용)
pm2 start ecosystem.config.cjs

# 또는
pm2 start npm --name "mrds" -- start

# 상태 확인
pm2 status

# 로그 확인
pm2 logs mrds
```

### 4-3. 부팅 시 자동 시작

```bash
pm2 startup
# 출력된 명령어 실행 (sudo env PATH=...)

pm2 save
```

### 4-4. 유용한 PM2 명령어

```bash
pm2 restart mrds    # 재시작
pm2 stop mrds       # 중지
pm2 delete mrds     # 삭제
```

### 4-5. 같은 서버에 여러 앱 실행 시

다른 앱이 이미 3000 포트를 쓰고 있다면, `ecosystem.config.cjs`에서 `PORT: 3001` 등으로 포트를 바꿉니다.

```javascript
env: {
  NODE_ENV: "production",
  PORT: 3001,  // poker-game이 3000을 쓰면 3001 사용
},
```

---

## 5단계: Nginx 리버스 프록시 (선택)

80/443 포트로 접속하려면 Nginx를 사용합니다.

### 5-1. Nginx 설치

```bash
sudo apt install -y nginx
```

### 5-2. 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/mrds
```

다음 내용 입력 (`your-domain.com` 변경):

```nginx
server {
    listen 80;
    server_name choir.your-domain.com;   # mrds 전용 서브도메인

    location / {
        proxy_pass http://127.0.0.1:3001;   # mrds는 3001 포트
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 업로드 파일 용량
    client_max_body_size 50M;
}
```

### 5-3. 사이트 활성화

```bash
sudo ln -s /etc/nginx/sites-available/mrds /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5-4. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d choir.your-domain.com
```

### 5-5. 같은 서버에 여러 앱 (poker-game + mrds)

| 앱 | 포트 | Nginx server_name 예시 |
|----|------|------------------------|
| poker-game | 3000 | poker.your-domain.com 또는 your-domain.com |
| mrds (미래도시) | 3001 | choir.your-domain.com |

서브도메인별로 사이트 설정 파일을 나누고, 각각 `proxy_pass` 포트만 다르게 설정합니다.

---

## 6단계: 업데이트 절차

코드 수정 후 서버 반영:

```bash
cd /home/ubuntu/mrds
git pull origin main
npm install
npm run build
pm2 restart mrds
```

DB 스키마 변경 시:

```bash
npx prisma migrate deploy
pm2 restart mrds
```

---

## 체크리스트

| 항목 | 확인 |
|------|------|
| GitHub에 코드 푸시 완료 | |
| Ubuntu 서버에 Node.js 설치 | |
| 프로젝트 클론 및 `npm run build` 성공 | |
| `.env` 환경 변수 설정 (AUTH_SECRET, NEXTAUTH_URL, OAuth) | |
| OAuth 콜백 URL을 `https://your-domain.com/api/auth/callback/...` 로 등록 | |
| `npx prisma migrate deploy` 실행 | |
| PM2로 서비스 실행 | |
| (선택) Nginx 리버스 프록시 설정 | |
| (선택) HTTPS 인증서 적용 | |
