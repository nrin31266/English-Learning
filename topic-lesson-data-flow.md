# Phân tích luồng dữ liệu Topic & Lesson

> Phân tích từ giao diện `http://localhost:3001/topics` và `http://localhost:3001/topics/bbc-learning-english`

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│  learner-web (React + Vite) port 3001                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Redux Store                                                │  │
│  │  topicsSlide (IHomeTopicsResponse)                         │  │
│  │  topicSlide   (ITopicDetailsResponse)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    GET /api/learning-contents/...
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  API Gateway (port 8888)                                        │
│  StripPrefix=2 → /api/learning-contents/topics/home → /topics/home│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  learning-content-service (Spring Boot, port 8081)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Controller → Service → Repository → PostgreSQL            │  │
│  │                     ↕                                     │  │
│  │              Redis (AI job status)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints chính

### 2.1. `GET /api/learning-contents/topics/home` — Trang danh sách topic

**Params:** `?limitLessonsPerTopic=4&limitTopics=10`

**Mục đích:** Lấy danh sách topic + bài học mới nhất cho trang chủ.

**Luồng xử lý (TopicService.getTopicsForHome()):**

```
1. topicRepository.findActiveTopics()
   → JPQL: SELECT Topic LEFT JOIN Lesson, WHERE isActive = true
   → Trả về List<TopicSummaryResponse> { id, name, slug, updatedAt, totalLessons }

2. Stream.limit(limitTopics) → lấy 10 topics đầu

3. lessonRepository.findLatestLessonsByTopicIds(topicIds, limitLessonsPerTopic)
   → Native SQL với ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY published_at DESC)
   → Chỉ lấy lesson đã publish (published_at IS NOT NULL)
   → Kèm subquery đếm active sentence count

4. userLessonProgressRepository.findByUserIdAndLessonIdIn(userId, lessonIds)
   → Load batch progress cho tất cả lessons
   → Map<lessonId, List<UserLessonProgress>>

5. Map dữ liệu → HomeTopicResponse { id, name, slug, lessons[] }

6. getResumeLearning(userId, 10) → bài học đang học dở
```

**Response structure:**
```json
{
  "code": 200,
  "result": {
    "allTopics": [
      { "id": 1, "name": "BBC Learning English", "slug": "bbc-learning-english", "updatedAt": "...", "totalLessons": 4 }
    ],
    "topics": [
      {
        "id": 1,
        "name": "BBC Learning English",
        "slug": "bbc-learning-english",
        "lessons": [
          {
            "id": 75,
            "topicSlug": "bbc-learning-english",
            "title": "Talking about weekend plans 🏊‍♀️🚴💃 Real Easy English",
            "thumbnailUrl": "...",
            "slug": "...",
            "languageLevel": "A2",
            "sourceType": "YOUTUBE",
            "durationSeconds": 283,
            "enableDictation": true,
            "enableShadowing": true,
            "shadowingStatus": "NOT_STARTED",
            "dictationStatus": "NOT_STARTED",
            "shadowingProgressPercent": 0,
            "dictationProgressPercent": 0,
            "activeSentenceCount": 6
          }
        ]
      }
    ],
    "resumeLearning": {
      "totalInProgress": 0,
      "hasMore": false,
      "recentLessons": []
    }
  }
}
```

### 2.2. `GET /api/learning-contents/topics/{slug}` — Chi tiết topic

**Ví dụ:** `GET /api/learning-contents/topics/bbc-learning-english`

**Mục đích:** Lấy tất cả lessons của một topic.

**Luồng xử lý (TopicService.getTopicDetailsBySlug()):**

```
1. topicRepository.findBySlug(slug) → Tìm topic

2. lessonRepository.findAllLessonsWithCountByTopicId(topicId)
   → Native SQL: SELECT từ lessons WHERE topic_id = :id AND published_at IS NOT NULL
   → ORDER BY published_at DESC
   → Kèm subquery đếm activeSentenceCount

3. userLessonProgressRepository.findByUserIdAndLessonIdIn(userId, lessonIds)
   → Load progress batch

4. Map → TopicDetailsResponse { id, name, slug, updatedAt, totalLessons, lessons[] }
```

