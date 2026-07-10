const BASE_URL = process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "https://signal-league.replit.app";

const layout = (content: string) => `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Signal League</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:0 0 24px 0;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
              ⚡ Signal League
            </p>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:12px;padding:36px 40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0 0;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">
              Signal League · 예측력 리그 플랫폼
            </p>
            <p style="margin:0;font-size:12px;color:#6b7280;">
              문의: <a href="mailto:hello@signalleague.com" style="color:#6b7280;">hello@signalleague.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>`;

const h1 = (text: string) =>
  `<h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#ffffff;">${text}</h1>`;

const p = (text: string) =>
  `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#d1d5db;">${text}</p>`;

const small = (text: string) =>
  `<p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">${text}</p>`;

export function verifyEmailTemplate({ nickname, token }: { nickname: string; token: string }) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  const subject = "[Signal League] 이메일 주소를 인증해주세요";
  const html = layout(`
    ${h1("이메일 주소를 인증해주세요")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!<br/>Signal League 베타 신청이 접수되었습니다. 아래 버튼을 눌러 이메일 주소를 인증해 주세요.`)}
    <div style="margin:28px 0;">
      ${button(url, "이메일 인증하기")}
    </div>
    ${p("버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요.")}
    <p style="margin:0 0 20px 0;font-size:13px;color:#6b7280;word-break:break-all;">${url}</p>
    ${small("이 링크는 <strong style=\"color:#9ca3af;\">24시간</strong> 후 만료됩니다. 본인이 요청하지 않은 경우 이 메일을 무시해 주세요.")}
  `);
  const text = `안녕하세요, ${nickname}님!\n\nSignal League 이메일 인증 링크입니다.\n\n${url}\n\n이 링크는 24시간 후 만료됩니다.`;
  return { subject, html, text };
}

export function passwordResetTemplate({ nickname, token }: { nickname: string; token: string }) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  const subject = "[Signal League] 비밀번호를 재설정해주세요";
  const html = layout(`
    ${h1("비밀번호 재설정")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!<br/>비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.`)}
    <div style="margin:28px 0;">
      ${button(url, "비밀번호 재설정")}
    </div>
    ${p("버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요.")}
    <p style="margin:0 0 20px 0;font-size:13px;color:#6b7280;word-break:break-all;">${url}</p>
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#f59e0b;">⚠️ 이 링크는 <strong>1시간</strong> 후 만료됩니다.</p>
    </div>
    ${small("본인이 요청하지 않은 경우 이 메일을 무시해 주세요. 계정은 안전하게 유지됩니다.")}
  `);
  const text = `안녕하세요, ${nickname}님!\n\nSignal League 비밀번호 재설정 링크입니다.\n\n${url}\n\n이 링크는 1시간 후 만료됩니다.`;
  return { subject, html, text };
}

export function betaApprovedTemplate({
  nickname,
  plan,
  initialScore,
}: {
  nickname: string;
  plan: "BASIC" | "STANDARD" | "PRO";
  initialScore: number;
}) {
  const planLabel = { BASIC: "Basic", STANDARD: "Standard", PRO: "Pro" }[plan];
  const subject = "[Signal League] 베타 이용이 승인되었습니다 🎉";
  const html = layout(`
    ${h1(`${nickname}님, 환영합니다!`)}
    ${p("Signal League 베타 이용이 승인되었습니다.")}
    <div style="background:#1f2937;border-radius:8px;padding:20px 24px;margin:20px 0 28px 0;">
      <p style="margin:0 0 10px 0;font-size:13px;color:#9ca3af;">승인 내역</p>
      <p style="margin:0 0 6px 0;font-size:15px;color:#ffffff;"><strong>승인된 요금제:</strong> ${planLabel}</p>
      <p style="margin:0;font-size:15px;color:#3b82f6;font-weight:600;">지급된 베타 점수: ${initialScore.toLocaleString()}점</p>
    </div>
    ${p("이제 예측 문제에 참여하거나 직접 문제를 만들 수 있습니다.")}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/home`, "Signal League 시작하기")}
    </div>
    ${small("Signal League의 점수는 현금, 상품권, 가상자산 등으로 환전·교환·양도·판매할 수 없는 비금전성 서비스 점수입니다.")}
  `);
  const text = `${nickname}님, 환영합니다!\n\nSignal League 베타 이용이 승인되었습니다.\n\n- 승인된 요금제: ${planLabel}\n- 지급된 베타 점수: ${initialScore.toLocaleString()}점\n\n이제 예측 문제에 참여하거나 직접 문제를 만들 수 있습니다.\n\n${BASE_URL}/home`;
  return { subject, html, text };
}

export function questionApprovedTemplate({
  nickname,
  questionTitle,
  questionId,
}: {
  nickname: string;
  questionTitle: string;
  questionId: string;
}) {
  const subject = "[Signal League] 예측 문제가 승인되었습니다 ✅";
  const html = layout(`
    ${h1(`${nickname}님`)}
    ${p("작성하신 예측 문제가 운영자 검토를 통과했습니다.")}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:16px 0 28px 0;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${questionTitle}</p>
    </div>
    ${p("이제 다른 회원들이 이 문제에 참여할 수 있습니다.")}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/predictions/${questionId}`, "문제 보러가기")}
    </div>
  `);
  const text = `${nickname}님\n\n작성하신 예측 문제가 운영자 검토를 통과했습니다.\n\n"${questionTitle}"\n\n이제 다른 회원들이 이 문제에 참여할 수 있습니다.\n\n${BASE_URL}/predictions/${questionId}`;
  return { subject, html, text };
}

