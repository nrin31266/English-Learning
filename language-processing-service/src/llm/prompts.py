import json
from string import Template


# ============================================================
# COMMON
# ============================================================

VOCAB_SYSTEM_PROMPT = (
    "Bạn là chuyên gia thiết kế chương trình học từ vựng tiếng Anh. "
    "Luôn trả về JSON hợp lệ. "
    "Không markdown. Không giải thích. Không thêm chữ ngoài JSON."
)


def _json_escape(value: str) -> str:
    return json.dumps(value or "", ensure_ascii=False)


def _json_array(values: list[str] | None) -> str:
    return json.dumps(values or [], ensure_ascii=False)


CUSTOM_POS_GUIDE = """Quy tắc POS:
- POS không cần theo spaCy.
- POS là nhãn học từ vựng do hệ thống định nghĩa để dễ lưu và hiển thị.
- Chỉ dùng một trong các giá trị sau:
  NOUN, VERB, ADJ, ADV, PHRASE, PHRASAL_VERB, COLLOCATION, IDIOM, FIXED_EXPRESSION
- NOUN: danh từ đơn hoặc cụm danh từ thông dụng.
  Ví dụ: "fare", "boarding pass", "aisle seat", "customer feedback"
- VERB: động từ đơn.
  Ví dụ: "confirm", "reserve", "cancel", "approve"
- ADJ: tính từ hoặc cụm tính từ ngắn.
  Ví dụ: "available", "non-refundable", "well known"
- ADV: trạng từ hoặc cụm trạng từ.
  Ví dụ: "in advance", "temporarily"
- PHRASE: cụm từ hữu ích nhưng không thuộc rõ các nhóm dưới.
  Ví dụ: "on time", "at risk", "under pressure"
- PHRASAL_VERB: cụm động từ có particle/preposition và có nghĩa riêng.
  Ví dụ: "check in", "take off", "set up", "log in", "wake someone up"
- COLLOCATION: cụm kết hợp tự nhiên, hay dùng cùng nhau.
  Ví dụ: "make a reservation", "boarding pass", "customer service", "meet a deadline"
- IDIOM: thành ngữ, nghĩa không suy ra trực tiếp từ từng từ.
  Ví dụ: "break the ice", "hit the road"
- FIXED_EXPRESSION: cụm diễn đạt cố định hoặc bán cố định.
  Ví dụ: "as soon as possible", "in charge of", "according to", "be responsible for something"
- Nếu là cụm nhiều từ phổ biến, ưu tiên gán loại cụm cụ thể:
  PHRASAL_VERB, COLLOCATION, IDIOM, FIXED_EXPRESSION.
- Nếu không chắc cụm thuộc loại nào, dùng PHRASE.
- Có thể dùng placeholder tự nhiên trong cụm nếu cụm đó thường cần tân ngữ/chủ thể:
  someone, somebody, something, one's, your.
  Ví dụ: "wake someone up", "take something into account", "lose touch with someone", "do one's best", "brush your teeth".
"""


# ============================================================
# SENTENCE PHONETIC + TRANSLATION PROMPT
# ============================================================

SENTENCE_PROMPT_TEMPLATE = Template("""Bạn là engine phiên âm tiếng Anh Mỹ và dịch tiếng Việt có tính ổn định cao.

Nhiệm vụ:
Với mỗi câu đầu vào, trả về phiên âm US IPA và bản dịch tiếng Việt tự nhiên.

Input JSON:
$sentences_json

Output bắt buộc:
[
  {
    "phoneticUs": "IPA Mỹ dạng thô, không có dấu / hoặc []",
    "translationVi": "bản dịch tiếng Việt tự nhiên"
  }
]

Luật:
1. Chỉ trả về JSON hợp lệ.
2. Số lượng phần tử output phải bằng input.
3. Giữ nguyên thứ tự câu.
4. phoneticUs chỉ chứa IPA thô, không bọc bằng "/" hoặc "[]".
5. translationVi phải tự nhiên, không dịch máy từng chữ.
""")


# ============================================================
# WORD DICTIONARY ANALYSIS PROMPT
# Dùng cho collection words: sinh nghĩa từ điển sạch theo word + pos
# Không dùng context để tránh AI chế nghĩa theo topic.
# ============================================================

