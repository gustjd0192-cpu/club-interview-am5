# Supabase 설정

이 버전은 타임테이블 데이터를 기존 `applicants` 테이블과 분리해 `interview_applications`에 저장합니다.

Supabase SQL Editor에서 다음 파일의 SQL을 한 번 실행하세요.

`supabase/interview_applications.sql`

필수 환경변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

이 버전의 타임테이블 API는 서버에서 Service Role을 사용하므로 Service Role Key를 브라우저 코드에 넣으면 안 됩니다.

기존 `applicants` 테이블의 RLS 정책은 기존 지망/AI 배정 기능 때문에 그대로 두어도 됩니다.
