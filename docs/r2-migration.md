# Supabase Storage → Cloudflare R2 migration (mixed mode)

## 목표
- 신규 업로드: Cloudflare R2 (private, presigned URL)
- 기존 업로드 파일: Supabase Storage 그대로 유지
- DB는 Supabase `videos` 테이블 그대로 사용

## 변경 전략
1. 기존 Supabase Storage 연동은 `src/lib/storage/providers/supabase-backup.ts` 로 백업 경로화
2. 신규 업로드는 `r2:` prefix가 붙은 `storage_path`로 저장
   - 예: `r2:videos/<user-id>/<video-id>.mp4.enc`
3. 다운로드/삭제는 `storage_path` prefix로 provider 자동 분기

## Cloudflare R2 생성/설정
1. Cloudflare Dashboard > **R2** > **Create bucket**
   - bucket: `encrypted-videos` (예시)
2. R2 > **Manage R2 API Tokens** > 토큰 생성
   - 권한: Object Read + Object Write (해당 버킷)
   - 발급된 `Access Key ID` / `Secret Access Key` 저장
3. Account ID 확인 (Cloudflare 우측 정보 또는 API 페이지)
4. CORS 설정 (직접 업로드 허용)

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 환경변수
`.env.local`에 다음 값 설정:

```bash
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=encrypted-videos
CLOUDFLARE_R2_KEY_PREFIX=videos
CLOUDFLARE_R2_UPLOAD_TTL_SECONDS=300
CLOUDFLARE_R2_DOWNLOAD_TTL_SECONDS=120
SUPABASE_SIGNED_DOWNLOAD_TTL_SECONDS=120
```

## 신규 API
- `POST /api/videos/upload-url` : R2 presigned PUT URL 발급
- `GET /api/videos/[id]/download-url` : provider별 presigned GET URL 발급
- `DELETE /api/videos/[id]` : provider별 파일 삭제 + DB row 삭제

## 롤아웃 순서
1. env 입력 후 배포
2. 신규 파일 업로드/재생 테스트
3. 기존(legacy) Supabase 파일 재생/삭제 테스트
4. 운영 안정화 후 필요 시 배치 마이그레이션 진행

## 보안 주의사항
- R2 Secret/Access key는 절대 클라이언트 노출 금지
- presigned URL TTL은 짧게 유지 (권장 1~5분)
- 업로드 전 서버에서 인증/권한 검증 필수
