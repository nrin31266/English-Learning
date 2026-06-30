# Vocabulary Module Context

## 1. Tổng quan

- Vocabulary là module xây curriculum theo chuỗi `Topic -> Subtopic -> VocabWordEntry -> Word/Definition`, hiện được lưu trong MongoDB của `dictionary-service`.
- Admin tạo và xuất bản topic, gọi AI sinh subtopic/word list, theo dõi xử lý dictionary, chọn hoặc sinh nghĩa theo context, quản lý shared dictionary và bật/tắt nội dung public.
- Learner duyệt topic/subtopic đang active, xem từ, nghĩa Việt, định nghĩa, ví dụ và nghe audio. Nút **Học bài này** hiện chưa có logic; không tìm thấy practice, quiz, flashcard hay progress dành riêng cho Vocabulary.
- Luồng tổng thể:
  1. Admin tạo `VocabTopic`; UI tự gọi generate subtopics.
  2. `dictionary-service` gọi `language-processing-service` để AI sinh mô tả topic và các `VocabSubTopic`.
  3. Admin generate words cho từng subtopic; AI trả word/POS và backend tạo `VocabWordEntry` cùng shared `Word` ở trạng thái `PENDING` nếu chưa tồn tại.
  4. Python word worker claim `Word`, sinh dictionary definitions/IPA, tạo US audio, upload audio và cập nhật `Word` thành `READY`.
  5. Worker callback Java; backend chọn definition phù hợp topic/subtopic, cache context vào `VocabWordEntry`, cập nhật completion rồi gửi Kafka/WebSocket.
  6. Learner chỉ nhìn thấy topic/subtopic active; word response kết hợp context cache từ entry với full shared dictionary/audio từ `Word`.
- API Gateway map `/api/dictionaries/**` vào `dictionary-service` rồi strip hai prefix; frontend gọi dạng `/dictionaries/...`. Xem `api-gateway/src/main/resources/application.yml`.

## 2. Admin Frontend

### Routes

- `/vocab/topics` -> `admin-web/src/features/vocab/pages/VocabTopicsPage.tsx`.
- `/vocab/topics/:topicId/subtopics` -> `admin-web/src/features/vocab/pages/VocabSubTopicsPage.tsx`.
- `/dictionary/words` -> `admin-web/src/features/vocab/pages/AdminDictionaryWordsPage.tsx` (quản lý shared `Word`, liên quan trực tiếp tới vocab entries).
- Khai báo route: `admin-web/src/routers/router.tsx`; sidebar: `admin-web/src/components/layout/AppSidebar.tsx`.

### Pages/components chính

- Topic page có search debounce 500 ms, tag/status filter, newest/oldest sort, pagination, card/list view; state filter đồng bộ URL.
- Topic components:
  - `CreateVocabTopicDialog.tsx`: title, tags, CEFR range, estimated word count.
  - `EditVocabTopicDialog.tsx`: sửa title/description/tags/CEFR và upload thumbnail.
  - `DeleteVocabTopicDialog.tsx`: cảnh báo cascade subtopics/entries.
  - `VocabTopicCard.tsx`, `VocabTopicListCard.tsx`: status, ready subtopic count và actions Generate/Open/Active/Edit/Delete.
- Subtopic page hiển thị topic completion và grid subtopic. Mỗi card có status, CEFR, `readyWordCount/wordCount`, Generate/View/Active/Delete.
- `VocabWordsDialog.tsx` tải words theo subtopic, hiển thị ready count, reload, play US audio, xóa toàn bộ entries và mở context dialog.
- `VocabWordCard.tsx` tách rõ context-matched data và shared dictionary data.
- `VocabWordContextDialog.tsx` chính là candidate meaning modal: so khớp definition đang dùng, cho chọn một definition có sẵn hoặc gọi AI tạo nghĩa mới.
- `AdminDictionaryWordsPage.tsx` quản lý shared `Word`: search/filter, create pending word, sửa basic fields/definitions, regenerate, xem usages, sync definition thay đổi xuống vocab entries và chặn xóa word đang được sử dụng.

### State/hook và API client

