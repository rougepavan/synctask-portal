package com.taskportal.backend.controllers;

import com.taskportal.backend.dto.ChainVerificationResult;
import com.taskportal.backend.models.AuditBlock;
import com.taskportal.backend.services.BlockchainService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    @Autowired
    private BlockchainService blockchainService;

    @GetMapping
    public ResponseEntity<List<AuditBlock>> getAuditLedger() {
        List<AuditBlock> ledger = blockchainService.getLedger();
        return ResponseEntity.ok(ledger);
    }

    @GetMapping("/verify")
    public ResponseEntity<ChainVerificationResult> verifyAuditLedger() {
        ChainVerificationResult verification = blockchainService.verifyChain();
        return ResponseEntity.ok(verification);
    }

    @PostMapping("/repair")
    public ResponseEntity<ChainVerificationResult> repairAuditLedger() {
        ChainVerificationResult result = blockchainService.repairChain();
        return ResponseEntity.ok(result);
    }
}
