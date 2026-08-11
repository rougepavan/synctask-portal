package com.taskportal.backend.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_blocks")
public class AuditBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @NotBlank
    @Column(nullable = false)
    private String action;

    @NotBlank
    @Column(name = "previous_hash", nullable = false, length = 64)
    private String previousHash;

    @NotBlank
    @Column(name = "hash", nullable = false, length = 64)
    private String hash;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String data;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime timestamp;

    public AuditBlock() {
    }

    public AuditBlock(Long taskId, String action, String previousHash, String hash, String data) {
        this.taskId = taskId;
        this.action = action;
        this.previousHash = previousHash;
        this.hash = hash;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public void setPreviousHash(String previousHash) {
        this.previousHash = previousHash;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