- Redux vocabulary: `admin-web/src/store/vocab/vocabSlice.ts`.
  - Giữ topic page metadata, subtopics, words và active IDs.
  - Optimistic status khi request generate pending.
  - Nhận WebSocket reducers `onSubtopicsGenerated`, `updateSubtopicFromWs`, `updateSubtopicProgress`.
- Redux shared dictionary: `admin-web/src/store/dictionary/dictionarySlice.ts`.
- HTTP wrapper: `admin-web/src/apis/handleAPI.ts`.
- WebSocket provider: `admin-web/src/features/ws/providers/WebSockerProvider.tsx`.

### Logic status và completion

- Topic UI map `DRAFT`, `GENERATING_SUBTOPICS`, `READY_FOR_WORD_GEN`, `PROCESSING`, `READY` thành badge riêng.
- Subtopic UI map `PENDING_WORDS`, `GENERATING_WORDS`, `PROCESSING_WORDS`, `READY`.
- Topic completion hiển thị khi `status === READY` hoặc `readySubtopicCount >= subtopicCount > 0`.
- Subtopic completion hiển thị khi `status === READY` và `readyWordCount >= wordCount`.
- UI subscribe:
  - `/topic/vocab/subtopics-generated` để refetch subtopics và cập nhật topic.
  - `/topic/vocab/subtopic-ready` để cập nhật subtopic/topic counts.
  - `/topic/vocab/subtopic-progress` để hiển thị live word progress. Tuy nhiên không tìm thấy producer backend gửi `VocabSubTopicProgressEvent`; channel này hiện có consumer/relay nhưng có thể không nhận dữ liệu.

### Generate AI và thao tác quản trị

- Tạo topic thành công sẽ tự dispatch `generateSubTopics`; topic `DRAFT` cũng có nút Generate thủ công.
- Generate subtopics/words là HTTP `202 Accepted`, backend chạy `@Async`; UI giữ trạng thái local và chờ WebSocket.
- Generate words chỉ được UI đưa ra khi subtopic `PENDING_WORDS`.
- Candidate meaning:
  - `Use` gọi manual context update và copy definition vào cache của entry.
  - `Generate with AI` gọi synchronous single-meaning endpoint, timeout frontend 30 giây.
- Active/inactive:
  - Topic có thể toggle từ topic page hoặc subtopic header.
  - Subtopic chỉ enable toggle khi `READY`.
- Delete/refresh:
  - Xóa topic cascade subtopics và entries theo `topicId`.
  - Xóa subtopic cascade entries của subtopic.
  - Delete all words reset subtopic về `PENDING_WORDS`.
  - Words dialog reload bằng GET; có backend recalculate endpoint/thunk nhưng không tìm thấy UI nào gọi `recalculateTopic`.

## 3. Learner Frontend

### Routes và pages

- `/vocab/topics` -> `learner-web/src/features/vocab/pages/VocabTopicsPage.tsx`.
- `/vocab/topics/:id` và `/vocab/topics/:id/subtopics/:subtopicId` cùng dùng `VocabTopicDetail.tsx`.
- `/dictionary` chỉ là placeholder `Dictionary Page`; không phải trang dictionary hoàn chỉnh.
- Route nằm trong `learner-web/src/routers/router.tsx`.

### State và API

- `learner-web/src/store/vocabSlide.ts`: topic catalog, filters/pagination; luôn gửi `activeOnly=true`.
- `learner-web/src/store/vocabDetailSlide.ts`: topic detail, active subtopics, selected subtopic và words.
- `learner-web/src/types/index.ts`: `IVocabTopic`, `IVocabSubTopic`, `IVocabWordEntry`, `IVocabWordDetail`.
- API gọi:
  - GET `/dictionaries/vocab/topics`.
  - GET `/dictionaries/vocab-tags`.
  - GET `/dictionaries/vocab/topics/{topicId}`.
  - GET `/dictionaries/vocab/topics/{topicId}/subtopics`.
  - GET `/dictionaries/vocab/subtopics/{subtopicId}/words`.

### Cách learner sử dụng dữ liệu

