"""
old-data.csv → Supabase students 테이블 임포트 스크립트

실행 방법:
  python3 scripts/import-old-data.py

환경변수 (.env.local 자동 로드):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import csv
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ─── .env.local 로드 ──────────────────────────────────────────────────────────

def load_env():
    env_path = Path(__file__).parent.parent / '.env.local'
    if not env_path.exists():
        raise FileNotFoundError(f'.env.local not found at {env_path}')
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    raise ValueError('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.')

# ─── 필드 매핑 헬퍼 ──────────────────────────────────────────────────────────

def parse_korean_date(s: str):
    """'24년 9월 2일' → '2024-09-02'"""
    s = s.strip()
    if not s:
        return None
    m = re.match(r'(\d+)년\s*(\d+)월\s*(\d+)일', s)
    if m:
        yy, mm, dd = m.groups()
        year = 2000 + int(yy)
        return f"{year:04d}-{int(mm):02d}-{int(dd):02d}"
    return None

def parse_score(s: str):
    """'24년08월 : 640' → 640, '000' 또는 범위 외 → None"""
    s = s.strip()
    if not s:
        return None
    m = re.search(r':\s*(\d+)', s)
    if m:
        v = int(m.group(1))
        if v < 200 or v > 800:
            return None
        return v
    return None

# 기존 코드 → (inquiry_channel, traffic_source, content_author, lead_type, b2b_partner, campaign_tags)
LEAD_MAP = {
    'A1)카톡방':                   ('카톡', None,           None,   'B2C', None, []),
    'A1)카톡방_장현아':             ('카톡', '네이버 블로그', '장현아', 'B2C', None, []),
    'A1)카톡방_이민재':             ('카톡', '네이버 블로그', '이민재', 'B2C', None, []),
    'A1)카톡방_배병윤':             ('카톡', '네이버 블로그', '배병윤', 'B2C', None, []),
    'A1)카톡방_랜딩페이지':         ('카톡', '(구)랜딩페이지', None,  'B2C', None, []),
    'A1)카톡방_인스타그램':         ('카톡', '인스타그램 오가닉', None,'B2C', None, []),
    'A1)카톡방_김우영':             ('카톡', '네이버 블로그', '김우영','B2C', None, []),
    'B1)네이버상담시트':            ('네이버 상담시트', '네이버 블로그', None,  'B2C', None, []),
    'B1)네이버상담시트_이민재':     ('네이버 상담시트', '네이버 블로그', '이민재','B2C', None, []),
    'B1)네이버상담시트_김우영':     ('네이버 상담시트', '네이버 블로그', '김우영','B2C', None, []),
    'B1)네이버상담시트_장현아':     ('네이버 상담시트', '네이버 블로그', '장현아','B2C', None, []),
    'B1)네이버상담시트_배병윤':     ('네이버 상담시트', '네이버 블로그', '배병윤','B2C', None, []),
    'B1)네이버 블로그':             (None, '네이버 블로그', None,   'B2C', None, []),
    'C1)고스트 블로그':             (None, '공식 블로그',   None,   'B2C', None, []),
    'C1)고스트 블로그(영문)':       (None, '공식 블로그',   None,   'B2C', None, []),
    'D1)구글상담시트':              ('구글 상담시트', '(구)랜딩페이지', None,'B2C', None, []),
    'E1)랜딩페이지':                ('구글 상담시트', '(구)랜딩페이지', None,'B2C', None, []),
    'F1)인스타그램':                (None, '인스타그램 광고', None,  'B2C', None, []),
    'F1)인스타그램_랜딩페이지':     ('인스타그램 링크', '(구)랜딩페이지', None,'B2C', None, []),
    'G1)브런치':                    (None, '브런치',        None,   'B2C', None, []),
    'H1)책':                        (None, '책',            None,   'B2C', None, []),
    'I1)소개':                      (None, '소개/추천',     None,   'B2C', None, []),
    'J1)대표전화':                  ('전화', None,           None,   'B2C', None, []),
    'K1)B2B_해연':                  (None, 'B2B 파트너',    None,   'B2B', '해연', []),
    'K1)B2B_커넥티드에듀':          (None, 'B2B 파트너',    None,   'B2B', '커넥티드에듀', []),
    'K1)B2B_부산프레스티지':        (None, 'B2B 파트너',    None,   'B2B', '부산프레스티지', []),
    'K1)B2B_인사이트 컨설팅':       (None, 'B2B 파트너',    None,   'B2B', '인사이트 컨설팅', []),
    'K1)B2B_신화 유학원':           (None, 'B2B 파트너',    None,   'B2B', '신화 유학원', []),
    'K1)B2B_미소남':                (None, 'B2B 파트너',    None,   'B2B', '미소남', []),
    'K1)B2B_InArt':                 (None, 'B2B 파트너',    None,   'B2B', 'InArt', []),
    'K1)B2B_박정 어학원':           (None, 'B2B 파트너',    None,   'B2B', '박정 어학원', []),
    'K1)B2B_솔로몬에듀':            (None, 'B2B 파트너',    None,   'B2B', '솔로몬에듀', []),
    'K1)B2B_Admission AG':          (None, 'B2B 파트너',    None,   'B2B', 'Admission AG', []),
    'L1)네이버공식카페':            (None, '네이버 카페',    None,   'B2C', None, []),
    'M1)레딧':                      (None, '레딧',          None,   'B2C', None, []),
    'Z1)기존DB':                    (None, None,            None,   'B2C', None, ['기존DB 재활성화']),
}

def map_lead_fields(s: str):
    s = s.strip()
    row = LEAD_MAP.get(s)
    if row:
        return row
    # prefix fallback (예: 'A1)카톡방_배병윤_추가메모' 등 비정형)
    for key, val in LEAD_MAP.items():
        if s.startswith(key):
            return val
    return (None, None, None, 'B2C', None, [])

def parse_grade_school(s: str):
    """'[1] US11' → ('11th', 'domestic_us')"""
    s = s.strip()
    if not s or s in ('미확인', '졸업', ''):
        return (s or '미확인', 'other')

    grade_map = {
        'US07': '7th',  'US08': '8th',  'US09': '9th',
        'US10': '10th', 'US11': '11th', 'US12': '12th',
    }

    if s.startswith('[1]'):
        rest = s[3:].strip()
        grade = grade_map.get(rest, rest)
        return (grade, 'domestic_us')
    elif s.startswith('[2]'):
        rest = s[3:].strip()
        return (rest, 'international')
    elif s.startswith('[3]'):
        rest = s[3:].strip()
        return (rest, 'korean_special')
    else:
        return (s, 'other')

COUNTRY_TIMEZONE = {
    '대한민국':        'Asia/Seoul',
    '미국':            'America/Los_Angeles',
    '미국/서부':       'America/Los_Angeles',
    '미국/동부':       'America/New_York',
    '미국/아틀란타':   'America/New_York',
    '미국/텍사스':     'America/Chicago',
    '캐나다':          'America/Toronto',
    '베트남':          'Asia/Ho_Chi_Minh',
    '베트남/호치민':   'Asia/Ho_Chi_Minh',
    '인도네시아':      'Asia/Jakarta',
    '중국':            'Asia/Shanghai',
    '말레이시아':      'Asia/Kuala_Lumpur',
    '싱가포르':        'Asia/Singapore',
    '필리핀':          'Asia/Manila',
    '태국':            'Asia/Bangkok',
    '호주':            'Australia/Sydney',
    '일본':            'Asia/Tokyo',
    '영국':            'Europe/London',
    '파라과이':        'America/Asuncion',
    '아랍에미리트':    'Asia/Dubai',
    '아르헨티나':      'America/Argentina/Buenos_Aires',
}

def map_timezone(s: str):
    s = s.strip()
    # 직접 매칭
    if s in COUNTRY_TIMEZONE:
        return COUNTRY_TIMEZONE[s]
    # 국가명만 포함된 경우 (예: '미국/아틀란타' 중 '미국' prefix)
    for key, tz in COUNTRY_TIMEZONE.items():
        if s.startswith(key):
            return tz
    return None

# ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

CSV_PATH = Path(__file__).parent.parent / 'crm' / 'old-data.csv'

with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
data_rows = rows[1:]

# 컬럼 인덱스
COL_NO      = 0
COL_INQ     = 1   # 인입일
COL_SRC     = 2   # 인입루트
COL_CONS    = 3   # 상담일
COL_GRADE   = 9   # 학생 학년
COL_COUNTRY = 10  # 거주 국가/도시
COL_RW      = 11  # RW점수
COL_MATH    = 12  # MATH점수
COL_MEMO    = 13  # 고객 정보
COL_NAME    = 5   # 학생 이름
COL_PHONE   = 7   # 학부모 전화번호
COL_KAKAO   = 8   # 학부모 카톡ID

students = []
skipped  = 0

for i, row in enumerate(data_rows, start=2):
    # 패딩
    while len(row) < 18:
        row.append('')

    name = row[COL_NAME].strip()
    if not name:
        skipped += 1
        continue

    # 연락처
    phone = row[COL_PHONE].strip()
    kakao = row[COL_KAKAO].strip()
    if phone:
        parent_phone = phone
        contact_type = 'phone'
    elif kakao:
        parent_phone = kakao
        contact_type = 'kakao'
    else:
        parent_phone = ''
        contact_type = 'phone'

    # 학년/재학유형
    grade, school_type = parse_grade_school(row[COL_GRADE])

    # 점수
    rw_score   = parse_score(row[COL_RW])
    math_score = parse_score(row[COL_MATH])
    score_status = 'scored' if rw_score or math_score else 'never_taken'

    # 인입 분류 (6개 필드)
    inq_ch, traffic_src, content_auth, lead_tp, b2b_part, camp_tags = map_lead_fields(row[COL_SRC])

    # 상담 메모
    memo_text = row[COL_MEMO].strip()
    timeline = []
    if memo_text:
        timeline.append({
            'id':         str(uuid.uuid4()),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'raw_memo':   memo_text,
            'published':  False,
        })

    students.append({
        'name':                  name,
        'grade':                 grade,
        'school_type':           school_type,
        'parent_phone':          parent_phone,
        'contact_type':          contact_type,
        'inquiry_date':          parse_korean_date(row[COL_INQ]),
        'inquiry_channel':       inq_ch,
        'traffic_source':        traffic_src,
        'content_author':        content_auth,
        'lead_type':             lead_tp,
        'b2b_partner':           b2b_part,
        'campaign_tags':         camp_tags,
        'parent_timezone':       map_timezone(row[COL_COUNTRY]),
        'previous_rw_score':     rw_score,
        'previous_math_score':   math_score,
        'previous_score_status': score_status,
        'target_score':          None,
        'target_test_date':      None,
        'target_test_date_2':    None,
        'desired_subjects':      'Both',
        'funnel_stage':          'churned',
        'lead_status':           'inactive',
        'matching_stage':        None,
        'churn_tag':             None,
        'churn_type':            None,
        'diagnostic_result_id':  None,
        'consultation_timeline': timeline,
        'ot_datetime':           None,
        'weekly_schedule':       None,
    })

print(f'파싱 완료: {len(students)}명 / 스킵: {skipped}명 (이름 없음)')

# ─── Supabase INSERT ──────────────────────────────────────────────────────────

try:
    import urllib.request
    import urllib.error
except ImportError:
    raise ImportError('urllib을 불러올 수 없습니다.')

ENDPOINT = f'{SUPABASE_URL}/rest/v1/students'
HEADERS = {
    'apikey':        SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

BATCH = 100
total = len(students)
inserted = 0
errors = []

for start in range(0, total, BATCH):
    batch = students[start:start + BATCH]
    payload = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=payload, headers=HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            inserted += len(batch)
            print(f'  [{inserted}/{total}] 삽입 완료')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        errors.append(f'batch {start}-{start+len(batch)}: HTTP {e.code} — {body[:200]}')
        print(f'  [ERROR] batch {start}: {e.code} — {body[:200]}')

print()
print(f'=== 완료: {inserted}명 삽입 / 에러: {len(errors)}건 ===')
if errors:
    print('에러 목록:')
    for e in errors:
        print(f'  {e}')