_WORD_SCHEMA = """{
  "summaryVi": "Tóm tắt ngắn các nghĩa tiếng Việt chính",
  "phonetics": {
    "uk": "IPA Anh-Anh dạng thô",
    "ukAudioUrl": "",
    "us": "IPA Anh-Mỹ dạng thô",
    "usAudioUrl": ""
  },
  "definitions": [
    {
      "definition": "Định nghĩa tiếng Anh rõ ràng, sát nghĩa từ điển",
      "meaningVi": "Nghĩa tiếng Việt tự nhiên, ngắn gọn",
      "example": "Câu ví dụ tiếng Anh tự nhiên dùng đúng từ/cụm từ hoặc biến thể ngữ pháp tự nhiên của nó",
      "viExample": "Bản dịch tiếng Việt tự nhiên của câu ví dụ",
      "level": "B1"
    }
  ],
  "isPhrase": false,
  "phraseType": "",
  "isValid": true,
  "cefrLevel": "B1"
}"""


_WORD_RULES = f"""LUẬT BẮT BUỘC:

1. Format output:
   - Chỉ trả về JSON hợp lệ.
   - Không markdown.
   - Không giải thích thêm.
   - Không thêm field ngoài schema.
   - Không dùng null.
   - Nếu không có dữ liệu cho audio thì để chuỗi rỗng "".

2. Kiểm tra từ hợp lệ:
   - isValid=false chỉ khi input không phải tiếng Anh thật, chỉ là số, URL, ký tự rác, hoặc chuỗi vô nghĩa.
   - Không được đánh isValid=false chỉ vì từ đó ít dùng hoặc POS được yêu cầu không phổ biến.
   - Nếu isValid=false, vẫn trả đúng schema, phonetics để rỗng, definitions là mảng rỗng.

3. Khóa POS:
{CUSTOM_POS_GUIDE}
   - Trường "pos" trong input là bắt buộc tuyệt đối.
   - Tất cả nghĩa trong definitions phải đúng chính xác POS được yêu cầu.
   - Nếu pos="NOUN", chỉ sinh nghĩa danh từ hoặc cụm danh từ.
   - Nếu pos="VERB", chỉ sinh nghĩa động từ.
   - Nếu pos="ADJ", chỉ sinh nghĩa tính từ.
   - Nếu pos="ADV", chỉ sinh nghĩa trạng từ.
   - Nếu pos="PHRASAL_VERB", chỉ sinh nghĩa của cụm động từ đó.
   - Nếu pos="COLLOCATION", chỉ sinh nghĩa/cách dùng của cụm kết hợp đó.
   - Nếu pos="IDIOM", chỉ sinh nghĩa thành ngữ đó.
   - Nếu pos="FIXED_EXPRESSION", chỉ sinh nghĩa cụm diễn đạt cố định hoặc bán cố định đó.
   - Nếu pos="PHRASE", xử lý như cụm từ/cụm diễn đạt hữu ích.
   - Tuyệt đối không mượn nghĩa từ POS khác.

4. Chất lượng nghĩa:
   - Nghĩa phải là nghĩa thực tế, phổ biến, sát từ điển.
   - Chỉ sinh nghĩa trực tiếp của đúng từ hoặc cụm từ input.
   - Không lấy nghĩa phát sinh từ việc ghép input với từ khác.
   - Không lấy nghĩa của cụm dài hơn nếu input chỉ là một từ đơn.
   - Không chế nghĩa theo chủ đề tưởng tượng.
   - Không tự bịa nghĩa.
   - Không diễn giải quá chuyên ngành nếu từ đó có nghĩa phổ thông.
   - Không viết nghĩa mơ hồ kiểu "something related to...".
   - Mỗi phần tử trong definitions chỉ mô tả một nét nghĩa riêng.
   - Không lặp nghĩa gần giống nhau.
   - Ưu tiên các nghĩa người học tiếng Anh thật sự hay gặp.

5. Số lượng definitions:
   - Sinh nhiều definitions nhất có thể, miễn là đó là nghĩa thật của đúng input và đúng POS.
   - Nếu từ/cụm từ đa nghĩa mạnh trong POS đó, sinh danh sách nghĩa thật đầy đủ nhất có thể.
   - Nếu từ/cụm từ ít nghĩa, chỉ sinh đúng số nghĩa thật sự có.
   - Không được bịa thêm nghĩa để làm dài danh sách.
   - Không lấy nghĩa của collocation, idiom, phrasal verb, hoặc cụm mở rộng nếu input không phải chính xác cụm đó.
   - Ví dụ: input là "run" thì không lấy nghĩa riêng của "run into", "run out of", "run a company" như một cụm cố định, trừ khi nghĩa đó là cách dùng trực tiếp phổ biến của động từ "run".
   - Ví dụ: input là "take off" thì được lấy nghĩa của phrasal verb "take off", vì input chính xác là cụm đó.
   - Ví dụ: input là "bank" pos="NOUN" thì lấy các nghĩa danh từ của "bank", không lấy nghĩa của "bank account" như một mục riêng.

6. Định nghĩa tiếng Anh:
   - Field "definition" phải viết bằng tiếng Anh.
   - Định nghĩa phải rõ, thực tế, dễ hiểu cho người học.
   - Với VERB hoặc PHRASAL_VERB, nên bắt đầu bằng "to ...".
   - Với NOUN, nên bắt đầu bằng "a ...", "an ...", hoặc "the ...".
   - Với ADJ, mô tả trạng thái/tính chất.
   - Với ADV, mô tả cách thức/mức độ/thời điểm.
   - Với COLLOCATION, IDIOM, PHRASE, FIXED_EXPRESSION, định nghĩa phải giải thích ý nghĩa/cách dùng của cả cụm.
   - Nếu input có placeholder như someone/something/one's/your, định nghĩa phải giải thích vai trò của placeholder đó.
   - Không viết định nghĩa quá ngắn kiểu một từ.
   - Không viết định nghĩa quá dài hoặc lan man.

7. Nghĩa tiếng Việt:
   - Field "meaningVi" phải là tiếng Việt tự nhiên.
   - Không được quá cụt, thô, hoặc khó hiểu.
   - Không dịch máy từng chữ.
   - Không dùng một chữ quá chung chung như: "làm", "đặt", "điều", "cái", "sự".
   - meaningVi nên dài vừa đủ, thường khoảng 2-6 từ.
   - Nghĩa tiếng Việt phải sát với definition tương ứng.
   - Ví dụ tốt: "sự sắp xếp", "ghi lại thông tin", "người đứng đầu", "làm rõ vấn đề".
   - Ví dụ không tốt: "đặt", "làm", "điều", "thứ", "cái".

8. summaryVi:
   - summaryVi là tóm tắt ngắn các nghĩa chính của từ.
   - Viết tự nhiên, dễ đọc trên UI.
   - Không quá thô hoặc quá cụt.
   - Khoảng 3-10 từ tiếng Việt.
   - Nếu có nhiều nghĩa, phân tách bằng "," hoặc "/".
   - Không nhồi quá nhiều nghĩa phụ.

9. Ví dụ tiếng Anh:
   - Field "example" phải là câu tiếng Anh tự nhiên, ngắn vừa phải.
   - Ví dụ phải dùng đúng nghĩa đang giải thích.
   - Ví dụ được phép dùng biến thể ngữ pháp tự nhiên của word input nếu câu cần như vậy.
   - Với danh từ, có thể dùng số ít hoặc số nhiều nếu tự nhiên.
     Ví dụ: "requirement" có thể xuất hiện là "a requirement" hoặc "requirements" nếu câu cần số nhiều.
   - Với động từ, có thể chia thì, thêm s/es, dùng V-ing, V-ed nếu tự nhiên.
     Ví dụ: "clean" có thể xuất hiện là "cleaned", "cleans", "cleaning".
   - Với phrasal verb/collocation/fixed expression có placeholder như someone/something/one's/your, ví dụ được phép thay placeholder bằng người/vật cụ thể.
     Ví dụ: "wake someone up" có thể dùng "Please wake me up at 7."
     Ví dụ: "take something into account" có thể dùng "We took the cost into account."
     Ví dụ: "do one's best" có thể dùng "She did her best."
   - Với cụm không có placeholder, nên giữ cụm gần với dạng input nhưng vẫn ưu tiên câu tự nhiên.
   - Không thay bằng từ đồng nghĩa không liên quan.
   - Không dùng ví dụ mà người học không nhận ra được từ/cụm đang học.
   - Câu ví dụ nên hữu ích cho các mode học: nghe rồi ghi lại, quiz chọn nghĩa, quiz chọn từ, flashcard, nối từ với nghĩa.
   - Không tối ưu cho fill-in-the-blank exact-string nữa.
   - Không dùng câu quá phức tạp.
   - Không dùng ví dụ nhạy cảm, bạo lực, chính trị, tình dục, hoặc gây tranh cãi.

10. Dịch ví dụ:
   - Field "viExample" phải dịch tự nhiên câu example.
   - Dịch đúng nghĩa đang giải thích.
   - Không dịch máy từng chữ.
   - Không bỏ sót sắc thái quan trọng.

11. Phiên âm:
   - phonetics.uk và phonetics.us phải là IPA dạng thô.
   - Không bọc bằng "/" hoặc "[]".
   - Ví dụ đúng: "ˈrekərd"
   - Ví dụ sai: "/ˈrekərd/", "[ˈrekərd]"
   - Nếu từ có khác biệt phát âm theo POS, dùng phát âm đúng với POS yêu cầu.
   - ukAudioUrl và usAudioUrl luôn là chuỗi rỗng "".

12. CEFR:
   - cefrLevel là độ khó tổng thể của từ.
   - definitions[].level là độ khó của riêng nghĩa đó.
   - Không đánh giá quá thấp các từ trang trọng, học thuật, chuyên ngành, hoặc hiếm.
   - Các từ formal/academic/specialized/rare thường phải là B2, C1 hoặc C2.
   - Chỉ dùng một trong các mức: A1, A2, B1, B2, C1, C2.

13. Cụm từ:
   - isPhrase=true nếu input là idiom, collocation, phrasal verb, fixed expression, hoặc cụm nhiều từ có nghĩa học tập riêng.
   - phraseType chỉ dùng một trong các giá trị:
     COLLOCATION, IDIOM, PHRASAL_VERB, FIXED_EXPRESSION
   - Nếu là từ đơn thông thường: isPhrase=false và phraseType="".
   - Nếu pos là COLLOCATION, IDIOM, PHRASAL_VERB hoặc FIXED_EXPRESSION thì isPhrase phải là true.
   - Nếu pos là PHRASAL_VERB thì phraseType="PHRASAL_VERB".
   - Nếu pos là COLLOCATION thì phraseType="COLLOCATION".
   - Nếu pos là IDIOM thì phraseType="IDIOM".
   - Nếu pos là FIXED_EXPRESSION thì phraseType="FIXED_EXPRESSION".

14. Thứ tự nghĩa:
   - definitions[0] phải là nghĩa phổ biến nhất hoặc nghĩa cốt lõi nhất của từ/cụm từ trong POS đó.
   - Các nghĩa sau là nghĩa phổ biến khác, sắc thái khác, hoặc cách dùng phụ.
   - Không đưa nghĩa của cụm ghép dài hơn nếu input không phải cụm đó.

15. Tuyệt đối tránh:
   - Không chế nghĩa.
   - Không suy diễn theo chủ đề.
   - Không đưa nghĩa của POS khác.
   - Không đưa nghĩa của cụm từ khác.
   - Không dịch Việt quá cụt.
   - Không sinh JSON lỗi.
"""


