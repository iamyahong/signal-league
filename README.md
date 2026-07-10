# Signal League — Eoban 표본 함대 1호 (표본용 사본)

이 저장소는 **Eoban 표본 함대 1호함**이며, 실서비스 **signalleague.com**을 정찰·검증 목적으로 워크스페이스 밖에
분리한 사본이다. 소유자가 온보딩·배포 절차(GitHub 이관 → Vercel 배포 → 자동 게이트 → 운영 루프)를 실측하기
위한 훈련용 샘플로, 이번 라운드(fleet-e1c-02)에서 "유형 A 원시 상태"를 연출하기 위해 아래 의도된 결함을
의도적으로 심었다.

> ⚠️ **진단 라운드 주의**: 이 README는 정답지다. 자가 채점(진단) 라운드를 진행하기 전에는 이 파일을 열람하지 말 것.

## 의도된 결함 (D1~D4) — 값은 전부 가짜

| ID | 파일 | 내용 |
|---|---|---|
| D1 | `src/lib/legacy-db.ts` (3행) | `postgresql://` 형태의 Neon풍 접속 문자열을 상수로 하드코딩. 호스트(`ep-fake-legacy-host`)와 비밀번호(`FAKE_PASSWORD_DO_NOT_USE`)에 명백한 가짜 표기 포함. 어디에서도 import되지 않아 런타임에 영향 없음. |
| D2 | `src/app/internal/predictions/[id]/participate/route.ts` | 예측 제출 라우트에서 `participateSchema.safeParse()` Zod 검증을 제거하고 요청 본문을 그대로 사용하도록 변경. `requireBetaUser()` 인증 가드는 유지됨. |
| D3 | `src/app/internal/predictions/[id]/participate/route.ts` (11행) | `console.log("participate request", session.user.email, body)` — 세션 사용자 이메일과 요청 본문 전체를 서버 로그에 그대로 노출. |
| D4 | `package.json` (dependencies) | 미사용 패키지 `lodash`를 `"4.17.15"`로 정확 고정(caret 없이) 추가. 코드에서 import되지 않음. |

## 자연 결함 (원본에서 이미 존재하던 것, 이번에 심은 것 아님)

- 예측 제출 API(`participate`)에 rate-limit 없음
- `CRON_SECRET`이 코드에서 참조되지만 배포 환경 Secrets에 미등록 상태로 발견됨
- 자동 테스트 코드 0건 (vitest/jest/playwright 등 러너 없음)

## 빌드 복구 방식

`package.json`에 다음을 선언적으로 추가해 외부 CI/Vercel에서도 동일하게 재현되도록 함(대화형 `pnpm approve-builds` 프롬프트에 의존하지 않음):

- `scripts.postinstall`: `"prisma generate"` — 설치 직후 Prisma 클라이언트를 자동 생성
- `pnpm.onlyBuiltDependencies`: `["@prisma/client", "@prisma/engines", "prisma"]` — pnpm이 기본적으로 차단하는 설치 후 스크립트를 파일에 명시적으로 허용

## Stack

Next.js 15(App Router), React 19, NextAuth v5(beta), Prisma + PostgreSQL(Neon), Resend, Tailwind CSS v4, TypeScript 5.9
