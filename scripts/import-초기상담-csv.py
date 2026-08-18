"""
세일즈 상담 관리 - ■■■최초상담_262522-260526.csv → Supabase students 임포트

실행 방법:
  python3 scripts/import-초기상담-csv.py [--dry-run]

- DB에 이미 있는 전화번호/카톡ID는 건너뜀 (중복 방지)
- 이름 없는 행 건너뜀
"""

import csv
import json
import re
import sys
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

DRY_RUN = '--dry-run' in sys.argv

# ─── env ─────────────────────────────────────────────────────────────────────

def load_env():
    env_path = Path(__file__).parent.parent / '.env.local'
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env()
SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey':        SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

# ─── 기존 DB 전화번호 조회 ────────────────────────────────────────────────────

def fetch_existing_phones():
    existing = set()
    page = 0
    while True:
        url = f'{SUPABASE_URL}/rest/v1/students?select=parent_phone&offset={page*1000}&limit=1000'
        req = urllib.request.Request(url, headers={**HEADERS, 'Prefer': 'count=none'})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        if not data:
            break
        for row in data:
            p = (row.get('parent_phone') or '').strip().replace('-', '')
            if p:
                existing.add(p)
        if len(data) < 1000:
            break
        page += 1
    return existing

# ─── 파싱 헬퍼 ───────────────────────────────────────────────────────────────

def parse_korean_date(s):
    s = s.strip()
    if not s:
        return None
    m = re.match(r'(\d+)년\s*(\d+)월\s*(\d+)일', s)
    if m:
        yy, mm, dd = m.groups()
        return f'{2000+int(yy):04d}-{int(mm):02d}-{int(dd):02d}'
    return None

def parse_score(s):
    s = s.strip()
    if not s:
        return None
    m = re.search(r':\s*(\d+)', s)
    if m:
        v = int(m.group(1))
        return v if 200 <= v <= 800 else None
    return None

def parse_grade_school(s):
    s = s.strip()
    if not s or s in ('미확인', '졸업', ''):
        return (s or '미확인', 'other')
    grade_map = {
        'US07': '7th', 'US08': '8th', 'US09': '9th',
        'US10': '10th', 'US11': '11th', 'US12': '12th',
    }
    if s.startswith('[1]'):
        rest = s[3:].strip()
        return (grade_map.get(rest, rest), 'domestic_us')
    elif s.startswith('[2]'):
        return (s[3:].strip(), 'international')
    elif s.startswith('[3]'):
        return (s[3:].strip(), 'korean_special')
    return (s, 'other')

COUNTRY_TIMEZONE = {
    '대한민국': 'Asia/Seoul', '미국': 'America/Los_Angeles',
    '미국/서부': 'America/Los_Angeles', '미국/동부': 'America/New_York',
    '캐나다': 'America/Toronto', '베트남': 'Asia/Ho_Chi_Minh',
    '인도네시아': 'Asia/Jakarta', '중국': 'Asia/Shanghai',
    '말레이시아': 'Asia/Kuala_Lumpur', '싱가포르': 'Asia/Singapore',
    '필리핀': 'Asia/Manila', '태국': 'Asia/Bangkok',
    '호주': 'Australia/Sydney', '일본': 'Asia/Tokyo',
    '영국': 'Europe/London', '파라과이': 'America/Asuncion',
    '아랍에미리트': 'Asia/Dubai', '아르헨티나': 'America/Argentina/Buenos_Aires',
}

def map_timezone(s):
    s = s.strip()
    if s in COUNTRY_TIMEZONE:
        return COUNTRY_TIMEZONE[s]
    for key, tz in COUNTRY_TIMEZONE.items():
        if s.startswith(key):
            return tz
    return None