**Response structure:**
```json
{
  "code": 200,
  "result": {
    "id": 1,
    "name": "BBC Learning English",
    "slug": "bbc-learning-english",
    "updatedAt": "2026-06-03T...",
    "totalLessons": 4,
    "lessons": [
      {
        "id": 75,
        "title": "Talking about weekend plans 🏊‍♀️🚴💃 Real Easy English",
        "slug": "talking-about-weekend-plans-real-easy-english",
        "languageLevel": "A2",
        "sourceType": "YOUTUBE",
        "durationSeconds": 283,
        "enableDictation": true,
        "enableShadowing": true,
        "activeSentenceCount": 6,
        "shadowingStatus": "NOT_STARTED",
        "dictationStatus": "NOT_STARTED",
        "shadowingProgressPercent": 0,
        "dictationProgressPercent": 0
      }
    ]
  }
}
```

### 2.3. `GET /api/learning-contents/lessons/resume` — Học tiếp

**Params:** `?page=0&size=10`

**Mục đích:** Lấy bài học đang học dở (pagination).

**Luồng xử lý:**
```
1. userLessonProgressRepository.findDistinctLessonIdAndModeByUserIdAndStatus()
   → Native query: SELECT DISTINCT lesson_id, mode FROM user_lesson_progress
     JOIN lessons ON user_lesson_progress.lesson_id = lessons.id
     WHERE user_id = :userId AND status = 'IN_PROGRESS' AND published_at IS NOT NULL
     → Trả về Page<Object[]> các cặp (lessonId, mode)

2. Với mỗi cặp (lessonId, mode) → tìm Lesson + UserLessonProgress → tính progressPercent

3. Trả về danh sách ResumeLessonDto
```

---

## 3. CSDL — Các bảng chính

### 3.1. `topics`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | BIGINT (PK, auto) | |
| name | VARCHAR(255) | Tên topic |
| slug | VARCHAR(255) | Unique, dùng cho URL |
| description | TEXT | Mô tả |
| is_active | BOOLEAN | Chỉ topic active mới hiển thị |
| color | VARCHAR(255) | Màu highlight |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 3.2. `lessons`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | BIGINT (PK, auto) | |
| topic_id | BIGINT (FK → topics.id) | |
| lesson_version | INTEGER | Version cho progress |
| title | VARCHAR(255) | Tiêu đề bài học |
| slug | VARCHAR(255) | |
| thumbnail_url | VARCHAR(255) | |
| description | TEXT | |
| lesson_type | ENUM ('AI_ASSISTED', 'TRADITIONAL') | |
| processing_step | ENUM | Trạng thái xử lý AI |
| language_level | ENUM ('A1'-'C2') | Trình độ |
| source_type | ENUM ('YOUTUBE', 'AUDIO_FILE', 'OTHER') | Nguồn |
| source_url | VARCHAR(500) | URL gốc (YouTube) |
| source_reference_id | VARCHAR(255) | YouTube video ID |
| duration_seconds | INTEGER | Thời lượng |
| total_sentences | INTEGER | Tổng số câu |
| status | ENUM ('DRAFT','PROCESSING','READY','ERROR') | |
| enable_dictation | BOOLEAN | Bật Dictation |
| enable_shadowing | BOOLEAN | Bật Shadowing |
| published_at | TIMESTAMP | Ngày publish (NULL = chưa publish) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Index:** `(topic_id, published_at DESC)` — tối ưu cho query lấy lesson mới nhất theo topic.

### 3.3. `lesson_sentences`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | BIGINT (PK, auto) | |
| lesson_id | BIGINT (FK → lessons.id) | |
| order_index | INTEGER | Thứ tự |
| text_raw | TEXT | Text gốc |
| text_display | TEXT | Text hiển thị |
| translation_vi | TEXT | Dịch tiếng Việt |
| phonetic_us | VARCHAR(1000) | Phiên âm |
| audio_start_ms | INTEGER | |
| audio_end_ms | INTEGER | |
| audio_segment_url | VARCHAR(500) | Audio segment |
| is_active | BOOLEAN | Có active không |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 3.4. `lesson_words`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | BIGINT (PK, auto) | |
| sentence_id | BIGINT (FK → lesson_sentences.id) | |
| order_index | INTEGER | |
| word_text | VARCHAR(255) | Từ gốc |
| word_normalized | VARCHAR(255) | Từ chuẩn hóa |
| lemma | VARCHAR(255) | Lemma |
| pos_tag | VARCHAR(50) | POS tag |
| entity_type | VARCHAR(50) | Entity type |
| audio_start_ms | INTEGER | |
| audio_end_ms | INTEGER | |
| is_clickable | BOOLEAN | |