WORD_ANALYSIS_PROMPT_TEMPLATE = Template(
    f"""Bạn là engine phân tích từ vựng tiếng Anh có tính ổn định cao.

Nhiệm vụ:
Phân tích MỘT từ hoặc cụm từ tiếng Anh theo đúng POS được yêu cầu.

Input:
{{"word":"$word","pos":"$pos"}}

Output schema:
{_WORD_SCHEMA}

{_WORD_RULES}
"""
)


def build_batch_word_prompt(words: list[dict]) -> str:
    """
    words: [{"word": "...", "pos": "..."}]
    Gọi AI một lần để phân tích nhiều từ/cụm từ.
    Hàm này cố ý bỏ context để AI chỉ sinh nghĩa từ điển sạch theo word + pos.
    """
    safe_words = [
        {
            "word": item.get("word", ""),
            "pos": item.get("pos", ""),
        }
        for item in words
    ]

    words_json = json.dumps(
        safe_words,
        ensure_ascii=False,
        separators=(",", ":")
    )

    return (
        f"Bạn là engine phân tích từ vựng tiếng Anh có tính ổn định cao.\n\n"
        f"Nhiệm vụ:\n"
        f"Phân tích {len(safe_words)} từ/cụm từ tiếng Anh theo đúng POS được yêu cầu.\n\n"
        f"Input JSON array:\n"
        f"{words_json}\n\n"
        f"Output bắt buộc:\n"
        f"- Trả về JSON ARRAY gồm đúng {len(safe_words)} object.\n"
        f"- Giữ nguyên thứ tự tương ứng với input.\n"
        f"- Mỗi object phải theo schema sau:\n"
        f"{_WORD_SCHEMA}\n\n"
        f"{_WORD_RULES}"
    )


