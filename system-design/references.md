# Tài liệu tham khảo

Tổng hợp các tài liệu học thuật và kỹ thuật làm nền tảng lý thuyết và triển khai cho hệ thống.

---

## Speech Recognition & Alignment

- Bain, M., Huh, J., Han, T., & Zisserman, A. (2023). **WhisperX: Time-Accurate Speech Transcription of Long-Form Audio.** *INTERSPEECH 2023.* https://arxiv.org/abs/2303.00747
  > Mô hình STT có căn chỉnh timestamp chính xác từng từ. Hệ thống dùng WhisperX để transcript audio người học và lấy word-level timestamps phục vụ tính fluency score.

- Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). **Robust Speech Recognition via Large-Scale Weak Supervision.** *ICML 2023.* https://arxiv.org/abs/2212.04356
  > Mô hình Whisper gốc của OpenAI, nền tảng của WhisperX. Huấn luyện trên 680.000 giờ audio đa ngôn ngữ, cho khả năng nhận dạng tiếng Anh tốt trong nhiều ngữ cảnh.

---

## Sequence Alignment & Edit Distance

- Levenshtein, V. I. (1966). **Binary codes capable of correcting deletions, insertions, and reversals.** *Soviet Physics Doklady, 10*(8), 707–710.
  > Bài báo gốc định nghĩa edit distance (khoảng cách chỉnh sửa) giữa 2 chuỗi. Hệ thống dùng biến thể của thuật toán này ở cả word-level alignment và phoneme-level alignment.

- Wagner, R. A., & Fischer, M. J. (1974). **The string-to-string correction problem.** *Journal of the ACM, 21*(1), 168–173.
  > Phát biểu bài toán string correction chính thức với DP, nền tảng lý thuyết cho `_align_words` và `levenshtein_alignment_with_similarity`.

- Needleman, S. B., & Wunsch, C. D. (1970). **A general method applicable to the search for similarities in the amino acid sequence of two proteins.** *Journal of Molecular Biology, 48*(3), 443–453.
  > Thuật toán DP alignment gốc từ sinh học phân tử, tiền thân của các thuật toán sequence alignment hiện đại dùng trong hệ thống.

---

## Phonetics & Grapheme-to-Phoneme

- International Phonetic Association. (1999). **Handbook of the International Phonetic Association.** Cambridge University Press.
  > Chuẩn quốc tế về hệ thống ký hiệu âm vị học IPA. Toàn bộ pipeline phoneme comparison trong hệ thống dựa trên ký hiệu IPA theo chuẩn này.

- Weide, R. (1998). **CMU Pronouncing Dictionary.** Carnegie Mellon University. http://www.speech.cs.cmu.edu/cgi-bin/cmudict
  > Từ điển phát âm tiếng Anh chuẩn theo IPA của CMU, dữ liệu huấn luyện chính của OpenPhonemizer. Ảnh hưởng trực tiếp đến chất lượng IPA output.

- OpenPhonemizer. (2023). *Open-source neural G2P model.* https://github.com/NeuralVox/OpenPhonemizer
  > Mô hình G2P (grapheme-to-phoneme) mã nguồn mở, chuyển văn bản sang IPA. Hệ thống dùng `openphonemizer==0.1.2` làm engine chính trong `phonemizer_service.py`.

---

## Fluency & Second Language Assessment

- Kormos, J., & Dénes, M. (2004). **Exploring measures and perceptions of fluency in the speech of second language learners.** *System, 32*(2), 145–164.
  > Nghiên cứu về cách đo lường fluency trong học ngoại ngữ L2, phân tích mối quan hệ giữa khoảng dừng, tốc độ nói và cảm nhận fluency. Cơ sở lý thuyết cho `_compute_fluency_score`.

