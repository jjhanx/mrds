#!/bin/bash
# 부팅 시 mrds를 fork 모드로 시작
# crontab에 등록: @reboot /경로/mrds/scripts/pm2-start-fork.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MRDS_DIR="$(dirname "$SCRIPT_DIR")"

sleep 15
cd "$MRDS_DIR"
pm2 delete mrds 2>/dev/null
pm2 start ecosystem.config.cjs
pm2 save
