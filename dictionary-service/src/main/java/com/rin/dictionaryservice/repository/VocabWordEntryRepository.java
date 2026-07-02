package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.VocabWordEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VocabWordEntryRepository extends MongoRepository<VocabWordEntry, String> {
    List<VocabWordEntry> findAllBySubtopicIdOrderByOrder(String subtopicId);
    List<VocabWordEntry> findAllByWordKeyAndPos(String wordKey, String pos);
    List<VocabWordEntry> findAllByWordKeyAndPosAndWordReadyTrue(String wordKey, String pos);
    Page<VocabWordEntry> findAllByWordKeyAndPos(String wordKey, String pos, Pageable pageable);
    Page<VocabWordEntry> findAllByWordKeyAndPosAndWordReady(String wordKey, String pos, boolean wordReady, Pageable pageable);
    long countByWordKeyAndPos(String wordKey, String pos);
    long countByWordKeyAndPosAndWordReadyTrue(String wordKey, String pos);
}
