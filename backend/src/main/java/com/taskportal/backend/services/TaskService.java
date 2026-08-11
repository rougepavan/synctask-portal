package com.taskportal.backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskportal.backend.models.Task;
import com.taskportal.backend.models.User;
import com.taskportal.backend.repositories.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private BlockchainService blockchainService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String serializeTaskState(Task task) {
        try {
            Map<String, Object> map = new HashMap<>();
            map.put("id", task.getId());
            map.put("title", task.getTitle());
            map.put("description", task.getDescription());
            map.put("priority", task.getPriority().name());
            map.put("status", task.getStatus().name());
            map.put("dueDate", task.getDueDate() != null ? task.getDueDate().toString() : null);
            map.put("estimatedHours", task.getEstimatedHours());
            map.put("assignee", task.getAssignee());
            map.put("userId", task.getUser().getId());
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{\"id\":" + task.getId() + ",\"title\":\"" + task.getTitle() + "\"}";
        }
    }

    public List<Task> getTasksByUser(User user) {
        return taskRepository.findByUser(user);
    }

    public Task getTaskById(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found with ID: " + taskId));
        
        if (!task.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized: You do not own this task.");
        }
        return task;
    }

    @Transactional
    public Task createTask(Task task, User user) {
        task.setUser(user);
        if (task.getAssignee() == null || task.getAssignee().trim().isEmpty()) {
            task.setAssignee(user.getUsername());
        }
        Task savedTask = taskRepository.save(task);
        
        blockchainService.recordTransaction(
                savedTask.getId(),
                "CREATED",
                serializeTaskState(savedTask)
        );
        
        return savedTask;
    }

    @Transactional
    public Task updateTask(Long taskId, Task taskDetails, User user) {
        Task existingTask = getTaskById(taskId, user);
        
        existingTask.setTitle(taskDetails.getTitle());
        existingTask.setDescription(taskDetails.getDescription());
        existingTask.setPriority(taskDetails.getPriority());
        existingTask.setStatus(taskDetails.getStatus());
        existingTask.setDueDate(taskDetails.getDueDate());
        existingTask.setEstimatedHours(taskDetails.getEstimatedHours());
        existingTask.setAssignee(taskDetails.getAssignee());
        
        Task updatedTask = taskRepository.save(existingTask);
        
        blockchainService.recordTransaction(
                updatedTask.getId(),
                "UPDATED",
                serializeTaskState(updatedTask)
        );
        
        return updatedTask;
    }

    @Transactional
    public void deleteTask(Long taskId, User user) {
        Task task = getTaskById(taskId, user);
        
        blockchainService.recordTransaction(
                task.getId(),
                "DELETED",
                serializeTaskState(task)
        );
        
        taskRepository.delete(task);
    }
}