LEAD_MAP = {
    'A1)카톡방':                   ('카톡', None, None, 'B2C', None, []),
    'A1)카톡방_장현아':             ('카톡', '네이버 블로그', '장현아', 'B2C', None, []),
    'A1)카톡방_이민재':             ('카톡', '네이버 블로그', '이민재', 'B2C', None, []),
    'A1)카톡방_배병윤':             ('카톡', '네이버 블로그', '배병윤', 'B2C', None, []),
    'A1)카톡방_랜딩페이지':         ('카톡', '(구)랜딩페이지', None, 'B2C', None, []),
    'A1)카톡방_인스타그램':         ('카톡', '인스타그램 오가닉', None, 'B2C', None, []),
    'A1)카톡방_김우영':             ('카톡', '네이버 블로그', '김우영', 'B2C', None, []),
    'B1)네이버상담시트':            ('네이버 상담시트', '네이버 블로그', None, 'B2C', None, []),
    'B1)네이버상담시트_이민재':     ('네이버 상담시트', '네이버 블로그', '이민재', 'B2C', None, []),
    'B1)네이버상담시트_김우영':     ('네이버 상담시트', '네이버 블로그', '김우영', 'B2C', None, []),
    'B1)네이버상담시트_장현아':     ('네이버 상담시트', '네이버 블로그', '장현아', 'B2C', None, []),
    'B1)네이버상담시트_배병윤':     ('네이버 상담시트', '네이버 블로그', '배병윤', 'B2C', None, []),
    'B1)네이버 블로그':             (None, '네이버 블로그', None, 'B2C', None, []),
    'C1)고스트 블로그':             (None, '공식 블로그', None, 'B2C', None, []),
    'C1)고스트 블로그(영문)':       (None, '공식 블로그', None, 'B2C', None, []),
    'D1)구글상담시트':              ('구글 상담시트', '(구)랜딩페이지', None, 'B2C', None, []),
    'E1)랜딩페이지':                ('구글 상담시트', '(구)랜딩페이지', None, 'B2C', None, []),
    'F1)인스타그램':                (None, '인스타그램 광고', None, 'B2C', None, []),
    'F1)인스타그램_랜딩페이지':     ('인스타그램 링크', '(구)랜딩페이지', None, 'B2C', None, []),
    'G1)브런치':                    (None, '브런치', None, 'B2C', None, []),
    'H1)책':                        (None, '책', None, 'B2C', None, []),
    'I1)소개':                      (None, '소개/추천', None, 'B2C', None, []),
    'J1)대표전화':                  ('전화', None, None, 'B2C', None, []),
    'K1)B2B_해연':                  (None, 'B2B 파트너', None, 'B2B', '해연', []),
    'K1)B2B_커넥티드에듀':          (None, 'B2B 파트너', None, 'B2B', '커넥티드에듀', []),
    'K1)B2B_부산프레스티지':        (None, 'B2B 파트너', None, 'B2B', '부산프레스티지', []),
    'K1)B2B_인사이트 컨설팅':       (None, 'B2B 파트너', None, 'B2B', '인사이트 컨설팅', []),
    'K1)B2B_신화 유학원':           (None, 'B2B 파트너', None, 'B2B', '신화 유학원', []),
    'K1)B2B_미소남':                (None, 'B2B 파트너', None, 'B2B', '미소남', []),
    'K1)B2B_InArt':                 (None, 'B2B 파트너', None, 'B2B', 'InArt', []),
    'K1)B2B_박정 어학원':           (None, 'B2B 파트너', None, 'B2B', '박정 어학원', []),
    'K1)B2B_솔로몬에듀':            (None, 'B2B 파트너', None, 'B2B', '솔로몬에듀', []),
    'K1)B2B_Admission AG':          (None, 'B2B 파트너', None, 'B2B', 'Admission AG', []),
    'L1)네이버공식카페':            (None, '네이버 카페', None, 'B2C', None, []),
    'M1)레딧':                      (None, '레딧', None, 'B2C', None, []),
    'Z1)기존DB':                    (None, None, None, 'B2C', None, ['기존DB 재활성화']),
}

def map_lead_fields(s):
    s = s.strip()
    if s in LEAD_MAP:
        return LEAD_MAP[s]
    for key, val in LEAD_MAP.items():
        if s.startswith(key):
            return val
    return (None, None, None, 'B2C', None, [])

# ─── 메인 ────────────────────────────────────────────────────────────────────

CSV_PATH = Path(__file__).parent.parent / 'crm' / '세일즈 상담 관리 - ■■■최초상담_262522-260526.csv'

