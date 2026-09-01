/**
 * ISO 3166-1 alpha-2 국가 마스터 — 글로벌 매출의 국가 입력·집계에 쓴다.
 *
 * 이름은 Node ICU(Intl.DisplayNames)로 생성했고, 대륙 분류는 수기다.
 * 런타임 Intl 의존을 피하려고 정적 배열로 커밋한다(생성 스크립트는 일회성).
 * 국기 이모지는 코드에서 파생하므로 저장하지 않는다.
 */

export type Continent = '아시아' | '유럽' | '북아메리카' | '남아메리카' | '아프리카' | '오세아니아';

export interface Country {
  code: string; // ISO 3166-1 alpha-2 (대문자)
  ko: string;
  en: string;
  continent: Continent;
}

/** 대륙 → 한글명 가나다순. 총 240개국. */
export const COUNTRIES: Country[] = [
  { code: 'NP', ko: '네팔', en: 'Nepal', continent: '아시아' },
  { code: 'TW', ko: '대만', en: 'Taiwan', continent: '아시아' },
  { code: 'KR', ko: '대한민국', en: 'South Korea', continent: '아시아' },
  { code: 'TL', ko: '동티모르', en: 'Timor-Leste', continent: '아시아' },
  { code: 'LA', ko: '라오스', en: 'Laos', continent: '아시아' },
  { code: 'LB', ko: '레바논', en: 'Lebanon', continent: '아시아' },
  { code: 'MO', ko: '마카오(중국 특별행정구)', en: 'Macao SAR China', continent: '아시아' },
  { code: 'MY', ko: '말레이시아', en: 'Malaysia', continent: '아시아' },
  { code: 'MV', ko: '몰디브', en: 'Maldives', continent: '아시아' },
  { code: 'MN', ko: '몽골', en: 'Mongolia', continent: '아시아' },
  { code: 'MM', ko: '미얀마', en: 'Myanmar (Burma)', continent: '아시아' },
  { code: 'BH', ko: '바레인', en: 'Bahrain', continent: '아시아' },
  { code: 'BD', ko: '방글라데시', en: 'Bangladesh', continent: '아시아' },
  { code: 'VN', ko: '베트남', en: 'Vietnam', continent: '아시아' },
  { code: 'BT', ko: '부탄', en: 'Bhutan', continent: '아시아' },
  { code: 'KP', ko: '북한', en: 'North Korea', continent: '아시아' },
  { code: 'BN', ko: '브루나이', en: 'Brunei', continent: '아시아' },
  { code: 'SA', ko: '사우디아라비아', en: 'Saudi Arabia', continent: '아시아' },
  { code: 'LK', ko: '스리랑카', en: 'Sri Lanka', continent: '아시아' },
  { code: 'SY', ko: '시리아', en: 'Syria', continent: '아시아' },
  { code: 'SG', ko: '싱가포르', en: 'Singapore', continent: '아시아' },
  { code: 'AE', ko: '아랍에미리트', en: 'United Arab Emirates', continent: '아시아' },
  { code: 'AM', ko: '아르메니아', en: 'Armenia', continent: '아시아' },
  { code: 'AZ', ko: '아제르바이잔', en: 'Azerbaijan', continent: '아시아' },
  { code: 'AF', ko: '아프가니스탄', en: 'Afghanistan', continent: '아시아' },
  { code: 'YE', ko: '예멘', en: 'Yemen', continent: '아시아' },
  { code: 'OM', ko: '오만', en: 'Oman', continent: '아시아' },
  { code: 'JO', ko: '요르단', en: 'Jordan', continent: '아시아' },
  { code: 'UZ', ko: '우즈베키스탄', en: 'Uzbekistan', continent: '아시아' },
  { code: 'IQ', ko: '이라크', en: 'Iraq', continent: '아시아' },
  { code: 'IR', ko: '이란', en: 'Iran', continent: '아시아' },
  { code: 'IL', ko: '이스라엘', en: 'Israel', continent: '아시아' },
  { code: 'IN', ko: '인도', en: 'India', continent: '아시아' },
  { code: 'ID', ko: '인도네시아', en: 'Indonesia', continent: '아시아' },
  { code: 'JP', ko: '일본', en: 'Japan', continent: '아시아' },
  { code: 'GE', ko: '조지아', en: 'Georgia', continent: '아시아' },
  { code: 'CN', ko: '중국', en: 'China', continent: '아시아' },
  { code: 'KZ', ko: '카자흐스탄', en: 'Kazakhstan', continent: '아시아' },
  { code: 'QA', ko: '카타르', en: 'Qatar', continent: '아시아' },
  { code: 'KH', ko: '캄보디아', en: 'Cambodia', continent: '아시아' },
  { code: 'KW', ko: '쿠웨이트', en: 'Kuwait', continent: '아시아' },
  { code: 'KG', ko: '키르기스스탄', en: 'Kyrgyzstan', continent: '아시아' },
  { code: 'CY', ko: '키프로스', en: 'Cyprus', continent: '아시아' },
  { code: 'TJ', ko: '타지키스탄', en: 'Tajikistan', continent: '아시아' },
  { code: 'TH', ko: '태국', en: 'Thailand', continent: '아시아' },
  { code: 'TM', ko: '투르크메니스탄', en: 'Turkmenistan', continent: '아시아' },
  { code: 'TR', ko: '튀르키예', en: 'Türkiye', continent: '아시아' },
  { code: 'PK', ko: '파키스탄', en: 'Pakistan', continent: '아시아' },
  { code: 'PS', ko: '팔레스타인 지구', en: 'Palestinian Territories', continent: '아시아' },
  { code: 'PH', ko: '필리핀', en: 'Philippines', continent: '아시아' },
  { code: 'HK', ko: '홍콩(중국 특별행정구)', en: 'Hong Kong SAR China', continent: '아시아' },
  { code: 'GG', ko: '건지', en: 'Guernsey', continent: '유럽' },
  { code: 'GR', ko: '그리스', en: 'Greece', continent: '유럽' },
  { code: 'NL', ko: '네덜란드', en: 'Netherlands', continent: '유럽' },
  { code: 'NO', ko: '노르웨이', en: 'Norway', continent: '유럽' },
  { code: 'DK', ko: '덴마크', en: 'Denmark', continent: '유럽' },
  { code: 'DE', ko: '독일', en: 'Germany', continent: '유럽' },
  { code: 'LV', ko: '라트비아', en: 'Latvia', continent: '유럽' },
  { code: 'RU', ko: '러시아', en: 'Russia', continent: '유럽' },
  { code: 'RO', ko: '루마니아', en: 'Romania', continent: '유럽' },
  { code: 'LU', ko: '룩셈부르크', en: 'Luxembourg', continent: '유럽' },
  { code: 'LT', ko: '리투아니아', en: 'Lithuania', continent: '유럽' },
  { code: 'LI', ko: '리히텐슈타인', en: 'Liechtenstein', continent: '유럽' },
  { code: 'IM', ko: '맨섬', en: 'Isle of Man', continent: '유럽' },
  { code: 'MC', ko: '모나코', en: 'Monaco', continent: '유럽' },
  { code: 'ME', ko: '몬테네그로', en: 'Montenegro', continent: '유럽' },
  { code: 'MD', ko: '몰도바', en: 'Moldova', continent: '유럽' },
  { code: 'MT', ko: '몰타', en: 'Malta', continent: '유럽' },
  { code: 'VA', ko: '바티칸 시국', en: 'Vatican City', continent: '유럽' },
  { code: 'BE', ko: '벨기에', en: 'Belgium', continent: '유럽' },
  { code: 'BY', ko: '벨라루스', en: 'Belarus', continent: '유럽' },
  { code: 'BA', ko: '보스니아 헤르체고비나', en: 'Bosnia & Herzegovina', continent: '유럽' },
  { code: 'MK', ko: '북마케도니아', en: 'North Macedonia', continent: '유럽' },
  { code: 'BG', ko: '불가리아', en: 'Bulgaria', continent: '유럽' },
  { code: 'SM', ko: '산마리노', en: 'San Marino', continent: '유럽' },
  { code: 'RS', ko: '세르비아', en: 'Serbia', continent: '유럽' },
  { code: 'SJ', ko: '스발바르제도-얀마웬섬', en: 'Svalbard & Jan Mayen', continent: '유럽' },
  { code: 'SE', ko: '스웨덴', en: 'Sweden', continent: '유럽' },
  { code: 'CH', ko: '스위스', en: 'Switzerland', continent: '유럽' },
  { code: 'ES', ko: '스페인', en: 'Spain', continent: '유럽' },
  { code: 'SK', ko: '슬로바키아', en: 'Slovakia', continent: '유럽' },
  { code: 'SI', ko: '슬로베니아', en: 'Slovenia', continent: '유럽' },
  { code: 'IS', ko: '아이슬란드', en: 'Iceland', continent: '유럽' },
  { code: 'IE', ko: '아일랜드', en: 'Ireland', continent: '유럽' },
  { code: 'AD', ko: '안도라', en: 'Andorra', continent: '유럽' },
  { code: 'AL', ko: '알바니아', en: 'Albania', continent: '유럽' },
  { code: 'EE', ko: '에스토니아', en: 'Estonia', continent: '유럽' },
  { code: 'GB', ko: '영국', en: 'United Kingdom', continent: '유럽' },
  { code: 'AT', ko: '오스트리아', en: 'Austria', continent: '유럽' },
  { code: 'AX', ko: '올란드 제도', en: 'Åland Islands', continent: '유럽' },
  { code: 'UA', ko: '우크라이나', en: 'Ukraine', continent: '유럽' },
  { code: 'IT', ko: '이탈리아', en: 'Italy', continent: '유럽' },
  { code: 'JE', ko: '저지', en: 'Jersey', continent: '유럽' },
  { code: 'GI', ko: '지브롤터', en: 'Gibraltar', continent: '유럽' },
  { code: 'CZ', ko: '체코', en: 'Czechia', continent: '유럽' },
  { code: 'HR', ko: '크로아티아', en: 'Croatia', continent: '유럽' },
  { code: 'FO', ko: '페로 제도', en: 'Faroe Islands', continent: '유럽' },
  { code: 'PT', ko: '포르투갈', en: 'Portugal', continent: '유럽' },
  { code: 'PL', ko: '폴란드', en: 'Poland', continent: '유럽' },
  { code: 'FR', ko: '프랑스', en: 'France', continent: '유럽' },
  { code: 'FI', ko: '핀란드', en: 'Finland', continent: '유럽' },
  { code: 'HU', ko: '헝가리', en: 'Hungary', continent: '유럽' },
  { code: 'GP', ko: '과들루프', en: 'Guadeloupe', continent: '북아메리카' },
  { code: 'GT', ko: '과테말라', en: 'Guatemala', continent: '북아메리카' },
  { code: 'GD', ko: '그레나다', en: 'Grenada', continent: '북아메리카' },
  { code: 'GL', ko: '그린란드', en: 'Greenland', continent: '북아메리카' },
  { code: 'BQ', ko: '네덜란드령 카리브', en: 'Caribbean Netherlands', continent: '북아메리카' },
  { code: 'NI', ko: '니카라과', en: 'Nicaragua', continent: '북아메리카' },
  { code: 'DM', ko: '도미니카', en: 'Dominica', continent: '북아메리카' },
  { code: 'DO', ko: '도미니카 공화국', en: 'Dominican Republic', continent: '북아메리카' },
  { code: 'MQ', ko: '마르티니크', en: 'Martinique', continent: '북아메리카' },
  { code: 'MX', ko: '멕시코', en: 'Mexico', continent: '북아메리카' },
  { code: 'MS', ko: '몬트세라트', en: 'Montserrat', continent: '북아메리카' },
  { code: 'US', ko: '미국', en: 'United States', continent: '북아메리카' },
  { code: 'VI', ko: '미국령 버진아일랜드', en: 'U.S. Virgin Islands', continent: '북아메리카' },
  { code: 'BB', ko: '바베이도스', en: 'Barbados', continent: '북아메리카' },
  { code: 'BS', ko: '바하마', en: 'Bahamas', continent: '북아메리카' },
  { code: 'BM', ko: '버뮤다', en: 'Bermuda', continent: '북아메리카' },
  { code: 'BZ', ko: '벨리즈', en: 'Belize', continent: '북아메리카' },
  { code: 'MF', ko: '생마르탱', en: 'St. Martin', continent: '북아메리카' },
  { code: 'BL', ko: '생바르텔레미', en: 'St. Barthélemy', continent: '북아메리카' },
  { code: 'PM', ko: '생피에르 미클롱', en: 'St. Pierre & Miquelon', continent: '북아메리카' },
  { code: 'LC', ko: '세인트루시아', en: 'St. Lucia', continent: '북아메리카' },
  { code: 'VC', ko: '세인트빈센트그레나딘', en: 'St. Vincent & Grenadines', continent: '북아메리카' },
  { code: 'KN', ko: '세인트키츠 네비스', en: 'St. Kitts & Nevis', continent: '북아메리카' },
  { code: 'SX', ko: '신트마르턴', en: 'Sint Maarten', continent: '북아메리카' },
  { code: 'AW', ko: '아루바', en: 'Aruba', continent: '북아메리카' },
  { code: 'HT', ko: '아이티', en: 'Haiti', continent: '북아메리카' },
  { code: 'AG', ko: '앤티가 바부다', en: 'Antigua & Barbuda', continent: '북아메리카' },
  { code: 'AI', ko: '앵귈라', en: 'Anguilla', continent: '북아메리카' },
  { code: 'SV', ko: '엘살바도르', en: 'El Salvador', continent: '북아메리카' },
  { code: 'VG', ko: '영국령 버진아일랜드', en: 'British Virgin Islands', continent: '북아메리카' },
  { code: 'HN', ko: '온두라스', en: 'Honduras', continent: '북아메리카' },
  { code: 'JM', ko: '자메이카', en: 'Jamaica', continent: '북아메리카' },
  { code: 'CA', ko: '캐나다', en: 'Canada', continent: '북아메리카' },
  { code: 'KY', ko: '케이맨 제도', en: 'Cayman Islands', continent: '북아메리카' },
  { code: 'CR', ko: '코스타리카', en: 'Costa Rica', continent: '북아메리카' },
  { code: 'CU', ko: '쿠바', en: 'Cuba', continent: '북아메리카' },
  { code: 'CW', ko: '퀴라소', en: 'Curaçao', continent: '북아메리카' },
  { code: 'TC', ko: '터크스 케이커스 제도', en: 'Turks & Caicos Islands', continent: '북아메리카' },
  { code: 'TT', ko: '트리니다드 토바고', en: 'Trinidad & Tobago', continent: '북아메리카' },
  { code: 'PA', ko: '파나마', en: 'Panama', continent: '북아메리카' },
  { code: 'PR', ko: '푸에르토리코', en: 'Puerto Rico', continent: '북아메리카' },
  { code: 'GY', ko: '가이아나', en: 'Guyana', continent: '남아메리카' },
  { code: 'VE', ko: '베네수엘라', en: 'Venezuela', continent: '남아메리카' },
  { code: 'BO', ko: '볼리비아', en: 'Bolivia', continent: '남아메리카' },
  { code: 'BR', ko: '브라질', en: 'Brazil', continent: '남아메리카' },
  { code: 'SR', ko: '수리남', en: 'Suriname', continent: '남아메리카' },
  { code: 'AR', ko: '아르헨티나', en: 'Argentina', continent: '남아메리카' },
  { code: 'EC', ko: '에콰도르', en: 'Ecuador', continent: '남아메리카' },
  { code: 'UY', ko: '우루과이', en: 'Uruguay', continent: '남아메리카' },
  { code: 'CL', ko: '칠레', en: 'Chile', continent: '남아메리카' },
  { code: 'CO', ko: '콜롬비아', en: 'Colombia', continent: '남아메리카' },
  { code: 'PY', ko: '파라과이', en: 'Paraguay', continent: '남아메리카' },
  { code: 'PE', ko: '페루', en: 'Peru', continent: '남아메리카' },
  { code: 'FK', ko: '포클랜드 제도', en: 'Falkland Islands', continent: '남아메리카' },
  { code: 'GF', ko: '프랑스령 기아나', en: 'French Guiana', continent: '남아메리카' },
  { code: 'GH', ko: '가나', en: 'Ghana', continent: '아프리카' },
  { code: 'GA', ko: '가봉', en: 'Gabon', continent: '아프리카' },
  { code: 'GM', ko: '감비아', en: 'Gambia', continent: '아프리카' },
  { code: 'GN', ko: '기니', en: 'Guinea', continent: '아프리카' },
  { code: 'GW', ko: '기니비사우', en: 'Guinea-Bissau', continent: '아프리카' },
  { code: 'NA', ko: '나미비아', en: 'Namibia', continent: '아프리카' },
  { code: 'NG', ko: '나이지리아', en: 'Nigeria', continent: '아프리카' },
  { code: 'SS', ko: '남수단', en: 'South Sudan', continent: '아프리카' },
  { code: 'ZA', ko: '남아프리카', en: 'South Africa', continent: '아프리카' },
  { code: 'NE', ko: '니제르', en: 'Niger', continent: '아프리카' },
  { code: 'LR', ko: '라이베리아', en: 'Liberia', continent: '아프리카' },
  { code: 'LS', ko: '레소토', en: 'Lesotho', continent: '아프리카' },
  { code: 'RE', ko: '레위니옹', en: 'Réunion', continent: '아프리카' },
  { code: 'RW', ko: '르완다', en: 'Rwanda', continent: '아프리카' },
  { code: 'LY', ko: '리비아', en: 'Libya', continent: '아프리카' },
  { code: 'MG', ko: '마다가스카르', en: 'Madagascar', continent: '아프리카' },
  { code: 'YT', ko: '마요트', en: 'Mayotte', continent: '아프리카' },
  { code: 'MW', ko: '말라위', en: 'Malawi', continent: '아프리카' },
  { code: 'ML', ko: '말리', en: 'Mali', continent: '아프리카' },
  { code: 'MA', ko: '모로코', en: 'Morocco', continent: '아프리카' },
  { code: 'MU', ko: '모리셔스', en: 'Mauritius', continent: '아프리카' },
  { code: 'MR', ko: '모리타니', en: 'Mauritania', continent: '아프리카' },
  { code: 'MZ', ko: '모잠비크', en: 'Mozambique', continent: '아프리카' },
  { code: 'BJ', ko: '베냉', en: 'Benin', continent: '아프리카' },
  { code: 'BW', ko: '보츠와나', en: 'Botswana', continent: '아프리카' },
  { code: 'BI', ko: '부룬디', en: 'Burundi', continent: '아프리카' },
  { code: 'BF', ko: '부르키나파소', en: 'Burkina Faso', continent: '아프리카' },
  { code: 'ST', ko: '상투메 프린시페', en: 'São Tomé & Príncipe', continent: '아프리카' },
  { code: 'EH', ko: '서사하라', en: 'Western Sahara', continent: '아프리카' },
  { code: 'SN', ko: '세네갈', en: 'Senegal', continent: '아프리카' },
  { code: 'SC', ko: '세이셸', en: 'Seychelles', continent: '아프리카' },
  { code: 'SH', ko: '세인트헬레나', en: 'St. Helena', continent: '아프리카' },
  { code: 'SO', ko: '소말리아', en: 'Somalia', continent: '아프리카' },
  { code: 'SD', ko: '수단', en: 'Sudan', continent: '아프리카' },
  { code: 'SL', ko: '시에라리온', en: 'Sierra Leone', continent: '아프리카' },
  { code: 'DZ', ko: '알제리', en: 'Algeria', continent: '아프리카' },
  { code: 'AO', ko: '앙골라', en: 'Angola', continent: '아프리카' },
  { code: 'ER', ko: '에리트리아', en: 'Eritrea', continent: '아프리카' },
  { code: 'SZ', ko: '에스와티니', en: 'Eswatini', continent: '아프리카' },
  { code: 'ET', ko: '에티오피아', en: 'Ethiopia', continent: '아프리카' },
  { code: 'UG', ko: '우간다', en: 'Uganda', continent: '아프리카' },
  { code: 'EG', ko: '이집트', en: 'Egypt', continent: '아프리카' },
  { code: 'ZM', ko: '잠비아', en: 'Zambia', continent: '아프리카' },
  { code: 'GQ', ko: '적도 기니', en: 'Equatorial Guinea', continent: '아프리카' },
  { code: 'CF', ko: '중앙 아프리카 공화국', en: 'Central African Republic', continent: '아프리카' },
  { code: 'DJ', ko: '지부티', en: 'Djibouti', continent: '아프리카' },
  { code: 'ZW', ko: '짐바브웨', en: 'Zimbabwe', continent: '아프리카' },
  { code: 'TD', ko: '차드', en: 'Chad', continent: '아프리카' },
  { code: 'CM', ko: '카메룬', en: 'Cameroon', continent: '아프리카' },
  { code: 'CV', ko: '카보베르데', en: 'Cape Verde', continent: '아프리카' },
  { code: 'KE', ko: '케냐', en: 'Kenya', continent: '아프리카' },
  { code: 'KM', ko: '코모로', en: 'Comoros', continent: '아프리카' },
  { code: 'CI', ko: '코트디부아르', en: 'Côte d’Ivoire', continent: '아프리카' },
  { code: 'CG', ko: '콩고-브라자빌', en: 'Congo - Brazzaville', continent: '아프리카' },
  { code: 'CD', ko: '콩고-킨샤사', en: 'Congo - Kinshasa', continent: '아프리카' },
  { code: 'TZ', ko: '탄자니아', en: 'Tanzania', continent: '아프리카' },
  { code: 'TG', ko: '토고', en: 'Togo', continent: '아프리카' },
  { code: 'TN', ko: '튀니지', en: 'Tunisia', continent: '아프리카' },
  { code: 'GU', ko: '괌', en: 'Guam', continent: '오세아니아' },
  { code: 'NR', ko: '나우루', en: 'Nauru', continent: '오세아니아' },
  { code: 'NF', ko: '노퍽섬', en: 'Norfolk Island', continent: '오세아니아' },
  { code: 'NZ', ko: '뉴질랜드', en: 'New Zealand', continent: '오세아니아' },
  { code: 'NC', ko: '뉴칼레도니아', en: 'New Caledonia', continent: '오세아니아' },
  { code: 'NU', ko: '니우에', en: 'Niue', continent: '오세아니아' },
  { code: 'MH', ko: '마셜 제도', en: 'Marshall Islands', continent: '오세아니아' },
  { code: 'FM', ko: '미크로네시아', en: 'Micronesia', continent: '오세아니아' },
  { code: 'VU', ko: '바누아투', en: 'Vanuatu', continent: '오세아니아' },
  { code: 'MP', ko: '북마리아나제도', en: 'Northern Mariana Islands', continent: '오세아니아' },
  { code: 'WS', ko: '사모아', en: 'Samoa', continent: '오세아니아' },
  { code: 'SB', ko: '솔로몬 제도', en: 'Solomon Islands', continent: '오세아니아' },
  { code: 'AS', ko: '아메리칸 사모아', en: 'American Samoa', continent: '오세아니아' },
  { code: 'AU', ko: '오스트레일리아', en: 'Australia', continent: '오세아니아' },
  { code: 'WF', ko: '왈리스-푸투나 제도', en: 'Wallis & Futuna', continent: '오세아니아' },
  { code: 'CK', ko: '쿡 제도', en: 'Cook Islands', continent: '오세아니아' },
  { code: 'KI', ko: '키리바시', en: 'Kiribati', continent: '오세아니아' },
  { code: 'TK', ko: '토켈라우', en: 'Tokelau', continent: '오세아니아' },
  { code: 'TO', ko: '통가', en: 'Tonga', continent: '오세아니아' },
  { code: 'TV', ko: '투발루', en: 'Tuvalu', continent: '오세아니아' },
  { code: 'PG', ko: '파푸아뉴기니', en: 'Papua New Guinea', continent: '오세아니아' },
  { code: 'PW', ko: '팔라우', en: 'Palau', continent: '오세아니아' },
  { code: 'PF', ko: '프랑스령 폴리네시아', en: 'French Polynesia', continent: '오세아니아' },
  { code: 'FJ', ko: '피지', en: 'Fiji', continent: '오세아니아' },
  { code: 'PN', ko: '핏케언 제도', en: 'Pitcairn Islands', continent: '오세아니아' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** 자주 쓰는 국가를 select 최상단에 올리기 위한 순서. */
export const FREQUENT_COUNTRY_CODES = ['PK', 'AE', 'US', 'IN', 'SA', 'KR', 'GB', 'CA', 'AU', 'SG'];

export const COUNTRIES_BY_CONTINENT: { continent: Continent; countries: Country[] }[] = (() => {
  const order: Continent[] = ['아시아', '유럽', '북아메리카', '남아메리카', '아프리카', '오세아니아'];
  return order.map((continent) => ({
    continent,
    countries: COUNTRIES.filter((c) => c.continent === continent),
  }));
})();

export function findCountry(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.trim().toUpperCase());
}

export function isCountryCode(code: string | null | undefined): boolean {
  return findCountry(code) !== undefined;
}

/** 입력값을 대문자 2자리로 정규화. 빈 값은 null(국가 미지정). */
export function normalizeCountryCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

/** 코드에서 국기 이모지 — 알파벳을 regional indicator로 옮긴다. */
export function countryFlag(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(...[...upper].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** 표시용 라벨: "🇵🇰 파키스탄". 미상이면 "미지정". */
export function countryLabel(code: string | null | undefined): string {
  const country = findCountry(code);
  if (!country) return '미지정';
  return `${countryFlag(country.code)} ${country.ko}`;
}
