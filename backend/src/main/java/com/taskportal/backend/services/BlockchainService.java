package com.taskportal.backend.services;

import com.taskportal.backend.dto.ChainVerificationResult;
import com.taskportal.backend.models.AuditBlock;
import com.taskportal.backend.repositories.AuditBlockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class BlockchainService {

    @Autowired
    private AuditBlockRepository auditBlockRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Computes the SHA-256 hash for a given block's contents.
     */
    public String calculateHash(Long taskId, String action, String previousHash, String data, LocalDateTime timestamp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String formattedTimestamp = timestamp != null ? timestamp.format(DATE_TIME_FORMATTER) : "";
            String input = taskId + ":" + action + ":" + previousHash + ":" + data + ":" + formattedTimestamp;
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error calculating hash", e);
        }
    }

    /**
     * Appends a new transaction block to the ledger.
     */
    @Transactional
    public AuditBlock recordTransaction(Long taskId, String action, String taskData) {
        AuditBlock lastBlock = auditBlockRepository.findFirstByOrderByIdDesc();
        String previousHash = (lastBlock == null) ? "0" : lastBlock.getHash();
        
        AuditBlock block = new AuditBlock();
        block.setTaskId(taskId);
        block.setAction(action);
        block.setPreviousHash(previousHash);
        block.setData(taskData);
        // Truncate nanos to ensure exact match when saved to MySQL DATETIME
        block.setTimestamp(LocalDateTime.now().withNano(0));
        
        // Calculate and set hash
        String hash = calculateHash(block.getTaskId(), block.getAction(), block.getPreviousHash(), block.getData(), block.getTimestamp());
        block.setHash(hash);
        
        return auditBlockRepository.save(block);
    }

    /**
     * Verifies the integrity of the blockchain ledger.
     */
    public ChainVerificationResult verifyChain() {
        List<AuditBlock> blocks = auditBlockRepository.findAllByOrderByIdAsc();
        
        if (blocks.isEmpty()) {
            return new ChainVerificationResult(true, "Ledger is empty. Cryptographically secure.", 0);
        }

        for (int i = 0; i < blocks.size(); i++) {
            AuditBlock currentBlock = blocks.get(i);
            
            // 1. Recalculate hash of current block and verify
            String calculatedHash = calculateHash(
                    currentBlock.getTaskId(),
                    currentBlock.getAction(),
                    currentBlock.getPreviousHash(),
                    currentBlock.getData(),
                    currentBlock.getTimestamp()
            );
            
            if (!calculatedHash.equals(currentBlock.getHash())) {
                return new ChainVerificationResult(
                        false,
                        "Block #" + currentBlock.getId() + " is compromised: Hash mismatch.",
                        blocks.size(),
                        currentBlock.getId()
                );
            }
            
            // 2. Verify link with previous block
            if (i == 0) {
                // First block previous hash must be "0"
                if (!"0".equals(currentBlock.getPreviousHash())) {
                    return new ChainVerificationResult(
                            false,
                            "Genesis block is compromised: Previous hash is not 0.",
                            blocks.size(),
                            currentBlock.getId()
                    );
                }
            } else {
                AuditBlock previousBlock = blocks.get(i - 1);
                if (!currentBlock.getPreviousHash().equals(previousBlock.getHash())) {
                    return new ChainVerificationResult(
                            false,
                            "Block #" + currentBlock.getId() + " is compromised: Chain link broken.",
                            blocks.size(),
                            currentBlock.getId()
                    );
                }
            }
        }
        
        return new ChainVerificationResult(true, "Ledger is completely valid. Cryptographic integrity verified.", blocks.size());
    }

    /**
     * Re-synchronizes and repairs legacy block hashes to ensure 100% cryptographic continuity.
     */
    @Transactional
    public ChainVerificationResult repairChain() {
        List<AuditBlock> blocks = auditBlockRepository.findAllByOrderByIdAsc();
        if (blocks.isEmpty()) {
            return new ChainVerificationResult(true, "Ledger is empty.", 0);
        }

        String prevHash = "0";
        for (AuditBlock block : blocks) {
            block.setPreviousHash(prevHash);
            if (block.getTimestamp() == null) {
                block.setTimestamp(LocalDateTime.now().withNano(0));
            } else {
                block.setTimestamp(block.getTimestamp().withNano(0));
            }
            String validHash = calculateHash(
                    block.getTaskId(),
                    block.getAction(),
                    block.getPreviousHash(),
                    block.getData(),
                    block.getTimestamp()
            );
            block.setHash(validHash);
            auditBlockRepository.save(block);
            prevHash = validHash;
        }

        return new ChainVerificationResult(true, "Blockchain ledger repaired and re-hashed successfully.", blocks.size());
    }

    /**
     * Retrieves all ledger entries.
     */
    public List<AuditBlock> getLedger() {
        return auditBlockRepository.findAllByOrderByIdAsc();
    }
}
