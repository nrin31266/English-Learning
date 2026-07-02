# Vocabulary Module Context

## Tổng quan

Vocabulary dùng chuỗi dữ liệu `VocabTopic -> VocabSubTopic -> VocabWordEntry -> Word`. Curriculum và tiến độ nằm trong `dictionary-service` (MongoDB); learner UI nằm trong `learner-web`.

Admin sinh topic/subtopic/word bằng AI. Python worker bổ sung nghĩa, IPA, audio cho shared `Word`; Java callback cập nhật entry và trạng thái hoàn thành. Learner chỉ thấy topic/subtopic active và ready.

## Learner routes

- `/vocab/topics`: danh sách topic và tab tiến độ. Tab được giữ bằng `?tab=progress`.
- `/vocab/topics/:id`: danh sách subtopic.
- `/vocab/topics/:id/subtopics/:subtopicId`: xem từ và học subtopic.
- `/vocab/review`: phiên ôn toàn cục, tối đa 10 từ đến hạn sớm nhất.

Người chưa đăng nhập có thể xem nội dung nhưng không được bắt đầu học hoặc lưu tiến độ.

## Learner state

- `store/vocabSlide.ts`: catalog, filter, sort, pagination.
- `store/vocabDetailSlide.ts`: topic detail, subtopic đang chọn và word list.
- `store/vocabProgressSlice.ts`: dashboard, progress theo subtopic, review queue và submit session.
- Component không gọi trực tiếp progress HTTP; page dùng Redux thunk và `dispatch(thunk).unwrap()` khi cần kết quả.
- `features/vocab/api/vocabRewardBus.ts` chỉ tương quan reward WebSocket theo `sessionId`, không phải HTTP API.

## Chế độ học

`VocabLearningPanel` hỗ trợ:

1. Flashcard.
2. Anh → Việt.
3. Việt → Anh.
4. Nghe & nhập.

Mặc định `COMBINED` chạy lần lượt bốn mode. Người dùng cũng có thể chọn một mode riêng. Một session học mới thường có 5 từ; phiên ôn có 10 từ.

Phím tắt chính:

- Flashcard: `Space` lật thẻ.
- Quiz: `1–4` chọn đáp án.
- Đánh giá: `1` Đã thuộc, `2` Dễ, `3` Vừa, `4` Khó, `5` Học lại.
- `Enter` hoàn tất khi không focus input; `Tab` học tiếp.

Session chỉ submit một lần ở từ cuối. UI mở result ngay theo optimistic state; API lưu nền, sau đó WebSocket cập nhật XP/coin.

## Progress và spaced repetition

Mongo collection `user_vocab_progress` có một document cho mỗi `(userId, subtopicId)`:

- `words`: progress từng word, rating, mode đã học, điểm và lịch ôn.
- `activityByDate`: số lượt từ đã chốt theo ngày.
- `rewardedScores`: mốc điểm cao nhất, chống farm thưởng.
- `processedSessions`: idempotency cho session.
- `masteredWordCount`: counter số word rating `DONE`, tối ưu dashboard.

Rating và lịch ôn:

- `AGAIN`: 1 ngày, 20 điểm.
- `HARD`: 3 ngày, 40 điểm.
- `MEDIUM`: 7 ngày, 60 điểm.
- `EASY`: 14 ngày, 100 điểm.
- `DONE`: không lên lịch ôn, 100 điểm.

“Tổng từ đã thuộc” chỉ cộng `DONE`. “Lượt từ hôm nay” gồm học mới và ôn lại.

## Review queue

Backend tìm tất cả progress có `nextReviewAt <= now`, bỏ `DONE`, sắp tăng dần theo `nextReviewAt` và trả tối đa 10 từ đầu.

- `GET /vocab/progress/review?limit=10`: tổng số đến hạn và batch sớm nhất.
- `POST /vocab/progress/review/sessions`: đóng một session ôn, kể cả batch chứa từ thuộc nhiều subtopic.

