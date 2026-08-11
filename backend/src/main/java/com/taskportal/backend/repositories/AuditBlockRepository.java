package com.taskportal.backend.repositories;

import com.taskportal.backend.models.AuditBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditBlockRepository extends JpaRepository<AuditBlock, Long> {
    List<AuditBlock> findAllByOrderByIdAsc();
    
    // Find the latest block added to the ledger
    AuditBlock findFirstByOrderByIdDesc();
}