- Topic list có search, tags, sort, pagination và card/list view; chỉ topic active được backend trả về.
- Topic detail chỉ render subtopic active. URL giữ selected subtopic để deep-link và responsive back navigation.
- Word cards ưu tiên context fields (`contextDefinition`, `contextMeaningVi`, examples, level), fallback sang `wordDetail.definitions[0]`/`summaryVi`.
- Audio ưu tiên US rồi UK URL trong `wordDetail.phonetics`, phát trực tiếp bằng `new Audio(url)`.
- Nút `Học bài này` có `handleStartLearning` rỗng. **Practice/quiz/flashcard/progress: Not found**.

### Shared dictionary popup với lesson modes

- `learner-web/src/components/WordPopup.tsx` + `learner-web/src/hooks/UseWordPopupReturn.ts` dùng trong Shadowing (`ActiveSentencePanel.tsx`) và Dictation (`DictationPanel.tsx`).
- Khi click lesson word, hook POST `/dictionaries/words` với text, sentence context, POS/entity/lemma và `isFallback=true`.
- Popup hỗ trợ `READY`, `FALLBACK`, `PROCESSING`, `FAILED`, IPA/audio UK/US, definitions và link Cambridge.
- Popup này không được tái sử dụng trong Vocabulary catalog; catalog dùng cards riêng.

## 4. Backend Data Model

Tất cả model vocabulary chính nằm trong `dictionary-service/src/main/java/com/rin/dictionaryservice/model` và dùng MongoDB.

### Topic (`vocab_topics`)

- `VocabTopic`: `id`, `title`, `description`, `tags`, `cefrRange`, `estimatedWordCount`, `subtopicCount`, `readySubtopicCount`, `status`, `isActive`, `thumbnailUrl`, `publishedAt`, timestamps.
- `VocabTag`: `id`, `name`, `slug`, `sortOrder`, `isActive`; seed ở `dictionary-service/.../config/VocabTagSeeder.java`.

### Subtopic (`vocab_subtopics`)

- `VocabSubTopic`: `id`, `topicId`, title EN/VI, description, CEFR, order, word/ready counts, status, active, timestamps.
- Compound index `(topicId, order)`.

### Entry (`vocab_word_entries`)

- `VocabWordEntry` là quan hệ curriculum giữa subtopic/topic và shared word: `subtopicId`, `topicId`, `wordKey`, `pos`, `order`, `wordReady`, `note`, `wordText`.
- Cache nghĩa đã resolve theo context: `contextDefinition`, `contextMeaningVi`, `contextExample`, `contextViExample`, `contextLevel`.
- Index theo `(topicId, wordKey, pos)`, `(subtopicId, order)`, `(wordKey, pos, wordReady)`.

### Shared dictionary (`words`)

- `Word`: canonical `text/key/pos`, lemma/entity/context, `summaryVi`, CEFR, phonetics UK/US + audio URLs, list `Definition`, phrase metadata, validity, processing status/retry/lock và timestamps.
- `Definition`: English definition, Vietnamese meaning, EN/VI examples, CEFR level.
- Unique logical ID/key là `wordKey|POS`; model cũng khai báo unique compound `(key, pos)`.
- Không có bảng/model `Meaning` hoặc `Dictionary` riêng: meanings là embedded `Word.Definition`; context là cached fields trong `VocabWordEntry`.

### Status enums và quan hệ

- Topic: `DRAFT -> GENERATING_SUBTOPICS -> READY_FOR_WORD_GEN -> PROCESSING -> READY`.
- Subtopic: `PENDING_WORDS -> GENERATING_WORDS -> PROCESSING_WORDS -> READY`.
- Word: `PENDING -> PROCESSING -> READY | FAILED`.
- Quan hệ được giữ bằng string IDs, không có Mongo `@DBRef`:
  `VocabTopic 1-N VocabSubTopic 1-N VocabWordEntry N-1 Word (wordKey+pos)`.

## 5. Backend API

Các path dưới đây là path sau gateway prefix `/dictionaries`; controller/service chính là `VocabAdminController`, `VocabController`, `AdminDictionaryController`, `WordController` và `VocabService`/`AdminDictionaryService`.

### Admin vocabulary

