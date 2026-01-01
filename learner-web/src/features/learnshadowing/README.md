# Learn Shadowing Feature - Documentation

## 📋 Tổng quan

Feature **Learn Shadowing** là tính năng học tiếng Anh theo phương pháp shadowing (bóng theo). User nghe một câu tiếng Anh, sau đó đọc theo và ghi âm. Hệ thống sẽ phân tích pronunciation và cho điểm.

## 🏗️ Cấu trúc thư mục

```
learnshadowing/
├── components/          # Các component UI
│   ├── ActiveSentencePanel.tsx       # Panel chính cho câu đang practice
│   ├── AudioShadowing.tsx            # Media player cho audio files
│   ├── YouTubeShadowing.tsx          # Media player cho YouTube videos
│   ├── SentenceDisplay.tsx           # Hiển thị câu với các từ clickable
│   ├── ShadowingResultPanel.tsx      # Hiển thị kết quả phân tích pronunciation
│   ├── ShadowingTranscript.tsx       # Danh sách tất cả các câu
│   └── KeyboardShortcutsHelp.tsx     # Dialog hướng dẫn phím tắt
├── pages/              # Page components
│   └── ShadowingMode.tsx             # Page chính cho shadowing mode
└── types/              # Type definitions
    └── types.ts                      # Interface cho player refs
```

## 🔄 Luồng hoạt động chính

### 1. Khởi động (ShadowingMode.tsx)
```
User navigate -> /lesson/:slug/shadowing
    ↓
Fetch lesson data từ API
    ↓
Hiển thị UI: Media Player + Active Sentence Panel + Transcript
    ↓
User click "Bắt đầu" (first interaction để comply browser policy)
```

### 2. Practice một câu (Flow chính)
```
1. Media player tự động play đoạn audio của câu (audioStartMs -> audioEndMs)
2. User nghe và đọc theo
3. User click "Start Recording" để ghi âm
    ↓
4. MediaRecorder ghi âm microphone
5. User click "Stop & Save"
    ↓
6. Upload audio lên server (/lp/speech-to-text/transcribe)
    ↓
7. Server phân tích và trả về kết quả (IShadowingResult)
    ↓
8. Hiển thị ShadowingResultPanel với:
   - Điểm số pronunciation (0-100%)
   - Chi tiết từng từ (CORRECT, NEAR, WRONG, MISSING, EXTRA)
   - Feedback message
    ↓
9. Nếu điểm >= 85: hiển thị "Next sentence" button (màu xanh)
   Nếu điểm < 85: hiển thị "Skip this sentence" button (màu vàng)
    ↓
10. User click Next/Skip -> chuyển sang câu tiếp theo
    ↓
    Quay lại bước 1
```

## 🎯 Components chi tiết

### ShadowingMode.tsx (Page Component)
**Vai trò:** Container chính, quản lý state và coordinate các components con

**State quản lý:**
- `activeIndex`: Index của câu đang practice
- `autoStop`: Auto dừng khi hết đoạn audio của câu
- `shouldAutoPlay`: Flag để control auto-play (false khi user click chọn câu)
- `userInteracted`: User đã tương tác với player chưa
- `showTranscript`: Hiển thị/ẩn transcript panel
- `showHelp`: Hiển thị/ẩn keyboard shortcuts help

**Keyboard shortcuts:**
- `Ctrl`: Replay câu hiện tại
- `Tab` hoặc `PageDown`: Câu tiếp theo
- `PageUp`: Câu trước đó

**Refs:**
- `playerRef`: Điều khiển media player (play, pause, playCurrentSegment)

---

### ActiveSentencePanel.tsx
**Vai trò:** Panel chính hiển thị câu đang practice và controls

**Tính năng:**
1. **Hiển thị câu** (SentenceDisplay)
2. **Transport controls** (Prev, Replay, Play, Pause, Next)
3. **Recording controls:**
   - Start Recording / Stop & Save
   - Play recorded audio
   - Cancel recording
4. **Hiển thị kết quả** (ShadowingResultPanel)
5. **Auto Next/Skip buttons** (dựa trên điểm số)