- Lennon, P. (1990). **Investigating fluency in EFL: A quantitative approach.** *Language Learning, 40*(3), 387–417.
  > Nghiên cứu định lượng fluency trong EFL, đề xuất speech rate (từ/giây) và pause duration là hai chỉ số đo lường chính. Trực tiếp ảnh hưởng đến công thức `pause_score` và `rate_score` trong hệ thống.

---

## Natural Language Processing

- Honnibal, M., Montani, I., Van Landeghem, S., & Boyd, A. (2020). **spaCy: Industrial-strength Natural Language Processing in Python.** Zenodo. https://doi.org/10.5281/zenodo.1212303
  > Thư viện NLP công nghiệp dùng cho phân tích POS, dependency parsing, lemmatization và NER. Hệ thống dùng `spacy==3.8.11` với model `en_core_web_sm` trong `spaCy_service`.

---

## Deep Learning Framework

- Paszke, A., Gross, S., Massa, F., Lerer, A., Bradbury, J., Chanan, G., ... & Chintala, S. (2019). **PyTorch: An Imperative Style, High-Performance Deep Learning Library.** *NeurIPS, 32.* https://arxiv.org/abs/1912.01703
  > Framework deep learning của Meta, nền tảng runtime cho cả WhisperX và OpenPhonemizer. Hệ thống dùng `torch==2.8.0` với GPU NVIDIA RTX A2000.

---

## Audio Processing

- McFee, B., McVicar, M., Faronbi, D., Roman, I., Gover, M., Balke, S., ... & Raffel, C. (2023). **librosa: Audio and Music Signal Analysis in Python.** Zenodo. https://doi.org/10.5281/zenodo.8252662
  > Thư viện Python phân tích tín hiệu audio, dùng trong pipeline xử lý và chuẩn hóa audio trước khi đưa vào STT.

- Google Cloud. (2024). **Google Cloud Text-to-Speech API.** https://cloud.google.com/text-to-speech
  > API TTS của Google, dùng để sinh audio phát âm chuẩn cho từng câu trong lesson, phục vụ tính năng nghe phát âm mẫu.

- yt-dlp contributors. (2021). **yt-dlp: A feature-rich command-line audio/video downloader.** https://github.com/yt-dlp/yt-dlp
  > Tool download audio/video từ YouTube và nhiều nguồn khác. Dùng trong pipeline tạo lesson khi admin nhập URL video.

---

## Large Language Models (AI Enrich)

- Google DeepMind. (2023). **Gemini: A Family of Highly Capable Multimodal Models.** https://arxiv.org/abs/2312.11805
  > LLM đa phương thức của Google DeepMind, dùng để enrich nội dung từ vựng: sinh IPA, nghĩa, ví dụ, phân tích từ theo ngữ cảnh qua `gemini_service`.

- DeepSeek-AI. (2025). **DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning.** https://arxiv.org/abs/2501.12948
  > LLM hiệu năng cao chi phí thấp. Hệ thống dùng DeepSeek API qua `deepseek_service` như một lựa chọn thay thế/bổ sung cho Gemini trong các task xử lý văn bản.

---

## Web Frameworks & API

- Ramírez, S. (2018). **FastAPI: Modern, fast web framework for building APIs with Python.** https://fastapi.tiangolo.com/
  > Framework web Python async, tự động sinh OpenAPI docs. Dùng làm nền tảng cho `language-processing-service` (AI service chạy trên port 8089).

- VMware (Pivotal). (2014). **Spring Boot.** https://spring.io/projects/spring-boot
  > Framework Java giảm boilerplate config cho microservices. Toàn bộ 6 backend service đều dùng Spring Boot 3.x với Java 21.

- Spring Cloud Community. (2015). **Spring Cloud OpenFeign: Declarative REST Client.** https://spring.io/projects/spring-cloud-openfeign
  > HTTP client declarative, dùng để gọi API giữa các microservices (thay vì viết tay RestTemplate). Dùng trong `learning-content-service` và các service khác.

