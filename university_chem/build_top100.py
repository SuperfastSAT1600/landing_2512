"""QS 2027 Top 100 universities JSON 생성 스크립트.
Tier1 28개 + 신규 72개 = 100개. rankSort 순 정렬 후 data/universities_top100.json 출력.
"""
import json, pathlib

TIER1_PATH = pathlib.Path("data/universities_tier1.json")
OUT_PATH   = pathlib.Path("data/universities_top100.json")

tier1 = json.loads(TIER1_PATH.read_text(encoding="utf-8"))

# rankSort를 tier1 항목에 추가 (없으면 rank 문자열에서 파싱)
for u in tier1:
    if "rankSort" not in u:
        try:
            u["rankSort"] = int(str(u["rank"]).replace("=",""))
        except:
            u["rankSort"] = 999

# 신규 72개교 (QS 2027 기준, Tier1에 없는 학교들)
NEW_UNIS = [
    # ── 6-10위 ────────────────────────────────────────────────────────────
    {"name":"Princeton University","kr":"프린스턴 대학교","rank":"6","rankSort":6,
     "country":"USA","accent":"#FF6900","tag":"지성과 전통의 아이비리그 정수",
     "traits":{"전통과격식":96,"논리력":95,"전략적사고":93}},
    {"name":"University of Edinburgh","kr":"에든버러 대학교","rank":"10","rankSort":10,
     "country":"UK","accent":"#500778","tag":"스코틀랜드 계몽주의의 요람",
     "traits":{"전통과격식":93,"자유로운사고":88,"논리력":87}},
    # ── 18-27위 ───────────────────────────────────────────────────────────
    {"name":"University of Melbourne","kr":"멜버른 대학교","rank":"18","rankSort":18,
     "country":"Australia","accent":"#003087","tag":"남반구 최고의 종합 연구 거점",
     "traits":{"전략적사고":90,"논리력":88,"자유로운사고":85}},
    {"name":"University of Sydney","kr":"시드니 대학교","rank":"21","rankSort":21,
     "country":"Australia","accent":"#990000","tag":"오세아니아 지성의 심장",
     "traits":{"자유로운사고":90,"사회적감각":87,"전통과격식":84}},
    {"name":"Australian National University","kr":"호주국립대학교","rank":"23","rankSort":23,
     "country":"Australia","accent":"#003366","tag":"퍼블릭 정책과 과학의 수도",
     "traits":{"전략적사고":91,"논리력":89,"사회적감각":82}},
    {"name":"University of Chicago","kr":"시카고 대학교","rank":"24","rankSort":24,
     "country":"USA","accent":"#800000","tag":"분석적 지성의 미국 심장부",
     "traits":{"논리력":97,"전략적사고":95,"전통과격식":90}},
    {"name":"Fudan University","kr":"푸단대학교","rank":"26","rankSort":26,
     "country":"China","accent":"#990000","tag":"상하이 인문·사회과학의 중심",
     "traits":{"전통과격식":91,"사회적감각":88,"전략적사고":86}},
    {"name":"Princeton University","kr":"프린스턴 대학교","rank":"6","rankSort":6,
     "country":"USA","accent":"#FF6900","tag":"지성과 전통의 아이비리그 정수",
     "traits":{"전통과격식":96,"논리력":95,"전략적사고":93}},
    # ── 30-41위 ───────────────────────────────────────────────────────────
    {"name":"Monash University","kr":"모나시 대학교","rank":"30","rankSort":30,
     "country":"Australia","accent":"#006452","tag":"글로벌 임팩트를 추구하는 연구대학",
     "traits":{"도전정신":88,"사회적감각":87,"논리력":84}},
    {"name":"King's College London","kr":"킹스 칼리지 런던","rank":"31","rankSort":31,
     "country":"UK","accent":"#9D0136","tag":"런던 중심의 의학·법학·인문 명문",
     "traits":{"전통과격식":92,"사회적감각":88,"표현력":85}},
    {"name":"University of Manchester","kr":"맨체스터 대학교","rank":"32","rankSort":32,
     "country":"UK","accent":"#660099","tag":"산업혁명의 도시가 낳은 연구 강국",
     "traits":{"도전정신":90,"논리력":87,"자유로운사고":83}},
    {"name":"University of Queensland","kr":"퀸즐랜드 대학교","rank":"33","rankSort":33,
     "country":"Australia","accent":"#51247A","tag":"혁신과 지속가능성의 연구 허브",
     "traits":{"도전정신":87,"집중력":85,"사회적감각":83}},
    {"name":"PSL – Paris Sciences et Lettres","kr":"파리 PSL 대학교","rank":"34","rankSort":34,
     "country":"France","accent":"#003189","tag":"파리 최고 그랑제콜·연구소 연합",
     "traits":{"자유로운사고":94,"논리력":93,"표현력":88}},
    {"name":"Delft University of Technology","kr":"델프트 공과대학교","rank":"35","rankSort":35,
     "country":"Netherlands","accent":"#00A6D6","tag":"유럽 최고의 공학·디자인 요새",
     "traits":{"논리력":95,"집중력":93,"도전정신":86}},
    {"name":"Shanghai Jiao Tong University","kr":"상하이교통대학교","rank":"37","rankSort":37,
     "country":"China","accent":"#990000","tag":"중국 공학·의학의 최전선",
     "traits":{"논리력":93,"집중력":91,"도전정신":87}},
    {"name":"Duke University","kr":"듀크 대학교","rank":"39","rankSort":39,
     "country":"USA","accent":"#003087","tag":"미국 남부의 의학·법학·정책 명문",
     "traits":{"전략적사고":92,"사회적감각":90,"논리력":88}},
    {"name":"Northwestern University","kr":"노스웨스턴 대학교","rank":"40","rankSort":40,
     "country":"USA","accent":"#4E2A84","tag":"언론·의학·경영의 트리플 명문",
     "traits":{"표현력":91,"전략적사고":90,"사회적감각":88}},
    {"name":"University of British Columbia","kr":"브리티시컬럼비아 대학교","rank":"41","rankSort":41,
     "country":"Canada","accent":"#002145","tag":"태평양 연안 최고의 연구대학",
     "traits":{"자유로운사고":89,"사회적감각":87,"논리력":85}},
    # ── 43-50위 ───────────────────────────────────────────────────────────
    {"name":"KAIST","kr":"한국과학기술원","rank":"43","rankSort":43,
     "country":"Korea","accent":"#002F6C","tag":"대한민국 이공계의 자부심",
     "traits":{"논리력":96,"집중력":95,"도전정신":92}},
    {"name":"Institut Polytechnique de Paris","kr":"파리 이공대학교","rank":"44","rankSort":44,
     "country":"France","accent":"#003189","tag":"에콜 폴리테크니크를 품은 이공계 연합",
     "traits":{"논리력":95,"집중력":94,"전략적사고":88}},
    {"name":"Korea University","kr":"고려대학교","rank":"45","rankSort":45,
     "country":"Korea","accent":"#841B2D","tag":"민족대학의 자존심과 글로벌 비전",
     "traits":{"전통과격식":91,"도전정신":88,"사회적감각":86}},
    {"name":"University of California, Los Angeles","kr":"UCLA","rank":"46","rankSort":46,
     "country":"USA","accent":"#2D68C4","tag":"서부 캘리포니아의 종합 드림스쿨",
     "traits":{"자유로운사고":91,"사회적감각":90,"도전정신":88}},
    {"name":"National Taiwan University","kr":"국립대만대학교","rank":"47","rankSort":47,
     "country":"Taiwan","accent":"#002D62","tag":"동아시아 민주주의와 학문의 정수",
     "traits":{"논리력":90,"전통과격식":87,"집중력":85}},
    {"name":"Carnegie Mellon University","kr":"카네기멜런 대학교","rank":"48","rankSort":48,
     "country":"USA","accent":"#C41230","tag":"AI·CS의 글로벌 메카",
     "traits":{"논리력":97,"집중력":96,"도전정신":93}},
    {"name":"Hong Kong Polytechnic University","kr":"홍콩이공대학교","rank":"49","rankSort":49,
     "country":"Hong Kong","accent":"#96002D","tag":"실용 기술과 혁신의 홍콩 거점",
     "traits":{"논리력":89,"도전정신":88,"사회적감각":85}},
    {"name":"University of Michigan","kr":"미시건 대학교","rank":"50","rankSort":50,
     "country":"USA","accent":"#00274C","tag":"미국 중서부 최대 종합 연구대학",
     "traits":{"전략적사고":91,"자유로운사고":89,"사회적감각":88}},
    # ── 51-60위 ───────────────────────────────────────────────────────────
    {"name":"New York University","kr":"뉴욕 대학교","rank":"51","rankSort":51,
     "country":"USA","accent":"#57068C","tag":"세계의 수도 뉴욕이 품은 글로벌 대학",
     "traits":{"사회적감각":93,"표현력":91,"자유로운사고":88}},
    {"name":"University of Bristol","kr":"브리스톨 대학교","rank":"52","rankSort":52,
     "country":"UK","accent":"#003366","tag":"영국 남서부 연구·예술의 중심지",
     "traits":{"자유로운사고":88,"논리력":86,"표현력":84}},
    {"name":"KU Leuven","kr":"루벤 가톨릭 대학교","rank":"53","rankSort":53,
     "country":"Belgium","accent":"#003D6B","tag":"유럽 최고(最古) 가톨릭 대학의 학문 깊이",
     "traits":{"전통과격식":93,"논리력":89,"전략적사고":86}},
    {"name":"Kyoto University","kr":"교토 대학교","rank":"54","rankSort":54,
     "country":"Japan","accent":"#1B1464","tag":"자유로운 탐구 정신, 일본 학문의 또 다른 극",
     "traits":{"자유로운사고":94,"논리력":92,"집중력":88}},
    {"name":"University of Amsterdam","kr":"암스테르담 대학교","rank":"55","rankSort":55,
     "country":"Netherlands","accent":"#BC0031","tag":"관용과 개방성의 유럽 학문 허브",
     "traits":{"자유로운사고":92,"사회적감각":90,"표현력":86}},
    {"name":"Ludwig-Maximilians-Universität München","kr":"루트비히막시밀리안 대학교 뮌헨","rank":"56","rankSort":56,
     "country":"Germany","accent":"#009440","tag":"독일 남부 학문의 무게 중심",
     "traits":{"논리력":91,"전통과격식":89,"전략적사고":86}},
    {"name":"London School of Economics","kr":"런던 정경대학교","rank":"57","rankSort":57,
     "country":"UK","accent":"#D4002A","tag":"세계 정치경제의 싱크탱크",
     "traits":{"전략적사고":95,"사회적감각":94,"논리력":90}},
    {"name":"Brown University","kr":"브라운 대학교","rank":"58","rankSort":58,
     "country":"USA","accent":"#4E3629","tag":"자유로운 커리큘럼의 아이비리그",
     "traits":{"자유로운사고":96,"표현력":90,"사회적감각":86}},
    {"name":"University of Auckland","kr":"오클랜드 대학교","rank":"59","rankSort":59,
     "country":"New Zealand","accent":"#00467F","tag":"태평양의 관문, 뉴질랜드 최고 명문",
     "traits":{"자유로운사고":87,"사회적감각":85,"논리력":83}},
    {"name":"University of Warwick","kr":"워릭 대학교","rank":"60","rankSort":60,
     "country":"UK","accent":"#5B2C8D","tag":"영국 신흥 연구대학의 아이콘",
     "traits":{"도전정신":89,"논리력":88,"전략적사고":85}},
    # ── 61-70위 ───────────────────────────────────────────────────────────
    {"name":"University of Birmingham","kr":"버밍엄 대학교","rank":"61","rankSort":61,
     "country":"UK","accent":"#002D62","tag":"레드브릭 대학의 선구자",
     "traits":{"전통과격식":88,"논리력":86,"사회적감각":84}},
    {"name":"City University of Hong Kong","kr":"홍콩시티대학교","rank":"62","rankSort":62,
     "country":"Hong Kong","accent":"#006530","tag":"홍콩 혁신·비즈니스의 역동적 거점",
     "traits":{"도전정신":88,"사회적감각":87,"논리력":84}},
    {"name":"University of Zurich","kr":"취리히 대학교","rank":"63","rankSort":63,
     "country":"Switzerland","accent":"#003C77","tag":"스위스 최대 종합대학의 다학제적 심도",
     "traits":{"논리력":90,"전략적사고":88,"전통과격식":86}},
    {"name":"Georgia Institute of Technology","kr":"조지아 공과대학교","rank":"64","rankSort":64,
     "country":"USA","accent":"#B3A369","tag":"미국 공대 탑3의 실전형 엔지니어 산실",
     "traits":{"논리력":95,"집중력":93,"도전정신":90}},
    {"name":"KAIST Graduate School","kr":"POSTECH (포항공과대학교)","rank":"65","rankSort":65,
     "country":"Korea","accent":"#003D78","tag":"한국 이공계 정예의 소수정예 요새",
     "traits":{"논리력":96,"집중력":95,"도전정신":90}},
    {"name":"Durham University","kr":"더럼 대학교","rank":"66","rankSort":66,
     "country":"UK","accent":"#7D2247","tag":"옥스브리지 분위기의 영국 전통 명문",
     "traits":{"전통과격식":93,"논리력":87,"표현력":83}},
    {"name":"Lund University","kr":"룬드 대학교","rank":"67","rankSort":67,
     "country":"Sweden","accent":"#875E9F","tag":"스칸디나비아 최대 종합대학의 개방성",
     "traits":{"자유로운사고":91,"사회적감각":88,"논리력":85}},
    {"name":"The University of Texas at Austin","kr":"텍사스 대학교 오스틴","rank":"68","rankSort":68,
     "country":"USA","accent":"#BF5700","tag":"텍사스 크기만큼 큰 야망의 공립 명문",
     "traits":{"도전정신":89,"사회적감각":88,"논리력":86}},
    {"name":"KTH Royal Institute of Technology","kr":"왕립 공과대학교","rank":"69","rankSort":69,
     "country":"Sweden","accent":"#003882","tag":"스웨덴 혁신 경제를 이끄는 공학 심장",
     "traits":{"논리력":93,"집중력":91,"도전정신":88}},
    {"name":"University of Glasgow","kr":"글래스고 대학교","rank":"70","rankSort":70,
     "country":"UK","accent":"#003865","tag":"스코틀랜드 제2의 지성, 600년 역사",
     "traits":{"전통과격식":92,"논리력":87,"자유로운사고":84}},
    # ── 71-80위 ───────────────────────────────────────────────────────────
    {"name":"Trinity College Dublin","kr":"더블린 트리니티 칼리지","rank":"71","rankSort":71,
     "country":"Ireland","accent":"#1D4F91","tag":"아일랜드 학문의 영원한 심장",
     "traits":{"전통과격식":94,"표현력":89,"자유로운사고":87}},
    {"name":"Sorbonne Université","kr":"소르본 대학교","rank":"72","rankSort":72,
     "country":"France","accent":"#003580","tag":"유럽 인문학 8세기의 정신적 고향",
     "traits":{"전통과격식":96,"표현력":93,"자유로운사고":91}},
    {"name":"University of Illinois Urbana-Champaign","kr":"일리노이 대학교 어배너-섐페인","rank":"73","rankSort":73,
     "country":"USA","accent":"#13294B","tag":"컴퓨터과학의 숨은 거인",
     "traits":{"논리력":93,"집중력":91,"도전정신":87}},
    {"name":"Université Paris-Saclay","kr":"파리 사클레 대학교","rank":"74","rankSort":74,
     "country":"France","accent":"#003189","tag":"프랑스 이공계 엘리트의 집결지",
     "traits":{"논리력":94,"집중력":92,"전략적사고":87}},
    {"name":"University of California, San Diego","kr":"UC 샌디에이고","rank":"75","rankSort":75,
     "country":"USA","accent":"#00629B","tag":"생명과학과 해양연구의 캘리포니아 보석",
     "traits":{"논리력":92,"집중력":90,"도전정신":87}},
    {"name":"Nanjing University","kr":"난징대학교","rank":"76","rankSort":76,
     "country":"China","accent":"#5B0066","tag":"중국 인문·자연과학의 균형 잡힌 명문",
     "traits":{"전통과격식":90,"논리력":88,"전략적사고":85}},
    {"name":"University of Leeds","kr":"리즈 대학교","rank":"77","rankSort":77,
     "country":"UK","accent":"#003865","tag":"영국 북부 산업·연구 도시의 지성",
     "traits":{"도전정신":87,"사회적감각":85,"논리력":83}},
    {"name":"Heidelberg University","kr":"하이델베르크 대학교","rank":"78","rankSort":78,
     "country":"Germany","accent":"#C1272D","tag":"독일 최古 대학의 철학·의학 전통",
     "traits":{"전통과격식":95,"논리력":89,"자유로운사고":86}},
    {"name":"University of Western Australia","kr":"서호주 대학교","rank":"79","rankSort":79,
     "country":"Australia","accent":"#003087","tag":"인도양 연안 자원·생명과학의 거점",
     "traits":{"논리력":86,"집중력":84,"사회적감각":82}},
    {"name":"Politecnico di Milano","kr":"밀라노 공과대학교","rank":"80","rankSort":80,
     "country":"Italy","accent":"#FECE00","tag":"유럽 디자인·건축·공학의 이탈리아 자존심",
     "traits":{"집중력":92,"논리력":91,"표현력":88}},
    # ── 81-90위 ───────────────────────────────────────────────────────────
    {"name":"University of Adelaide","kr":"애들레이드 대학교","rank":"81","rankSort":81,
     "country":"Australia","accent":"#005695","tag":"호주 남부 연구·와인의 도시 지성",
     "traits":{"논리력":85,"자유로운사고":83,"집중력":82}},
    {"name":"Pennsylvania State University","kr":"펜실베이니아 주립대학교","rank":"82","rankSort":82,
     "country":"USA","accent":"#003087","tag":"미국 최대급 공립 종합대학의 저력",
     "traits":{"논리력":88,"사회적감각":86,"도전정신":84}},
    {"name":"University of Washington","kr":"워싱턴 대학교","rank":"83","rankSort":83,
     "country":"USA","accent":"#4B2E83","tag":"시애틀 테크 생태계의 학문적 심장",
     "traits":{"도전정신":90,"논리력":89,"사회적감각":86}},
    {"name":"University of Sheffield","kr":"셰필드 대학교","rank":"84","rankSort":84,
     "country":"UK","accent":"#0D1F2D","tag":"영국 공학·도시설계의 든든한 거점",
     "traits":{"논리력":87,"집중력":85,"도전정신":83}},
    {"name":"Uppsala University","kr":"웁살라 대학교","rank":"85","rankSort":85,
     "country":"Sweden","accent":"#990000","tag":"북유럽 최古 대학의 자유로운 학풍",
     "traits":{"전통과격식":92,"자유로운사고":89,"논리력":86}},
    {"name":"Boston University","kr":"보스턴 대학교","rank":"86","rankSort":86,
     "country":"USA","accent":"#CC0000","tag":"보스턴 지성의 다양성과 역동성",
     "traits":{"사회적감각":89,"자유로운사고":87,"도전정신":85}},
    {"name":"Osaka University","kr":"오사카 대학교","rank":"87","rankSort":87,
     "country":"Japan","accent":"#0065AA","tag":"일본 서부 과학기술과 의학의 핵심",
     "traits":{"논리력":91,"집중력":89,"전략적사고":85}},
    {"name":"Freie Universität Berlin","kr":"베를린 자유대학교","rank":"88","rankSort":88,
     "country":"Germany","accent":"#1D6F42","tag":"자유와 민주주의 정신으로 세운 베를린의 지성",
     "traits":{"자유로운사고":93,"표현력":88,"사회적감각":86}},
    {"name":"University of Copenhagen","kr":"코펜하겐 대학교","rank":"89","rankSort":89,
     "country":"Denmark","accent":"#901A1E","tag":"덴마크 복지국가를 이끄는 연구 중심",
     "traits":{"사회적감각":90,"전략적사고":88,"논리력":86}},
    {"name":"University of Nottingham","kr":"노팅엄 대학교","rank":"90","rankSort":90,
     "country":"UK","accent":"#005CAB","tag":"글로벌 캠퍼스를 보유한 영국 국제화 선두",
     "traits":{"사회적감각":88,"자유로운사고":86,"논리력":84}},
    # ── 91-100위 ──────────────────────────────────────────────────────────
    {"name":"University of Alberta","kr":"앨버타 대학교","rank":"91","rankSort":91,
     "country":"Canada","accent":"#007C41","tag":"캐나다 대초원의 에너지·환경 연구 거점",
     "traits":{"논리력":88,"집중력":86,"도전정신":83}},
    {"name":"Institute of Science Tokyo","kr":"도쿄 과학대학교","rank":"92","rankSort":92,
     "country":"Japan","accent":"#0F3D87","tag":"일본 이공계 엘리트의 또 다른 요새",
     "traits":{"논리력":92,"집중력":91,"도전정신":87}},
    {"name":"University of Technology Sydney","kr":"시드니 공과대학교","rank":"93","rankSort":93,
     "country":"Australia","accent":"#00A3E0","tag":"실용 기술 혁신의 도시형 대학",
     "traits":{"도전정신":89,"논리력":87,"사회적감각":84}},
    {"name":"University of Wisconsin–Madison","kr":"위스콘신대학교 매디슨","rank":"94","rankSort":94,
     "country":"USA","accent":"#C5050C","tag":"미국 농업·의학·인문 공립 명문",
     "traits":{"자유로운사고":88,"논리력":87,"사회적감각":85}},
    {"name":"Ohio State University","kr":"오하이오 주립대학교","rank":"95","rankSort":95,
     "country":"USA","accent":"#BB0000","tag":"미국 최대급 공립대학의 규모와 저력",
     "traits":{"사회적감각":87,"도전정신":86,"논리력":84}},
    {"name":"University of California, Santa Barbara","kr":"UC 샌타바버라","rank":"96","rankSort":96,
     "country":"USA","accent":"#003660","tag":"노벨상을 쏟아내는 태평양 연안 이공계 명문",
     "traits":{"논리력":91,"집중력":90,"자유로운사고":85}},
    {"name":"Universität Berlin (TU Berlin)","kr":"베를린 공과대학교","rank":"97","rankSort":97,
     "country":"Germany","accent":"#C10021","tag":"독일 수도의 공학·건축 혁신 심장",
     "traits":{"논리력":92,"집중력":90,"도전정신":87}},
    {"name":"University of Malaya","kr":"말라야 대학교","rank":"98","rankSort":98,
     "country":"Malaysia","accent":"#003087","tag":"동남아 최고 명문의 다문화 학문 용광로",
     "traits":{"사회적감각":88,"논리력":85,"전통과격식":82}},
    {"name":"University of Liverpool","kr":"리버풀 대학교","rank":"99","rankSort":99,
     "country":"UK","accent":"#00539B","tag":"비틀즈의 도시가 품은 연구·의학 명문",
     "traits":{"전통과격식":89,"논리력":86,"사회적감각":83}},
    {"name":"University of São Paulo","kr":"상파울루 대학교","rank":"100","rankSort":100,
     "country":"Brazil","accent":"#004A80","tag":"라틴아메리카 최고 연구대학의 자부심",
     "traits":{"논리력":87,"사회적감각":86,"자유로운사고":83}},
]

