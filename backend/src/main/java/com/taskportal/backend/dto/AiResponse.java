package com.taskportal.backend.dto;

public class AiResponse {
    private String description;
    private String priority; // LOW, MEDIUM, HIGH
    private Integer estimatedHours;

    public AiResponse() {
    }

    public AiResponse(String description, String priority, Integer estimatedHours) {
        this.description = description;
        this.priority = priority;
        this.estimatedHours = estimatedHours;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Integer getEstimatedHours() {
        return estimatedHours;
    }

    public void setEstimatedHours(Integer estimatedHours) {
        this.estimatedHours = estimatedHours;
    }
}
