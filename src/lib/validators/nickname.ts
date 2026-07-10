export type NicknameValidation = { ok: true } | { ok: false; message: string };

const ALLOWED_CHARS = /^[a-zA-Z0-9가-힣_]+$/;
const FORBIDDEN_PATTERN = /(?:관리자|운영자|admin|administrator|operator|system)/i;

export function validateNickname(nickname: string): NicknameValidation {
  const trimmed = nickname.trim();

  if (trimmed.length === 0)
    return { ok: false, message: "닉네임을 입력해 주세요." };
  if (trimmed.length < 2)
    return { ok: false, message: "닉네임은 2자 이상이어야 합니다." };
  if (trimmed.length > 20)
    return { ok: false, message: "닉네임은 20자 이하여야 합니다." };
  if (!ALLOWED_CHARS.test(trimmed))
    return { ok: false, message: "닉네임에 허용되지 않는 문자가 포함되어 있습니다." };
  if (FORBIDDEN_PATTERN.test(trimmed))
    return { ok: false, message: "사용할 수 없는 표현이 포함되어 있습니다." };

  return { ok: true };
}
