package com.taskportal.backend.services;

import com.taskportal.backend.dto.ChainVerificationResult;
import com.taskportal.backend.models.AuditBlock;
import com.taskportal.backend.repositories.AuditBlockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class BlockchainServiceTest {

    @Mock
    private AuditBlockRepository auditBlockRepository;

    @InjectMocks
    private BlockchainService blockchainService;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testVerifyChain_EmptyLedger() {
        when(auditBlockRepository.findAllByOrderByIdAsc()).thenReturn(new ArrayList<>());
        ChainVerificationResult result = blockchainService.verifyChain();
        assertTrue(result.isValid());
        assertEquals(0, result.getTotalBlocks());
    }

    @Test
    public void testVerifyChain_ValidLedger() {
        List<AuditBlock> blocks = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        AuditBlock block1 = new AuditBlock();
        block1.setId(1L);
        block1.setTaskId(10L);
        block1.setAction("CREATED");
        block1.setPreviousHash("0");
        block1.setData("{\"title\":\"Test Task\"}");
        block1.setTimestamp(now);
        String hash1 = blockchainService.calculateHash(10L, "CREATED", "0", "{\"title\":\"Test Task\"}", now);
        block1.setHash(hash1);
        blocks.add(block1);

        AuditBlock block2 = new AuditBlock();
        block2.setId(2L);
        block2.setTaskId(10L);
        block2.setAction("UPDATED");
        block2.setPreviousHash(hash1);
        block2.setData("{\"title\":\"Updated Test Task\"}");
        block2.setTimestamp(now.plusSeconds(30));
        String hash2 = blockchainService.calculateHash(10L, "UPDATED", hash1, "{\"title\":\"Updated Test Task\"}", now.plusSeconds(30));
        block2.setHash(hash2);
        blocks.add(block2);

        when(auditBlockRepository.findAllByOrderByIdAsc()).thenReturn(blocks);

        ChainVerificationResult result = blockchainService.verifyChain();
        assertTrue(result.isValid());
        assertEquals(2, result.getTotalBlocks());
        assertNull(result.getTamperedBlockId());
    }

    @Test
    public void testVerifyChain_TamperedBlockData() {
        List<AuditBlock> blocks = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        AuditBlock block1 = new AuditBlock();
        block1.setId(1L);
        block1.setTaskId(10L);
        block1.setAction("CREATED");
        block1.setPreviousHash("0");
        block1.setData("{\"title\":\"Test Task\"}");
        block1.setTimestamp(now);
        String hash1 = blockchainService.calculateHash(10L, "CREATED", "0", "{\"title\":\"Test Task\"}", now);
        block1.setHash(hash1);
        blocks.add(block1);

        AuditBlock block2 = new AuditBlock();
        block2.setId(2L);
        block2.setTaskId(10L);
        block2.setAction("UPDATED");
        block2.setPreviousHash(hash1);
        block2.setData("{\"title\":\"Updated Test Task\"}");
        block2.setTimestamp(now.plusSeconds(30));
        String hash2 = blockchainService.calculateHash(10L, "UPDATED", hash1, "{\"title\":\"Updated Test Task\"}", now.plusSeconds(30));
        block2.setHash(hash2);
        
        // Tamper the data *after* generating the valid hash
        block2.setData("{\"title\":\"Tampered Data!\"}");
        blocks.add(block2);

        when(auditBlockRepository.findAllByOrderByIdAsc()).thenReturn(blocks);

        ChainVerificationResult result = blockchainService.verifyChain();
        assertFalse(result.isValid());
        assertEquals(2L, result.getTamperedBlockId());
    }
}