- `POST /admin/vocab/topics` — `CreateVocabTopicRequest` -> `VocabTopicResponse`; `VocabService.createTopic`; admin create dialog.
- `GET /admin/vocab/topics` — query q/tags/status/page/size/sort -> `PageResponse<VocabTopicResponse>`; admin topic page.
- `GET /admin/vocab/topics/{id}` — response topic; không tìm thấy admin UI gọi trực tiếp.
- `PUT /admin/vocab/topics/{id}` — `UpdateVocabTopicRequest`; edit topic/thumbnail flow.
- `DELETE /admin/vocab/topics/{id}` — cascade delete; admin topic page.
- `POST /admin/vocab/topics/{id}/generate-subtopics` — 202 + topic; `acceptGenerateSubTopics` rồi `generateSubTopicsAsync`; admin topic page.
- `GET /admin/vocab/topics/{id}/subtopics?activeOnly=false` — list subtopics; admin pages.
- `POST /admin/vocab/subtopics/{id}/generate-words` — 202 + subtopic; `acceptGenerateWords` rồi `generateWordsAsync`; admin subtopic page.
- `GET /admin/vocab/subtopics/{id}/words` — word entries + shared word detail; words dialog.
- `DELETE /admin/vocab/subtopics/{id}` — cascade entries; subtopic page.
- `DELETE /admin/vocab/subtopics/{id}/words` — reset word pipeline; words dialog.
- `POST /admin/vocab/topics/{id}/recalculate` — recompute counts/status; thunk tồn tại, UI usage **Not found**.
- `POST /admin/vocab/topics/{id}/upload-image` — multipart proxy sang LPS; edit dialog.
- `PUT /admin/vocab/topics/{id}/toggle-active` — topic active toggle.
- `PUT /admin/vocab/subtopics/{id}/toggle-active` — subtopic active toggle.
- `PUT /admin/vocab/word-entries/{id}/context` — `UpdateEntryContextRequest`; candidate meaning `Use`.
- `POST /admin/vocab/word-entries/{id}/generate-meaning` — synchronous AI single meaning; candidate modal.

### Public vocabulary/dictionary

- `GET /vocab/topics` — active/filter/page topic catalog; learner.
- `GET /vocab/topics/{id}` — requires active topic; learner detail.
- `GET /vocab/topics/{id}/subtopics` — requires active topic, returns active subtopics; learner.
- `GET /vocab/subtopics/{id}/words` — requires active topic + subtopic; learner.
- `GET /vocab-tags` — active sorted tags; both frontends.
- `POST /words` — `WordSearchRequest` -> `WordResponse`; lesson `WordPopup`. Có DB/cache lookup, queue creation và external dictionary fallback.

### Admin shared dictionary

- `GET /admin/dictionary/words`, `GET /{wordId}` — list/detail.
- `POST /admin/dictionary/words` — tạo `Word` PENDING.
- `PUT /admin/dictionary/words/{wordId}` — sửa basic dictionary fields/status.
- `PUT /admin/dictionary/words/{wordId}/definitions` — thay definition list, optional sync used entries.
- `PATCH /admin/dictionary/words/{wordId}/definitions/{index}` — sửa một definition, optional sync.
- `POST /admin/dictionary/words/{wordId}/regenerate` — reset PENDING, optional clear definitions.
- `DELETE /admin/dictionary/words/{wordId}` — chỉ xóa khi usage count = 0.
- `GET /admin/dictionary/words/{wordId}/entries` — paged vocab usages.

### Internal

- `POST /api/internal/vocab/words-ready` — `WordReadyRequest`; Python worker callback để hydrate entries/completion.
- LPS endpoints: `/internal/vocab/gen-subtopics`, `/gen-words`, `/generate-single-meaning`, `/internal/upload/image`; được bảo vệ bởi `X-Worker-Key`.

## 6. AI Generation Flow

