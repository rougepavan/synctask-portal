package com.taskportal.backend.controllers;

import com.taskportal.backend.dto.TaskRequest;
import com.taskportal.backend.models.Task;
import com.taskportal.backend.models.TaskPriority;
import com.taskportal.backend.models.TaskStatus;
import com.taskportal.backend.models.User;
import com.taskportal.backend.repositories.UserRepository;
import com.taskportal.backend.security.UserDetailsImpl;
import com.taskportal.backend.services.TaskService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));
    }

    /** Map a TaskRequest DTO onto a Task entity safely */
    private Task mapRequestToTask(TaskRequest req) {
        Task task = new Task();
        task.setTitle(req.getTitle());
        task.setDescription(req.getDescription());

        // Priority — default MEDIUM if missing / invalid
        try {
            task.setPriority(TaskPriority.valueOf(req.getPriority() != null ? req.getPriority().toUpperCase() : "MEDIUM"));
        } catch (Exception e) {
            task.setPriority(TaskPriority.MEDIUM);
        }

        // Status — default TODO if missing / invalid
        try {
            task.setStatus(TaskStatus.valueOf(req.getStatus() != null ? req.getStatus().toUpperCase() : "TODO"));
        } catch (Exception e) {
            task.setStatus(TaskStatus.TODO);
        }

        // Due date — parse yyyy-MM-dd string safely
        if (req.getDueDate() != null && !req.getDueDate().isBlank()) {
            try {
                task.setDueDate(LocalDate.parse(req.getDueDate()));
            } catch (Exception e) {
                task.setDueDate(null);
            }
        }

        task.setEstimatedHours(req.getEstimatedHours());
        return task;
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(taskService.getTasksByUser(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(taskService.getTaskById(id, user));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody TaskRequest req) {
        User user = getAuthenticatedUser();
        Task task = mapRequestToTask(req);
        return ResponseEntity.ok(taskService.createTask(task, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest req) {
        User user = getAuthenticatedUser();
        Task taskDetails = mapRequestToTask(req);
        return ResponseEntity.ok(taskService.updateTask(id, taskDetails, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        taskService.deleteTask(id, user);
        return ResponseEntity.ok().build();
    }
}
