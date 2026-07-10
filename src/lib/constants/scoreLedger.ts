import { ScoreLedgerType } from "@prisma/client";

export const SCORE_TYPE_LABELS: Record<ScoreLedgerType, string> = {
  PLAN_GRANT: "요금제 점수 지급",
  QUESTION_CREATE_COST: "문제 생성 비용",
  QUESTION_CREATE_REFUND: "문제 생성 비용 반환",
  PREDICTION_ALLOCATE: "예측 참여 점수 배분",
  PREDICTION_WIN: "예측 성공 성과 점수",
  PREDICTION_LOSE: "예측 비적중 점수 소진",
  QUESTION_VOID_REFUND: "무효 처리 점수 반환",
  REFERRAL_BONUS: "추천 활동 보너스",
  ADMIN_ADJUST_ADD: "운영자 점수 지급",
  ADMIN_ADJUST_SUBTRACT: "운영자 점수 차감",
  SYSTEM_CORRECTION: "시스템 보정",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_BETA: "베타 대기",
  BETA_ACTIVE: "베타 활성",
  ACTIVE: "활성",
  CANCELED: "해지",
  EXPIRED: "만료",
  SUSPENDED: "정지",
  DELETED: "탈퇴",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING_BETA: "bg-amber-100 text-amber-800",
  BETA_ACTIVE: "bg-green-100 text-green-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  CANCELED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-red-100 text-red-800",
  DELETED: "bg-gray-100 text-gray-400",
};

export const PLAN_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PRO: "Pro",
};