- Prompt/schema nằm tại `language-processing-service/src/llm/prompts.py`:
  - `VOCAB_SYSTEM_PROMPT` ép JSON-only.
  - `build_subtopic_prompt` sinh topic description + semantic-boundary subtopics.
  - `build_word_gen_prompt` sinh 16–26 word/phrase items, custom POS và tránh overlap.
  - `_WORD_SCHEMA`/word analyzer sinh dictionary, IPA, definitions, examples, CEFR.
  - `build_single_meaning_prompt` sinh đúng một nghĩa thật theo topic/subtopic context.
- FastAPI routes ở `language-processing-service/src/routers/internal_router.py`; Java gọi qua `LanguageProcessingClient`.
- Subtopic và word-list generation chạy `@Async` trong JVM; không có persisted AI job entity. Failure reset topic về `DRAFT` hoặc subtopic về `PENDING_WORDS`.
- Dictionary enrichment là background worker thực sự:
  - `language-processing-service/src/workers/word/word_worker.py` claim batch 5 `Word` PENDING trực tiếp từ Mongo.
  - AI analyze batch, `word_processor.py` sinh/upload US audio, cập nhật Word READY rồi callback Java.
  - Retry tối đa 5; Java `WordService.recoverStuckJobs` chạy mỗi phút, reset PROCESSING quá 10 phút hoặc đánh FAILED.
- Existing READY word được dùng ngay và backend chọn definition bằng `VocabContextScoringHelper`: keyword/phrase overlap, topic/subtopic title/description/tags, CEFR distance, completeness và deterministic tie-break.
- Admin có retry theo hai mức: delete all rồi generate lại subtopic words; hoặc regenerate một shared Word. Có refresh list, nhưng không có batch generate-all-subtopics hay quality dashboard.

## 7. Current Status Logic

- **Ready (Word)**: worker đã ghi dictionary/IPA/audio/definitions vào shared `Word`. Entry chỉ ready sau callback hoặc khi generate list gặp Word đã READY.
- **Ready (Subtopic)**: `wordCount > 0` và số entry `wordReady=true` đạt `wordCount`.
- **Ready (Topic)**: `subtopicCount > 0` và số subtopic READY đạt tổng.
- **Pending**:
  - `PENDING_WORDS`: subtopic chưa có entries hoặc vừa delete all/failure.
  - `Word.PENDING`: chờ Python worker claim.
- **Processing**:
  - `GENERATING_*`: đang chờ LPS sinh cấu trúc/list.
  - `PROCESSING_WORDS`: entries đã tạo nhưng còn Word chưa ready.
  - Topic `PROCESSING`: một phần subtopic ready hoặc recalculate thấy chưa đủ.
- Completed counts là denormalized counters trong topic/subtopic, được cập nhật từ DB counts khi callback/recalculate; frontend cũng có logic suy diễn completion từ counters.
- `isActive` là publication flag:
  - Topic activation chặn DRAFT/GENERATING/no-subtopic, nhưng không yêu cầu topic `READY`.
  - Subtopic activation yêu cầu `READY`.
  - Public endpoints bắt active topic/subtopic, nhưng public word list không lọc `wordReady` riêng.
- Manual context update và single-meaning generation set entry `wordReady=true`, nhưng không gọi `checkSubTopicCompletion`; counts/status có thể stale cho đến một callback/recalculate khác.

## 8. Điểm mạnh hiện tại

- Tách `Word` dùng chung khỏi `VocabWordEntry` theo curriculum giúp reuse dictionary/audio và hỗ trợ polysemy theo context.
- Context definition được cache ở entry, tránh scoring lại khi learner fetch; list response tránh N+1 bằng bulk `findAllById`.
- Human-in-the-loop rõ: admin xem candidate definitions, chọn nghĩa hoặc yêu cầu AI tạo nghĩa mới.
- Prompt subtopic nhấn mạnh include/exclude boundaries; prompt word list hỗ trợ phrases/collocations/idioms và CEFR.
- Worker có claim lock, retry, stuck-job recovery, batch AI và callback completion.
- Public API enforce active topic/subtopic; admin và learner state/routes được tách tương đối sạch.
- Shared dictionary admin có usage visibility và cơ chế sync definitions xuống entries, nên nên giữ khi refactor.

## 9. Vấn đề / điểm rối hiện tại