# ============================================================
# VOCAB CURRICULUM PROMPTS
# Dùng cho vocab_topics, vocab_subtopics, vocab_word_entries.
# ============================================================

def build_subtopic_prompt(
    topic_title: str,
    cefr_range: str,
    n: int,
    tags: list[str] | None = None,
) -> str:
    return f"""Bạn là chuyên gia thiết kế curriculum từ vựng tiếng Anh.

Nhiệm vụ:
Tạo danh sách subtopic từ vựng cho một topic lớn. Các subtopic phải rõ ranh giới để khi sinh word list không bị trùng nghĩa, không bị dẫm chủ đề.

Input:
- topicTitle: {_json_escape(topic_title)}
- tags: {_json_array(tags)}
- cefrRange: {_json_escape(cefr_range)}
- targetSubtopicCount: {n}

Yêu cầu tổng quát:
1. Tạo khoảng {n} subtopics.
2. Ưu tiên đúng chất lượng hơn là máy móc đủ số lượng, nhưng không được lệch quá xa targetSubtopicCount.
3. Các subtopic phải chia theo cụm nghĩa thật sự khác nhau, không chỉ đổi tên bằng từ đồng nghĩa.
4. Không tạo hai subtopic quá gần nhau.
   Ví dụ xấu:
   - "Flight Booking" và "Buying Airline Tickets"
   - "Business Meetings" và "Meeting Discussions"
   - "Frontend Layout" và "Page Layout Design"
5. Mỗi subtopic phải đủ rộng để sinh được khoảng 16-26 từ/cụm từ chất lượng.
6. Mỗi subtopic vẫn phải đủ hẹp để word list không bị quá chung chung.
7. Phân bổ CEFR tương đối đều trong range được cung cấp.
8. title phải viết bằng tiếng Anh tự nhiên.
9. titleVi phải là bản dịch tiếng Việt ngắn gọn, tự nhiên.
10. topicDescription phải là mô tả tiếng Anh 2-3 câu về topic lớn.
11. topicDescription phải giàu semantic anchors để backend dùng scoring: domain chính, semantic clusters, actions, objects, roles, constraints.
12. Không viết chung chung kiểu "This topic covers useful vocabulary about...".
13. description của mỗi subtopic phải viết bằng tiếng Anh, dài 3-4 câu, cực kỳ rõ ranh giới.

Luật rất quan trọng cho description:
- Bắt buộc mô tả rõ subtopic này BAO GỒM gì.
- Bắt buộc mô tả rõ subtopic này LOẠI TRỪ gì.
- Phải dùng ý tương đương với INCLUDES và EXCLUDES.
- Description phải đủ rõ để prompt word generation dựa vào đó sinh từ không bị trùng với subtopic khác.
- Không viết description chung chung kiểu "This subtopic covers important vocabulary about...".
- Không dùng mô tả quá rộng làm mất ranh giới giữa các subtopic.
- Không tạo subtopic có phần INCLUDED của subtopic này lại nằm trong INCLUDED của subtopic khác.

Ví dụ description tốt:
"Focuses on the process of booking flights, comparing ticket options, and confirming reservations. Includes vocabulary for fares, seats, schedules, and booking conditions. Strictly excludes airport security, baggage handling, boarding procedures, and in-flight services."

Ví dụ description xấu:
"This subtopic is about travel and useful airport words."

Return JSON object đúng schema:
{{
  "topicDescription": "2-3 sentence English overview with semantic anchors (domain, clusters, actions, objects, roles, constraints)",
  "subtopics": [
    {{
      "title": "English subtopic title",
      "titleVi": "Tiêu đề tiếng Việt ngắn gọn",
      "description": "3-4 sentence English boundary description with clear includes and excludes",
      "cefrLevel": "B1"
    }}
  ]
}}

Luật output:
- Chỉ trả về JSON object.
- Không markdown.
- Không giải thích.
- Không thêm field ngoài schema.
- Không dùng null.
- cefrLevel chỉ được là một trong: A1, A2, B1, B2, C1, C2.
"""