### 3.5. `user_lesson_progress`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | BIGINT (PK, auto) | |
| user_id | VARCHAR(255) | Keycloak user ID |
| lesson_id | BIGINT | |
| mode | ENUM ('SHADOWING', 'DICTATION') | |
| status | ENUM ('IN_PROGRESS', 'COMPLETED') | |
| lesson_version | INTEGER | |
| progress_items | JSONB | Map<sentenceId, ProgressItem> |
| lesson_score | DOUBLE | |
| completed_sentence_count | INTEGER | |
| total_sentence_count | INTEGER | |
| completed_at | BIGINT | |
| updated_at | TIMESTAMP | |

**Unique constraint:** `(user_id, lesson_id, mode)` — mỗi user chỉ có 1 progress per (lesson, mode).

---

## 4. Cách query chi tiết

### 4.1. Home topics — Native SQL với ROW_NUMBER()

File: `LessonRepository.findLatestLessonsByTopicIds()`

```sql
SELECT x.id, x.topic_id, x.title, x.thumbnail_url, x.slug, 
       x.language_level, x.source_type, x.duration_seconds,
       x.enable_dictation, x.enable_shadowing,
       (SELECT COUNT(s.id) FROM lesson_sentences s 
        WHERE s.lesson_id = x.id AND s.is_active = true) AS activeSentenceCount
FROM (
    SELECT l.*,
           ROW_NUMBER() OVER (PARTITION BY l.topic_id ORDER BY l.published_at DESC) AS rn
    FROM lessons l
    WHERE l.topic_id IN (:topicIds)
      AND l.published_at IS NOT NULL
) x
WHERE x.rn <= :limitLessonsPerTopic
ORDER BY x.topic_id, x.published_at DESC
```

### 4.2. Topic detail — Tất cả lessons của topic

File: `LessonRepository.findAllLessonsWithCountByTopicId()`

```sql
SELECT l.id, l.topic_id, l.title, l.thumbnail_url, l.slug,
       l.language_level, l.source_type, l.duration_seconds,
       l.enable_dictation, l.enable_shadowing,
       (SELECT COUNT(s.id) FROM lesson_sentences s 
        WHERE s.lesson_id = l.id AND s.is_active = true) AS activeSentenceCount
FROM lessons l
WHERE l.topic_id = :topicId AND l.published_at IS NOT NULL
ORDER BY l.published_at DESC
```

### 4.3. Active topics (JPQL)

File: `TopicRepository.findActiveTopics()`

```java
@Query("""
    SELECT new TopicSummaryResponse(t.id, t.name, t.slug, t.updatedAt, COUNT(DISTINCT l.id))
    FROM Topic t
    LEFT JOIN Lesson l ON l.topic.id = t.id
    WHERE t.isActive = true
    GROUP BY t.id, t.name, t.slug, t.updatedAt
    ORDER BY t.updatedAt DESC
""")
```

---

## 5. Quản lý progress (UserLessonProgress)

### Cách tính tiến độ

```
progressPercent = round(completedSentenceCount / totalActiveSentences * 100)
```

- Mỗi user có 2 bản ghi progress per lesson: SHADOWING và DICTATION
- Progress items lưu trong JSONB: `{ sentenceId: { bestScore, latestScore, attemptCount, ... } }`
- Khi tất cả sentences hoàn thành → lesson được đánh dấu COMPLETED

### Cập nhật progress

```
PUT /api/learning-contents/process/progress
Body: { lessonId, sentenceId, mode: "SHADOWING", score: 85.0 }
```

---

## 6. Frontend xử lý & hiển thị