- Có ba tầng status độc lập nhưng không có persisted pipeline/job status; lỗi async chỉ reset về trạng thái trước, không lưu error/retry metadata cho topic/subtopic.
- Không tìm thấy producer `VocabSubTopicProgressEvent`, dù common event, notification relay và admin subscription đều tồn tại. Admin có thể chỉ nhảy progress khi subtopic hoàn tất.
- `acceptGenerateSubTopics` xóa subtopics cũ nhưng không xóa `VocabWordEntry` cũ theo topic, có nguy cơ tạo orphan entries.
- Topic có thể active trước khi READY; public catalog cũng chỉ filter active, không filter READY. Topic chưa hoàn tất có thể xuất hiện nhưng không có subtopic active.
- Public word endpoint không filter `wordReady`; nếu dữ liệu active bị lệch, learner có thể nhận pending entries thiếu dictionary/context.
- Manual `updateEntryContextManual` và `generateSingleMeaningSync` không chạy completion checks, dễ làm `readyWordCount` stale.
- Topic list backend dùng `findAll()` rồi filter/sort/page trong RAM; sẽ kém khi dữ liệu lớn.
- `READY_FOR_WORD_GEN` là tên dễ hiểu nhầm: topic đã có subtopics nhưng không nói có bao nhiêu subtopic đã bắt đầu word processing. Topic cũng không được chuyển PROCESSING ngay khi generate một subtopic.
- `readySubtopicCount`/`readyWordCount` vừa là stored counters vừa được frontend tự suy diễn; nhiều nguồn sự thật dễ lệch.
- Learner có CTA `Học bài này` nhưng handler rỗng; prompt nói dữ liệu dùng cho quiz/flashcard, nhưng feature đó **Not found**.
- Vocabulary catalog và lesson `WordPopup` hiển thị dictionary theo hai UI/data path khác nhau, chưa có shared presentation model.
- Naming `Word`/`VocabWordEntry`, `definition`/`meaningVi`, `context*`/`wordDetail.definitions` hợp lý về kỹ thuật nhưng chưa được giải thích trong type/domain boundary, dễ khiến frontend lấy fallback không nhất quán.
- `publishedAt` có trong model/DTO nhưng không tìm thấy flow set giá trị; publication thực tế dùng `isActive`.

## 10. Gợi ý hướng refactor

- Thêm pipeline state có error metadata và timestamps cho generation (`SUBTOPIC_GENERATION`, `WORD_LIST_GENERATION`, `DICTIONARY_ENRICHMENT`), nhưng giữ domain status đơn giản để public query dễ hiểu.
- Chuẩn hóa transition service duy nhất cho counters/status; mọi đường làm entry ready (worker callback, manual select, single AI meaning, dictionary sync) đều gọi cùng completion updater.
- Thêm batch actions: generate words cho tất cả subtopic pending, retry failed words, recalculate/repair topic; action phải idempotent và có progress.
- Thêm quality dashboard: missing context/audio/IPA/examples, duplicate words across neighboring subtopics, failed/stuck words, stale counters và inactive-ready content.
- Giữ `Word.Definition` là shared dictionary meaning và `VocabWordEntry.context*` là selected contextual sense, nhưng đặt tên/API rõ hơn như `dictionaryDefinitions` và `selectedSense`; cân nhắc lưu `selectedDefinitionId/index` thay vì chỉ copy text nếu cần traceability.
- Di chuyển topic filtering/pagination xuống Mongo query/index thay vì `findAll()`.
- Chỉ public topic `READY && active`; chỉ public subtopic `READY && active`; chỉ trả entry ready hoặc expose rõ partial mode.
- Khi regenerate subtopics, cascade dọn entries cũ trong cùng transaction-like orchestration/repair job.
- Dùng AI cho các điểm có giá trị cao: semantic overlap/duplicate audit giữa subtopics, quality scoring definitions/examples, gợi ý sửa context và tạo distractors cho quiz. Không nên dùng AI lại mỗi lần learner đọc dữ liệu đã chuẩn hóa.
- Nếu triển khai learning mode, xây progression riêng (flashcard/quiz/listening/matching) trên stable entry IDs; hiện chưa nên gắn thêm logic vào catalog page.