# Princeton 중복 제거 (실수로 2번 넣었음)
seen = set()
deduped = []
for u in NEW_UNIS:
    key = (u["name"], u["rankSort"])
    if key not in seen:
        seen.add(key)
        deduped.append(u)
NEW_UNIS = deduped

# Tier1 rankSort 집합
tier1_ranks = {u["rankSort"] for u in tier1}

# 신규 중 tier1과 rankSort 충돌하는 것 제거
new_filtered = [u for u in NEW_UNIS if u["rankSort"] not in tier1_ranks]

combined = tier1 + new_filtered
combined.sort(key=lambda x: x["rankSort"])

# 최종 확인
print(f"Tier1: {len(tier1)} | New: {len(new_filtered)} | Total: {len(combined)}")
ranks = [u["rankSort"] for u in combined]
print(f"Rank range: {min(ranks)} – {max(ranks)}")
duplicates = [r for r in ranks if ranks.count(r) > 1]
if duplicates:
    print(f"WARNING: Duplicate ranks: {set(duplicates)}")
else:
    print("No duplicate ranks")

TRAIT_OVERRIDES = {
    # ─── 금(金) dominant ───────────────────────────────────────────────────────
    "Massachusetts Institute of Technology":
        {"논리력":98,"공학혁신":97,"수리과학":92,"도전정신":88,"전략적사고":80},
    "California Institute of Technology":
        {"수리과학":99,"논리력":99,"집중력":97,"철학적깊이":80,"전통과격식":68},
    "ETH Zurich":
        {"공학혁신":98,"논리력":97,"수리과학":93,"전통과격식":82,"실용주의":80},
    "University of Cambridge":
        {"논리력":97,"집중력":94,"전통과격식":90,"수리과학":88,"철학적깊이":84},
    "Delft University of Technology":
        {"공학혁신":95,"논리력":92,"수리과학":88,"실용주의":84,"집중력":88},
    "Carnegie Mellon University":
        {"논리력":97,"공학혁신":95,"기업가정신":88,"집중력":93,"수리과학":90},
    "Institut Polytechnique de Paris":
        {"수리과학":95,"논리력":94,"공학혁신":90,"전략적사고":86,"집중력":88},
    "National Taiwan University":
        {"논리력":90,"전통과격식":85,"집중력":88,"공학혁신":86,"수리과학":82},
    "Shanghai Jiao Tong University":
        {"공학혁신":93,"논리력":91,"도전정신":86,"집중력":87,"수리과학":88},
    "Johns Hopkins University":
        {"집중력":98,"수리과학":90,"논리력":93,"도전정신":86,"공학혁신":88},
    "Technical University of Munich":
        {"공학혁신":97,"집중력":94,"전통과격식":88,"논리력":93,"수리과학":85},
    "University of Illinois Urbana-Champaign":
        {"논리력":93,"공학혁신":90,"집중력":88,"수리과학":86,"기업가정신":82},
    "University of California, San Diego":
        {"논리력":91,"수리과학":88,"집중력":87,"공학혁신":85,"자유로운사고":78},
    "University of California, Santa Barbara":
        {"수리과학":91,"논리력":89,"집중력":85,"자유로운사고":80,"공학혁신":83},
    "Universität Berlin (TU Berlin)":
        {"공학혁신":92,"논리력":89,"집중력":87,"도전정신":84,"수리과학":83},
    "Institute of Science Tokyo":
        {"논리력":91,"집중력":90,"수리과학":87,"공학혁신":85,"전통과격식":78},
    "Osaka University":
        {"논리력":89,"집중력":88,"수리과학":84,"전략적사고":82,"공학혁신":80},
    "Université Paris-Saclay":
        {"수리과학":94,"논리력":91,"공학혁신":88,"전략적사고":84,"집중력":87},
    "Hong Kong Polytechnic University":
        {"공학혁신":88,"논리력":86,"도전정신":85,"집중력":83,"글로벌영향력":80},
    "Politecnico di Milano":
        {"공학혁신":92,"집중력":88,"논리력":87,"표현력":82,"수리과학":78},
    "Tsinghua University":
        {"집중력":97,"논리력":94,"수리과학":90,"도전정신":88,"공학혁신":86},
    "KAIST":
        {"논리력":96,"집중력":93,"공학혁신":91,"수리과학":88,"도전정신":85},
    "KTH Royal Institute of Technology":
        {"공학혁신":93,"집중력":89,"논리력":87,"수리과학":84,"전략적사고":80},
    "University of Alberta":
        {"논리력":88,"집중력":84,"공학혁신":82,"수리과학":80,"자유로운사고":76},
    # ─── 화(火) dominant ───────────────────────────────────────────────────────
    "Stanford University":
        {"도전정신":97,"기업가정신":95,"자유로운사고":88,"논리력":84,"글로벌영향력":90},
    "Imperial College London":
        {"도전정신":92,"논리력":96,"집중력":90,"글로벌영향력":85,"사회적감각":80},
    "National University of Singapore":
        {"도전정신":90,"전략적사고":88,"글로벌영향력":86,"사회적감각":84,"국제정치감각":80},
    "University of California, Berkeley":
        {"도전정신":96,"자유로운사고":95,"사회적감각":91,"글로벌영향력":87,"기업가정신":85},
    "Korea University":
        {"도전정신":88,"사회적감각":86,"전통과격식":87,"글로벌영향력":82,"실용주의":79},
    "KAIST Graduate School":
        {"도전정신":90,"공학혁신":93,"논리력":92,"집중력":88,"글로벌영향력":78},
    "Monash University":
        {"도전정신":87,"사회적감각":86,"논리력":83,"글로벌영향력":82,"실용주의":80},
    "University of Manchester":
        {"도전정신":90,"논리력":87,"자유로운사고":83,"기업가정신":84,"사회적감각":82},
    "University of Queensland":
        {"도전정신":87,"논리력":84,"사회적감각":83,"글로벌영향력":80,"공학혁신":79},
    "The University of Texas at Austin":
        {"도전정신":89,"사회적감각":85,"논리력":84,"기업가정신":82,"글로벌영향력":80},
    "City University of Hong Kong":
        {"도전정신":88,"기업가정신":87,"사회적감각":84,"글로벌영향력":82,"논리력":79},
    "Ohio State University":
        {"도전정신":86,"사회적감각":85,"자유로운사고":82,"실용주의":80,"지역사회기여":78},
    "Northwestern University":
        {"사회적감각":92,"표현력":88,"전략적사고":86,"도전정신":84,"글로벌영향력":82},
    "University of Technology Sydney":
        {"도전정신":89,"기업가정신":87,"공학혁신":85,"사회적감각":82,"글로벌영향력":80},
    "University of Washington":
        {"도전정신":88,"사회적감각":85,"논리력":84,"전략적사고":82,"글로벌영향력":80},
    "Georgia Institute of Technology":
        {"도전정신":90,"공학혁신":92,"논리력":89,"집중력":85,"기업가정신":80},
    "UNSW Sydney":
        {"도전정신":91,"공학혁신":87,"논리력":86,"사회적감각":83,"글로벌영향력":80},
    "McGill University":
        {"도전정신":82,"전통과격식":88,"논리력":87,"글로벌영향력":82,"자유로운사고":83},
    "University of São Paulo":
        {"도전정신":84,"사회적감각":85,"글로벌영향력":80,"자유로운사고":78,"지역사회기여":82},
    "Nanyang Technological University":
        {"도전정신":93,"공학혁신":90,"논리력":87,"집중력":85,"글로벌영향력":82},
    "University of Melbourne":
        {"도전정신":87,"전략적사고":84,"사회적감각":85,"논리력":82,"글로벌영향력":80},
    "Pennsylvania State University":
        {"도전정신":84,"사회적감각":83,"논리력":86,"실용주의":80,"지역사회기여":78},
    # ─── 토(土) dominant ───────────────────────────────────────────────────────
    "University of Oxford":
        {"전통과격식":99,"실용주의":87,"논리력":89,"철학적깊이":90,"표현력":85},
    "Harvard University":
        {"전통과격식":98,"사회적감각":92,"논리력":90,"실용주의":85,"전략적사고":88},
    "Seoul National University":
        {"전통과격식":95,"집중력":93,"논리력":91,"지역사회기여":85,"실용주의":82},
    "The University of Tokyo":
        {"전통과격식":97,"집중력":93,"논리력":90,"실용주의":86,"수리과학":82},
    "Fudan University":
        {"전통과격식":91,"사회적감각":85,"전략적사고":83,"실용주의":80,"논리력":82},
    "King's College London":
        {"전통과격식":91,"사회적감각":87,"표현력":84,"논리력":82,"실용주의":80},
    "Ludwig-Maximilians-Universität München":
        {"전통과격식":89,"논리력":88,"전략적사고":84,"실용주의":82,"철학적깊이":85},
    "University of Glasgow":
        {"전통과격식":91,"논리력":85,"자유로운사고":82,"실용주의":80,"지역사회기여":82},
    "Trinity College Dublin":
        {"전통과격식":93,"표현력":87,"자유로운사고":84,"실용주의":79,"철학적깊이":82},
    "Nanjing University":
        {"전통과격식":89,"논리력":85,"전략적사고":82,"실용주의":80,"지역사회기여":80},
    "Heidelberg University":
        {"전통과격식":94,"논리력":87,"자유로운사고":84,"철학적깊이":88,"실용주의":77},
    "University of Malaya":
        {"전통과격식":86,"사회적감각":84,"논리력":82,"글로벌영향력":78,"지역사회기여":83},
    "University of Liverpool":
        {"전통과격식":88,"논리력":83,"사회적감각":82,"실용주의":80,"지역사회기여":80},
    "University of Birmingham":
        {"전통과격식":86,"논리력":83,"도전정신":80,"실용주의":80,"지역사회기여":82},
    "University of Sheffield":
        {"전통과격식":84,"공학혁신":85,"논리력":84,"실용주의":82,"지역사회기여":80},
    "University of Adelaide":
        {"전통과격식":83,"논리력":82,"자유로운사고":80,"실용주의":81,"지역사회기여":82},
    "Peking University":
        {"전통과격식":95,"논리력":90,"표현력":88,"철학적깊이":82,"자유로운사고":85},
    # ─── 목(木) dominant ───────────────────────────────────────────────────────
    "Yale University":
        {"표현력":97,"자유로운사고":95,"철학적깊이":85,"전통과격식":82,"예술적감성":88},
    "University College London":
        {"자유로운사고":95,"다양성포용":93,"사회적감각":88,"글로벌영향력":84,"표현력":87},
    "Columbia University":
        {"표현력":96,"사회적감각":94,"자유로운사고":90,"전략적사고":87,"국제정치감각":82},
    "Cornell University":
        {"자유로운사고":95,"다양성포용":90,"도전정신":88,"공학혁신":82,"사회적감각":85},
    "Yonsei University":
        {"표현력":93,"자유로운사고":92,"전통과격식":85,"글로벌영향력":82,"사회적감각":88},
    "University of Toronto":
        {"자유로운사고":90,"전략적사고":88,"글로벌영향력":85,"사회적감각":87,"다양성포용":83},
    "Brown University":
        {"자유로운사고":96,"예술적감성":92,"다양성포용":90,"표현력":88,"철학적깊이":80},
    "New York University":
        {"표현력":93,"사회적감각":91,"자유로운사고":88,"글로벌영향력":87,"예술적감성":84},
    "PSL – Paris Sciences et Lettres":
        {"자유로운사고":94,"표현력":91,"논리력":89,"수리과학":85,"예술적감성":88},
    "University of Amsterdam":
        {"자유로운사고":92,"다양성포용":89,"사회적감각":88,"철학적깊이":82,"글로벌영향력":80},
    "Sorbonne Université":
        {"표현력":96,"예술적감성":93,"전통과격식":89,"자유로운사고":91,"철학적깊이":86},
    "University of Edinburgh":
        {"자유로운사고":90,"표현력":88,"전통과격식":88,"논리력":84,"철학적깊이":82},
    "Freie Universität Berlin":
        {"자유로운사고":93,"다양성포용":88,"표현력":87,"철학적깊이":85,"국제정치감각":80},
    "University of Bristol":
        {"자유로운사고":88,"표현력":84,"논리력":86,"도전정신":82,"공학혁신":78},
    "Uppsala University":
        {"자유로운사고":89,"전통과격식":86,"논리력":84,"예술적감성":80,"실용주의":77},
    "Lund University":
        {"자유로운사고":91,"사회적감각":87,"글로벌영향력":84,"다양성포용":82,"실용주의":78},
    "University of British Columbia":
        {"자유로운사고":89,"글로벌영향력":85,"사회적감각":83,"논리력":81,"다양성포용":84},
    "University of Auckland":
        {"자유로운사고":87,"사회적감각":84,"논리력":81,"글로벌영향력":80,"다양성포용":79},
    "University of Wisconsin–Madison":
        {"자유로운사고":88,"논리력":85,"공학혁신":82,"사회적감각":83,"다양성포용":80},
    "Boston University":
        {"자유로운사고":87,"사회적감각":86,"글로벌영향력":84,"표현력":82,"도전정신":80},
    "University of Nottingham":
        {"자유로운사고":86,"사회적감각":84,"글로벌영향력":83,"실용주의":79,"다양성포용":80},
    "University of California, Los Angeles":
        {"자유로운사고":91,"사회적감각":89,"도전정신":86,"예술적감성":84,"글로벌영향력":83},
    "University of Sydney":
        {"자유로운사고":88,"전통과격식":84,"사회적감각":85,"표현력":82,"실용주의":80},
    # ─── 수(水) dominant ───────────────────────────────────────────────────────
    "Princeton University":
        {"전략적사고":95,"철학적깊이":90,"전통과격식":88,"논리력":87,"국제정치감각":82},
    "London School of Economics":
        {"전략적사고":95,"사회적감각":91,"국제정치감각":88,"논리력":85,"철학적깊이":82},
    "University of Chicago":
        {"전략적사고":95,"철학적깊이":90,"논리력":89,"전통과격식":85,"국제정치감각":82},
    "Australian National University":
        {"전략적사고":90,"국제정치감각":88,"논리력":84,"글로벌영향력":82,"철학적깊이":78},
    "Duke University":
        {"전략적사고":92,"사회적감각":87,"논리력":85,"국제정치감각":82,"철학적깊이":80},
    "University of Copenhagen":
        {"사회적감각":89,"전략적사고":87,"논리력":83,"국제정치감각":82,"실용주의":80},
    "University of Pennsylvania":
        {"전략적사고":97,"사회적감각":93,"논리력":88,"국제정치감각":85,"철학적깊이":78},
    "Kyoto University":
        {"철학적깊이":92,"전략적사고":88,"국제정치감각":78,"논리력":84,"자유로운사고":80},
    "University of Michigan":
        {"전략적사고":90,"사회적감각":87,"논리력":85,"국제정치감각":82,"자유로운사고":78},
    "Durham University":
        {"전략적사고":88,"철학적깊이":86,"전통과격식":84,"논리력":80,"표현력":78},
    "The University of Hong Kong":
        {"사회적감각":94,"전략적사고":90,"자유로운사고":87,"국제정치감각":85,"논리력":80},
    "The Chinese University of Hong Kong":
        {"전략적사고":88,"전통과격식":85,"표현력":84,"사회적감각":83,"철학적깊이":83},
    "University of Western Australia":
        {"전략적사고":85,"논리력":80,"철학적깊이":80,"사회적감각":78,"집중력":75},
    "University of Leeds":
        {"전략적사고":83,"사회적감각":83,"논리력":79,"철학적깊이":77,"실용주의":78},
    "University of Warwick":
        {"전략적사고":88,"논리력":84,"도전정신":80,"철학적깊이":78,"국제정치감각":76},
    "University of Zurich":
        {"전략적사고":88,"논리력":86,"전통과격식":82,"철학적깊이":84,"국제정치감각":76},
    "KU Leuven":
        {"전략적사고":85,"국제정치감각":80,"전통과격식":88,"철학적깊이":83,"논리력":82},
}

# TRAIT_OVERRIDES 적용
for uni in combined:
    if uni["name"] in TRAIT_OVERRIDES:
        uni["traits"] = TRAIT_OVERRIDES[uni["name"]]

OUT_PATH.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Written → {OUT_PATH}")
