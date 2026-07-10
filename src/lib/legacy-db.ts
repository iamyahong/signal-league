// 예전 접속 방식 — 마이그레이션 이전 레거시 설정 (현재 어디에서도 import되지 않음, 런타임 무영향)
export const LEGACY_DB_CONNECTION_STRING =
  "postgresql://legacy_user:FAKE_PASSWORD_DO_NOT_USE@ep-fake-legacy-host.us-east-2.aws.neon.tech/legacy_signal_db?sslmode=require";