## Appendix: File paths quan trọng đã đọc

### Admin frontend

- `admin-web/src/routers/router.tsx`
- `admin-web/src/components/layout/AppSidebar.tsx`
- `admin-web/src/types/index.ts`
- `admin-web/src/store/vocab/vocabSlice.ts`
- `admin-web/src/store/dictionary/dictionarySlice.ts`
- `admin-web/src/features/vocab/pages/VocabTopicsPage.tsx`
- `admin-web/src/features/vocab/pages/VocabSubTopicsPage.tsx`
- `admin-web/src/features/vocab/pages/AdminDictionaryWordsPage.tsx`
- `admin-web/src/features/vocab/components/CreateVocabTopicDialog.tsx`
- `admin-web/src/features/vocab/components/EditVocabTopicDialog.tsx`
- `admin-web/src/features/vocab/components/DeleteVocabTopicDialog.tsx`
- `admin-web/src/features/vocab/components/VocabTopicCard.tsx`
- `admin-web/src/features/vocab/components/VocabTopicListCard.tsx`
- `admin-web/src/features/vocab/components/VocabWordsDialog.tsx`
- `admin-web/src/features/vocab/components/VocabWordCard.tsx`
- `admin-web/src/features/vocab/components/VocabWordContextDialog.tsx`

### Learner frontend

- `learner-web/src/routers/router.tsx`
- `learner-web/src/types/index.ts`
- `learner-web/src/types/dictionary.ts`
- `learner-web/src/store/vocabSlide.ts`
- `learner-web/src/store/vocabDetailSlide.ts`
- `learner-web/src/features/vocab/pages/VocabTopicsPage.tsx`
- `learner-web/src/features/vocab/pages/VocabTopicDetail.tsx`
- `learner-web/src/features/vocab/components/VocabTopicCard.tsx`
- `learner-web/src/features/vocab/components/VocabTopicListCard.tsx`
- `learner-web/src/components/WordPopup.tsx`
- `learner-web/src/hooks/UseWordPopupReturn.ts`
- `learner-web/src/features/learnshadowing/components/ActiveSentencePanel.tsx`
- `learner-web/src/features/learndictation/components/DictationPanel.tsx`

### Backend, worker và event relay

- `api-gateway/src/main/resources/application.yml`
- `dictionary-service/src/main/resources/application.yml`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/VocabAdminController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/VocabController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/VocabTagController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/WordController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/AdminDictionaryController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/controller/internal/VocabWorkerController.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/service/VocabService.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/service/WordService.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/service/AdminDictionaryService.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/service/support/VocabAiResponseParser.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/service/support/VocabContextScoringHelper.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/model/{VocabTopic,VocabSubTopic,VocabWordEntry,VocabTag,Word}.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/constant/{VocabTopicStatus,VocabSubTopicStatus,WordCreationStatus}.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/dto/` (vocab request/response, AI payload và admin word DTOs liên quan)
- `dictionary-service/src/main/java/com/rin/dictionaryservice/repository/{VocabTopicRepository,VocabSubTopicRepository,VocabWordEntryRepository,VocabTagRepository,WordRepository}.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/repository/httpclient/LanguageProcessingClient.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/kafka/{KafkaProducer,KafkaConsumer}.java`
- `dictionary-service/src/main/java/com/rin/dictionaryservice/config/{AsyncConfig,VocabTagSeeder,WorkerKeyFilter}.java`
- `language-processing-service/src/routers/internal_router.py`
- `language-processing-service/src/llm/prompts.py`
- `language-processing-service/src/workers/word/word_worker.py`
- `language-processing-service/src/services/word_processor.py`
- `language-processing-service/src/client/mongo_word_repository.py`
- `common/src/main/java/com/rin/englishlearning/common/constants/KafkaTopics.java`
- `common/src/main/java/com/rin/englishlearning/common/event/{VocabSubTopicProgressEvent,VocabSubTopicReadyEvent,VocabSubtopicsGeneratedEvent}.java`
- `notification-service/src/main/java/com/rin/notificationservice/kafka/KafkaConsumer.java`