- Spring Data Team. (2011). **Spring Data JPA.** https://spring.io/projects/spring-data-jpa
  > ORM abstraction trên Hibernate, mapping Java entity ↔ PostgreSQL. Dùng trong tất cả Java service có database.

---

## Microservices & Infrastructure

- Dragoni, N., Giallorenzo, S., Lafuente, A. L., Mazzara, M., Montesi, F., Mustafin, R., & Safina, L. (2017). **Microservices: yesterday, today, and tomorrow.** *Present and Ulterior Software Engineering*, 195–216. https://doi.org/10.1007/978-3-319-67425-4_12
  > Bài báo khảo sát toàn diện về kiến trúc microservices, định nghĩa, lợi ích và thách thức. Nền tảng lý thuyết cho quyết định tách hệ thống thành các service độc lập.

- Newman, S. (2015). **Building Microservices: Designing Fine-Grained Systems.** O'Reilly Media.
  > Sách thực hành hướng dẫn thiết kế microservices: service boundary, communication, deployment. Tham khảo cho các quyết định thiết kế trong hệ thống.

- Merkel, D. (2014). **Docker: Lightweight Linux Containers for Consistent Development and Deployment.** *Linux Journal, 2014*(239).
  > Container platform, dùng để đóng gói và chạy toàn bộ hạ tầng local (PostgreSQL, Kafka, Keycloak, ZooKeeper) qua `docker-compose.yml`.

- Kreps, J., Narkhede, N., & Rao, J. (2011). **Kafka: A Distributed Messaging System for Log Processing.** *Proceedings of the NetDB Workshop.*
  > Hệ thống message queue phân tán của LinkedIn. Dùng cho async pipeline tạo lesson (admin → learning-content-service → AI service) và event notification.

- Apache ZooKeeper. (2010). **ZooKeeper: A Distributed Coordination Service.** https://zookeeper.apache.org/
  > Distributed coordination service, dùng để quản lý Kafka broker state và leader election trong cụm Kafka.

- Netflix OSS. (2012). **Eureka: Service Discovery in the Cloud.** https://github.com/Netflix/eureka
  > Service registry của Netflix, tích hợp qua Spring Cloud Netflix. Cho phép các service tự đăng ký và tìm nhau bằng tên thay vì IP cứng.

- Redis Ltd. (2024). **Redis: The Real-time Data Platform.** https://redis.io/
  > In-memory data store, dùng cho caching kết quả AI và pub/sub trong pipeline xử lý từ vựng bất đồng bộ.

- PostgreSQL Global Development Group. (1996). **PostgreSQL: The World's Most Advanced Open Source Relational Database.** https://www.postgresql.org/
  > RDBMS chính của hệ thống (version 16), lưu trữ dữ liệu lesson, user, từ vựng và kết quả học tập. Cũng là backend database của Keycloak.

---

## Security & Authentication

- Hardt, D. (Ed.). (2012). **The OAuth 2.0 Authorization Framework.** RFC 6749. IETF. https://datatracker.ietf.org/doc/html/rfc6749
  > Chuẩn ủy quyền (authorization) hiện đại nhất, cho phép ứng dụng bên thứ ba truy cập tài nguyên mà không cần biết password. Nền tảng của Keycloak và Spring Security OAuth2.

- Sakimura, N., Bradley, J., Jones, M., de Medeiros, B., & Mortimore, C. (2014). **OpenID Connect Core 1.0.** OpenID Foundation. https://openid.net/specs/openid-connect-core-1_0.html
  > Lớp xác thực (authentication) trên OAuth 2.0, cung cấp ID Token để xác minh identity người dùng. Dùng qua Keycloak cho cả `learner-web` và `admin-web`.

- Red Hat. (2024). **Keycloak: Open Source Identity and Access Management.** https://www.keycloak.org/
  > IAM mã nguồn mở của Red Hat, quản lý auth/authz tập trung cho toàn hệ thống. Tích hợp qua `keycloak-js` ở frontend và Spring Security OAuth2 Resource Server ở backend.