export function questionRejectedTemplate({
  nickname,
  questionTitle,
  reason,
}: {
  nickname: string;
  questionTitle: string;
  reason: string;
}) {
  const subject = "[Signal League] 예측 문제가 반려되었습니다";
  const html = layout(`
    ${h1(`${nickname}님`)}
    ${p("작성하신 예측 문제가 검토 결과 반려되었습니다.")}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:16px 0 20px 0;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${questionTitle}</p>
    </div>
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#f59e0b;">반려 사유</p>
    ${p(reason)}
    ${p("사유를 확인하시고 필요 시 새로운 문제로 다시 작성해 주세요.")}
    ${small("문제 작성 시 차감된 생성 비용은 정책에 따라 환급 여부가 결정됩니다.")}
  `);
  const text = `${nickname}님\n\n작성하신 예측 문제가 검토 결과 반려되었습니다.\n\n"${questionTitle}"\n\n[반려 사유]\n${reason}\n\n사유를 확인하시고 필요 시 새로운 문제로 다시 작성해 주세요.`;
  return { subject, html, text };
}

export type ResultRole = "HIT" | "MISS" | "AUTHOR";

export function resultConfirmedTemplate({
  nickname,
  questionTitle,
  questionId,
  role,
  scoreChange,
  winningChoice,
}: {
  nickname: string;
  questionTitle: string;
  questionId: string;
  role: ResultRole;
  scoreChange?: number;
  winningChoice: string;
}) {
  let subject: string;
  let roleHtml: string;
  let roleText: string;

  if (role === "HIT") {
    subject = "[Signal League] 🎯 적중! 예측 결과가 확정되었습니다";
    roleHtml = `
      <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#22c55e;">축하합니다! 예측이 적중했습니다.</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#d1d5db;">점수 변동: <strong style="color:#22c55e;">+${scoreChange?.toLocaleString()}점</strong></p>
    `;
    roleText = `축하합니다! 예측이 적중했습니다.\n점수 변동: +${scoreChange?.toLocaleString()}점`;
  } else if (role === "MISS") {
    subject = "[Signal League] 📊 예측 결과가 확정되었습니다";
    roleHtml = `
      <p style="margin:0 0 8px 0;font-size:15px;color:#d1d5db;">이번 예측은 적중하지 못했습니다.</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#d1d5db;">점수 변동: <strong style="color:#f87171;">${scoreChange?.toLocaleString()}점</strong></p>
    `;
    roleText = `이번 예측은 적중하지 못했습니다.\n점수 변동: ${scoreChange?.toLocaleString()}점`;
  } else {
    subject = "[Signal League] 📋 작성하신 문제의 결과가 확정되었습니다";
    roleHtml = `<p style="margin:0 0 20px 0;font-size:15px;color:#d1d5db;">작성하신 예측 문제의 결과가 확정되었습니다.</p>`;
    roleText = "작성하신 예측 문제의 결과가 확정되었습니다.";
  }

  const html = layout(`
    ${h1(`${nickname}님`)}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#ffffff;">${questionTitle}</p>
      <p style="margin:0;font-size:13px;color:#9ca3af;">정답: <strong style="color:#ffffff;">${winningChoice}</strong></p>
    </div>
    ${roleHtml}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/predictions/${questionId}`, "결과 상세 보기")}
    </div>
  `);
  const text = `${nickname}님\n\n"${questionTitle}"\n정답: ${winningChoice}\n\n${roleText}\n\n결과 상세 보기: ${BASE_URL}/predictions/${questionId}`;
  return { subject, html, text };
}

export type VoidRole = "PARTICIPANT" | "AUTHOR";

export function questionVoidedTemplate({
  nickname,
  questionTitle,
  reason,
  role,
  refundedScore,
}: {
  nickname: string;
  questionTitle: string;
  reason: string;
  role: VoidRole;
  refundedScore?: number;
}) {
  const subject = "[Signal League] ⚠️ 예측 문제가 무효 처리되었습니다";
  const roleHtml =
    role === "PARTICIPANT"
      ? `
        ${p("참여하신 예측 문제가 무효 처리되었습니다. 참여 시 차감된 점수가 환급되었습니다.")}
        <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;">
          <p style="margin:0;font-size:15px;color:#3b82f6;font-weight:600;">환급된 점수: ${refundedScore?.toLocaleString()}점</p>
        </div>
      `
      : `
        ${p("작성하신 예측 문제가 무효 처리되었습니다.")}
        ${small("문제 작성 시 차감된 생성 비용은 정책에 따라 환급 여부가 결정됩니다. 자세한 내용은 운영자에게 문의해 주세요.")}
      `;
  const roleText =
    role === "PARTICIPANT"
      ? `참여하신 예측 문제가 무효 처리되었습니다.\n환급된 점수: ${refundedScore?.toLocaleString()}점`
      : "작성하신 예측 문제가 무효 처리되었습니다.";

  const html = layout(`
    ${h1(`${nickname}님`)}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${questionTitle}</p>
    </div>
    ${roleHtml}
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#f59e0b;">무효 처리 사유</p>
    ${p(reason)}
  `);
  const text = `${nickname}님\n\n"${questionTitle}"\n\n${roleText}\n\n[무효 처리 사유]\n${reason}`;
  return { subject, html, text };
}

export function adminBroadcastTemplate({
  nickname,
  title,
  content,
  linkUrl,
}: {
  nickname: string;
  title: string;
  content: string;
  linkUrl?: string;
}) {
  const subject = title.startsWith("[Signal League]") ? title : `[Signal League] ${title}`;
  const linkHtml = linkUrl
    ? `<div style="margin:28px 0;">${button(linkUrl, "자세히 보기")}</div>`
    : "";
  const html = layout(`
    ${h1(title)}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!`)}
    ${p(content)}
    ${linkHtml}
  `);
  const text = `안녕하세요, ${nickname}님!\n\n${title}\n\n${content}${linkUrl ? `\n\n${linkUrl}` : ""}`;
  return { subject, html, text };
}

