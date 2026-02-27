# nextjs_test_project

Next.js + Supabase 기반의 **로그인 사용자 전용 보안 영상 보관함** 예제입니다.

## 구현된 기능

- 이메일 로그인/회원가입(Supabase Auth)
- 로그인 사용자만 접근 가능한 `/videos` 페이지
- 영상 업로드 시 브라우저에서 AES-256-GCM 암호화 후 Cloudflare R2(private) 저장
- 기존 Supabase Storage 파일은 백업 경로로 계속 접근 가능 (mixed mode)
- 사용자별 영상 목록 표시
- 영상 클릭 시 암호문 다운로드 후 브라우저 복호화 재생
- Tailwind CSS 기반 UI

> 저장소(Storage)에는 평문 영상이 아닌 암호문(`*.enc`)만 저장됩니다.
>
> R2 이관 가이드는 `docs/r2-migration.md`를 참고하세요.

---

## 1) 환경변수 설정

`.env.local` 파일에 아래 값을 설정하세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional (default: encrypted-videos)
SUPABASE_VIDEO_BUCKET=encrypted-videos

# 32자 이상 권장
VIDEO_ENCRYPTION_SECRET=
```

`VIDEO_ENCRYPTION_SECRET`는 사용자 ID와 결합해 복호화 키를 파생하는 데 사용됩니다.

---

## 2) Supabase SQL 실행

Supabase SQL Editor에서 `supabase.sql`을 실행하세요.

생성되는 항목:
- `public.videos` 테이블
- RLS 정책(본인 row만 조회/삽입/삭제)
- private bucket `encrypted-videos`

---

## 3) 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후:
1. `/auth`에서 회원가입/로그인
2. `/videos`에서 영상 업로드
3. 목록에서 재생

---

## API 요약

- `POST /api/videos`
  - multipart form-data(`file`)
  - 로그인 사용자만 가능
  - 암호화 후 Storage 업로드 + 메타데이터 저장

- `GET /api/videos`
  - 로그인 사용자 본인 영상 목록 반환

- `GET /api/videos/:id/stream`
  - 로그인 사용자 본인 영상만
  - Storage 암호문 다운로드 -> 복호화 -> video 응답

---

## 보안 메모

- 이 예제는 **서버 복호화 재생 방식**입니다.
- 키 파생은 `VIDEO_ENCRYPTION_SECRET + user.id` 기반입니다.
- 운영 단계에서는 KMS(HSM) 도입, 키 로테이션, 감사 로그를 권장합니다.