**Recording Flow:**
```javascript
startRecording()
  ↓
navigator.mediaDevices.getUserMedia({ audio: true })
  ↓
MediaRecorder.start()
  ↓
... user đọc ...
  ↓
stopRecording()
  ↓
MediaRecorder.stop() -> ondataavailable -> onstop
  ↓
Tạo Blob từ chunks
  ↓
Upload FormData lên API
  ↓
Nhận ITranscriptionResponse
  ↓
Hiển thị kết quả
```

**State quan trọng:**
- `isRecording`: Đang ghi âm
- `hasRecordedAudio`: Đã có audio ghi sẵn
- `isPlayingRecorded`: Đang phát lại audio đã ghi
- `isUploading`: Đang upload lên server
- `transcription`: Kết quả phân tích từ server

**Feedback âm thanh:**
- `success.wav`: Phát khi điểm >= 85
- `not_correct.ogg`: Phát khi điểm < 85

**Cleanup critical:**
- Dừng MediaRecorder khi unmount
- Stop tất cả media tracks (microphone)
- Cleanup audio player
- Revoke object URLs

---

### AudioShadowing.tsx / YouTubeShadowing.tsx
**Vai trò:** Media players (audio file vs YouTube video)

**Interface chung (ShadowingPlayerRef):**
```typescript
interface ShadowingPlayerRef {
  playCurrentSegment: () => void;  // Play từ audioStartMs của câu
  play: () => void;                // Continue play
  pause: () => void;               // Pause
  getUserInteracted: () => boolean;// Check user đã click "Bắt đầu"
}
```

**Tính năng:**
- Auto-play khi chuyển câu (nếu `shouldAutoPlay = true` và `userInteracted = true`)
- Auto-stop tại `audioEndMs` (nếu `autoStop = true`)
- Progress bar clickable để seek
- Overlay "Bắt đầu" cho first interaction (browser policy)

**Browser Autoplay Policy:**
- Browser không cho phép auto-play media cho đến khi user tương tác
- Giải pháp: hiển thị overlay "Bắt đầu", user phải click
- Sau khi click, set `userInteracted = true`, mới được auto-play

**YouTube-specific (YouTubeShadowing):**
- Sử dụng `react-youtube` library
- PADDING_SEC = 0.1s (lùi/tiến một chút so với audioStartMs/audioEndMs)
- Dùng `setTimeout` thay vì `setInterval` để auto-stop (hiệu quả hơn)

**Cleanup critical:**
- Pause và destroy player khi unmount
- Cleanup khi tab bị ẩn (visibilitychange)
- Cleanup khi F5/navigate (beforeunload)

---

### SentenceDisplay.tsx
**Vai trò:** Hiển thị câu dưới dạng các từ riêng biệt, clickable

**Props:**
- `words`: Mảng ILLessonWord (có orderIndex để sort)
- `onWordClick`: Callback khi click vào từ (có thể dùng để show word details modal)

**Kỹ thuật:**
- `React.memo` để tránh re-render không cần thiết
- `useMemo` để cache sorted words
- Mỗi từ là `<button>` để accessibility tốt

---

### ShadowingResultPanel.tsx
**Vai trò:** Hiển thị kết quả phân tích pronunciation

**Data structure (IShadowingResult):**
```typescript
{
  weightedAccuracy: number;        // Điểm tổng (0-100)
  correctWords: number;            // Số từ đọc đúng
  totalWords: number;              // Tổng số từ
  lastRecognizedPosition: number;  // Vị trí từ cuối user đọc được
  compares: IShadowingWordCompare[]; // Chi tiết từng từ
}

IShadowingWordCompare {
  position: number;
  expectedWord: string;           // Từ trong câu mẫu
  recognizedWord: string;         // Từ user thực sự đọc
  status: "CORRECT" | "NEAR" | "WRONG" | "MISSING" | "EXTRA";
}
```

