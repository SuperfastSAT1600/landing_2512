#!/usr/bin/env python3
"""
SuperfastSAT Slack Bot — Socket Mode
채널별 역할:
  #개발_병윤     → Claude CLI 실행 (병윤만)
  #m1_리드      → 리드 메시지 파싱 → CRM 자동 등록
  #블로그_채널  → 블로그 주제 추천 + 포스팅 작성
"""

import re
import os
import glob
import time
import hmac
import hashlib
import json
import subprocess
import logging
import threading
import schedule
import requests as http
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import dotenv_values

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

env = dotenv_values("/workspace/.env.local")
SLACK_BOT_TOKEN     = env.get("SLACK_BOT_TOKEN")
SLACK_APP_TOKEN     = env.get("SLACK_APP_TOKEN")
ADMIN_SECRET_KEY    = env.get("ADMIN_SECRET_KEY")
SLACK_SIGNING_SECRET = env.get("SLACK_SIGNING_SECRET", "")
CRM_BASE_URL        = env.get("CRM_API_URL", "http://localhost:3000")

DEV_CHANNEL   = "C0B5SKL75FU"   # #개발_병윤
LEADS_CHANNEL = "C07FK85V9PD"   # #m1_26년-5-6월-2억-2리드
BLOG_CHANNEL  = "C0A28EJQA7P"   # 블로그 주제/작성 채널
TARGET_USER   = "U07FK6LSK7C"   # 병윤
WORKSPACE     = "/workspace"
BLOG_API_URL  = "http://localhost:3000/api/slack/events"

if not SLACK_BOT_TOKEN or not SLACK_APP_TOKEN:
    raise RuntimeError(".env.local에 SLACK_BOT_TOKEN 또는 SLACK_APP_TOKEN이 없습니다.")

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(token=SLACK_BOT_TOKEN)


# ── Claude CLI ────────────────────────────────────────────────────────────────

def run_claude(prompt: str) -> str:
    log.info(f"Claude 실행: {prompt[:80]}...")
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True, text=True, cwd=WORKSPACE, timeout=300,
        )
        output = result.stdout.strip()
        if result.returncode != 0 and result.stderr:
            output = result.stderr.strip()
        return output or "작업이 완료되었습니다."
    except subprocess.TimeoutExpired:
        return "⚠️ 작업 시간이 초과되었습니다 (5분). 더 작은 단위로 요청해 주세요."
    except FileNotFoundError:
        return "⚠️ claude CLI를 찾을 수 없습니다. PATH를 확인해 주세요."
    except Exception as e:
        return f"⚠️ 오류 발생: {e}"


# ── 리드 파싱 ─────────────────────────────────────────────────────────────────

def _clean_grade(raw: str) -> str:
    """'8학년' → '8', 이미 숫자면 그대로."""
    m = re.search(r'(\d+)', raw)
    return m.group(1) if m else raw.strip()


def _clean_phone(raw: str) -> str:
    """'p:+821091242922' 또는 '+821091242922, ...' → '+821091242922'."""
    # 맨 앞 'p:' 제거
    raw = re.sub(r'^p:', '', raw.strip())
    # 콤마나 공백 이후 제거
    raw = re.split(r'[,\s]', raw)[0]
    return raw.strip()


def parse_instagram_lead(text: str) -> dict | None:
    """
    형식:
      m1_…리드, 작성일 : …
      크리에이티브 : …
      캠페인 : …
      학년:8학년
      목표점수:1500
      연락처:p:+821091242922, 새로운 상담 신청!
    """
    if "학년:" not in text or "연락처:" not in text or "목표점수:" not in text:
        return None

    grade_m   = re.search(r'학년:(.+?)(?:\n|$)', text)
    score_m   = re.search(r'목표점수:(\d+)', text)
    phone_m   = re.search(r'연락처:(.+?)(?:,|\n|$)', text)
    campaign_m = re.search(r'캠페인 : (.+?)(?:\n|$)', text)
    creative_m = re.search(r'크리에이티브 : (.+?)(?:\n|$)', text)

    grade = _clean_grade(grade_m.group(1)) if grade_m else "미정"
    phone = _clean_phone(phone_m.group(1)) if phone_m else "미정"

    campaign_tags = []
    if campaign_m:
        campaign_tags.append(campaign_m.group(1).strip())
    if creative_m:
        campaign_tags.append(creative_m.group(1).strip())

    return {
        "name": "인스타 리드",
        "grade": grade,
        "school_type": "other",
        "parent_phone": phone,
        "desired_subjects": "Both",
        "inquiry_channel": "인스타그램 링크",
        "traffic_source": "인스타그램",
        "target_score": int(score_m.group(1)) if score_m else None,
        "campaign_tags": campaign_tags,
        "lead_type": "B2C",
    }


