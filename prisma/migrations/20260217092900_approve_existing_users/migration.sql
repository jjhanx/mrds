-- 기존 회원들을 승인 상태로 변경
UPDATE "User" SET "status" = 'approved' WHERE "status" = 'pending';