### 6.1. Trang `/topics` (Topics.tsx)

```
useEffect → dispatch(fetchTopics({ limitLessonsPerTopic: 4, limitTopics: 10 }))
  → topicsSlide.fetchTopics.pending → loading
  → API call: GET /learning-contents/topics/home
  → topicsSlide.fetchTopics.fulfilled → data ready

Render:
├── Header: "Danh sách phát" + subtitle
├── TopicFilterPanel: search + chip buttons (lọc client-side theo name/slug)
├── ResumeLearningSection: bài học đang học dở (nếu có)
└── Recently Updated:
    └── TopicSection × N (mỗi topic = 1 section)
        ├── Tên topic + link → /topics/:slug + badge (số lesson)
        └── LessonCard × 4 (max)
            ├── Thumbnail + level badge + source tag + duration
            ├── Title
            └── CompactProgress bars (shadowing + dictation)
```

### 6.2. Trang `/topics/:slug` (TopicDetails.tsx)

```
useParams() → { slug }
useEffect → dispatch(fetchTopicBySlug(slug))
  → topicSlide.fetchTopicBySlug.pending → loading
  → API call: GET /learning-contents/topics/{slug}
  → topicSlide.fetchTopicBySlug.fulfilled → data ready

Render:
├── Back button → /topics
├── Header: Tên topic + số lessons + ngày cập nhật + featured badge (≥10 lessons)
├── Filter: level buttons (All | A1 | A2 | B1 | B2 | C1 | C2)
│   └── Client-side filter: lessons.filter(l => l.languageLevel === levelFilter)
└── Grid: LessonCard × N (responsive: 1→2→3→4 cột)
    └── onClick → LessonModeDialog
        ├── Lesson info (title, level, source, duration)
        └── Buttons:
            ├── "Shadowing" → /learn/lessons/:id/:slug/shadowing
            └── "Dictation" → /learn/lessons/:id/:slug/dictation
```

---

## 7. Tổng kết luồng dữ liệu

| Bước | Mô tả |
|------|-------|
| 1 | User vào `/topics` |
| 2 | `Topics.tsx` dispatch `fetchTopics()` |
| 3 | `topicsSlide` gọi `handleAPI(GET /learning-contents/topics/home)` |
| 4 | Gateway nhận request, strip prefix, forward tới learning-content-service (port 8081) |
| 5 | `TopicController.getHomeTopics()` → `TopicService.getTopicsForHome()` |
| 6 | Service query: active topics → native SQL với ROW_NUMBER() lấy N lessons mới nhất per topic |
| 7 | Service query: batch load UserLessonProgress cho tất cả lessons |
| 8 | Map dữ liệu → `HomeTopicsResponse` (JSON) |
| 9 | Frontend nhận response → Redux state update → re-render |
| 10 | Tương tự cho `/topics/:slug`: dispatch `fetchTopicBySlug(slug)` |
| 11 | `TopicService.getTopicDetailsBySlug()` → query lessons WHERE topic_id AND published |
| 12 | Filter level là **client-side** (JavaScript filter, không gọi API lại) |
| 13 | Click lesson → `LessonModeDialog` → chọn mode → navigate tới trang học |

### Điểm đáng chú ý

- **Pagination Resume Learning:** dùng API riêng `GET /lessons/resume?page=0&size=10` (không qua Redux, fetch trực tiếp)
- **Filter level:** hoàn toàn client-side, không gọi lại API
- **Progress query:** batch load bằng `findByUserIdAndLessonIdIn()` để tránh N+1 query
- **activeSentenceCount:** đếm bằng SQL subquery, không phải Java memory
- **Lesson chỉ hiển thị khi đã publish** (`published_at IS NOT NULL`)
- **Topic chỉ hiển thị khi active** (`isActive = true`)

---

## 8. File cấu hình Gateway

File: `api-gateway/src/main/resources/application.yml`

```yaml
routes:
  - id: learning-content
    uri: http://localhost:8081
    predicates:
      - Path=/api/learning-contents/**
    filters:
      - StripPrefix=2
```

→ `http://localhost:8888/api/learning-contents/topics/home` → `http://localhost:8081/topics/home`
