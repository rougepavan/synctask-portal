package com.taskportal.backend.controllers;

import com.taskportal.backend.dto.AiResponse;
import com.taskportal.backend.models.Task;
import com.taskportal.backend.models.User;
import com.taskportal.backend.repositories.UserRepository;
import com.taskportal.backend.security.UserDetailsImpl;
import com.taskportal.backend.services.AiService;
import com.taskportal.backend.services.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/suggest")
    public ResponseEntity<AiResponse> getAiSuggestions(@RequestParam String title) {
        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        AiResponse suggestions = aiService.generateTaskDetails(title);
        return ResponseEntity.ok(suggestions);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getProductivitySummary() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElse(null);

        List<Task> tasks = (user != null) ? taskService.getTasksByUser(user) : Collections.emptyList();

        // Compute stats
        long total = tasks.size();
        long done = tasks.stream().filter(t -> "DONE".equals(t.getStatus().name())).count();
        long inProgress = tasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus().name())).count();
        long todo = tasks.stream().filter(t -> "TODO".equals(t.getStatus().name())).count();
        long highP = tasks.stream().filter(t -> "HIGH".equals(t.getPriority().name())).count();
        long medP = tasks.stream().filter(t -> "MEDIUM".equals(t.getPriority().name())).count();
        long lowP = tasks.stream().filter(t -> "LOW".equals(t.getPriority().name())).count();
        long overdue = tasks.stream().filter(t -> {
            if (t.getDueDate() == null) return false;
            return t.getDueDate().isBefore(java.time.LocalDate.now()) && !"DONE".equals(t.getStatus().name());
        }).count();
        long totalHours = tasks.stream()
            .filter(t -> t.getEstimatedHours() != null)
            .mapToLong(t -> t.getEstimatedHours())
            .sum();
        long completedHours = tasks.stream()
            .filter(t -> "DONE".equals(t.getStatus().name()) && t.getEstimatedHours() != null)
            .mapToLong(t -> t.getEstimatedHours())
            .sum();

        // AI text
        Map<String, String> textSummary = aiService.generateTaskSummary(tasks);

        Map<String, Object> result = new HashMap<>(textSummary);
        result.put("total", total);
        result.put("done", done);
        result.put("inProgress", inProgress);
        result.put("todo", todo);
        result.put("highPriority", highP);
        result.put("medPriority", medP);
        result.put("lowPriority", lowP);
        result.put("overdue", overdue);
        result.put("totalHours", totalHours);
        result.put("completedHours", completedHours);
        result.put("completionRate", total > 0 ? Math.round((done * 100.0) / total) : 0);

        return ResponseEntity.ok(result);
    }
}