Backend chia nội bộ theo subtopic để cập nhật document nhưng gom reward thành một event/session. Retry dùng cùng `sessionId` không cộng activity hoặc phần thưởng hai lần. Result hiển thị số còn lại và cho “Ôn tiếp” hoặc quay về `/vocab/topics?tab=progress`.

## Progress APIs

- `GET /vocab/subtopics/{id}/progress`.
- `POST /vocab/subtopics/{id}/progress/sessions`.
- `GET /vocab/progress/dashboard`.
- `GET /vocab/progress/scoped?topicIds=...` — progress nhẹ cho các topic đang hiển thị hoặc một topic detail.
- `GET /vocab/progress/review?limit=10`.
- `POST /vocab/progress/review/sessions`.

Các endpoint progress yêu cầu JWT; `SecurityUtils` lấy `userId` từ token, không nhận user ID từ client.

Dashboard tổng chỉ được gọi khi mở tab `?tab=progress`. Catalog gửi tối đa IDs của page hiện tại vào scoped API; topic detail chỉ gửi một ID. Scoped API dùng ba bulk query cố định (topic, subtopic, user progress), không gọi theo từng card.

## Reward flow

1. `dictionary-service` xác thực word thuộc subtopic và tính delta so với mốc tốt nhất.
2. Progress được lưu trước.
3. Service phát `GamificationRewardEvent` qua Kafka với event ID ổn định.
4. `user-service` lưu receipt chống xử lý trùng, cộng XP/coin rồi gửi WebSocket.
5. Learner result chờ reward bằng `sessionId`; timeout không làm mất reward phía server.

Mỗi từ tối đa 100 điểm. Học lại không thể nhận lại phần đã thưởng; chỉ phần điểm vượt mốc cũ mới tạo delta.

## Completion UI

- Subtopic hoàn thành khi số word đã chốt đạt tổng word ready; list chỉ hiện chữ “Hoàn thành”.
- Khi toàn bộ subtopic hoàn thành, header topic hiện badge tick theo phong cách `LessonModeLayout`.
- Result dùng bố cục hai cột trên màn lớn: danh sách từ bên trái, tổng kết và action bên phải.

## Backend content model

- `vocab_topics`: metadata, tags, CEFR, counters, status, active.
- `vocab_subtopics`: topic ID, EN/VI title, order, word counters, status, active.
- `vocab_word_entries`: quan hệ curriculum và context definition/meaning/example đã cache.
- `words`: shared dictionary, definitions, IPA và audio.
- `user_vocab_progress`: learner progress/session/review/reward watermark.

Entry tham chiếu shared word bằng `wordKey + pos`, không dùng `@DBRef`.

## Admin/AI pipeline

Admin routes nằm trong `admin-web/src/features/vocab`. Backend chính là `VocabAdminController` và `VocabService`.

Luồng generation:

1. Tạo topic và sinh subtopic.
2. Sinh word list cho subtopic.
3. Tạo/reuse shared `Word`.
4. Python worker claim word pending, sinh dictionary/IPA/audio.
5. Callback Java hydrate entry, cập nhật ready counters và gửi Kafka/WebSocket.

Status chính:

- Topic: `DRAFT -> GENERATING_SUBTOPICS -> READY_FOR_WORD_GEN -> PROCESSING -> READY`.
- Subtopic: `PENDING_WORDS -> GENERATING_WORDS -> PROCESSING_WORDS -> READY`.
- Word: `PENDING -> PROCESSING -> READY | FAILED`.

## Quy tắc khi sửa tiếp

- HTTP learner progress phải đi qua Redux thunk.
- Không lưu vocab progress vào localStorage.
- Không tính reward ở frontend.
- Không tin rating/word/subtopic do client gửi nếu chưa validate ownership và trạng thái.
- Giữ idempotency theo `sessionId` cho cả lưu progress, Kafka và reward consumer.
- Ôn tập chỉ lấy từ thật sự đến hạn; không thêm nút luyện tự do làm mất ý nghĩa spaced repetition.
- Khi đổi schema progress, giữ fallback hoặc migration cho document cũ.