def parse_landing_lead(text: str) -> dict | None:
    """
    형식 (Slack 이모지 코드 포함):
      :clipboard: 채널: tutoring_landing
      :clock1: 시간: …
      :bust_in_silhouette: 학생: 홍길동
      :mortar_board: 학년: 10학년
      :telephone_receiver: 연락처: 010-1234-5678, https://…
    """
    if "학생:" not in text and "학생: " not in text:
        return None
    if "채널:" not in text and "채널: " not in text:
        return None

    # 이모지 코드 제거 후 파싱
    clean = re.sub(r':[a-z0-9_]+:', '', text)

    name_m    = re.search(r'학생:\s*(.+?)(?:\n|$)', clean)
    grade_m   = re.search(r'학년:\s*(.+?)(?:\n|$)', clean)
    phone_m   = re.search(r'연락처:\s*(.+?)(?:,|https?://|\n|$)', clean)
    channel_m = re.search(r'채널:\s*(.+?)(?:\n|$)', clean)

    name  = name_m.group(1).strip()  if name_m  else "미정"
    grade = _clean_grade(grade_m.group(1)) if grade_m else "미정"
    phone = phone_m.group(1).strip() if phone_m else "미정"

    source_channel = channel_m.group(1).strip() if channel_m else ""

    # 채널 → inquiry_channel / traffic_source 매핑
    if "tutoring_landing" in source_channel or "landing" in source_channel:
        inquiry_channel = "상담 예약"
        traffic_source  = "네이버 블로그"
    elif "google" in source_channel.lower():
        inquiry_channel = "구글 상담시트"
        traffic_source  = "구글 상담시트"
    elif "naver" in source_channel.lower() or "네이버" in source_channel:
        inquiry_channel = "네이버 상담시트"
        traffic_source  = "네이버 블로그"
    else:
        inquiry_channel = "상담 예약"
        traffic_source  = None

    return {
        "name": name,
        "grade": grade,
        "school_type": "other",
        "parent_phone": phone,
        "desired_subjects": "Both",
        "inquiry_channel": inquiry_channel,
        "traffic_source": traffic_source,
        "campaign_tags": [],
        "lead_type": "B2C",
    }


# ── 블로그 API 내부 호출 ──────────────────────────────────────────────────────

def _make_slack_signature(body: str) -> tuple[str, str]:
    """Slack signing secret으로 서명을 생성한다."""
    timestamp = str(int(time.time()))
    basestring = f"v0:{timestamp}:{body}"
    sig = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        basestring.encode(),
        hashlib.sha256,
    ).hexdigest()
    return timestamp, sig


def call_blog_api(command: str, channel: str, thread_ts: str | None = None) -> bool:
    """Next.js 블로그 API를 Slack 서명을 직접 생성해서 내부 호출한다."""
    ts = thread_ts or str(time.time())
    event: dict = {
        "type": "app_mention",
        "text": f"<@UBOT> {command}",
        "channel": channel,
        "ts": ts,
    }
    if thread_ts:
        event["thread_ts"] = thread_ts

    payload = json.dumps({"type": "event_callback", "event": event}, separators=(",", ":"))
    timestamp, signature = _make_slack_signature(payload)

    try:
        resp = http.post(
            BLOG_API_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-slack-request-timestamp": timestamp,
                "x-slack-signature": signature,
            },
            timeout=15,
        )
        log.info(f"Blog API 응답: {resp.status_code} {resp.text[:100]}")
        return resp.status_code == 200
    except Exception as e:
        log.error(f"Blog API 호출 실패: {e}")
        return False