**Màu sắc theo status:**
- `CORRECT`: Xanh lá (emerald)
- `NEAR`: Vàng (amber)
- `WRONG`: Đỏ (red)
- `MISSING`: Xám, italic (slate)
- `EXTRA`: Xanh dương (blue)
- Chưa đọc tới: Mờ, border dashed

**Hiển thị 2 hàng:**
1. **Target sentence**: Câu mẫu cần đọc
2. **You said**: Những gì user thực sự đọc

**Optimization:**
- Pure functions bên ngoài component (`getWordChipClasses`, `getAlertVariant`)
- `useMemo` để cache classes đã tính
- `React.memo` để tránh re-render

---

### ShadowingTranscript.tsx
**Vai trò:** Hiển thị danh sách tất cả các câu, cho phép jump

**Tính năng:**
- Visual indicator: CheckCircle (đã học), Circle fill (đang học), Circle outline (chưa học)
- Progress bar hiển thị % hoàn thành
- Toggle IPA (phiên âm)
- Toggle Translation (dịch nghĩa)
- Auto scroll câu active vào viewport (1/5 từ trên xuống)
- Badge "audio" cho câu có audio segment riêng

**Auto scroll logic:**
```javascript
// Tính vị trí scroll để câu active ở 1/5 viewport từ trên xuống
const scrollTo = itemTop - (containerHeight / 5) + (itemHeight / 2)
scrollContainer.scrollTo({ top: scrollTo, behavior: "smooth" })
```

---

### KeyboardShortcutsHelp.tsx
**Vai trò:** Dialog hiển thị danh sách phím tắt

**Shortcuts hiện tại:**
- **Ctrl**: Replay current segment (playback category)
- **Tab/PageDown**: Next sentence (navigation category)
- **PageUp**: Previous sentence (navigation category)

**Dễ dàng thêm shortcuts mới:**
```javascript
const shortcuts = [
  { key: "Space", action: "Toggle play/pause", category: "playback" },
  // ... thêm vào đây
]
```

---

## 🔧 Kỹ thuật tối ưu hiệu suất

### 1. React.memo
Sử dụng cho components không cần re-render khi props không đổi:
- `SentenceDisplay`
- `ShadowingResultPanel`

### 2. useMemo
Cache các giá trị tính toán phức tạp:
- Sorted words
- Progress percentage
- Word chip classes
- Alert variants

### 3. useCallback
Cache functions để tránh tạo lại:
- Event handlers
- Player control functions

### 4. useRef
Dùng cho values không trigger re-render:
- Audio/Video element refs
- Playing state (isPlayingRef)
- MediaRecorder, stream refs
- Success/fail audio refs

### 5. Memoize derived states
```javascript
const shouldShowNextButton = useMemo(
  () => transcription?.shadowingResult?.weightedAccuracy >= 85,
  [transcription]
)
```

### 6. Cleanup patterns
```javascript
useEffect(() => {
  // Setup
  const handler = () => { /* ... */ }
  element.addEventListener('event', handler)
  
  // Cleanup
  return () => {
    element.removeEventListener('event', handler)
    // Stop streams, revoke URLs, null refs, etc.
  }
}, [deps])
```

---

## ⚠️ Vấn đề thường gặp và giải pháp

### 1. Audio không auto-play khi chuyển câu
**Nguyên nhân:** User chưa tương tác với page (browser policy)

**Giải pháp:** 
- Hiển thị overlay "Bắt đầu"
- Set `userInteracted = true` sau khi user click
- Chỉ auto-play khi `userInteracted = true`

### 2. Memory leak khi unmount
**Nguyên nhân:** Không cleanup audio/video element, MediaRecorder, streams

**Giải pháp:**
- Cleanup trong `useEffect` return function
- Stop tất cả streams: `stream.getTracks().forEach(t => t.stop())`
- Pause và clear audio src: `audio.pause(); audio.src = ""`
- Revoke object URLs: `URL.revokeObjectURL(url)`

### 3. Recording vẫn chạy sau khi unmount
**Nguyên nhân:** MediaRecorder không được stop

