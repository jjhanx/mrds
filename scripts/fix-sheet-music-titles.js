/**
 * 악보 제목 정리 스크립트
 *
 * 복구 과정에서 filename 기반으로 만들어져 underscore 등으로 망가진 제목을
 * 읽기 좋게 정리합니다. (다 지우고 재업로드할 필요 없음)
 *
 * 사용법: node scripts/fix-sheet-music-titles.js [--dry-run]
 *   --dry-run  실제 수정 없이 변경 예정 내용만 출력
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function improveTitle(title) {
  if (!title || typeof title !== "string") return title;
  let s = title.trim();
  if (!s) return title;

  // "timestamp-random-" 패턴 잔여물 제거 (숫자-영소문자- 형태)
  s = s.replace(/^\d{10,15}-[a-z0-9]{5,8}-/i, "");

  // __ (쌍밑줄) → ", " (곡 - 가수A, 가수B 패턴)
  s = s.replace(/__+/g, ", ");

  // _-_ → " - " (곡 - 가수 구분)
  s = s.replace(/_-\s*_/g, " - ");

  // 단일 _ → 공백
  s = s.replace(/_/g, " ");

  // 연속 공백 하나로
  s = s.replace(/\s+/g, " ").trim();

  // 한글이 전혀 없고 알파벳/숫자도 거의 없으면 복구 불가 (예: ___ - ____)
  const hasContent = /[a-zA-Z0-9가-힣]/.test(s) && s.length >= 2;
  return hasContent ? s : title;
}

function looksLikeSanitized(title) {
  if (!title || title.length < 3) return false;
  const underscoreCount = (title.match(/_/g) || []).length;
  const hasDoubleUnderscore = title.includes("__");
  const hasUnderscoreDash = /_-_?/.test(title);
  const mostlyUnderscores = (title.match(/_/g) || []).length > title.length * 0.3;
  return underscoreCount >= 2 || hasDoubleUnderscore || hasUnderscoreDash || mostlyUnderscores;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("악보 제목 정리 스크립트" + (dryRun ? " (미리보기)" : "") + "\n");

  const all = await prisma.sheetMusic.findMany({
    select: { id: true, title: true, filepath: true },
  });

  const toUpdate = [];
  for (const item of all) {
    if (!looksLikeSanitized(item.title)) continue;
    const improved = improveTitle(item.title);
    if (improved !== item.title) {
      toUpdate.push({ id: item.id, oldTitle: item.title, newTitle: improved });
    }
  }

  console.log("수정 대상:", toUpdate.length, "건 / 전체", all.length, "건\n");

  if (toUpdate.length === 0) {
    console.log("수정할 제목이 없습니다.");
    return;
  }

  if (dryRun) {
    console.log("--- 미리보기 (앞 20건) ---\n");
    toUpdate.slice(0, 20).forEach((u, i) => {
      console.log(`${i + 1}. "${u.oldTitle}"`);
      console.log(`   → "${u.newTitle}"\n`);
    });
    if (toUpdate.length > 20) {
      console.log(`... 외 ${toUpdate.length - 20}건`);
    }
    console.log("\n실제 적용하려면 --dry-run 없이 실행하세요.");
    return;
  }

  let updated = 0;
  for (const u of toUpdate) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE SheetMusic SET title = ? WHERE id = ?`,
        u.newTitle.slice(0, 255),
        u.id
      );
    } catch (e) {
      console.error(`  실패: ${u.id} -`, e.message);
      continue;
    }
    updated++;
    if (updated <= 10) {
      console.log(`  ${u.oldTitle?.slice(0, 40)}... → ${u.newTitle?.slice(0, 40)}...`);
    }
  }
  console.log(`\n완료: ${updated}건 수정됨`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