export function reportHandledTemplate({
  nickname,
  resolution,
}: {
  nickname: string;
  resolution: "ACCEPTED" | "DISMISSED" | "NEEDS_MORE_INFO";
}) {
  const isResolved = resolution === "ACCEPTED";
  const subject = isResolved
    ? "[Signal League] 신고 처리 완료"
    : "[Signal League] 신고 처리 결과";
  const bodyText = isResolved
    ? "접수하신 신고가 검토되어 필요한 조치가 진행되었습니다."
    : "접수하신 신고를 검토했으나 별도 조치는 진행되지 않았습니다.";
  const html = layout(`
    ${h1(isResolved ? "신고 처리 완료" : "신고 처리 결과")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!`)}
    ${p(bodyText)}
    ${p("신고해 주신 내용은 운영 정책을 유지하는 데 큰 도움이 됩니다.")}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/notifications`, "알림 페이지에서 확인하기")}
    </div>
    ${small("상세 조치 내용은 운영 정책에 따라 공개되지 않습니다.")}
  `);
  const text = `안녕하세요, ${nickname}님!\n\n${bodyText}\n\n신고해 주신 내용은 운영 정책을 유지하는 데 큰 도움이 됩니다.\n\n${BASE_URL}/notifications`;
  return { subject, html, text };
}

