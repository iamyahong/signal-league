import { z } from "zod";

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

const oneYearLater = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

export const createQuestionSchema = z
  .object({
    title: z.string().min(5, "제목은 5자 이상 입력해주세요.").max(100, "제목은 100자 이하로 입력해주세요."),
    categoryId: z.string().min(1, "카테고리를 선택해주세요."),
    description: z.string().min(20, "설명은 20자 이상 입력해주세요.").max(1000, "설명은 1000자 이하로 입력해주세요."),
    resolutionCriteria: z.string().min(20, "결과 확정 기준은 20자 이상 입력해주세요.").max(500, "결과 확정 기준은 500자 이하로 입력해주세요."),
    closesAt: z.string().refine((v) => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d >= tomorrow();
    }, "참여 마감일은 최소 24시간 이후여야 합니다."),
    resolvesAt: z.string(),
    sourceUrls: z.array(z.string().url("올바른 URL을 입력해주세요.")).max(5).default([]),
    options: z
      .array(
        z.object({
          label: z.string().min(1, "선택지 텍스트를 입력해주세요.").max(50, "선택지는 50자 이하로 입력해주세요."),
          description: z.string().max(200, "선택지 설명은 200자 이하로 입력해주세요.").optional(),
        }),
      )
      .min(2, "선택지는 최소 2개 이상 입력해주세요.")
      .max(5, "선택지는 최대 5개까지 입력할 수 있습니다."),
    creatorCost: z.number().int().positive("생성 비용은 양수여야 합니다."),
  })
  .refine(
    (data) => {
      const closes = new Date(data.closesAt);
      const resolves = new Date(data.resolvesAt);
      return !isNaN(resolves.getTime()) && resolves > closes;
    },
    { message: "결과 확정 예정일은 참여 마감일 이후여야 합니다.", path: ["resolvesAt"] },
  )
  .refine(
    (data) => {
      const labels = data.options.map((o) => o.label.trim());
      return new Set(labels).size === labels.length;
    },
    { message: "선택지 텍스트가 중복되었습니다.", path: ["options"] },
  );

export const participateSchema = z.object({
  optionId: z.string().min(1, "선택지를 선택해주세요."),
  allocatedScore: z
    .number()
    .int("점수는 정수여야 합니다.")
    .min(10, "최소 배분 점수는 10점입니다.")
    .max(1_000_000),
  memo: z.string().max(300, "근거 메모는 300자 이하로 입력해주세요.").optional(),
});

export const commentSchema = z.object({
  commentType: z.enum(["GROUND", "COUNTER", "QUESTION", "INFO", "OTHER"], {
    required_error: "댓글 유형을 선택해주세요.",
  }),
  content: z.string().min(1, "댓글 내용을 입력해주세요.").max(1000, "댓글은 1000자 이하로 입력해주세요."),
  parentId: z.string().optional(),
});

export const reportSchema = z.object({
  reason: z.enum([
    "MISINFORMATION",
    "DEFAMATION",
    "HATE",
    "ILLEGAL",
    "SPAM",
    "SCORE_TRADE",
    "AMBIGUOUS_CRITERIA",
    "OTHER",
  ], { required_error: "신고 사유를 선택해주세요." }),
  detail: z.string().max(500, "상세 내용은 500자 이하로 입력해주세요.").optional(),
});

export const predictionsListSchema = z.object({
  tab: z.enum(["popular", "latest", "closing", "closed", "resolved", "participated"]).default("popular"),
  categories: z.string().optional(),
  sort: z.enum(["latest", "closing", "participants", "allocated", "comments"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().max(100).optional(),
});