def run_suggest_topics(n: int = 5) -> bool:
    """suggest-topics.js 스크립트를 백그라운드에서 실행해 Slack에 주제를 올린다."""
    import os, threading

    def _run():
        log.info(f"주제 추천 스크립트 실행: {n}개")
        try:
            env = {**os.environ}
            result = subprocess.run(
                ["node", "blog-agent/scripts/suggest-topics.js"],
                capture_output=True, text=True, cwd=WORKSPACE, timeout=60, env=env,
            )
            if result.returncode != 0:
                log.error(f"suggest-topics 오류: {result.stderr[:300]}")
            else:
                log.info(f"suggest-topics 완료")
        except subprocess.TimeoutExpired:
            log.error("suggest-topics 타임아웃")
        except Exception as e:
            log.error(f"suggest-topics 실행 실패: {e}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return True


# ── 블로그 작성 (플랫폼별 분기) ───────────────────────────────────────────────

# ── 블로그 작성 모델 배치 ────────────────────────────────────────────────────
# landing: claude-sonnet-4-6  — 전문성 + 데이터 분석
# ghost  : claude-sonnet-4-6  — SEO/GEO, 마크다운 전문가 글
# naver  : claude-haiku-4-5-20251001 — 친근한 포맷, 빠른 생성

PLATFORM_SKILLS = {
    'landing': ('landing-blog', 'claude-sonnet-4-6'),
    'naver':   ('naver-blog',   'claude-haiku-4-5-20251001'),
    'ghost':   ('ghost-blog',   'claude-sonnet-4-6'),
}

def _run_claude_blog(prompt: str, model: str) -> str:
    log.info(f'Claude [{model}] 실행: {prompt[:60]}...')
    try:
        result = subprocess.run(
            ['claude', '-p', prompt, '--model', model, '--dangerously-skip-permissions'],
            capture_output=True, text=True, cwd=WORKSPACE, timeout=360,
        )
        output = result.stdout.strip()
        if result.returncode != 0 and result.stderr:
            output = result.stderr.strip()
        return output or '작업이 완료되었습니다.'
    except subprocess.TimeoutExpired:
        return '⚠️ 작업 시간이 초과되었습니다 (6분).'
    except FileNotFoundError:
        return '⚠️ claude CLI를 찾을 수 없습니다.'
    except Exception as e:
        return f'⚠️ 오류: {e}'


def _load_topic_title(n: int) -> str | None:
    import json as _json
    path = '/workspace/blog-agent/data/today-topics.json'
    try:
        data = _json.loads(open(path).read())
        for t in data.get('topics', []):
            if t.get('n') == n:
                return t.get('title', '')
    except Exception:
        pass
    return None


def run_blog_write_async(n, platform: str, channel: str, thread_ts, say, topic_title=None):
    def _run():
        title = topic_title
        if title is None and n is not None:
            title = _load_topic_title(n)
        if not title:
            say(f'⚠️ {n}번 주제를 찾을 수 없습니다. 주제 목록을 먼저 생성해주세요.', thread_ts=thread_ts)
            return

        skill_name, convert_model = PLATFORM_SKILLS.get(platform, PLATFORM_SKILLS['landing'])
        platform_label = {'landing': '랜딩 페이지', 'naver': '네이버 블로그', 'ghost': 'Ghost 블로그'}[platform]

        # Step 1: superfastsat-blog로 blueprint 생성 (항상 Sonnet)
        say(f'📝 [1/2] blueprint 분석 및 작성 중...', thread_ts=thread_ts)
        blueprint_prompt = (
            f'/superfastsat-blog\n\n'
            f'주제: {title}\n\n'
            f'참고: /workspace/schema/questions/master_sat_ontology_v3.jsonl 에서 '
            f'관련 스킬의 Hard 문제, rationale, 선지 패턴을 검색해 '
            f'구체적 수치(Hard 비율%, 문항 수, 문제 ID)를 본문에 포함할 것.'
        )
        log.info(f'blueprint 작성 시작: {title[:50]}')
        _run_claude_blog(blueprint_prompt, 'claude-sonnet-4-6')

        # 생성된 blueprint 파일 탐색 (가장 최근 것)
        blueprints = glob.glob('/workspace/wiki/blog/*/blueprint.md')
        if not blueprints:
            say('⚠️ blueprint 파일을 찾을 수 없습니다. superfastsat-blog 스킬을 확인해주세요.', thread_ts=thread_ts)
            return
        latest_blueprint = max(blueprints, key=os.path.getmtime)
        log.info(f'blueprint 완료: {latest_blueprint}')

        # Step 2: 플랫폼 스킬로 blueprint → 최종 포맷 변환
        say(f'🔄 [2/2] {platform_label}용 변환 중...', thread_ts=thread_ts)
        convert_prompt = (
            f'/{skill_name}\n\n'
            f'{latest_blueprint} 파일의 blueprint를 읽어 {platform_label}용 포스팅으로 변환할 것.'
        )
        log.info(f'플랫폼 변환 시작: [{platform}/{convert_model}] {title[:50]}')
        result = _run_claude_blog(convert_prompt, convert_model)

        chunks = [result[i:i+3800] for i in range(0, len(result), 3800)]
        for i, chunk in enumerate(chunks):
            prefix = f'✅ [{platform_label}] 작성 완료\n\n' if i == 0 else ''
            say(f'{prefix}{chunk}', thread_ts=thread_ts)

        log.info(f'블로그 작성 완료: [{platform}] {title[:50]}')

    threading.Thread(target=_run, daemon=True).start()


# ── CRM 등록 ──────────────────────────────────────────────────────────────────

def register_in_crm(lead: dict) -> tuple[bool, str, str]:
    """(성공여부, student_id, 오류메시지)"""
    payload = {k: v for k, v in lead.items() if v is not None}
    try:
        resp = http.post(
            f"{CRM_BASE_URL}/api/crm/students",
            json=payload,
            headers={"Content-Type": "application/json", "x-admin-key": ADMIN_SECRET_KEY},
            timeout=15,
        )
        if resp.status_code == 201:
            student_id = resp.json().get("data", {}).get("id", "")
            return True, student_id, ""
        return False, "", f"HTTP {resp.status_code}: {resp.text[:300]}"
    except http.Timeout:
        return False, "", "CRM API 타임아웃"
    except Exception as e:
        return False, "", str(e)


# ── 이벤트 핸들러 ─────────────────────────────────────────────────────────────

@app.event("message")
def handle_message(event, say):
    if event.get("subtype") or event.get("bot_id"):
        return

    channel = event.get("channel")
    text    = event.get("text", "").strip()
    if not text:
        return

    # ── 개발 채널: 병윤의 명령 → Claude 실행
    if channel == DEV_CHANNEL:
        if event.get("user") != TARGET_USER:
            return
        log.info(f"명령 수신: {text}")
        say("⏳ 작업 중...")
        result = run_claude(text)
        chunks = [result[i:i+3800] for i in range(0, len(result), 3800)]
        for i, chunk in enumerate(chunks):
            say(f"{'✅ ' if i == 0 else ''}{chunk}")
        return

    # ── 리드 채널: 메시지 파싱 → CRM 자동 등록
    if channel == LEADS_CHANNEL:
        log.info(f"리드 수신: {text[:100]}")
        lead = parse_instagram_lead(text) or parse_landing_lead(text)
        if not lead:
            log.info("리드 형식 미인식, 스킵")
            return

        log.info(f"파싱 완료: 이름={lead['name']}, 학년={lead['grade']}, 연락처={lead['parent_phone']}")
        ok, student_id, err = register_in_crm(lead)

        if ok:
            crm_link = f"{CRM_BASE_URL}/admin/crm"
            say(
                f"✅ CRM 등록 완료\n"
                f"• 이름: {lead['name']}\n"
                f"• 학년: {lead['grade']}학년\n"
                f"• 연락처: {lead['parent_phone']}\n"
                f"• 채널: {lead.get('inquiry_channel', '-')}\n"
                f"{crm_link}"
            )
        else:
            say(f"⚠️ CRM 등록 실패: {err}")
        return

    # ── 블로그 채널: 주제 추천 + 블로그 작성/발행
    if channel == BLOG_CHANNEL:
        log.info(f"블로그 채널 수신: {text[:100]}")
        thread_ts = event.get("thread_ts") or event.get("ts")

        # 주제 N개 뽑아줘 / 주제 추천해줘 → suggest-topics.js 직접 실행
        topic_n_match = re.search(r'주제\s*(\d+)개\s*(?:뽑아줘|추천해줘|알려줘|추천)', text)
        topic_simple = re.search(r'주제\s*(?:추천해줘|뽑아줘|알려줘|추천)', text)

        if topic_n_match:
            n = min(int(topic_n_match.group(1)), 10)
            log.info(f"주제 {n}개 추천 요청")
            ok = run_suggest_topics(n)
            if not ok:
                say(f"⚠️ 주제 생성 실패. 잠시 후 다시 시도해주세요.")
            return

        if topic_simple and not topic_n_match:
            log.info("주제 5개 추천 요청")
            ok = run_suggest_topics(5)
            if not ok:
                say("⚠️ 주제 생성 실패. 잠시 후 다시 시도해주세요.")
            return

        # N번 [플랫폼] 써줘 — 플랫폼별 포맷 분기
        platform_match = re.search(r'(\d+)번\s*(랜딩|네이버|고스트|ghost|naver|landing)?\s*써줘', text, re.IGNORECASE)
        if platform_match:
            n = int(platform_match.group(1))
            raw_platform = (platform_match.group(2) or '랜딩').lower()
            platform = {
                '랜딩': 'landing', 'landing': 'landing',
                '네이버': 'naver',  'naver': 'naver',
                '고스트': 'ghost',  'ghost': 'ghost',
            }.get(raw_platform, 'landing')
            platform_label = {'landing': '랜딩 페이지', 'naver': '네이버 블로그', 'ghost': 'Ghost 블로그'}[platform]
            say(f"⏳ {n}번 주제로 {platform_label}용 포스팅 작성 중 (blueprint → 변환, 8~12분 소요)...", thread_ts=thread_ts)
            run_blog_write_async(n, platform, channel, thread_ts, say)
            return

        # 직접 주제 입력: "주제명" 써줘 / 해줘 / 작성해줘
        direct_match = re.search('[\u2018\u2019\u201c\u201d\'\""](.+?)[\u2018\u2019\u201c\u201d\'\""].*(?:써줘|해줘|작성해줘|포스팅해줘)', text)
        if direct_match:
            topic_title = direct_match.group(1).strip()
            platform = 'naver' if '네이버' in text else ('ghost' if '고스트' in text or 'ghost' in text.lower() else 'landing')
            platform_label = {'landing': '랜딩 페이지', 'naver': '네이버 블로그', 'ghost': 'Ghost 블로그'}[platform]
            say(f"⏳ '{topic_title}' 주제로 {platform_label}용 포스팅 작성 중 (blueprint → 변환, 8~12분 소요)...", thread_ts=thread_ts)
            run_blog_write_async(None, platform, channel, thread_ts, say, topic_title=topic_title)
            return

        # 발행
        if re.search(r'발행할게요|발행해줘|publish', text):
            say("⏳ 발행 중...", thread_ts=thread_ts)
            ok = call_blog_api("발행할게요", channel, thread_ts)
            if not ok:
                say("⚠️ 발행 API 호출 실패.", thread_ts=thread_ts)
            return

        return


# ── 일일 주제 자동 제안 스케줄러 ──────────────────────────────────────────────

KST = ZoneInfo("Asia/Seoul")

def _daily_topic_job():
    """매일 오전 9:07 KST 주제 추천 자동 실행."""
    now_kst = datetime.now(KST)
    log.info(f"[스케줄] 일일 주제 제안 실행 — {now_kst.strftime('%Y-%m-%d %H:%M KST')}")

    last_file = "/workspace/blog-agent/data/today-topics.json"
    try:
        import json as _json
        data = _json.loads(open(last_file).read())
        if data.get("date") == now_kst.strftime("%Y-%m-%d"):
            log.info("[스케줄] 오늘 이미 주제가 생성됨, 스킵")
            return
    except Exception:
        pass

    run_suggest_topics(5)


def _run_scheduler():
    """스케줄러 루프 — 별도 데몬 스레드에서 실행."""
    # 매일 오전 9:07 KST에 실행 (서버 UTC 기준 00:07)
    schedule.every().day.at("00:07").do(_daily_topic_job)
    log.info("[스케줄] 일일 주제 제안 등록 완료 — 매일 09:07 KST")
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    log.info("SuperfastSAT Slack Bot 시작 (Socket Mode)")
    log.info(f"개발채널: {DEV_CHANNEL} | 리드채널: {LEADS_CHANNEL} | 블로그채널: {BLOG_CHANNEL} | CRM: {CRM_BASE_URL}")

    # 스케줄러 데몬 스레드 시작
    t = threading.Thread(target=_run_scheduler, daemon=True, name="DailyTopicScheduler")
    t.start()

    handler = SocketModeHandler(app, SLACK_APP_TOKEN)
    handler.start()