export function disputeHandledTemplate({
  nickname,
  decision,
  questionTitle,
  questionId,
}: {
  nickname: string;
  decision: "ACCEPTED" | "REJECTED" | "NEEDS_MORE_INFO";
  questionTitle: string;
  questionId: string;
}) {
  const titleMap = {
    ACCEPTED: "이의제기 인용",
    REJECTED: "이의제기 검토 결과",
    NEEDS_MORE_INFO: "이의제기 추가 정보 요청",
  };
  const bodyMap = {
    ACCEPTED: "제출하신 이의제기가 인용되어 결과가 조정되었습니다. 자세한 내용은 문제 상세 페이지에서 확인해 주세요.",
    REJECTED: "제출하신 이의제기를 검토한 결과, 기존 결과를 유지하기로 결정했습니다.",
    NEEDS_MORE_INFO: "이의제기 검토를 위해 추가 정보가 필요합니다. 알림 페이지에서 자세한 내용을 확인해 주세요.",
  };
  const subject = `[Signal League] ${titleMap[decision]}`;
  const html = layout(`
    ${h1(titleMap[decision])}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!`)}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${questionTitle}</p>
    </div>
    ${p(bodyMap[decision])}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/predictions/${questionId}`, "문제 상세 보기")}
    </div>
  `);
  const text = `안녕하세요, ${nickname}님!\n\n${titleMap[decision]}\n\n"${questionTitle}"\n\n${bodyMap[decision]}\n\n${BASE_URL}/predictions/${questionId}`;
  return { subject, html, text };
}

export function accountSuspendedTemplate({ nickname }: { nickname: string }) {
  const subject = "[Signal League] 계정 이용 제한 안내";
  const html = layout(`
    ${h1("계정 이용이 제한되었습니다")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!`)}
    ${p("운영 정책 위반으로 계정 이용이 제한되었습니다.")}
    ${p("자세한 내용은 운영자에게 문의해 주세요.")}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/suspended`, "제한 안내 확인")}
    </div>
    ${small("문의: hello@signalleague.com")}
  `);
  const text = `안녕하세요, ${nickname}님!\n\n운영 정책 위반으로 계정 이용이 제한되었습니다.\n\n자세한 내용은 운영자에게 문의해 주세요.\n\n문의: hello@signalleague.com`;
  return { subject, html, text };
}

export function accountUnsuspendedTemplate({ nickname }: { nickname: string }) {
  const subject = "[Signal League] 계정 이용 제한 해제 안내";
  const html = layout(`
    ${h1("계정 이용 제한이 해제되었습니다")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!`)}
    ${p("계정 이용 제한이 해제되었습니다. 다시 Signal League를 이용하실 수 있습니다.")}
    <div style="margin:28px 0;">
      ${button(`${BASE_URL}/home`, "Signal League 시작하기")}
    </div>
  `);
  const text = `안녕하세요, ${nickname}님!\n\n계정 이용 제한이 해제되었습니다. 다시 Signal League를 이용하실 수 있습니다.\n\n${BASE_URL}/home`;
  return { subject, html, text };
}

export function signupReceivedTemplate({
  nickname,
  planName,
  provider,
}: {
  nickname: string;
  planName: string;
  provider: "email" | "google";
}) {
  const nextStepsHtml =
    provider === "email"
      ? "1. 이메일 주소 인증 (인증 메일 확인)<br/>2. 베타 승인 대기<br/>3. 승인 후 Signal League 시작!"
      : "1. 베타 승인 대기 (운영팀 검토 중)<br/>2. 승인 후 Signal League 시작!";

  const nextStepsText =
    provider === "email"
      ? "1. 이메일 주소 인증\n2. 베타 승인 대기\n3. 승인 후 Signal League 시작!"
      : "1. 베타 승인 대기 (운영팀 검토 중)\n2. 승인 후 Signal League 시작!";

  const subject = "[Signal League] 베타 신청이 접수되었습니다";
  const html = layout(`
    ${h1("베타 신청이 접수되었습니다 🎉")}
    ${p(`안녕하세요, <strong style="color:#ffffff;">${nickname}</strong>님!<br/>Signal League 베타 신청이 정상적으로 접수되었습니다.`)}
    <div style="background:#1f2937;border-radius:8px;padding:20px 24px;margin:20px 0 28px 0;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;">신청 요금제</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;">${planName}</p>
    </div>
    ${p("운영팀이 검토 후 순차적으로 베타 승인을 진행합니다. 승인 시 별도 안내 메일을 발송해 드립니다.")}
    <div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#ffffff;">다음 단계</p>
      <p style="margin:0;font-size:13px;color:#d1d5db;">${nextStepsHtml}</p>
    </div>
    ${small("Signal League는 사회·경제·국제정세·기술 이슈에 대한 예측력을 점수로 기록하는 구독형 플랫폼입니다.")}
  `);
  const text = `안녕하세요, ${nickname}님!\n\nSignal League 베타 신청이 접수되었습니다.\n신청 요금제: ${planName}\n\n다음 단계:\n${nextStepsText}\n\n운영팀 검토 후 순차적으로 베타 승인을 진행합니다.`;
  return { subject, html, text };
}
