package com.taskportal.backend.dto;

public class ChainVerificationResult {
    private boolean isValid;
    private String message;
    private int totalBlocks;
    private Long tamperedBlockId;

    public ChainVerificationResult(boolean isValid, String message, int totalBlocks) {
        this.isValid = isValid;
        this.message = message;
        this.totalBlocks = totalBlocks;
        this.tamperedBlockId = null;
    }

    public ChainVerificationResult(boolean isValid, String message, int totalBlocks, Long tamperedBlockId) {
        this.isValid = isValid;
        this.message = message;
        this.totalBlocks = totalBlocks;
        this.tamperedBlockId = tamperedBlockId;
    }

    public boolean isValid() {
        return isValid;
    }

    public void setValid(boolean valid) {
        isValid = valid;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getTotalBlocks() {
        return totalBlocks;
    }

    public void setTotalBlocks(int totalBlocks) {
        this.totalBlocks = totalBlocks;
    }

    public Long getTamperedBlockId() {
        return tamperedBlockId;
    }

    public void setTamperedBlockId(Long tamperedBlockId) {
        this.tamperedBlockId = tamperedBlockId;
    }
}
