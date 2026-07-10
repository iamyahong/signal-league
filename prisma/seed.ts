import {
  PrismaClient,
  PlanCode,
  UserRoleType,
  UserStatus,
  SubscriptionStatus,
  ScoreLedgerType,
  QuestionStatus,
  CommentType,
  ReportTargetType,
  ReportStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function makeReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function applyScoreInSeed(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  type: ScoreLedgerType,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  const profile = await tx.userProfile.findUniqueOrThrow({ where: { userId }, select: { availableScore: true } });
  const balanceBefore = profile.availableScore;
  const balanceAfter = balanceBefore + amount;
  if (balanceAfter < 0) throw new Error(`잔액 부족: ${userId} (before:${balanceBefore} amount:${amount})`);

  await tx.scoreLedger.create({
    data: { userId, type, amount, balanceAfter, description, referenceType, referenceId },
  });
  const update: Record<string, unknown> = { availableScore: balanceAfter };
  if (amount > 0) update.totalScore = { increment: amount };
  await tx.userProfile.update({ where: { userId }, data: update });
  return balanceAfter;
}

async function main() {
  console.log("🌱 시딩 시작...");

  // Plans
  const planDefs = [
    { code: PlanCode.BASIC,    name: "Basic",    priceKrw: 1100, monthlyScore: 1000,  description: "예측 리그 입문자를 위한 기본 요금제" },
    { code: PlanCode.STANDARD, name: "Standard", priceKrw: 3900, monthlyScore: 4000,  description: "일반 사용자를 위한 표준 요금제" },
    { code: PlanCode.PRO,      name: "Pro",      priceKrw: 9900, monthlyScore: 10000, description: "적극적인 예측 참여자를 위한 프로 요금제" },
  ];
  for (const plan of planDefs) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }
  console.log("✅ Plan 3개");

  // Categories
  const catDefs = [
    { slug: "economy",       name: "경제·금융", sortOrder: 1 },
    { slug: "international", name: "국제정세",  sortOrder: 2 },
    { slug: "society",       name: "사회",      sortOrder: 3 },
    { slug: "tech",          name: "기술·AI",   sortOrder: 4 },
    { slug: "culture",       name: "문화·엔터", sortOrder: 5 },
    { slug: "sports",        name: "스포츠",    sortOrder: 6 },
  ];
  for (const cat of catDefs) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat });
  }
  console.log("✅ Category 6개");

  // ServiceSettings
  const settings = [
    { key: "question_create_min_ratio",  value: "0.05" },
    { key: "question_create_min_score",  value: "50"   },
    { key: "question_create_max_score",  value: "5000" },
    { key: "prediction_min_allocate",    value: "10"   },
    { key: "prediction_win_multiplier",  value: "2"    },
    { key: "dispute_period_hours",       value: "72"   },
  ];
  for (const s of settings) {
    await prisma.serviceSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log("✅ ServiceSetting 6개");

  const [basicPlan, standardPlan, proPlan] = await Promise.all([
    prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.BASIC } }),
    prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.STANDARD } }),
    prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.PRO } }),
  ]);

  const pwHash = await bcrypt.hash("Test1234!", 12);

  // Test accounts
  const testAccounts = [
    { email: "admin@signalleague.com",         nickname: "관리자",   status: UserStatus.BETA_ACTIVE,  plan: proPlan,      subStatus: SubscriptionStatus.BETA_ACTIVE,  role: UserRoleType.SUPER_ADMIN, desiredPlan: PlanCode.PRO      },
    { email: "operator@signalleague.com",      nickname: "운영자",   status: UserStatus.BETA_ACTIVE,  plan: proPlan,      subStatus: SubscriptionStatus.BETA_ACTIVE,  role: UserRoleType.OPERATOR,    desiredPlan: PlanCode.PRO      },
    { email: "test-basic@signalleague.com",    nickname: "베타기본", status: UserStatus.BETA_ACTIVE,  plan: basicPlan,    subStatus: SubscriptionStatus.BETA_ACTIVE,  role: null, desiredPlan: PlanCode.BASIC    },
    { email: "test-standard@signalleague.com", nickname: "베타표준", status: UserStatus.BETA_ACTIVE,  plan: standardPlan, subStatus: SubscriptionStatus.BETA_ACTIVE,  role: null, desiredPlan: PlanCode.STANDARD },
    { email: "test-pro@signalleague.com",      nickname: "베타프로", status: UserStatus.BETA_ACTIVE,  plan: proPlan,      subStatus: SubscriptionStatus.BETA_ACTIVE,  role: null, desiredPlan: PlanCode.PRO      },
    { email: "test-pending@signalleague.com",  nickname: "베타대기", status: UserStatus.PENDING_BETA, plan: basicPlan,    subStatus: SubscriptionStatus.PENDING_BETA, role: null, desiredPlan: PlanCode.STANDARD },
  ];

  const createdUsers: Record<string, string> = {};
  const now = new Date();

  for (const acc of testAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      console.log(`⏭️  이미 존재: ${acc.email}`);
      createdUsers[acc.email] = existing.id;
      if (acc.role) {
        const existingRole = await prisma.userRole.findFirst({ where: { userId: existing.id, role: acc.role } });
        if (!existingRole) await prisma.userRole.create({ data: { userId: existing.id, role: acc.role } });
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: acc.email,
        nickname: acc.nickname,
        passwordHash: pwHash,
        status: acc.status,
        desiredPlanCode: acc.desiredPlan,
        referralCode: makeReferralCode(),
        profile: { create: { favoriteCategories: ["economy", "tech"], joinPurpose: "예측 능력을 기르고 싶습니다." } },
        subscription: {
          create: {
            planId: acc.plan.id,
            status: acc.subStatus,
            ...(acc.status === UserStatus.BETA_ACTIVE && { betaApprovedAt: now, betaApprovedBy: "seed" }),
          },
        },
      },
    });
    createdUsers[acc.email] = user.id;
    if (acc.role) await prisma.userRole.create({ data: { userId: user.id, role: acc.role } });
    if (acc.status === UserStatus.BETA_ACTIVE) {
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, user.id, ScoreLedgerType.PLAN_GRANT, acc.plan.monthlyScore, `베타 승인 — ${acc.plan.name} 요금제 월 지급 점수`, "Subscription");
      });
    }
    console.log(`✅ 계정 생성: ${acc.email} (${acc.nickname})`);
  }

  // Add dummy score transactions for test-standard account
  const standardUserId = createdUsers["test-standard@signalleague.com"];
  if (standardUserId) {
    const existingDummy = await prisma.scoreLedger.findFirst({
      where: { userId: standardUserId, type: ScoreLedgerType.ADMIN_ADJUST_ADD, description: { contains: "더미" } },
    });
    if (!existingDummy) {
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, standardUserId, ScoreLedgerType.ADMIN_ADJUST_ADD,      500, "더미 — 이벤트 참여 보상",   "AuditLog");
        await applyScoreInSeed(tx, standardUserId, ScoreLedgerType.ADMIN_ADJUST_SUBTRACT, -200, "더미 — 규정 위반 차감",    "AuditLog");
        await applyScoreInSeed(tx, standardUserId, ScoreLedgerType.REFERRAL_BONUS,         300, "더미 — 추천 보너스",       "Referral");
      });
      console.log("✅ test-standard 더미 거래 3건 추가");
    }
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 3a: Dummy users + Questions + Participations + Comments
  // ─────────────────────────────────────────────────────────

  // 20 Dummy users (@signalleague.local) — not loginable (blocked in auth.ts)
  const dummyUserDefs = [
    { email: "dummy-01@signalleague.local", nickname: "예측초보",     plan: basicPlan    },
    { email: "dummy-02@signalleague.local", nickname: "흐름분석가",   plan: standardPlan },
    { email: "dummy-03@signalleague.local", nickname: "시장읽기",     plan: standardPlan },
    { email: "dummy-04@signalleague.local", nickname: "뉴스러버",     plan: basicPlan    },
    { email: "dummy-05@signalleague.local", nickname: "미래탐험가",   plan: proPlan      },
    { email: "dummy-06@signalleague.local", nickname: "경제학개론",   plan: standardPlan },
    { email: "dummy-07@signalleague.local", nickname: "트렌드헌터",   plan: proPlan      },
    { email: "dummy-08@signalleague.local", nickname: "정보수집가",   plan: standardPlan },
    { email: "dummy-09@signalleague.local", nickname: "신호감지기",   plan: proPlan      },
    { email: "dummy-10@signalleague.local", nickname: "판단력충만",   plan: basicPlan    },
    { email: "dummy-11@signalleague.local", nickname: "데이터마니아", plan: proPlan      },
    { email: "dummy-12@signalleague.local", nickname: "거시경제관",   plan: standardPlan },
    { email: "dummy-13@signalleague.local", nickname: "글로벌시야",   plan: standardPlan },
    { email: "dummy-14@signalleague.local", nickname: "기술예측가",   plan: proPlan      },
    { email: "dummy-15@signalleague.local", nickname: "문화코드읽기", plan: basicPlan    },
    { email: "dummy-16@signalleague.local", nickname: "스포츠분석",   plan: basicPlan    },
    { email: "dummy-17@signalleague.local", nickname: "정치경제학",   plan: standardPlan },
    { email: "dummy-18@signalleague.local", nickname: "사회탐구자",   plan: standardPlan },
    { email: "dummy-19@signalleague.local", nickname: "미디어리터시", plan: proPlan      },
    { email: "dummy-20@signalleague.local", nickname: "인사이트왕",   plan: proPlan      },
  ];

  const dummyUserIds: string[] = [];
  for (const def of dummyUserDefs) {
    const existing = await prisma.user.findUnique({ where: { email: def.email } });
    if (existing) {
      dummyUserIds.push(existing.id);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        email: def.email,
        nickname: def.nickname,
        passwordHash: pwHash,
        status: UserStatus.BETA_ACTIVE,
        desiredPlanCode: def.plan.code,
        referralCode: makeReferralCode(),
        profile: { create: { favoriteCategories: [], joinPurpose: "시드 더미 계정" } },
        subscription: {
          create: {
            planId: def.plan.id,
            status: SubscriptionStatus.BETA_ACTIVE,
            betaApprovedAt: now,
            betaApprovedBy: "seed",
          },
        },
      },
    });
    dummyUserIds.push(user.id);
    // Give 50,000 starting points so they can participate many times
    await prisma.$transaction(async (tx) => {
      await applyScoreInSeed(tx, user.id, ScoreLedgerType.PLAN_GRANT, 50000, "시드 — 더미 계정 초기 지급", "Subscription");
    });
  }
  console.log(`✅ 더미 유저 ${dummyUserIds.length}명`);

  // Fetch categories
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  // Author = dummy-01 for most, admin for a few
  const adminId = createdUsers["admin@signalleague.com"] ?? dummyUserIds[0];
  const d = dummyUserIds;

  // 12 OPEN prediction questions
  const questionDefs = [
    {
      slug: "q-interest-rate-2026h1",
      authorIdx: 0,
      categorySlug: "economy",
      title: "한국은행 기준금리, 2026년 상반기 내 한 번 이상 인하될까?",
      description: "한국은행 금융통화위원회는 2025년 하반기 기준금리를 3.0%로 동결했습니다. 2026년 들어 인플레이션 안정세와 경기 둔화 우려가 교차하면서 금리 인하 여부에 대한 전망이 엇갈리고 있습니다. 글로벌 금리 사이클 전환, 미 연준 정책 동조화, 국내 부동산 시장 상황 등을 고려할 때 상반기 내 인하 여부를 예측해보세요.",
      resolutionCriteria: "2026년 6월 30일까지 한국은행이 기준금리를 현재 수준에서 0.25%p 이상 인하하면 '인하 있음'이 정답입니다. 한국은행 공식 금통위 결정문을 기준으로 판단합니다.",
      closeDays: 25,
      resolveDays: 50,
      options: ["인하 있음", "동결 유지"],
    },
    {
      slug: "q-kospi-3000-2026",
      authorIdx: 1,
      categorySlug: "economy",
      title: "코스피 지수, 2026년 내 3,000선 돌파할까?",
      description: "코스피는 2025년 내내 2,400~2,700 사이에서 박스권을 형성했습니다. 반도체 업황 회복, 외국인 수급 개선, 환율 안정화 여부 등이 핵심 변수로 작용하고 있습니다. 2026년 내 3,000선 돌파 가능성에 대한 여러분의 판단을 공유해주세요.",
      resolutionCriteria: "2026년 12월 31일까지 코스피 종가 기준 3,000포인트 이상을 단 하루라도 기록하면 '돌파'가 정답입니다. 한국거래소(KRX) 공식 데이터를 기준으로 합니다.",
      closeDays: 20,
      resolveDays: 60,
      options: ["3,000선 돌파", "돌파 실패"],
    },
    {
      slug: "q-usd-krw-1350",
      authorIdx: 2,
      categorySlug: "economy",
      title: "원달러 환율, 2026년 3분기 말 1,350원 미만으로 하락할까?",
      description: "원달러 환율은 2025년 말 1,400원대를 돌파했습니다. 미 연준의 금리 동결 기조, 한국 수출 회복 여부, 지정학적 리스크 등이 복잡하게 얽혀 있습니다. 2026년 3분기 말(9월 30일) 환율 수준을 예측해보세요.",
      resolutionCriteria: "2026년 9월 30일 서울 외환시장 종가(하나은행 고시 기준) 원달러 환율이 1,350원 미만이면 '1,350 미만'이 정답입니다.",
      closeDays: 15,
      resolveDays: 45,
      options: ["1,350원 미만", "1,350~1,450원", "1,450원 이상"],
    },
    {
      slug: "q-us-election-economy",
      authorIdx: 3,
      categorySlug: "international",
      title: "미국 2026년 중간선거, 공화당이 상·하원 모두 과반을 유지할까?",
      description: "2024년 트럼프 재집권 이후 공화당은 상·하원 모두 과반을 장악했습니다. 2026년 중간선거를 앞두고 경제 실적, 이민 정책, 관세 전쟁 결과가 유권자 심리에 영향을 줄 전망입니다. 공화당의 양원 과반 유지 여부를 예측해보세요.",
      resolutionCriteria: "2026년 11월 미국 중간선거 결과 공화당이 상원(51석 이상)과 하원(218석 이상) 모두 과반을 유지하면 '유지'가 정답입니다. AP통신 공식 결과를 기준으로 합니다.",
      closeDays: 30,
      resolveDays: 90,
      options: ["양원 모두 유지", "하원만 상실", "상원만 상실", "양원 모두 상실"],
    },
    {
      slug: "q-ukraine-ceasefire-2026",
      authorIdx: 4,
      categorySlug: "international",
      title: "러시아-우크라이나 전쟁, 2026년 내 공식 휴전 협정 체결될까?",
      description: "미국의 중재 노력과 유럽의 외교적 압박 속에서 러시아-우크라이나 전쟁의 휴전 협상이 진행 중입니다. 영토 문제, 안보 보장, 제재 해제 등 복잡한 이해관계가 얽혀 있습니다. 2026년 연내 공식 휴전 협정 서명 여부를 예측해보세요.",
      resolutionCriteria: "2026년 12월 31일까지 러시아와 우크라이나가 국제적으로 공인되는 공식 휴전 협정에 서명하면 '협정 체결'이 정답입니다. UN 또는 OSCE 공식 확인을 기준으로 합니다.",
      closeDays: 28,
      resolveDays: 80,
      options: ["휴전 협정 체결", "교전 지속"],
    },
    {
      slug: "q-national-birth-rate",
      authorIdx: 5,
      categorySlug: "society",
      title: "2025년 합계출산율, 0.75를 넘을까?",
      description: "한국의 합계출산율은 2023년 0.72명으로 역대 최저를 기록했습니다. 정부의 저출생 대책 패키지 효과, 혼인 건수 변화, MZ세대 인식 변화 등이 주요 변수입니다. 통계청이 발표하는 2025년 합계출산율이 0.75를 넘을지 예측해보세요.",
      resolutionCriteria: "통계청이 공식 발표하는 2025년 연간 합계출산율이 0.75 이상이면 '0.75 이상'이 정답입니다. 2026년 발표 예정인 통계청 인구동향조사를 기준으로 합니다.",
      closeDays: 18,
      resolveDays: 55,
      options: ["0.75 이상", "0.70~0.75 미만", "0.70 미만"],
    },
    {
      slug: "q-seoul-housing-price",
      authorIdx: 6,
      categorySlug: "society",
      title: "서울 아파트 평균 매매가, 2026년 연말까지 현재 대비 상승할까?",
      description: "서울 아파트 시장은 고금리와 대출 규제 속에서도 강남권 중심의 신고가 행진이 이어지고 있습니다. 금리 인하 기대감, 공급 부족, 재건축 규제 완화 여부가 핵심 변수입니다. 2026년 연말(12월) 서울 아파트 평균 매매가의 방향성을 예측해보세요.",
      resolutionCriteria: "KB국민은행 주택가격동향 2026년 12월 서울 아파트 평균 매매가가 2026년 1월 대비 5% 이상 상승하면 '상승', 5% 미만 변동이면 '보합', 하락하면 '하락'이 정답입니다.",
      closeDays: 22,
      resolveDays: 70,
      options: ["5% 이상 상승", "보합 (-5%~+5%)", "5% 이상 하락"],
    },
    {
      slug: "q-gpt5-release",
      authorIdx: 7,
      categorySlug: "tech",
      title: "OpenAI, 2026년 내 GPT-5 정식 출시할까?",
      description: "OpenAI는 GPT-4o 출시 이후 차세대 모델 개발에 집중하고 있습니다. 경쟁사인 Google DeepMind, Anthropic의 추격과 함께 AI 군비 경쟁이 가속화되고 있습니다. 2026년 내 GPT-5(또는 그에 준하는 차세대 플래그십 모델)의 정식 출시 여부를 예측해보세요.",
      resolutionCriteria: "OpenAI가 'GPT-5' 혹은 그에 상응하는 차세대 모델을 2026년 12월 31일까지 일반에 정식 공개하면 '출시'가 정답입니다. OpenAI 공식 블로그 기준으로 판단합니다.",
      closeDays: 12,
      resolveDays: 40,
      options: ["2026년 내 출시", "2027년 이후"],
    },
    {
      slug: "q-ai-regulation-korea",
      authorIdx: 8,
      categorySlug: "tech",
      title: "한국 AI 기본법, 2026년 내 시행될까?",
      description: "대한민국 국회는 2025년 AI 기본법을 통과시켰습니다. 시행령 제정, 소관 부처 정비, 고위험 AI 규제 준비 등 후속 작업이 남아 있습니다. 법안 공포 이후 세부 시행령까지 마련되어 실질적인 법 집행이 2026년 내 이뤄질지 예측해보세요.",
      resolutionCriteria: "AI 기본법 및 하위 시행령이 관보에 공포되어 주요 조항의 실질적 시행이 2026년 12월 31일까지 이뤄지면 '시행'이 정답입니다. 정부 관보 공식 기록을 기준으로 합니다.",
      closeDays: 24,
      resolveDays: 65,
      options: ["2026년 내 시행", "2027년 이후 시행"],
    },
    {
      slug: "q-bts-full-comeback",
      authorIdx: 9,
      categorySlug: "culture",
      title: "BTS, 2026년 내 전원 완전체 컴백 앨범 발매할까?",
      description: "BTS 멤버들의 군 복무가 순차적으로 마무리되고 있습니다. 팬들은 2026년을 완전체 컴백의 원년으로 기대하고 있으며, HYBE 주가와 K-팝 시장에도 큰 영향을 줄 전망입니다. 2026년 내 7인 완전체 정규 앨범 발매 여부를 예측해보세요.",
      resolutionCriteria: "BTS 7인 전원이 참여한 정규 또는 미니 앨범을 2026년 12월 31일까지 공식 발매하면 '완전체 컴백'이 정답입니다. HYBE 공식 채널 기준으로 판단합니다.",
      closeDays: 16,
      resolveDays: 50,
      options: ["완전체 컴백", "일부 멤버 위주 활동", "컴백 없음"],
    },
    {
      slug: "q-netflix-korean-drama",
      authorIdx: 10,
      categorySlug: "culture",
      title: "2026년 Netflix 비영어권 작품 1위, 한국 드라마가 차지할까?",
      description: "오징어 게임 시즌 2 이후 한국 드라마의 넷플릭스 글로벌 점령이 지속되고 있습니다. 2026년 예정된 대형 K-드라마 라인업과 타 비영어권 국가 작품들의 경쟁이 치열합니다. 연간 누적 시청 시간 기준 넷플릭스 비영어권 1위를 한국 작품이 가져갈지 예측해보세요.",
      resolutionCriteria: "Netflix가 공개하는 2026년 연간 비영어권 작품 시청 시간 상위 랭킹에서 한국 작품이 1위를 차지하면 '한국 1위'가 정답입니다. Netflix 공식 TOP 10 보고서를 기준으로 합니다.",
      closeDays: 26,
      resolveDays: 75,
      options: ["한국 1위", "한국 작품 2~3위", "비한국 작품이 1위"],
    },
    {
      slug: "q-kbo-2026-champion",
      authorIdx: 11,
      categorySlug: "sports",
      title: "2026년 KBO 한국시리즈 우승팀, 어디가 될까?",
      description: "2025 KBO 시즌을 제패한 팀에 이어 2026년 새 시즌 한국시리즈 우승 경쟁이 시작됩니다. 각 팀의 전력 보강 현황, 외국인 선수 영입, 주전 선수 부상 여부 등이 변수입니다. 여러분이 예상하는 2026년 KBO 한국시리즈 우승팀을 선택해보세요.",
      resolutionCriteria: "2026년 KBO 한국시리즈 공식 우승팀을 KBO 공식 발표 기준으로 확인합니다.",
      closeDays: 0.5,
      resolveDays: 55,
      options: ["LG 트윈스", "KIA 타이거즈", "롯데 자이언츠", "삼성 라이온즈", "기타 팀"],
    },
  ];

  const questionIds: string[] = [];

  for (const qDef of questionDefs) {
    const existing = await prisma.predictionQuestion.findFirst({ where: { title: qDef.title, deletedAt: null } });
    if (existing) {
      questionIds.push(existing.id);
      console.log(`⏭️  이미 존재 (question): ${qDef.title.slice(0, 30)}...`);
      continue;
    }

    const authorId = qDef.authorIdx < dummyUserIds.length ? dummyUserIds[qDef.authorIdx] : adminId;
    const closesAt = new Date(now.getTime() + qDef.closeDays * 24 * 60 * 60 * 1000);
    const resolvesAt = new Date(now.getTime() + qDef.resolveDays * 24 * 60 * 60 * 1000);
    const creatorCost = 200;

    // Deduct creation cost from author
    const authorProfile = await prisma.userProfile.findUnique({ where: { userId: authorId }, select: { availableScore: true } });
    if (!authorProfile || authorProfile.availableScore < creatorCost) {
      // Grant more score if needed
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, authorId, ScoreLedgerType.ADMIN_ADJUST_ADD, 50000, "시드 — 문제 생성용 추가 지급");
      });
    }

    const question = await prisma.$transaction(async (tx) => {
      const q = await tx.predictionQuestion.create({
        data: {
          authorId,
          categoryId: catMap[qDef.categorySlug],
          title: qDef.title,
          description: qDef.description,
          resolutionCriteria: qDef.resolutionCriteria,
          closesAt,
          resolvesAt,
          creatorCost,
          status: QuestionStatus.OPEN,
          options: {
            create: qDef.options.map((label, idx) => ({ label, sortOrder: idx })),
          },
        },
        include: { options: true },
      });
      await applyScoreInSeed(tx, authorId, ScoreLedgerType.QUESTION_CREATE_COST, -creatorCost, `예측 문제 생성 — ${qDef.title.slice(0, 40)}`, "PredictionQuestion", q.id);
      return q;
    });

    questionIds.push(question.id);
    console.log(`✅ 문제 생성: ${qDef.title.slice(0, 30)}...`);
  }

  console.log(`✅ 예측 문제 ${questionIds.length}개`);

  // Participations: each dummy user participates in several questions
  // Each dummy user picks a random option and allocates 200-1000 pts per question
  let participationCount = 0;
  const usersToParticipate = dummyUserIds;

  for (let qi = 0; qi < questionIds.length; qi++) {
    const qId = questionIds[qi];
    const questionWithOptions = await prisma.predictionQuestion.findUnique({
      where: { id: qId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    if (!questionWithOptions) continue;

    // How many users participate: 6-18 per question
    const participantTarget = 6 + (qi % 13);
    const shuffled = [...usersToParticipate].sort(() => Math.random() - 0.5).slice(0, participantTarget);

    for (const uid of shuffled) {
      const already = await prisma.predictionParticipation.findUnique({
        where: { questionId_userId: { questionId: qId, userId: uid } },
      });
      if (already) continue;

      const profile = await prisma.userProfile.findUnique({ where: { userId: uid }, select: { availableScore: true } });
      if (!profile || profile.availableScore < 200) continue;

      const optIdx = Math.floor(Math.random() * questionWithOptions.options.length);
      const chosenOption = questionWithOptions.options[optIdx];
      const allocate = 200 + Math.floor(Math.random() * 800); // 200-999

      await prisma.$transaction(async (tx) => {
        const p = await tx.predictionParticipation.create({
          data: {
            questionId: qId,
            userId: uid,
            optionId: chosenOption.id,
            allocatedScore: allocate,
          },
        });
        await applyScoreInSeed(tx, uid, ScoreLedgerType.PREDICTION_ALLOCATE, -allocate, `예측 참여 — ${questionWithOptions.title.slice(0, 30)}`, "PredictionParticipation", p.id);
        await tx.predictionOption.update({
          where: { id: chosenOption.id },
          data: { totalAllocated: { increment: allocate }, participantCount: { increment: 1 } },
        });
        await tx.predictionQuestion.update({
          where: { id: qId },
          data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: allocate } },
        });
      });
      participationCount++;
    }
  }
  console.log(`✅ 더미 참여 ${participationCount}건`);

  // Comments: 3-6 comments on each of the first 8 questions
  const commentPool: {
    commentType: CommentType;
    content: string;
  }[] = [
    { commentType: CommentType.GROUND,   content: "한국은행의 최근 총재 발언을 보면 상반기 인하 가능성이 열려 있다고 봅니다. 물가 안정세와 가계부채 우려가 균형을 이루고 있어서 6월 전에 한 번은 움직일 것 같아요." },
    { commentType: CommentType.COUNTER,  content: "저는 동결 쪽에 참여했습니다. 미 연준이 아직 금리를 내리지 않은 상황에서 한국만 먼저 움직이면 외국인 자금 유출 위험이 크다고 봐요." },
    { commentType: CommentType.QUESTION, content: "참여 마감일 이후에 한국은행 금통위 결정이 나올 경우, 그 결과도 반영되나요? 결과 확정 기준이 궁금합니다." },
    { commentType: CommentType.INFO,     content: "관련 데이터: 2월 소비자물가 상승률이 2.1%로 목표 범위 내에 들어왔습니다. 한국은행 기준금리 인하 가능성을 높이는 신호입니다." },
    { commentType: CommentType.GROUND,   content: "반도체 수출이 4개월 연속 증가하고 있어서 코스피 상승 여력은 충분하다고 봅니다. 외국인 수급이 관건인데, 원화 강세 전환 시 3천선은 가능하다고 생각해요." },
    { commentType: CommentType.COUNTER,  content: "코스피 3000은 쉽지 않다고 봅니다. PER 기준으로 이미 글로벌 대비 저평가가 해소되고 있고, 부동산 PF 부실이 금융주에 악영향을 줄 가능성도 있습니다." },
    { commentType: CommentType.INFO,     content: "참고로 외국인은 지난달 코스피에서 3조원 이상 순매수했습니다. 이 흐름이 유지된다면 3000선 도전도 가능해 보입니다." },
    { commentType: CommentType.QUESTION, content: "종가 기준이라고 하셨는데, 장중에만 3000을 터치하고 종가에 내려올 경우는 돌파 실패로 보는 건가요?" },
    { commentType: CommentType.GROUND,   content: "트럼프 관세 정책이 미국 내 인플레이션을 재점화시키고 있어서 연준의 금리 인하 타이밍이 늦춰질 것 같아요. 원달러 환율은 당분간 1400원대를 유지할 가능성이 높습니다." },
    { commentType: CommentType.COUNTER,  content: "한국의 경상수지 흑자가 확대되면 원화 절상 압력이 강해집니다. 3분기까지는 환율 하락 쪽으로 베팅... 아, 판단하는 것이 더 합리적이라고 봅니다." },
    { commentType: CommentType.GROUND,   content: "중간선거는 전통적으로 집권 여당이 불리합니다. 트럼프 정책의 인플레이션 영향이 중산층에 체감되기 시작하면 공화당 하원 상실 가능성이 높아질 것 같아요." },
    { commentType: CommentType.INFO,     content: "현재 갤럽 지지율 기준 트럼프 지지율은 42% 수준입니다. 중간선거 6개월 전 지지율이 45% 이하면 하원 상실 확률이 역사적으로 70%를 넘습니다." },
    { commentType: CommentType.QUESTION, content: "상원과 하원 중 어느 쪽이 공화당에 더 유리한 지형인가요? 상원은 민주당이 수성해야 할 의석이 더 많다고 들었는데." },
    { commentType: CommentType.GROUND,   content: "GPT-5 출시는 2026년 내 거의 확실하다고 봅니다. OpenAI의 인력 채용 패턴과 컴퓨팅 인프라 투자 속도를 보면 하반기 출시 준비가 이미 시작된 것 같아요." },
    { commentType: CommentType.COUNTER,  content: "GPT-4의 성능 향상 버전을 GPT-5로 포지셔닝할 수 있어서 마케팅 전략에 따라 '출시' 기준이 달라질 수 있습니다. 결과 확정 기준을 좀 더 명확히 해주셨으면 해요." },
    { commentType: CommentType.INFO,     content: "Sam Altman이 최근 인터뷰에서 2026년을 'AI가 과학적 발견을 가속화하는 원년'이라고 표현했습니다. 이는 GPT-5급 모델 출시를 시사하는 발언으로 해석됩니다." },
    { commentType: CommentType.GROUND,   content: "BTS 멤버들 중 마지막 전역이 올해 상반기로 예정되어 있습니다. HYBE의 재무 계획상 완전체 컴백은 2026년 하반기가 유력해 보입니다." },
    { commentType: CommentType.COUNTER,  content: "멤버들 각자의 솔로 활동이 길어질 수 있어서 완전체 컴백이 예상보다 늦어질 수 있습니다. 2027년이 현실적이라는 의견도 있어요." },
    { commentType: CommentType.OTHER,    content: "어떤 선택지든 팬으로서 기대가 큰 건 사실이지만, 최대한 객관적으로 판단해보려고 했습니다." },
    { commentType: CommentType.GROUND,   content: "합계출산율 0.75 달성은 쉽지 않다고 봅니다. 혼인 건수 증가가 선행되어야 하는데, 2024년 혼인 통계가 개선됐다고 해도 출생까지는 9개월 이상 시간이 걸립니다." },
    { commentType: CommentType.INFO,     content: "통계청 자료에 따르면 2024년 혼인 건수가 21만건으로 전년 대비 증가했습니다. 이것이 2025년 출생률 소폭 개선으로 이어질 수 있다는 분석이 있습니다." },
  ];

  let commentCount = 0;
  const qsForComments = questionIds.slice(0, 8);
  for (let qi = 0; qi < qsForComments.length; qi++) {
    const qId = qsForComments[qi];
    const existing = await prisma.comment.count({ where: { questionId: qId, deletedAt: null } });
    if (existing > 0) continue;

    const commentCount_ = 3 + (qi % 4);
    const pool = [...commentPool].sort(() => Math.random() - 0.5).slice(0, commentCount_);
    for (const cp of pool) {
      const uid = usersToParticipate[Math.floor(Math.random() * usersToParticipate.length)];
      await prisma.comment.create({
        data: {
          questionId: qId,
          userId: uid,
          commentType: cp.commentType,
          content: cp.content,
        },
      });
      commentCount++;
    }
  }
  console.log(`✅ 더미 댓글 ${commentCount}건`);

  // ─────────────────────────────────────────────────────────
  //  STEP 3b: PENDING_REVIEW seed questions
  // ─────────────────────────────────────────────────────────

  const basicUserId = createdUsers["test-basic@signalleague.com"];
  const standardUserId2 = createdUsers["test-standard@signalleague.com"];
  const dummy001Id = dummyUserIds[0]; // dummy-01@signalleague.local

  const pendingQuestionDefs = [
    {
      authorId: basicUserId,
      categorySlug: "international",
      title: "2026년 G20 정상회의, 기후 관련 공동 성명에 주요 5개국 모두 서명할까?",
      description: "2026년 G20 정상회의에서 기후변화 대응 관련 공동 성명이 채택될 예정입니다. 미국·중국·인도·러시아·사우디아라비아 5개국의 동시 서명 여부가 핵심입니다.",
      resolutionCriteria: "2026년 G20 정상회의 공식 공동 성명에 미국·중국·인도·러시아·사우디아라비아 5개국 정상이 모두 서명하면 '서명'이 정답입니다. G20 공식 문서 기준으로 판단합니다.",
      creatorCost: 50,
      closeDays: 90,
      resolveDays: 120,
      options: ["5개국 모두 서명", "일부 서명 거부"],
    },
    {
      authorId: standardUserId2,
      categorySlug: "tech",
      title: "삼성전자, 2026년 내 자체 AI 칩(NPU) 탑재 스마트폰 글로벌 출시할까?",
      description: "삼성전자는 자체 개발 NPU를 탑재한 스마트폰 출시를 준비 중이라고 알려져 있습니다. Apple의 A시리즈 칩에 대응하는 삼성의 자체 AI 반도체 전략이 2026년 내 제품화될지 예측해보세요.",
      resolutionCriteria: "삼성전자가 자체 설계한 NPU를 주요 기능으로 탑재한 스마트폰을 2026년 12월 31일까지 글로벌 시장에 공식 출시하면 '출시'가 정답입니다. 삼성전자 공식 발표 기준입니다.",
      creatorCost: 200,
      closeDays: 60,
      resolveDays: 90,
      options: ["2026년 내 출시", "2027년 이후 출시"],
    },
    {
      authorId: dummy001Id,
      categorySlug: "society",
      title: "서울시, 2026년 내 무인 자율주행 대중교통 정규 노선 운행을 시작할까?",
      description: "서울시는 자율주행 기술 도입을 위한 시범 운행을 확대하고 있습니다. 청계천·상암·강남 일부 구간에서 시범 노선을 운행 중이나, 정규 노선 전환 여부가 핵심입니다.",
      resolutionCriteria: "서울시가 운임을 받는 정규 대중교통 노선으로 무인 자율주행 차량(Safety Driver 없음)을 2026년 12월 31일까지 공식 운행하면 '운행 시작'이 정답입니다.",
      creatorCost: 1000,
      closeDays: 45,
      resolveDays: 80,
      options: ["정규 노선 운행 시작", "시범 운행 단계 유지", "계획 취소·연기"],
    },
  ];

  for (const qDef of pendingQuestionDefs) {
    if (!qDef.authorId) continue;
    const existing = await prisma.predictionQuestion.findFirst({
      where: { title: qDef.title, deletedAt: null },
    });
    if (existing) {
      console.log(`⏭️  이미 존재 (pending question): ${qDef.title.slice(0, 40)}...`);
      continue;
    }

    const authorProfile = await prisma.userProfile.findUnique({
      where: { userId: qDef.authorId },
      select: { availableScore: true },
    });
    if (!authorProfile || authorProfile.availableScore < qDef.creatorCost) {
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, qDef.authorId, ScoreLedgerType.ADMIN_ADJUST_ADD, qDef.creatorCost + 1000, "시드 — PENDING 문제 생성용 추가 지급");
      });
    }

    const closesAt = new Date(now.getTime() + qDef.closeDays * 24 * 60 * 60 * 1000);
    const resolvesAt = new Date(now.getTime() + qDef.resolveDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const q = await tx.predictionQuestion.create({
        data: {
          authorId: qDef.authorId,
          categoryId: catMap[qDef.categorySlug],
          title: qDef.title,
          description: qDef.description,
          resolutionCriteria: qDef.resolutionCriteria,
          closesAt,
          resolvesAt,
          creatorCost: qDef.creatorCost,
          status: QuestionStatus.PENDING_REVIEW,
          options: {
            create: qDef.options.map((label, idx) => ({ label, sortOrder: idx })),
          },
        },
      });
      await applyScoreInSeed(tx, qDef.authorId, ScoreLedgerType.QUESTION_CREATE_COST, -qDef.creatorCost, `예측 문제 생성(검토 대기) — ${qDef.title.slice(0, 40)}`, "PredictionQuestion", q.id);
    });

    console.log(`✅ PENDING 문제 생성: ${qDef.title.slice(0, 40)}...`);
  }
  console.log("✅ PENDING_REVIEW 시드 문제 완료");

  // ─────────────────────────────────────────────────────────
  //  STEP 3b-2: 신고 시드 데이터
  // ─────────────────────────────────────────────────────────

  // Fetch some comments and questions for report targets
  const commentsForReports = await prisma.comment.findMany({
    where: { deletedAt: null },
    take: 7,
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true },
  });

  const questionsForReports = await prisma.predictionQuestion.findMany({
    where: { status: "OPEN", deletedAt: null },
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true, authorId: true },
  });

  const adminUserId = createdUsers["admin@signalleague.com"];
  const operatorUserId = createdUsers["operator@signalleague.com"];

  const reportDefs: Array<{
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    status: ReportStatus;
    reviewNote?: string;
    processingReason?: string;
    processingResolution?: string;
    processedByAdminId?: string;
  }> = [];

  // Comment reports
  if (commentsForReports.length >= 1) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[0].userId);
    if (reporters.length > 0) {
      reportDefs.push({
        reporterId: reporters[0],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[0].id,
        reason: "욕설 및 혐오 표현이 포함된 댓글입니다.",
        status: ReportStatus.PENDING,
      });
    }
  }

  // Duplicate report: a second reporter files a report on the SAME first comment
  // Used to verify "동일 대상 신고 이력" display in admin
  if (commentsForReports.length >= 1) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[0].userId);
    if (reporters.length > 7) {
      reportDefs.push({
        reporterId: reporters[7],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[0].id,
        reason: "선동적이고 공격적인 언어를 사용하고 있습니다.",
        status: ReportStatus.PENDING,
      });
    }
  }

  if (commentsForReports.length >= 2) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[1].userId);
    if (reporters.length > 1) {
      reportDefs.push({
        reporterId: reporters[1],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[1].id,
        reason: "특정 종목 매수/매도 유도 발언이 포함되어 있습니다.",
        status: ReportStatus.REVIEWING,
        reviewNote: "내용 확인 중. 실제 투자 유도 여부 검토 필요.",
      });
    }
  }

  if (commentsForReports.length >= 3) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[2].userId);
    if (reporters.length > 2) {
      reportDefs.push({
        reporterId: reporters[2],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[2].id,
        reason: "사실과 다른 허위 정보를 유포하고 있습니다.",
        status: ReportStatus.ACCEPTED,
        processingReason: "검토 결과 명백한 허위 사실 포함 확인. 댓글 별도 숨김 처리 완료.",
        processingResolution: "ACCEPTED",
        processedByAdminId: adminUserId,
      });
    }
  }

  if (commentsForReports.length >= 4) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[3].userId);
    if (reporters.length > 3) {
      reportDefs.push({
        reporterId: reporters[3],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[3].id,
        reason: "광고성 내용이 포함된 스팸 댓글입니다.",
        status: ReportStatus.DISMISSED,
        processingReason: "검토 결과 일반 의견 표현에 해당. 광고 해당 없음.",
        processingResolution: "DISMISSED",
        processedByAdminId: operatorUserId,
      });
    }
  }

  if (commentsForReports.length >= 5) {
    const reporters = dummyUserIds.filter((id) => id !== commentsForReports[4].userId);
    if (reporters.length > 4) {
      reportDefs.push({
        reporterId: reporters[4],
        targetType: ReportTargetType.COMMENT,
        targetId: commentsForReports[4].id,
        reason: "다른 사용자를 비방하는 내용이 포함되어 있습니다.",
        status: ReportStatus.PENDING,
      });
    }
  }

  // Question reports
  if (questionsForReports.length >= 1) {
    const reporters = dummyUserIds.filter((id) => id !== questionsForReports[0].authorId);
    if (reporters.length > 5) {
      reportDefs.push({
        reporterId: reporters[5],
        targetType: ReportTargetType.QUESTION,
        targetId: questionsForReports[0].id,
        reason: "결과 확정 기준이 불명확하여 공정한 판단이 불가능합니다.",
        status: ReportStatus.NEEDS_MORE_INFO,
        reviewNote: "출제자 답변 요청 후 재검토 예정.",
        processingReason: "결과 기준 보완 필요. 출제자에게 추가 설명 요청.",
        processingResolution: "NEEDS_MORE_INFO",
        processedByAdminId: adminUserId,
      });
    }
  }

  if (questionsForReports.length >= 2) {
    const reporters = dummyUserIds.filter((id) => id !== questionsForReports[1].authorId);
    if (reporters.length > 6) {
      reportDefs.push({
        reporterId: reporters[6],
        targetType: ReportTargetType.QUESTION,
        targetId: questionsForReports[1].id,
        reason: "특정 정치 세력에 편향된 예측 문제로 보입니다.",
        status: ReportStatus.PENDING,
      });
    }
  }

  let reportCount = 0;
  for (const def of reportDefs) {
    if (!def.reporterId || !def.targetId) continue;

    const existing = await prisma.report.findFirst({
      where: {
        reporterId: def.reporterId,
        targetType: def.targetType,
        targetId: def.targetId,
        reason: def.reason,
      },
    });
    if (existing) {
      console.log(`⏭️  이미 존재 (report): ${def.reason.slice(0, 40)}...`);
      continue;
    }

    const now2 = new Date();
    await prisma.report.create({
      data: {
        reporterId: def.reporterId,
        targetType: def.targetType,
        targetId: def.targetId,
        reason: def.reason,
        status: def.status,
        reviewNote: def.reviewNote,
        reviewedBy: def.processedByAdminId,
        reviewedAt: def.processedByAdminId ? now2 : null,
        processedAt: def.processedByAdminId ? now2 : null,
        processedByAdminId: def.processedByAdminId,
        processingReason: def.processingReason,
        processingResolution: def.processingResolution,
      },
    });
    reportCount++;
  }
  console.log(`✅ 신고 시드 ${reportCount}건`);

  // ─────────────────────────────────────────────────────────────
  // STEP 4-①: CLOSED, RESOLVED, VOIDED 시드
  // ─────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@signalleague.com" } });
  const catEconomy = await prisma.category.findFirst({ where: { slug: "economy" } });
  const catTech    = await prisma.category.findFirst({ where: { slug: "tech" } });
  const catIntl    = await prisma.category.findFirst({ where: { slug: "international" } });

  // Dummy users with sufficient balance for participation
  const dummyPool = await prisma.userProfile.findMany({
    where: { availableScore: { gte: 300 } },
    select: { userId: true },
    take: 10,
  });
  const dummyPoolIds = dummyPool.map((u) => u.userId);

  interface ClosedQuestionDef {
    title: string;
    description: string;
    resolutionCriteria: string;
    categoryId: string | undefined;
    options: string[];
    closedDaysAgo: number;
    resolvesAt: Date;
  }

  if (adminUser && catEconomy && catTech && catIntl) {
    // Ensure admin has enough balance for creator costs (3 × 200 = 600)
    const adminProfile = await prisma.userProfile.findUnique({ where: { userId: adminUser.id }, select: { availableScore: true } });
    if (adminProfile && adminProfile.availableScore < 1000) {
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, adminUser.id, ScoreLedgerType.ADMIN_ADJUST_ADD, 3000, "시드: CLOSED/RESOLVED/VOIDED 문제 생성용 잔액 보충");
      });
    }

    const closedDefs: ClosedQuestionDef[] = [
      {
        title: "2026년 상반기 한국 소비자물가 상승률이 2% 이하로 떨어질까요?",
        description: "통계청이 발표하는 소비자물가지수 기준으로 2026년 1~6월 중 단 한 달이라도 전년 동기 대비 2% 이하를 기록하면 '예'로 확정합니다.",
        resolutionCriteria: "통계청 공식 소비자물가 발표 기준, 2026년 6월 말 결과 확인",
        categoryId: catEconomy.id,
        options: ["예 (2% 이하 기록)", "아니오 (2% 초과 유지)"],
        closedDaysAgo: 5,
        resolvesAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: "OpenAI, 2026년 내 GPT-5 정식 출시 여부",
        description: "OpenAI가 2026년 12월 31일 이전에 GPT-5라는 명칭의 모델을 공식 API 및 ChatGPT에서 정식 서비스로 제공하면 '예'로 확정합니다.",
        resolutionCriteria: "OpenAI 공식 블로그 또는 API 문서 기준 GPT-5 정식 출시 확인",
        categoryId: catTech.id,
        options: ["예 (2026년 내 출시)", "아니오 (2027년 이후 출시 또는 미출시)"],
        closedDaysAgo: 10,
        resolvesAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "2026년 G7 정상회의 개최국이 캐나다가 될까요?",
        description: "2026년 G7 정상회의가 캐나다에서 개최되는지 여부입니다.",
        resolutionCriteria: "G7 공식 발표 기준",
        categoryId: catIntl.id,
        options: ["예 (캐나다 개최)", "아니오 (다른 국가)"],
        closedDaysAgo: 3,
        resolvesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdClosedQuestions: Array<{ id: string; options: Array<{ id: string; label: string }> }> = [];

    for (const def of closedDefs) {
      const existing = await prisma.predictionQuestion.findFirst({
        where: { title: def.title, deletedAt: null },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
      if (existing) {
        console.log(`⏭️  이미 존재 (CLOSED): ${def.title.slice(0, 40)}...`);
        createdClosedQuestions.push(existing);
        continue;
      }

      const creatorCost = 200;
      const closedAt = new Date(Date.now() - def.closedDaysAgo * 24 * 60 * 60 * 1000);
      const approvedAt = new Date(closedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
      const openAt = approvedAt;

      const q = await prisma.$transaction(async (tx) => {
        const question = await tx.predictionQuestion.create({
          data: {
            authorId: adminUser.id,
            categoryId: def.categoryId!,
            title: def.title,
            description: def.description,
            resolutionCriteria: def.resolutionCriteria,
            closesAt: closedAt,
            resolvesAt: def.resolvesAt,
            creatorCost,
            approvedAt,
            status: QuestionStatus.CLOSED,
            lastAutoClosedAt: closedAt,
            options: { create: def.options.map((label, idx) => ({ label, sortOrder: idx })) },
          },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        });
        await applyScoreInSeed(tx, adminUser.id, ScoreLedgerType.QUESTION_CREATE_COST, -creatorCost, `예측 문제 생성 — ${def.title.slice(0, 40)}`, "PredictionQuestion", question.id);
        return question;
      });

      // Add participations from dummy pool
      const qOpts = await prisma.predictionOption.findMany({ where: { questionId: q.id, deletedAt: null }, orderBy: { sortOrder: "asc" } });
      const participants = dummyPoolIds.slice(0, 6);
      for (let pi = 0; pi < participants.length; pi++) {
        const uid = participants[pi];
        const optIdx = pi % qOpts.length;
        const chosenOption = qOpts[optIdx];
        const allocate = 100 + pi * 50;
        const pProfile = await prisma.userProfile.findUnique({ where: { userId: uid }, select: { availableScore: true } });
        if (!pProfile || pProfile.availableScore < allocate) continue;

        await prisma.$transaction(async (tx) => {
          const p = await tx.predictionParticipation.create({
            data: { questionId: q.id, userId: uid, optionId: chosenOption.id, allocatedScore: allocate },
          });
          await applyScoreInSeed(tx, uid, ScoreLedgerType.PREDICTION_ALLOCATE, -allocate, `예측 참여 — ${def.title.slice(0, 30)}`, "PredictionParticipation", p.id);
          await tx.predictionOption.update({ where: { id: chosenOption.id }, data: { totalAllocated: { increment: allocate }, participantCount: { increment: 1 } } });
          await tx.predictionQuestion.update({ where: { id: q.id }, data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: allocate } } });
          await tx.userProfile.update({ where: { userId: uid }, data: { totalPredictions: { increment: 1 } } });
        });
      }

      // For 소비자물가 (closedDefs[0]): add test-basic (correct option, WON) and test-standard (wrong option, LOST)
      if (def.title.includes("소비자물가")) {
        const testBasicUser = await prisma.user.findFirst({ where: { email: "test-basic@signalleague.com" } });
        const testStdUser   = await prisma.user.findFirst({ where: { email: "test-standard@signalleague.com" } });
        const testParticipants: Array<{ user: typeof testBasicUser; optIdx: number; allocate: number }> = [
          { user: testBasicUser, optIdx: 0, allocate: 200 }, // 예 (2% 이하 기록) — correct
          { user: testStdUser,   optIdx: 1, allocate: 150 }, // 아니오 (2% 초과 유지) — wrong
        ];
        for (const tp of testParticipants) {
          if (!tp.user) continue;
          const existing = await prisma.predictionParticipation.findFirst({ where: { questionId: q.id, userId: tp.user.id } });
          if (existing) continue;
          const chosen = qOpts[tp.optIdx];
          const pProfile = await prisma.userProfile.findUnique({ where: { userId: tp.user.id }, select: { availableScore: true } });
          if (!pProfile || pProfile.availableScore < tp.allocate) continue;
          await prisma.$transaction(async (tx) => {
            const p = await tx.predictionParticipation.create({
              data: { questionId: q.id, userId: tp.user!.id, optionId: chosen.id, allocatedScore: tp.allocate },
            });
            await applyScoreInSeed(tx, tp.user!.id, ScoreLedgerType.PREDICTION_ALLOCATE, -tp.allocate, `예측 참여 — ${def.title.slice(0, 30)}`, "PredictionParticipation", p.id);
            await tx.predictionOption.update({ where: { id: chosen.id }, data: { totalAllocated: { increment: tp.allocate }, participantCount: { increment: 1 } } });
            await tx.predictionQuestion.update({ where: { id: q.id }, data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: tp.allocate } } });
            await tx.userProfile.update({ where: { userId: tp.user!.id }, data: { totalPredictions: { increment: 1 } } });
          });
        }
      }

      createdClosedQuestions.push(q);
      console.log(`✅ CLOSED 문제 생성: ${def.title.slice(0, 40)}...`);
    }

    // ── RESOLVED 2개 (closedDefs[0], closedDefs[2] 기반)
    const resolvedDefs = [
      { qIdx: 0, correctLabel: "예 (2% 이하 기록)", memo: "2026년 4월 소비자물가 상승률이 1.8%로 발표되어 기준 충족. 통계청 공식 발표 확인됨.", evidenceUrl: "https://kostat.go.kr" },
      { qIdx: 2, correctLabel: "예 (캐나다 개최)",   memo: "2026년 G7 정상회의가 캐나다 Kananaskis에서 개최 확정. G7 공식 성명 기준 확인됨.", evidenceUrl: "https://g7.gc.ca" },
    ];

    for (const rd of resolvedDefs) {
      const q = createdClosedQuestions[rd.qIdx];
      if (!q) continue;

      const refreshed = await prisma.predictionQuestion.findUnique({
        where: { id: q.id },
        include: {
          options: { orderBy: { sortOrder: "asc" } },
          participations: { where: { deletedAt: null, status: "ACTIVE" } },
        },
      });
      if (!refreshed || refreshed.status === "RESOLVED" || refreshed.status === "VOIDED") {
        console.log(`⏭️  이미 처리됨 (RESOLVED): ${rd.memo.slice(0, 30)}...`);
        continue;
      }

      const correctOption = refreshed.options.find((o) => o.label === rd.correctLabel);
      if (!correctOption) {
        console.log(`⚠️  정답 선택지 못 찾음: "${rd.correctLabel}"`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.predictionQuestion.update({
          where: { id: refreshed.id },
          data: {
            status: QuestionStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedByUserId: adminUser.id,
            resolvedOptionId: correctOption.id,
            resolutionMemo: rd.memo,
            resolutionEvidenceUrl: rd.evidenceUrl,
          },
        });
        await tx.predictionOption.update({ where: { id: correctOption.id }, data: { isResolved: true } });

        for (const p of refreshed.participations) {
          const isWinner = p.optionId === correctOption.id;
          if (isWinner) {
            const earnedScore = p.allocatedScore * 2;
            await applyScoreInSeed(tx, p.userId, ScoreLedgerType.PREDICTION_WIN, earnedScore, `예측 적중 — ${refreshed.title.slice(0, 30)}`, "PredictionQuestion", refreshed.id);
            await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "WON", earnedScore } });
            await tx.userProfile.update({ where: { userId: p.userId }, data: { correctPredictions: { increment: 1 } } });
          } else {
            await applyScoreInSeed(tx, p.userId, ScoreLedgerType.PREDICTION_LOSE, 0, `예측 비적중 — ${refreshed.title.slice(0, 30)}`, "PredictionQuestion", refreshed.id);
            await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "LOST", earnedScore: 0 } });
          }
        }
        await tx.auditLog.create({
          data: {
            actorId: adminUser.id, action: "QUESTION_RESOLVE",
            targetType: "PredictionQuestion", targetId: refreshed.id,
            before: { status: "CLOSED" }, after: { status: "RESOLVED", correctOptionLabel: rd.correctLabel },
          },
        });
      }, { timeout: 30000 });

      console.log(`✅ RESOLVED: ${refreshed.title.slice(0, 40)}...`);
    }

    // ── VOIDED 1개 (closedDefs[1] 기반)
    const voidTarget = createdClosedQuestions[1];
    if (voidTarget) {
      const refreshedVoid = await prisma.predictionQuestion.findUnique({
        where: { id: voidTarget.id },
        include: { participations: { where: { deletedAt: null, status: "ACTIVE" } } },
      });

      if (refreshedVoid && refreshedVoid.status === "CLOSED") {
        const voidReason = "OpenAI가 GPT-5라는 명칭 대신 다른 브랜딩으로 출시하여 결과 기준 해석이 불명확해짐. 무효 처리하고 참여 점수 전액 환불.";
        const userVisibleMessage = "결과 기준이 불명확하여 무효 처리되었습니다.";

        await prisma.$transaction(async (tx) => {
          await tx.predictionQuestion.update({
            where: { id: refreshedVoid.id },
            data: {
              status: QuestionStatus.VOIDED,
              voidedAt: new Date(),
              voidedByUserId: adminUser.id,
              voidReason,
              creatorCostRefunded: true,
            },
          });
          for (const p of refreshedVoid.participations) {
            await applyScoreInSeed(tx, p.userId, ScoreLedgerType.QUESTION_VOID_REFUND, p.allocatedScore, `예측 무효 환불 — ${refreshedVoid.title.slice(0, 30)}`, "PredictionQuestion", refreshedVoid.id);
            await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "REFUNDED", earnedScore: p.allocatedScore } });
          }
          if (refreshedVoid.creatorCost > 0) {
            await applyScoreInSeed(tx, adminUser.id, ScoreLedgerType.QUESTION_CREATE_REFUND, refreshedVoid.creatorCost, `예측 문제 생성 비용 환불 — ${refreshedVoid.title.slice(0, 30)}`, "PredictionQuestion", refreshedVoid.id);
          }
          await tx.auditLog.create({
            data: {
              actorId: adminUser.id, action: "QUESTION_VOID",
              targetType: "PredictionQuestion", targetId: refreshedVoid.id,
              before: { status: "CLOSED" },
              after: { status: "VOIDED", voidReason, userVisibleMessage, participantCount: refreshedVoid.participations.length },
            },
          });
        }, { timeout: 30000 });

        console.log(`✅ VOIDED: ${refreshedVoid.title.slice(0, 40)}...`);
      } else {
        console.log(`⏭️  이미 처리됨 (VOIDED): ${voidTarget.id}`);
      }
    }

    // ── STEP 4-①: 결과 대기 큐 테스트용 CLOSED 문제 3개 (해결하지 않고 CLOSED 상태 유지)
    const remainClosedDefs: ClosedQuestionDef[] = [
      {
        title: "삼성전자 1분기 영업이익 4조원 초과 달성 여부",
        description: "삼성전자가 2026년 1분기 연결 기준 영업이익으로 4조 원을 초과 달성하면 '예'로 확정합니다.",
        resolutionCriteria: "삼성전자 공식 IR 자료 및 전자공시시스템(DART) 기준",
        categoryId: catEconomy.id,
        options: ["예 (4조원 초과)", "아니오 (4조원 이하)"],
        closedDaysAgo: 2,
        resolvesAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: "한국 2026년 상반기 실업률 3% 이하 유지 여부",
        description: "통계청 발표 기준으로 2026년 1~6월 중 월간 실업률이 한 번도 3%를 초과하지 않으면 '예'로 확정합니다.",
        resolutionCriteria: "통계청 경제활동인구조사 공식 발표 기준",
        categoryId: catEconomy.id,
        options: ["예 (3% 이하 유지)", "아니오 (3% 초과 발생)"],
        closedDaysAgo: 7,
        resolvesAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: "2026년 FIFA 월드컵 아시아 예선 한국 조 1위 통과 여부",
        description: "한국 축구 국가대표팀이 2026년 FIFA 월드컵 아시아 최종예선 자국 조에서 1위로 본선 티켓을 획득하면 '예'로 확정합니다.",
        resolutionCriteria: "FIFA 공식 월드컵 예선 최종 순위 기준",
        categoryId: catIntl.id,
        options: ["예 (조 1위 통과)", "아니오 (2위 이하)"],
        closedDaysAgo: 4,
        resolvesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    ];

    const adminProfileNow = await prisma.userProfile.findUnique({ where: { userId: adminUser.id }, select: { availableScore: true } });
    if (adminProfileNow && adminProfileNow.availableScore < 600) {
      await prisma.$transaction(async (tx) => {
        await applyScoreInSeed(tx, adminUser.id, ScoreLedgerType.ADMIN_ADJUST_ADD, 2000, "시드: 추가 CLOSED 문제 생성용 잔액 보충");
      });
    }

    for (const def of remainClosedDefs) {
      const existing = await prisma.predictionQuestion.findFirst({ where: { title: def.title, deletedAt: null } });
      if (existing) {
        console.log(`⏭️  이미 존재 (REMAIN CLOSED): ${def.title.slice(0, 40)}...`);
        continue;
      }
      const creatorCost = 200;
      const closedAt = new Date(Date.now() - def.closedDaysAgo * 24 * 60 * 60 * 1000);
      const approvedAt = new Date(closedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
      const q = await prisma.$transaction(async (tx) => {
        const question = await tx.predictionQuestion.create({
          data: {
            authorId: adminUser.id,
            categoryId: def.categoryId!,
            title: def.title,
            description: def.description,
            resolutionCriteria: def.resolutionCriteria,
            closesAt: closedAt,
            resolvesAt: def.resolvesAt,
            creatorCost,
            approvedAt,
            status: QuestionStatus.CLOSED,
            lastAutoClosedAt: closedAt,
            options: { create: def.options.map((label, idx) => ({ label, sortOrder: idx })) },
          },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        });
        await applyScoreInSeed(tx, adminUser.id, ScoreLedgerType.QUESTION_CREATE_COST, -creatorCost, `예측 문제 생성 — ${def.title.slice(0, 40)}`, "PredictionQuestion", question.id);
        return question;
      });
      const rcOpts = await prisma.predictionOption.findMany({ where: { questionId: q.id, deletedAt: null }, orderBy: { sortOrder: "asc" } });
      for (let pi = 0; pi < Math.min(6, dummyPoolIds.length); pi++) {
        const uid = dummyPoolIds[pi];
        const optIdx = pi % rcOpts.length;
        const chosenOption = rcOpts[optIdx];
        const allocate = 80 + pi * 40;
        const pProfile = await prisma.userProfile.findUnique({ where: { userId: uid }, select: { availableScore: true } });
        if (!pProfile || pProfile.availableScore < allocate) continue;
        await prisma.$transaction(async (tx) => {
          const p = await tx.predictionParticipation.create({
            data: { questionId: q.id, userId: uid, optionId: chosenOption.id, allocatedScore: allocate },
          });
          await applyScoreInSeed(tx, uid, ScoreLedgerType.PREDICTION_ALLOCATE, -allocate, `예측 참여 — ${def.title.slice(0, 30)}`, "PredictionParticipation", p.id);
          await tx.predictionOption.update({ where: { id: chosenOption.id }, data: { totalAllocated: { increment: allocate }, participantCount: { increment: 1 } } });
          await tx.predictionQuestion.update({ where: { id: q.id }, data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: allocate } } });
          await tx.userProfile.update({ where: { userId: uid }, data: { totalPredictions: { increment: 1 } } });
        });
      }
      console.log(`✅ REMAIN CLOSED 문제 생성: ${def.title.slice(0, 40)}...`);
    }

    // ── Retrofit: test-basic WON + test-standard LOST in already-RESOLVED 소비자물가
    const sobujaQ = await prisma.predictionQuestion.findFirst({
      where: { title: { contains: "소비자물가" }, status: "RESOLVED" },
      include: { options: { where: { deletedAt: null } } },
    });
    if (sobujaQ?.resolvedOptionId) {
      const correctOpt = sobujaQ.options.find((o) => o.id === sobujaQ.resolvedOptionId);
      const wrongOpt   = sobujaQ.options.find((o) => o.id !== sobujaQ.resolvedOptionId);
      const testBasicU = await prisma.user.findFirst({ where: { email: "test-basic@signalleague.com" } });
      const testStdU   = await prisma.user.findFirst({ where: { email: "test-standard@signalleague.com" } });

      if (testBasicU && correctOpt) {
        const exists = await prisma.predictionParticipation.findFirst({ where: { questionId: sobujaQ.id, userId: testBasicU.id } });
        if (!exists) {
          const allocate = 200; const earned = allocate * 2;
          await prisma.$transaction(async (tx) => {
            await tx.predictionParticipation.create({
              data: { questionId: sobujaQ.id, userId: testBasicU.id, optionId: correctOpt.id, allocatedScore: allocate, status: "WON", earnedScore: earned },
            });
            await applyScoreInSeed(tx, testBasicU.id, ScoreLedgerType.PREDICTION_ALLOCATE, -allocate, `예측 참여(시드 보정) — 소비자물가`, "PredictionQuestion", sobujaQ.id);
            await applyScoreInSeed(tx, testBasicU.id, ScoreLedgerType.PREDICTION_WIN, earned, `예측 적중(시드 보정) — 소비자물가`, "PredictionQuestion", sobujaQ.id);
            await tx.predictionOption.update({ where: { id: correctOpt.id }, data: { totalAllocated: { increment: allocate }, participantCount: { increment: 1 } } });
            await tx.predictionQuestion.update({ where: { id: sobujaQ.id }, data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: allocate } } });
            await tx.userProfile.update({ where: { userId: testBasicU.id }, data: { totalPredictions: { increment: 1 }, correctPredictions: { increment: 1 } } });
          });
          console.log("✅ test-basic WON retrofit 완료");
        } else {
          console.log("⏭️  test-basic 소비자물가 참여 이미 존재");
        }
      }

      if (testStdU && wrongOpt) {
        const exists = await prisma.predictionParticipation.findFirst({ where: { questionId: sobujaQ.id, userId: testStdU.id } });
        if (!exists) {
          const allocate = 150;
          await prisma.$transaction(async (tx) => {
            await tx.predictionParticipation.create({
              data: { questionId: sobujaQ.id, userId: testStdU.id, optionId: wrongOpt.id, allocatedScore: allocate, status: "LOST", earnedScore: 0 },
            });
            await applyScoreInSeed(tx, testStdU.id, ScoreLedgerType.PREDICTION_ALLOCATE, -allocate, `예측 참여(시드 보정) — 소비자물가`, "PredictionQuestion", sobujaQ.id);
            await applyScoreInSeed(tx, testStdU.id, ScoreLedgerType.PREDICTION_LOSE, 0, `예측 비적중(시드 보정) — 소비자물가`, "PredictionQuestion", sobujaQ.id);
            await tx.predictionOption.update({ where: { id: wrongOpt.id }, data: { totalAllocated: { increment: allocate }, participantCount: { increment: 1 } } });
            await tx.predictionQuestion.update({ where: { id: sobujaQ.id }, data: { totalParticipants: { increment: 1 }, totalAllocated: { increment: allocate } } });
            await tx.userProfile.update({ where: { userId: testStdU.id }, data: { totalPredictions: { increment: 1 } } });
          });
          console.log("✅ test-standard LOST retrofit 완료");
        } else {
          console.log("⏭️  test-standard 소비자물가 참여 이미 존재");
        }
      }
    }
  }

  // ── STEP 4-②: 시드 이의제기 3건
  {
    const sobujaQ2 = await prisma.predictionQuestion.findFirst({
      where: { title: { contains: "소비자물가" }, status: "RESOLVED", deletedAt: null },
    });
    const g7Q2 = await prisma.predictionQuestion.findFirst({
      where: { title: { contains: "G7" }, status: "RESOLVED", deletedAt: null },
    });
    const testBasicU2 = await prisma.user.findFirst({ where: { email: "test-basic@signalleague.com" } });
    const dummy01U  = await prisma.user.findFirst({ where: { email: "dummy-01@signalleague.local" } });
    const dummy05U  = await prisma.user.findFirst({ where: { email: "dummy-05@signalleague.local" } });

    if (sobujaQ2 && testBasicU2) {
      const exists = await prisma.dispute.findUnique({ where: { questionId_userId: { questionId: sobujaQ2.id, userId: testBasicU2.id } } });
      if (!exists) {
        await prisma.dispute.create({
          data: {
            questionId: sobujaQ2.id,
            userId: testBasicU2.id,
            reason: "결과 판정 기준이 불명확합니다. 발표된 통계청 자료를 보면 해당 월 수치가 기준치를 충족하지 않는 것으로 보이며, 추가 검토가 필요합니다. 기준이 되는 통계 출처와 판단 근거를 명확히 제시해 주십시오.",
            evidence: "https://kostat.go.kr/board.es?mid=a10301010000&bid=215",
            status: "PENDING",
          },
        });
        console.log("✅ 이의제기 시드 1 (test-basic → 소비자물가, PENDING)");
      } else {
        console.log("⏭️  이의제기 시드 1 이미 존재");
      }
    }

    if (sobujaQ2 && dummy01U) {
      const exists = await prisma.dispute.findUnique({ where: { questionId_userId: { questionId: sobujaQ2.id, userId: dummy01U.id } } });
      if (!exists) {
        await prisma.dispute.create({
          data: {
            questionId: sobujaQ2.id,
            userId: dummy01U.id,
            reason: "발표 자료를 보면 실제 소비자물가 상승률은 2% 초과 구간에 있었습니다. 판정 근거로 제시된 URL의 데이터가 실제 통계청 발표와 상이합니다. 원본 데이터 링크와 함께 재검토를 요청드립니다.",
            status: "PENDING",
          },
        });
        console.log("✅ 이의제기 시드 2 (dummy-01 → 소비자물가, PENDING)");
      } else {
        console.log("⏭️  이의제기 시드 2 이미 존재");
      }
    }

    if (g7Q2 && dummy05U) {
      const exists = await prisma.dispute.findUnique({ where: { questionId_userId: { questionId: g7Q2.id, userId: dummy05U.id } } });
      if (!exists) {
        await prisma.dispute.create({
          data: {
            questionId: g7Q2.id,
            userId: dummy05U.id,
            reason: "G7 정상회의 개최지 판정 근거가 불분명합니다. 해당 회의가 캐나다에서 개최된 것은 맞으나, 판정 기준일 시점의 공식 발표 여부를 기준으로 했을 때 문제 결과 확정 시점과 불일치가 있을 수 있습니다.",
            status: "REVIEWING",
          },
        });
        console.log("✅ 이의제기 시드 3 (dummy-05 → G7, REVIEWING)");
      } else {
        console.log("⏭️  이의제기 시드 3 이미 존재");
      }
    }
  }

  // ── STEP 4-②: 인라인 랭킹 스냅샷 생성
  {
    console.log("\n📊 랭킹 스냅샷 생성 중...");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const periodKey = `${year}-${month}`;
    function getISOWeek(date: Date): number {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
    const weekNum = getISOWeek(now);
    const weekKey = `${year}-W${String(weekNum).padStart(2, "0")}`;

    // Compute per-user totals from UserProfile + ScoreLedger
    const activeUsers = await prisma.user.findMany({
      where: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null },
      select: { id: true },
    });

    const startOfMonth = new Date(year, now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    type UserStat = {
      userId: string;
      allTimeScore: number;
      monthlyScore: number;
      weeklyScore: number;
      totalPredictions: number;
      correctPredictions: number;
      accuracy: number;
    };

    const userStats: UserStat[] = [];
    for (const u of activeUsers) {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: u.id },
        select: { totalScore: true, totalPredictions: true, correctPredictions: true },
      });
      const [monthlyAgg, weeklyAgg] = await Promise.all([
        prisma.scoreLedger.aggregate({
          where: { userId: u.id, type: "PREDICTION_WIN", createdAt: { gte: startOfMonth }, deletedAt: null },
          _sum: { amount: true },
        }),
        prisma.scoreLedger.aggregate({
          where: { userId: u.id, type: "PREDICTION_WIN", createdAt: { gte: sevenDaysAgo }, deletedAt: null },
          _sum: { amount: true },
        }),
      ]);
      const tp = profile?.totalPredictions ?? 0;
      const cp = profile?.correctPredictions ?? 0;
      userStats.push({
        userId: u.id,
        allTimeScore: profile?.totalScore ?? 0,
        monthlyScore: monthlyAgg._sum.amount ?? 0,
        weeklyScore: weeklyAgg._sum.amount ?? 0,
        totalPredictions: tp,
        correctPredictions: cp,
        accuracy: tp > 0 ? cp / tp : 0,
      });
    }

    // Sort and generate snapshots for ALL_TIME only
    const sorted = [...userStats].sort((a, b) => b.allTimeScore - a.allTimeScore);
    const combinations = [
      { periodType: "ALL_TIME" as const, periodKey: "all" },
      { periodType: "MONTHLY" as const, periodKey },
      { periodType: "WEEKLY" as const, periodKey: weekKey },
    ];

    const sortedByMonthly = [...userStats].sort((a, b) => b.monthlyScore - a.monthlyScore);
    const sortedByWeekly  = [...userStats].sort((a, b) => b.weeklyScore  - a.weeklyScore);

    for (const combo of combinations) {
      const key = combo.periodType === "ALL_TIME" ? "allTimeScore" : combo.periodType === "MONTHLY" ? "monthlyScore" : "weeklyScore";
      const ranked = [...userStats].sort((a, b) => (b[key as keyof UserStat] as number) - (a[key as keyof UserStat] as number));

      await prisma.rankingSnapshot.deleteMany({
        where: { periodType: combo.periodType, periodKey: combo.periodKey, categoryId: null },
      });
      if (ranked.length > 0) {
        await prisma.rankingSnapshot.createMany({
          data: ranked.map((u, i) => ({
            userId: u.userId,
            periodType: combo.periodType,
            periodKey: combo.periodKey,
            categoryId: null,
            categoryCode: null,
            rank: i + 1,
            score: u[key as keyof UserStat] as number,
            totalPredictions: u.totalPredictions,
            correctPredictions: u.correctPredictions,
            accuracy: u.accuracy,
          })),
        });
      }
      console.log(`  ✅ ${combo.periodType} (${combo.periodKey}) — ${ranked.length}명 스냅샷`);
    }

    // Update UserRankingStat
    for (let i = 0; i < sorted.length; i++) {
      const u = sorted[i];
      const mRank = sortedByMonthly.findIndex((x) => x.userId === u.userId) + 1;
      const wRank = sortedByWeekly.findIndex((x) => x.userId === u.userId) + 1;
      await prisma.userRankingStat.upsert({
        where: { userId_periodType_periodKey: { userId: u.userId, periodType: "MONTHLY", periodKey } },
        update: { totalRank: i + 1, totalScore: u.allTimeScore, monthlyRank: mRank, monthlyScore: u.monthlyScore, weeklyRank: wRank, weeklyScore: u.weeklyScore, accuracy: u.accuracy, updatedAt: now },
        create: { userId: u.userId, periodType: "MONTHLY", periodKey, totalRank: i + 1, totalScore: u.allTimeScore, monthlyRank: mRank, monthlyScore: u.monthlyScore, weeklyRank: wRank, weeklyScore: u.weeklyScore, accuracy: u.accuracy },
      });
    }
    console.log(`  ✅ UserRankingStat 업데이트 — ${sorted.length}명`);
  }

  console.log("\n🎉 시딩 완료!");
  console.log("\n📋 테스트 계정 (비밀번호: Test1234!)");
  console.log("  admin@signalleague.com          | 관리자   | BETA_ACTIVE | PRO      | SUPER_ADMIN");
  console.log("  operator@signalleague.com       | 운영자   | BETA_ACTIVE | PRO      | OPERATOR");
  console.log("  test-basic@signalleague.com     | 베타기본 | BETA_ACTIVE | BASIC    | —");
  console.log("  test-standard@signalleague.com  | 베타표준 | BETA_ACTIVE | STANDARD | —");
  console.log("  test-pro@signalleague.com       | 베타프로 | BETA_ACTIVE | PRO      | —");
  console.log("  test-pending@signalleague.com   | 베타대기 | PENDING_BETA| (희망:STANDARD) | —");
  console.log("\n  더미 유저 20명: dummy-01~20@signalleague.local (로그인 불가)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