def build_word_gen_prompt(
    topic_title: str,
    subtopic_title: str,
    subtopic_description: str,
    cefr_level: str,
) -> str:
    return f"""Bạn là engine sinh danh sách từ vựng tiếng Anh cho một subtopic học tập.

Nhiệm vụ:
Sinh danh sách từ/cụm từ tiếng Anh chất lượng cao cho đúng subtopic được cung cấp.
Danh sách này dùng cho nghe rồi ghi lại, quiz chọn nghĩa, quiz chọn từ, flashcard và nối từ với nghĩa.
Không cần tối ưu cho fill-in-the-blank exact-string.

Input:
- parentTopic: {_json_escape(topic_title)}
- subtopicTitle: {_json_escape(subtopic_title)}
- subtopicDescription: {_json_escape(subtopic_description)}
- targetCefrLevel: {_json_escape(cefr_level)}

Số lượng:
- Sinh linh hoạt từ 16 đến 26 items.
- Không cần ép đủ 26 nếu subtopic không đủ từ chất lượng.
- Chất lượng, độ đúng ngữ cảnh, độ tự nhiên, tính ứng dụng và độ đa dạng nghĩa quan trọng hơn số lượng.
- Nếu subtopic rất giàu từ vựng, có thể sinh gần 26.
- Nếu subtopic hẹp, sinh ít hơn nhưng phải sạch và đúng.
- Nếu không đủ 16 items chất lượng, vẫn ưu tiên đúng và sạch hơn là bịa thêm.

Luật chọn từ/cụm từ:
1. Tất cả items phải thuộc trực tiếp subtopicDescription.
2. Không sinh từ quá chung của parentTopic nếu không nằm rõ trong subtopic.
3. Không sinh từ chỉ liên quan lỏng lẻo.
4. Không sinh từ nằm trong phần bị loại trừ của description.
5. Không sinh từ thuộc subtopic hàng xóm.
6. Mỗi item phải có một vai trò học tập riêng, không chỉ là bản gần nghĩa của item khác.
7. Tránh near-synonyms trong cùng list.
   Ví dụ xấu:
   - buy, purchase, acquire
   - select, choose, pick
   - fix, repair, mend
8. Tránh sinh quá nhiều từ cùng một word family nếu chúng không thật sự cần học riêng.
   Ví dụ xấu:
   - configure, configuration, configurable
   - develop, developer, development
9. Chỉ giữ nhiều biến thể cùng gốc khi mỗi biến thể có POS hoặc nghĩa học tập thật sự khác biệt và rất cần cho subtopic.
10. Ưu tiên danh sách cân bằng gồm:
   - danh từ cốt lõi
   - động từ thao tác/hành động
   - tính từ mô tả quan trọng
   - trạng từ hữu ích nếu có
   - phrasal verb phổ biến
   - collocation tự nhiên
   - idiom nếu thật sự phổ biến và phù hợp
   - fixed expression nếu người học hay gặp trong ngữ cảnh này
11. Không sinh từ quá hiếm, quá học thuật, hoặc quá chuyên ngành nếu CEFR thấp.
12. Với CEFR cao, có thể sinh từ formal/specialized hơn nhưng vẫn phải thực tế.
13. Không sinh tên riêng, thương hiệu, địa danh cụ thể, URL, số, hoặc ký hiệu rác.
14. Không sinh item nhạy cảm, bạo lực, chính trị, tình dục, hoặc gây tranh cãi.

Luật làm giàu cụm từ kiểu TOEIC/giao tiếp:
15. Được phép và nên sinh các cụm có placeholder tự nhiên nếu chúng phổ biến và hữu ích.
16. Placeholder hợp lệ:
   - someone
   - somebody
   - something
   - one's
   - your
17. Dùng placeholder khi cụm thường cần tân ngữ/chủ thể linh hoạt.
   Ví dụ tốt:
   - "wake someone up"
   - "take something into account"
   - "lose touch with someone"
   - "get in touch with someone"
   - "ask someone out"
   - "remind someone of something"
   - "be responsible for something"
   - "do one's best"
   - "brush your teeth"
   - "wash your face"
18. Không dùng cụm cụt, thiếu thành phần khiến example sau này phải tự chen từ vào giữa.
   Ví dụ xấu:
   - "wash face"
   - "wake up" nếu nghĩa muốn nói là đánh thức ai đó
   - "take account" thay vì "take something into account"
19. Nếu cụm có hai biến thể nghĩa khác nhau, chọn dạng rõ nghĩa hơn:
   - "wake up" = tự thức dậy
   - "wake someone up" = đánh thức ai đó
   - "get up" = thức dậy / đứng dậy
   - "get someone up" = gọi ai dậy
20. Ưu tiên cụm người học thật sự gặp trong TOEIC, công việc, du lịch, đời sống, học tập và giao tiếp.

Luật format word:
21. word phải viết lowercase.
22. Giữ spelling tự nhiên, khoảng trắng, dấu nháy, dấu gạch nối, dấu chấm nếu thật sự thuộc từ/cụm.
23. Cho phép dấu/diacritics/accent trong các từ tiếng Anh vay mượn hoặc thuật ngữ hợp lệ.
    Ví dụ: "café", "résumé", "naïve", "façade", "chargé d'affaires".
24. Không tự ý bỏ dấu nếu spelling chuẩn của từ có dấu.
25. Không dùng underscore cho phrase.
26. Không thêm nghĩa, không thêm explanation trong output.

{CUSTOM_POS_GUIDE}

Ví dụ word hợp lệ:
- {{"word": "boarding pass", "pos": "COLLOCATION"}}
- {{"word": "check in", "pos": "PHRASAL_VERB"}}
- {{"word": "fare", "pos": "NOUN"}}
- {{"word": "aisle seat", "pos": "COLLOCATION"}}
- {{"word": "take something into account", "pos": "FIXED_EXPRESSION"}}
- {{"word": "in charge of", "pos": "FIXED_EXPRESSION"}}
- {{"word": "be responsible for something", "pos": "FIXED_EXPRESSION"}}
- {{"word": "wake someone up", "pos": "PHRASAL_VERB"}}
- {{"word": "lose touch with someone", "pos": "FIXED_EXPRESSION"}}
- {{"word": "do one's best", "pos": "FIXED_EXPRESSION"}}
- {{"word": "brush your teeth", "pos": "COLLOCATION"}}
- {{"word": "wash your face", "pos": "COLLOCATION"}}
- {{"word": "well known", "pos": "ADJ"}}
- {{"word": "on time", "pos": "PHRASE"}}
- {{"word": "résumé", "pos": "NOUN"}}
- {{"word": "café", "pos": "NOUN"}}

Ví dụ word không hợp lệ:
- {{"word": "boarding_pass", "pos": "COLLOCATION"}}
- {{"word": "Airport Security", "pos": "NOUN"}}
- {{"word": "wash face", "pos": "COLLOCATION"}}
- {{"word": "wake up", "pos": "PHRASAL_VERB"}} nếu nghĩa muốn nói là đánh thức ai đó
- {{"word": "take account", "pos": "FIXED_EXPRESSION"}}
- {{"word": "airport", "pos": "NOUN"}} nếu subtopic chỉ nói về booking flight tickets
- {{"word": "buy", "pos": "VERB"}} và {{"word": "purchase", "pos": "VERB"}} cùng list nếu chúng chỉ đóng vai trò gần nghĩa nhau
- {{"word": "check in", "pos": "VERB"}} nếu muốn nhấn mạnh đây là phrasal verb phổ biến thì nên dùng PHRASAL_VERB

Return JSON object đúng schema:
{{
  "words": [
    {{
      "word": "lowercase word or phrase",
      "pos": "NOUN"
    }}
  ]
}}

Luật output:
- Chỉ trả về JSON object.
- Không markdown.
- Không giải thích.
- Không thêm field ngoài schema.
- Không dùng null.
- words nên có từ 16 đến 26 items nếu có đủ items chất lượng.
"""