**Giải pháp:**
```javascript
if (mediaRecorder.state !== 'inactive') {
  mediaRecorder.stop()
}
mediaRecorder.ondataavailable = null
mediaRecorder.onstop = null
```

### 4. YouTube player memory leak
**Nguyên nhân:** YouTube iframe không được destroy

**Giải pháp:**
```javascript
if (typeof playerRef.current.destroy === 'function') {
  playerRef.current.destroy()
}
playerRef.current = null
```

### 5. Feedback sound phát nhiều lần
**Nguyên nhân:** Effect trigger nhiều lần với cùng transcription

**Giải pháp:**
- Dùng `lastTranscriptionRef` để track transcription đã play
- Chỉ play khi `transcription.id` khác `lastTranscriptionRef.current`

---

## 📡 API Integration

### POST /lp/speech-to-text/transcribe
**Request (FormData):**
```javascript
{
  file: Blob,                    // Audio recording (webm format)
  expectedWords: JSON.stringify([...]),  // Mảng expected words
  sentenceId: string             // ID của câu
}
```

**Response (ITranscriptionResponse):**
```typescript
{
  id: number;
  audioUrl: string;
  transcribedText: string;
  shadowingResult: IShadowingResult;
}
```

---

## 🎨 UI/UX Design Patterns

### 1. Progressive Disclosure
- Chỉ hiện Next/Skip buttons sau khi có kết quả
- Chỉ hiện "Cancel" button khi đang recording

### 2. Visual Feedback
- Circular progress với màu sắc (success/warning/destructive)
- Word chips với màu theo status
- Animations: pulse, hover effects, smooth scroll

### 3. Loading States
- Spinner khi uploading
- "Recording..." text
- Disabled buttons khi processing

### 4. Error Handling
- Toast/alert khi không thể access microphone
- Error text khi upload failed
- Graceful fallbacks

---

## 🚀 Hướng dẫn mở rộng

### Thêm shortcut mới
File: `KeyboardShortcutsHelp.tsx`
```javascript
const shortcuts = [
  // ... existing
  { key: "Space", action: "Toggle play/pause", category: "playback" },
]
```

File: `ShadowingMode.tsx`
```javascript
if (e.code === "Space") {
  e.preventDefault()
  if (isPlaying) {
    handlePause()
  } else {
    handlePlay()
  }
}
```

### Thêm loại media player mới (VimeoShadowing)
1. Tạo `VimeoShadowing.tsx` implement `ShadowingPlayerRef`
2. Thêm vào `ShadowingMode.tsx`:
```javascript
{lesson.sourceType === "VIMEO" && (
  <VimeoShadowing ref={playerRef} ... />
)}
```

### Thêm tính năng slow-motion playback
```javascript
const [playbackRate, setPlaybackRate] = useState(1)

// Trong audio element
audio.playbackRate = playbackRate

// UI control
<Select value={playbackRate} onChange={setPlaybackRate}>
  <option value={0.5}>0.5x</option>
  <option value={1}>1x</option>
  <option value={1.5}>1.5x</option>
</Select>
```

---

## 📚 Dependencies

- `react-youtube`: YouTube player component
- `lucide-react`: Icons
- Native `MediaRecorder` API: Ghi âm microphone
- Native `<audio>` element: Play audio files
- `@/components/ui/*`: shadcn/ui components

---

## 📝 Notes

1. **Browser compatibility:** MediaRecorder và getUserMedia cần browser modern (Chrome, Firefox, Edge)
2. **Mobile support:** Cần test trên mobile, có thể cần adjust UI
3. **HTTPS required:** getUserMedia yêu cầu HTTPS hoặc localhost
4. **Microphone permission:** User phải grant quyền microphone

---

## 🤝 Contributing

Khi thêm code mới:
1. ✅ Thêm comment giải thích logic phức tạp
2. ✅ Cleanup đúng cách (useEffect return)
3. ✅ Handle loading và error states
4. ✅ Test trên nhiều browsers
5. ✅ Optimize với memo/useMemo khi cần

---

**Người viết:** AI Assistant  
**Ngày cập nhật:** 2026-01-01  
**Version:** 1.0
