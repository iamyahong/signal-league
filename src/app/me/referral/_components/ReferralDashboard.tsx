"use client";

import { useState } from "react";
import { Copy, Check, Share2, Users, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ReferredUser {
  nickname: string;
  joinedAt: string;
  firstParticipatedAt: string | null;
  bonusGiven: boolean;
  bonusAmount: number | null;
}

interface Props {
  referralCode: string;
  userId: string;
  totalReferrals: number;
  totalBonusEarned: number;
  referrals: ReferredUser[];
}

export function ReferralDashboard({ referralCode, userId, totalReferrals, totalBonusEarned, referrals }: Props) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : `/signup?ref=${referralCode}`;

  const rankingShareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/ranking/${userId}`
    : `/share/ranking/${userId}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
    toast.success("추천 코드를 복사했습니다");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("초대 링크를 복사했습니다");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRankingLink = async () => {
    await navigator.clipboard.writeText(rankingShareUrl);
    toast.success("랭킹 공유 링크를 복사했습니다");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">친구 초대</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          친구를 초대하면 첫 참여 시 양쪽 모두 <strong>500점</strong>이 지급됩니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">초대한 친구</span>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{totalReferrals}명</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">획득 보너스</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">+{totalBonusEarned.toLocaleString()}점</div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">내 추천 코드</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] font-mono text-lg font-bold tracking-widest text-[var(--color-text-primary)] border border-[var(--color-border-default)]">
              {referralCode}
            </div>
            <Button variant="secondary" onClick={handleCopyCode} className="shrink-0">
              {codeCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">초대 링크</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-default)] overflow-hidden text-ellipsis whitespace-nowrap">
              {shareUrl}
            </div>
            <Button variant="primary" onClick={handleCopyLink} className="shrink-0 gap-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "복사됨" : "복사"}
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--color-border-default)]">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">내 랭킹 공유</p>
          <Button variant="secondary" onClick={handleCopyRankingLink} className="w-full gap-2">
            <Share2 className="h-4 w-4" />
            랭킹 공유 링크 복사
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">초대한 친구 목록</h2>
        {referrals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">아직 초대한 친구가 없습니다.</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">위의 링크를 공유해 친구를 초대해 보세요.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {referrals.map((r, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.nickname}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      가입 {new Date(r.joinedAt).toLocaleDateString("ko-KR")}
                      {r.firstParticipatedAt && (
                        <> · 첫 참여 {new Date(r.firstParticipatedAt).toLocaleDateString("ko-KR")}</>
                      )}
                    </p>
                  </div>
                  {r.bonusGiven ? (
                    <Badge variant="success">보너스 지급</Badge>
                  ) : r.firstParticipatedAt ? (
                    <Badge variant="warning">지급 대기</Badge>
                  ) : (
                    <Badge variant="default">미참여</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