print('기존 DB 전화번호 조회 중...')
existing_phones = fetch_existing_phones()
print(f'  DB 기존 연락처: {len(existing_phones)}개')

with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    raw_rows = list(reader)

students = []
skipped_no_name = 0
skipped_duplicate = 0
skipped_no_contact = 0

for row in raw_rows:
    name = row.get('학생 이름\n(한글/영어)', '').strip()
    if not name:
        skipped_no_name += 1
        continue

    phone_raw = row.get('학부모\n전화번호', '').strip()
    kakao_raw = row.get('학부모\n카톡ID', '').strip()

    phone_clean = phone_raw.replace('-', '')
    kakao_clean = kakao_raw.strip()

    if phone_clean:
        contact = phone_clean
        contact_type = 'phone'
    elif kakao_clean:
        contact = kakao_clean
        contact_type = 'kakao'
    else:
        contact = ''
        contact_type = 'phone'
        skipped_no_contact += 1

    # 중복 체크
    if contact and contact in existing_phones:
        skipped_duplicate += 1
        continue

    grade, school_type = parse_grade_school(row.get('학생\n학년', ''))
    rw_score   = parse_score(row.get('RW점수\n\n00년00월 : 000점', ''))
    math_score = parse_score(row.get('MATH점수\n\n00년00월 : 000점', ''))
    inq_ch, traffic_src, content_auth, lead_tp, b2b_part, camp_tags = map_lead_fields(
        row.get('인입\n루트', '')
    )

    memo_text = row.get('고객 정보', '').strip()
    timeline = []
    if memo_text:
        inq_date_str = parse_korean_date(row.get('상담일', '') or row.get('인입일', ''))
        created_at = (
            datetime.fromisoformat(inq_date_str).replace(tzinfo=timezone.utc).isoformat()
            if inq_date_str else datetime.now(timezone.utc).isoformat()
        )
        timeline.append({
            'id':         str(uuid.uuid4()),
            'created_at': created_at,
            'raw_memo':   memo_text,
            'published':  False,
        })

    students.append({
        'name':                  name,
        'grade':                 grade,
        'school_type':           school_type,
        'parent_phone':          contact,
        'contact_type':          contact_type,
        'inquiry_date':          parse_korean_date(row.get('인입일', '')),
        'inquiry_channel':       inq_ch,
        'traffic_source':        traffic_src,
        'content_author':        content_auth,
        'lead_type':             lead_tp,
        'b2b_partner':           b2b_part,
        'campaign_tags':         camp_tags,
        'parent_timezone':       map_timezone(row.get('학부모\n거주\n국가/도시', '')),
        'previous_rw_score':     rw_score,
        'previous_math_score':   math_score,
        'previous_score_status': 'scored' if (rw_score or math_score) else 'never_taken',
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

    if contact:
        existing_phones.add(contact)  # 같은 번호가 CSV에 중복 있을 경우 방지

print(f'\n파싱 결과:')
print(f'  추가 예정:       {len(students)}명')
print(f'  중복 (이미 DB):  {skipped_duplicate}명')
print(f'  이름 없음:       {skipped_no_name}명')
print(f'  연락처 없음:     {skipped_no_contact}명 (추가는 됨)')

if DRY_RUN:
    print('\n[DRY RUN] 실제 삽입 없이 종료.')
    sys.exit(0)

# ─── Supabase INSERT ──────────────────────────────────────────────────────────

ENDPOINT = f'{SUPABASE_URL}/rest/v1/students'
POST_HEADERS = {**HEADERS, 'Prefer': 'return=minimal'}

BATCH = 100
total = len(students)
inserted = 0
errors = []

print(f'\n{total}명 삽입 중...')
for start in range(0, total, BATCH):
    batch = students[start:start + BATCH]
    payload = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=payload, headers=POST_HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            inserted += len(batch)
            print(f'  [{inserted}/{total}] 완료')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        errors.append(f'batch {start}: HTTP {e.code} — {body[:300]}')
        print(f'  [ERROR] batch {start}: {e.code}')

print(f'\n=== 완료: {inserted}명 삽입 / 에러: {len(errors)}건 ===')
for e in errors:
    print(f'  {e}')
