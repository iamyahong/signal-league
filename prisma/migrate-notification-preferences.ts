import prisma from "../src/lib/prisma";
import {
  DEFAULT_PREFERENCES,
  isNewStructure,
  type NotificationPreferences,
} from "../src/lib/notificationPreferences";

interface LegacyPrefs {
  question_approved?: boolean;
  participation_result?: boolean;
  score_change?: boolean;
  comment_deleted?: boolean;
  report_processed?: boolean;
  [key: string]: unknown;
}

type NewPrefs = NotificationPreferences;

function migrate(raw: LegacyPrefs | NewPrefs | null): NewPrefs {
  if (isNewStructure(raw)) return raw;

  const legacy = (raw ?? {}) as LegacyPrefs;
  const qa = legacy.question_approved ?? true;
  const rc = legacy.participation_result ?? true;

  return {
    questionApproved: { inApp: qa, email: qa },
    questionRejected: { ...DEFAULT_PREFERENCES.questionRejected },
    resultConfirmed:  { inApp: rc, email: rc },
    betaApproved:     { ...DEFAULT_PREFERENCES.betaApproved },
    questionVoided:   { ...DEFAULT_PREFERENCES.questionVoided },
  };
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");

  const profiles = await prisma.userProfile.findMany({
    select: {
      id: true,
      userId: true,
      notificationPreferences: true,
      user: { select: { email: true } },
    },
  });

  let migrated = 0;
  let skipped = 0;
  let nullFilled = 0;

  for (const p of profiles) {
    const before = p.notificationPreferences as LegacyPrefs | NewPrefs | null;
    const after = migrate(before);

    if (isNewStructure(before)) {
      skipped++;
      continue;
    }

    if (before === null) nullFilled++;

    console.log(`[${dryRun ? "DRY" : "MIGRATE"}] ${p.user.email}`);
    console.log("  before:", JSON.stringify(before));
    console.log("  after: ", JSON.stringify(after));

    if (!dryRun) {
      await prisma.userProfile.update({
        where: { id: p.id },
        data: { notificationPreferences: after as unknown as Record<string, { inApp: boolean; email: boolean }> },
      });
    }

    migrated++;
  }

  console.log("\n=== 마이그레이션 결과 ===");
  console.log(`총: ${profiles.length}명`);
  console.log(`변환: ${migrated}명 (NULL 포함: ${nullFilled}명)`);
  console.log(`스킵 (이미 신규): ${skipped}명`);
  if (dryRun) console.log("※ DRY RUN — 실제 DB 변경 없음");
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