def build_single_meaning_prompt(
    word: str,
    pos: str,
    topic_title: str,
    topic_description: str,
    subtopic_title: str,
    subtopic_description: str,
) -> str:
    return f"""Bạn là engine chọn nghĩa từ vựng tiếng Anh theo ngữ cảnh học tập.

Nhiệm vụ:
Tạo CHÍNH XÁC MỘT nghĩa phù hợp nhất cho từ/cụm từ input trong subtopic được cung cấp.

Input:
- word: {_json_escape(word)}
- pos: {_json_escape(pos)}
- topicTitle: {_json_escape(topic_title)}
- topicDescription: {_json_escape(topic_description)}
- subtopicTitle: {_json_escape(subtopic_title)}
- subtopicDescription: {_json_escape(subtopic_description)}

Tư duy bắt buộc:
- Không được chế nghĩa mới.
- Không được bẻ nghĩa để ép vào subtopic.
- Phải chọn một nghĩa thật, phổ biến hoặc hợp lý của đúng word input.
- Nghĩa đó phải phù hợp nhất với subtopicDescription, sau đó mới khớp topicDescription.
- Nếu word có nhiều nghĩa, chọn nghĩa đúng nhất với subtopic.
- Nếu word không thật sự hợp với subtopic, vẫn chọn nghĩa thật gần nhất, không bịa nghĩa.

Schema output:
{{
  "definition": "Clear dictionary-style English definition that matches the selected real sense",
  "meaningVi": "Nghĩa tiếng Việt tự nhiên, ngắn gọn",
  "example": "English example sentence using the word, phrase, or a natural grammatical realization of it",
  "viExample": "Bản dịch tiếng Việt tự nhiên của example",
  "level": "B1"
}}

Luật bắt buộc:

1. Format:
   - Chỉ trả về một JSON object.
   - Không trả array.
   - Không markdown.
   - Không giải thích.
   - Không thêm field ngoài schema.
   - Không dùng null.

2. POS lock:
{CUSTOM_POS_GUIDE}
   - Phải giữ đúng pos được cung cấp.
   - Nếu pos="NOUN", definition phải là nghĩa danh từ hoặc cụm danh từ.
   - Nếu pos="VERB", definition phải là nghĩa động từ.
   - Nếu pos="ADJ", definition phải là nghĩa tính từ.
   - Nếu pos="ADV", definition phải là nghĩa trạng từ.
   - Nếu pos="PHRASE", definition phải là nghĩa của cả cụm.
   - Nếu pos="PHRASAL_VERB", definition phải là nghĩa của cụm động từ.
   - Nếu pos="COLLOCATION", definition phải giải thích nghĩa/cách dùng của collocation.
   - Nếu pos="IDIOM", definition phải là nghĩa thành ngữ.
   - Nếu pos="FIXED_EXPRESSION", definition phải là nghĩa/cách dùng của cụm cố định hoặc bán cố định.
   - Tuyệt đối không đổi POS.
   - Không dùng nghĩa của POS khác để làm cho hợp context.

3. Chất lượng definition:
   - definition phải viết bằng tiếng Anh.
   - definition phải rõ, thực tế, sát nghĩa từ điển.
   - Không viết definition quá ngắn một từ.
   - Không viết definition quá dài hoặc lan man.
   - Không đưa chi tiết quá chuyên ngành nếu từ đó có nghĩa phổ thông phù hợp.
   - Không lấy nghĩa của cụm dài hơn nếu input không phải chính xác cụm đó.
   - Nếu input có placeholder như someone/something/one's/your, definition phải giải thích nghĩa của cả pattern đó.
   - Ví dụ: input "bank" không được lấy nghĩa của "bank account".
   - Ví dụ: input "take off" thì được lấy nghĩa phrasal verb vì input chính xác là cụm đó.
   - Ví dụ: input "wake someone up" phải lấy nghĩa đánh thức ai đó, không lấy nghĩa tự thức dậy.

4. Ràng buộc ngữ cảnh:
   - Nghĩa được chọn phải hợp với subtopicDescription trước tiên.
   - topicDescription là context tổng thể hỗ trợ disambiguation ở mức rộng.
   - Nếu subtopicDescription và topicDescription xung đột, ưu tiên subtopicDescription.
   - Nhưng nghĩa vẫn phải là nghĩa thật của word.
   - Không được tạo nghĩa riêng chỉ vì subtopic cần.
   - Không được suy diễn quá xa.
   - subtopicDescription có thể chứa phần EXCLUDES để phân ranh giới khi sinh word list.
   - Khi chọn nghĩa cho word đã có sẵn, EXCLUDES chỉ là thông tin ranh giới mềm, không phải danh sách cấm tuyệt đối.
   - Ưu tiên nghĩa khớp với phần INCLUDED, subtopicTitle, topicDescription và mục tiêu học tập.
   - Không tự động loại một nghĩa chỉ vì definition/example có vài keyword xuất hiện trong phần EXCLUDES.

5. meaningVi:
   - meaningVi phải là tiếng Việt tự nhiên.
   - Không quá cụt, không thô, không dịch máy.
   - Không dùng một chữ quá chung như: "làm", "đặt", "điều", "cái", "sự".
   - Nên dài khoảng 2-6 từ.
   - Phải sát với definition.
   - Ví dụ tốt: "sự sắp xếp", "ghi lại thông tin", "người đứng đầu", "xác nhận thông tin".
   - Ví dụ xấu: "làm", "đặt", "điều", "cái".

6. example:
   - example phải là câu tiếng Anh tự nhiên, ngắn vừa phải.
   - example phải dùng đúng nghĩa đang học.
   - Không cần tối ưu cho fill-in-the-blank exact-string.
   - Được phép dùng biến thể ngữ pháp tự nhiên của word input nếu câu cần như vậy.
   - Với danh từ, có thể dùng số ít hoặc số nhiều nếu tự nhiên.
     Ví dụ: "curtain" có thể dùng "curtains" nếu câu nói về nhiều rèm cửa.
   - Với động từ, có thể chia thì, thêm s/es, dùng V-ing, V-ed nếu tự nhiên.
     Ví dụ: "clean" có thể dùng "cleaned", "cleans", "cleaning".
   - Với phrasal verb/collocation/fixed expression có placeholder như someone/something/one's/your, ví dụ được phép thay placeholder bằng người/vật cụ thể.
     Ví dụ: "wake someone up" có thể dùng "Please wake me up at 7."
     Ví dụ: "take something into account" có thể dùng "We took the cost into account."
     Ví dụ: "lose touch with someone" có thể dùng "I lost touch with my old friend."
     Ví dụ: "do one's best" có thể dùng "She did her best."
   - Với cụm không có placeholder, ví dụ nên thể hiện rõ cụm đó hoặc một biến thể tự nhiên của cụm đó.
   - Không thay bằng từ đồng nghĩa không liên quan.
   - Không dùng ví dụ mà người học không nhận ra được từ/cụm đang học.
   - Câu ví dụ nên hữu ích cho các mode học: nghe rồi ghi lại, quiz chọn nghĩa, quiz chọn từ, flashcard, nối từ với nghĩa.
   - Không dùng câu quá phức tạp.
   - Không dùng nội dung nhạy cảm, bạo lực, chính trị, tình dục, hoặc gây tranh cãi.

7. viExample:
   - viExample phải dịch tự nhiên câu example.
   - Dịch đúng nghĩa đang học.
   - Không dịch máy từng chữ.
   - Không bỏ sót sắc thái chính.

8. level:
   - level là CEFR của nghĩa cụ thể này.
   - Chỉ dùng một trong: A1, A2, B1, B2, C1, C2.
   - Không đánh giá quá thấp từ formal, academic, specialized, hoặc hiếm.

Return:
- Chỉ JSON object đúng schema.
"""